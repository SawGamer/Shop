package com.za.shop.catalog.internal;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.za.shop.catalog.ProductChanged;
import com.za.shop.catalog.internal.CatalogDtos.AdminProductDto;
import com.za.shop.catalog.internal.CatalogDtos.AdminProductSummaryDto;
import com.za.shop.catalog.internal.CatalogDtos.BrandDto;
import com.za.shop.catalog.internal.CatalogDtos.BrandUpsert;
import com.za.shop.catalog.internal.CatalogDtos.CategoryNode;
import com.za.shop.catalog.internal.CatalogDtos.CategoryUpsert;
import com.za.shop.catalog.internal.CatalogDtos.DealUpsert;
import com.za.shop.catalog.internal.CatalogDtos.ProductUpsert;
import com.za.shop.catalog.internal.CatalogDtos.SpecInput;
import com.za.shop.catalog.internal.CatalogDtos.SpecsUpsert;
import com.za.shop.catalog.internal.CatalogDtos.VariantUpsert;
import com.za.shop.inventory.InventoryService;
import com.za.shop.media.ImageProcessor;
import com.za.shop.media.MediaStorage;
import com.za.shop.shared.ApiException;
import com.za.shop.shared.PageResponse;
import com.za.shop.shared.Paging;
import com.za.shop.shared.Slugs;

@Service
@Transactional
class CatalogAdminService {

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final BrandRepository brands;
    private final CategoryRepository categories;
    private final InventoryService inventory;
    private final ImageProcessor imageProcessor;
    private final MediaStorage mediaStorage;
    private final CatalogMapper mapper;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    CatalogAdminService(ProductRepository products, ProductVariantRepository variants, BrandRepository brands,
            CategoryRepository categories, InventoryService inventory, ImageProcessor imageProcessor,
            MediaStorage mediaStorage, CatalogMapper mapper, ApplicationEventPublisher events, Clock clock) {
        this.products = products;
        this.variants = variants;
        this.brands = brands;
        this.categories = categories;
        this.inventory = inventory;
        this.imageProcessor = imageProcessor;
        this.mediaStorage = mediaStorage;
        this.mapper = mapper;
        this.events = events;
        this.clock = clock;
    }

    // ───────────── products ─────────────

