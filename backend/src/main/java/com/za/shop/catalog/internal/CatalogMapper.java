package com.za.shop.catalog.internal;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.za.shop.catalog.internal.CatalogDtos.AdminProductDto;
import com.za.shop.catalog.internal.CatalogDtos.AdminProductSummaryDto;
import com.za.shop.catalog.internal.CatalogDtos.AdminVariantDto;
import com.za.shop.catalog.internal.CatalogDtos.BrandDto;
import com.za.shop.catalog.internal.CatalogDtos.CategoryRef;
import com.za.shop.catalog.internal.CatalogDtos.ImageDto;
import com.za.shop.catalog.internal.CatalogDtos.ProductDetailDto;
import com.za.shop.catalog.internal.CatalogDtos.VariantDto;
import com.za.shop.inventory.InventoryService;
import com.za.shop.inventory.StockLevel;
import com.za.shop.shared.Money;
import com.za.shop.shared.OptionOrder;
import com.za.shop.shared.ShopProperties;

@Component
class CatalogMapper {

    private final InventoryService inventory;
    private final ShopProperties shop;
    private final Clock clock;

    CatalogMapper(InventoryService inventory, ShopProperties shop, Clock clock) {
        this.inventory = inventory;
        this.shop = shop;
        this.clock = clock;
    }

    ProductDetailDto detail(Product product) {
        Map<UUID, StockLevel> stock = stockOf(product);
        Optional<Deal> running = product.runningDeal(clock.instant());
        List<VariantDto> variants = product.getVariants().stream().map(v -> {
            int available = stock.get(v.getId()).available();
            Pricing.Effective price = Pricing.of(v, running);
            return new VariantDto(v.getId(), v.getSku(), v.getSize(), v.getColor(), money(price.priceCents()),
                    moneyOrNull(price.compareAtCents()), available, available > 0);
        }).toList();
        Optional<Pricing.Effective> cheapest = cheapest(product).map(v -> Pricing.of(v, running));
        return new ProductDetailDto(product.getId(), product.getSlug(), product.getName(), product.getDescription(),
                BrandDto.of(product.getBrand()), categories(product), images(product), sizes(product), colors(product),
                variants, cheapest.map(p -> money(p.priceCents())).orElse(null),
                cheapest.map(p -> moneyOrNull(p.compareAtCents())).orElse(null),
                variants.stream().anyMatch(VariantDto::inStock), product.getStatus(), product.getCreatedAt(),
                product.getUpdatedAt(), specs(product), running.map(CatalogDtos.DealDto::of).orElse(null));
    }

    AdminProductDto admin(Product product) {
        Map<UUID, StockLevel> stock = stockOf(product);
        List<AdminVariantDto> variants = product.getVariants().stream().map(v -> {
            StockLevel level = stock.get(v.getId());
            return new AdminVariantDto(v.getId(), v.getSku(), v.getSize(), v.getColor(), money(v.getPriceCents()),
                    moneyOrNull(v.getCompareAtPriceCents()), level.available(), level.available() > 0,
                    level.onHand(), level.reserved());
        }).toList();
        Optional<ProductVariant> cheapest = cheapest(product);
        return new AdminProductDto(product.getId(), product.getSlug(), product.getName(), product.getDescription(),
                BrandDto.of(product.getBrand()), categories(product), images(product), sizes(product), colors(product),
                variants, cheapest.map(v -> money(v.getPriceCents())).orElse(null),
                cheapest.map(v -> moneyOrNull(v.effectiveCompareAtCents())).orElse(null),
                variants.stream().anyMatch(AdminVariantDto::inStock), product.getStatus(), product.getCreatedAt(),
                product.getUpdatedAt(), specs(product), product.deal().map(CatalogDtos.DealDto::of).orElse(null));
    }

    List<AdminProductSummaryDto> adminSummaries(List<Product> products) {
        List<UUID> variantIds = products.stream().flatMap(p -> p.getVariants().stream()).map(ProductVariant::getId)
                .toList();
        Map<UUID, StockLevel> stock = inventory.levels(variantIds);
        return products.stream().map(p -> new AdminProductSummaryDto(p.getId(), p.getSlug(), p.getName(),
                BrandDto.of(p.getBrand()), p.getStatus(), cheapest(p).map(v -> money(v.getPriceCents())).orElse(null),
                p.getVariants().stream().mapToInt(v -> stock.get(v.getId()).available()).sum(),
                p.getVariants().size(), firstImageUrl(p), p.getUpdatedAt())).toList();
    }

    static Optional<ProductVariant> cheapest(Product product) {
        return product.getVariants().stream().min(Comparator.comparingLong(ProductVariant::getPriceCents));
    }

    static String firstImageUrl(Product product) {
        return product.getImages().isEmpty() ? null : product.getImages().getFirst().getUrl();
    }

    static List<String> sizes(Product product) {
        return OptionOrder.arrange(product.getVariants().stream().map(ProductVariant::getSize)
                .filter(Objects::nonNull).distinct().toList());
    }

    static List<String> colors(Product product) {
        return new ArrayList<>(product.getVariants().stream().map(ProductVariant::getColor).filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new)));
    }

    private Map<UUID, StockLevel> stockOf(Product product) {
        return inventory.levels(product.getVariants().stream().map(ProductVariant::getId).toList());
    }

    private static List<CategoryRef> categories(Product product) {
        return product.getCategories().stream().sorted(Comparator.comparing(Category::getName)).map(CategoryRef::of)
                .toList();
    }

    private static List<CatalogDtos.SpecDto> specs(Product product) {
        return product.getSpecs().stream().map(CatalogDtos.SpecDto::of).toList();
    }

    private static List<ImageDto> images(Product product) {
        return product.getImages().stream().map(ImageDto::of).toList();
    }

    private Money money(long cents) {
        return Money.of(cents, shop.currency());
    }

    private Money moneyOrNull(Long cents) {
        return cents == null ? null : money(cents);
    }

}
