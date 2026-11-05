package com.za.shop.catalog.internal;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.za.shop.catalog.internal.CatalogDtos.BrandUpsert;
import com.za.shop.catalog.internal.CatalogDtos.CategoryUpsert;
import com.za.shop.catalog.internal.CatalogDtos.ProductUpsert;
import com.za.shop.catalog.internal.CatalogDtos.VariantUpsert;

/**
 * Fills an empty catalog with one of the demo catalogs ({@code shop.seed.catalog}) so the shop is usable
 * right after start-up.
 */
@Component
@Order(10)
@ConditionalOnProperty(name = "shop.seed.enabled", havingValue = "true")
class DemoCatalogSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoCatalogSeeder.class);

    private final CatalogAdminService admin;
    private final ProductRepository products;
    private final TransactionTemplate tx;
    private final String catalogId;

    DemoCatalogSeeder(CatalogAdminService admin, ProductRepository products, TransactionTemplate tx,
            @Value("${shop.seed.catalog:footwear}") String catalogId) {
        this.admin = admin;
        this.products = products;
        this.tx = tx;
        this.catalogId = catalogId.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (products.count() > 0) {
            return;
        }
        DemoCatalogs.Catalog catalog = DemoCatalogs.get(catalogId);
        log.info("Seeding the '{}' demo catalog…", catalog.id());
        tx.executeWithoutResult(status -> seed(catalog));
        log.info("Seeded {} demo products", catalog.products().size());
    }

    private void seed(DemoCatalogs.Catalog catalog) {
        Map<String, UUID> brandIds = new HashMap<>();
        for (String brand : catalog.brands()) {
            brandIds.put(brand, admin.createBrand(new BrandUpsert(brand, null)).id());
        }
        Map<String, UUID> categoryIds = new HashMap<>();
        for (DemoCatalogs.Category category : catalog.categories()) {
            categoryIds.put(category.slug(), admin.createCategory(new CategoryUpsert(category.name(), category.slug(),
                    category.parentSlug() == null ? null : categoryIds.get(category.parentSlug()))).id());
        }

        Random random = new Random(42);
        for (DemoCatalogs.Product seed : catalog.products()) {
            var product = admin.create(new ProductUpsert(seed.name(), null, seed.description(),
                    brandIds.get(seed.brand()), List.of(categoryIds.get(seed.category())), ProductStatus.ACTIVE));
            String skuBase = product.slug().toUpperCase(Locale.ROOT);
            skuBase = skuBase.substring(0, Math.min(skuBase.length(), 48));
            int n = 0;
            for (String color : orNone(seed.colors())) {
                for (String size : orNone(seed.sizes())) {
                    int stock = random.nextInt(10) < 2 ? 0 : 1 + random.nextInt(catalog.stockRange());
                    admin.addVariant(product.id(), new VariantUpsert(String.format("%s-%02d", skuBase, ++n), size, color,
                            seed.priceCents(), seed.compareAtCents(), stock));
                }
            }
            byte[] image = image(catalog.id(), seed.image());
            if (image != null) {
                admin.addImage(products.findById(product.id()).orElseThrow(), image, seed.name());
            }
        }
    }

    private static List<String> orNone(List<String> values) {
        if (values.isEmpty()) {
            List<String> none = new ArrayList<>();
            none.add(null);
            return none;
        }
        return values;
    }

    private static byte[] image(String catalog, int number) {
        String path = String.format("seed/%s/%02d.jpg", catalog, number);
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            log.warn("Demo image {} is missing; the product is seeded without an image", path);
            return null;
        }
        try (InputStream in = resource.getInputStream()) {
            return in.readAllBytes();
        }
        catch (IOException e) {
            throw new IllegalStateException("Could not read demo image " + path, e);
        }
    }
}