    @Transactional(readOnly = true)
    PageResponse<AdminProductSummaryDto> list(String q, ProductStatus status, Integer page, Integer pageSize) {
        Specification<Product> spec = (root, query, cb) -> cb.conjunction();
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase(Locale.ROOT).replace("%", "\\%").replace("_", "\\_") + "%";
            spec = spec.and((root, query, cb) -> cb.or(cb.like(cb.lower(root.get("name")), like),
                    cb.like(root.get("slug"), like)));
        }
        Page<Product> result = products.findAll(spec,
                Paging.of(page, pageSize, Sort.by(Sort.Direction.DESC, "updatedAt")));
        return PageResponse.of(mapper.adminSummaries(result.getContent()), result.getNumber(), result.getSize(),
                result.getTotalElements());
    }

    @Transactional(readOnly = true)
    AdminProductDto get(UUID id) {
        return mapper.admin(product(id));
    }

    AdminProductDto create(ProductUpsert request) {
        String slug = Slugs.fromOptional(request.slug(), request.name());
        if (products.existsBySlug(slug)) {
            throw ApiException.conflict("CONFLICT", "A product with slug '" + slug + "' already exists");
        }
        Instant now = clock.instant();
        Product product = new Product(slug, request.name().trim(), description(request), brand(request.brandId()),
                request.status(), now);
        product.getCategories().addAll(categoriesById(request.categoryIds()));
        products.save(product);
        changed(product);
        return mapper.admin(product);
    }

    AdminProductDto update(UUID id, ProductUpsert request) {
        Product product = product(id);
        String slug = Slugs.fromOptional(request.slug(), request.name());
        if (products.existsBySlugAndIdNot(slug, id)) {
            throw ApiException.conflict("CONFLICT", "A product with slug '" + slug + "' already exists");
        }
        product.update(slug, request.name().trim(), description(request), brand(request.brandId()), request.status(),
                categoriesById(request.categoryIds()), clock.instant());
        changed(product);
        return mapper.admin(product);
    }

    void archive(UUID id) {
        Product product = product(id);
        product.archive(clock.instant());
        changed(product);
    }

    // ───────────── specs and deals ─────────────

    AdminProductDto replaceSpecs(UUID productId, SpecsUpsert request) {
        Product product = product(productId);
        List<ProductSpec> specs = new java.util.ArrayList<>();
        Set<String> keys = new HashSet<>();
        for (SpecInput input : request.specs()) {
            String key = Slugs.slugify(input.label()).replace('-', '_');
            if (key.isEmpty() || key.length() > 60) {
                throw ApiException.badRequest("VALIDATION_FAILED", "Invalid spec label '" + input.label() + "'");
            }
            if (!keys.add(key)) {
                throw ApiException.badRequest("VALIDATION_FAILED",
                        "Each spec label may be used once per product ('" + input.label() + "' appears twice)");
            }
            specs.add(new ProductSpec(product, specs.size(), key,
                    input.group() == null || input.group().isBlank() ? null : input.group().trim(),
                    input.label().trim(), input.value().trim(), input.filterable()));
        }
        // Hibernate inserts before it deletes; flush the removal first so a re-used key does not collide
        // with the row it replaces (unique per product and key).
        product.getSpecs().clear();
        products.flush();
        product.replaceSpecs(specs);
        product.touch(clock.instant());
        changed(product);
        return mapper.admin(product);
    }

    AdminProductDto setDeal(UUID productId, DealUpsert request) {
        Instant now = clock.instant();
        if (!request.endsAt().isAfter(request.startsAt())) {
            throw ApiException.badRequest("VALIDATION_FAILED", "The deal must end after it starts")
                    .with("errors", java.util.Map.of("endsAt", "must be after the start"));
        }
        if (!request.endsAt().isAfter(now)) {
            throw ApiException.badRequest("VALIDATION_FAILED", "The deal must end in the future")
                    .with("errors", java.util.Map.of("endsAt", "must be in the future"));
        }
        Product product = product(productId);
        product.setDeal(request.percentOff(), request.startsAt(), request.endsAt(), now);
        changed(product);
        return mapper.admin(product);
    }

    AdminProductDto clearDeal(UUID productId) {
        Product product = product(productId);
        product.clearDeal(clock.instant());
        changed(product);
        return mapper.admin(product);
    }

    // ───────────── variants ─────────────

    AdminProductDto addVariant(UUID productId, VariantUpsert request) {
        Product product = product(productId);
        String sku = normalizeSku(request.sku());
        if (variants.existsBySku(sku)) {
            throw ApiException.conflict("CONFLICT", "SKU " + sku + " already exists");
        }
        ProductVariant variant = new ProductVariant(product, sku, blankToNull(request.size()),
                blankToNull(request.color()), request.priceCents(), request.compareAtPriceCents(),
                product.getVariants().size(), clock.instant());
        variants.save(variant);
        product.getVariants().add(variant);
        inventory.initialize(variant.getId(), request.onHand() == null ? 0 : request.onHand());
        product.touch(clock.instant());
        changed(product);
        return mapper.admin(product);
    }

    AdminProductDto updateVariant(UUID productId, UUID variantId, VariantUpsert request) {
        Product product = product(productId);
        ProductVariant variant = variantOf(product, variantId);
        String sku = normalizeSku(request.sku());
        if (variants.existsBySkuAndIdNot(sku, variantId)) {
            throw ApiException.conflict("CONFLICT", "SKU " + sku + " already exists");
        }
        variant.update(sku, blankToNull(request.size()), blankToNull(request.color()), request.priceCents(),
                request.compareAtPriceCents());
        product.touch(clock.instant());
        changed(product);
        return mapper.admin(product);
    }

    AdminProductDto deleteVariant(UUID productId, UUID variantId) {
        Product product = product(productId);
        ProductVariant variant = variantOf(product, variantId);
        inventory.remove(variant.getId());
        product.getVariants().remove(variant);
        product.touch(clock.instant());
        changed(product);
        return mapper.admin(product);
    }

    // ───────────── images ─────────────

    AdminProductDto addImage(UUID productId, MultipartFile file, String alt) {
        Product product = product(productId);
        byte[] bytes;
        try {
            bytes = file.getBytes();
        }
        catch (IOException e) {
            throw ApiException.badRequest("VALIDATION_FAILED", "Could not read the uploaded file");
        }
        return addImage(product, bytes, alt);
    }

    AdminProductDto addImage(Product product, byte[] bytes, String alt) {
        ImageProcessor.ProcessedImage image = imageProcessor.toWebJpeg(bytes);
        String key = "products/" + product.getId() + "/" + UUID.randomUUID() + "." + image.extension();
        MediaStorage.StoredObject stored = mediaStorage.store(key, image.content(), image.contentType());
        int position = product.getImages().stream().mapToInt(ProductImage::getPosition).max().orElse(-1) + 1;
        product.getImages().add(new ProductImage(product, stored.key(), stored.url(),
                alt == null || alt.isBlank() ? product.getName() : alt.trim(), position, clock.instant()));
        product.touch(clock.instant());
        changed(product);
        return mapper.admin(product);
    }

    AdminProductDto deleteImage(UUID productId, UUID imageId) {
        Product product = product(productId);
        ProductImage image = product.getImages().stream().filter(i -> i.getId().equals(imageId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Image"));
        product.getImages().remove(image);
        product.touch(clock.instant());
        changed(product);
        String key = image.getStorageKey();
        // Only remove the file once the database change is committed.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                mediaStorage.delete(key);
            }
        });
        return mapper.admin(product);
    }

    // ───────────── categories ─────────────

    CategoryNode createCategory(CategoryUpsert request) {
        String slug = Slugs.fromOptional(request.slug(), request.name());
        if (categories.existsBySlug(slug)) {
            throw ApiException.conflict("CONFLICT", "A category with slug '" + slug + "' already exists");
        }
        if (request.parentId() != null && !categories.existsById(request.parentId())) {
            throw ApiException.notFound("Parent category");
        }
        Category category = categories.save(new Category(slug, request.name().trim(), request.parentId(),
                (int) categories.count(), clock.instant()));
        return node(category);
    }

    CategoryNode updateCategory(UUID id, CategoryUpsert request) {
        Category category = categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        String slug = Slugs.fromOptional(request.slug(), request.name());
        if (categories.existsBySlugAndIdNot(slug, id)) {
            throw ApiException.conflict("CONFLICT", "A category with slug '" + slug + "' already exists");
        }
        requireNoCycle(id, request.parentId());
        boolean slugChanged = !slug.equals(category.getSlug()) || !java.util.Objects.equals(request.parentId(),
                category.getParentId());
        category.update(slug, request.name().trim(), request.parentId());
        if (slugChanged) {
            products.findIdsByCategory(id).forEach(pid -> events.publishEvent(new ProductChanged(pid)));
        }
        return node(category);
    }

    void deleteCategory(UUID id) {
        Category category = categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        if (categories.existsByParentId(id)) {
            throw ApiException.conflict("CONFLICT", "Delete or move the sub-categories first");
        }
        List<UUID> affected = products.findIdsByCategory(id);
        categories.delete(category);
        affected.forEach(pid -> events.publishEvent(new ProductChanged(pid)));
    }

    // ───────────── brands ─────────────

    BrandDto createBrand(BrandUpsert request) {
        String slug = Slugs.fromOptional(request.slug(), request.name());
        if (brands.existsBySlug(slug)) {
            throw ApiException.conflict("CONFLICT", "A brand with slug '" + slug + "' already exists");
        }
        return BrandDto.of(brands.save(new Brand(slug, request.name().trim(), clock.instant())));
    }

    BrandDto updateBrand(UUID id, BrandUpsert request) {
        Brand brand = brands.findById(id).orElseThrow(() -> ApiException.notFound("Brand"));
        String slug = Slugs.fromOptional(request.slug(), request.name());
        if (brands.existsBySlugAndIdNot(slug, id)) {
            throw ApiException.conflict("CONFLICT", "A brand with slug '" + slug + "' already exists");
        }
        brand.rename(slug, request.name().trim());
        products.findIdsByBrand(id).forEach(pid -> events.publishEvent(new ProductChanged(pid)));
        return BrandDto.of(brand);
    }

    void deleteBrand(UUID id) {
        Brand brand = brands.findById(id).orElseThrow(() -> ApiException.notFound("Brand"));
        if (products.existsByBrandId(id)) {
            throw ApiException.conflict("CONFLICT", "Products still use this brand");
        }
        brands.delete(brand);
    }

    // ───────────── helpers ─────────────

    private Product product(UUID id) {
        return products.findById(id).orElseThrow(() -> ApiException.notFound("Product"));
    }

    private Brand brand(UUID id) {
        return brands.findById(id).orElseThrow(() -> ApiException.badRequest("VALIDATION_FAILED", "Unknown brand"));
    }

    private Set<Category> categoriesById(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return Set.of();
        }
        Set<UUID> wanted = new HashSet<>(ids);
        List<Category> found = categories.findAllById(wanted);
        if (found.size() != wanted.size()) {
            throw ApiException.badRequest("VALIDATION_FAILED", "Unknown category");
        }
        return new HashSet<>(found);
    }

    private void requireNoCycle(UUID categoryId, UUID newParentId) {
        UUID current = newParentId;
        int guard = 0;
        while (current != null && guard++ < 100) {
            if (current.equals(categoryId)) {
                throw ApiException.badRequest("VALIDATION_FAILED", "A category cannot be its own ancestor");
            }
            current = categories.findById(current).map(Category::getParentId).orElse(null);
        }
    }

    private static ProductVariant variantOf(Product product, UUID variantId) {
        return product.getVariants().stream().filter(v -> v.getId().equals(variantId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Variant"));
    }

    private void changed(Product product) {
        events.publishEvent(new ProductChanged(product.getId()));
    }

    private static CategoryNode node(Category c) {
        return new CategoryNode(c.getId(), c.getSlug(), c.getName(), c.getParentId(), List.of());
    }

    private static String description(ProductUpsert request) {
        return request.description() == null ? "" : request.description().trim();
    }

    private static String normalizeSku(String sku) {
        return sku.trim().toUpperCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
