package com.za.shop.catalog.internal;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.za.shop.catalog.internal.CatalogDtos.BrandUpsert;
import com.za.shop.catalog.internal.CatalogDtos.CategoryNode;
import com.za.shop.catalog.internal.CatalogDtos.CategoryUpsert;
import com.za.shop.catalog.internal.CatalogDtos.ProductUpsert;
import com.za.shop.catalog.internal.CatalogDtos.VariantUpsert;

/** Fills an empty catalog with demo shoes (fictional brands) so the shop is usable right after start-up. */
@Component
@Order(10)
@ConditionalOnProperty(name = "shop.seed.enabled", havingValue = "true")
class DemoCatalogSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoCatalogSeeder.class);

    private record Seed(String name, String brand, List<String> categories, String color, List<String> sizes,
            long priceCents, Long compareAtCents, int image, String description) {
    }

    private static final List<String> WOMEN = List.of("36", "37", "38", "39", "40", "41");
    private static final List<String> MEN = List.of("40", "41", "42", "43", "44", "45", "46");
    private static final List<String> UNISEX = List.of("38", "39", "40", "41", "42", "43", "44", "45");

    private static final List<Seed> SEEDS = List.of(
            new Seed("Frost Trail Winter Boot", "Kestrel Outdoor", List.of("boots"), "Sky Blue", WOMEN, 12990L, 15990L,
                    1, "Water-resistant nubuck with a warm shearling collar and a grippy lug sole for icy streets."),
            new Seed("Milano Perforated Pump", "Velora", List.of("heels"), "Nude", WOMEN, 8990L, null, 2,
                    "A timeless almond-toe pump in perforated suede with a cushioned insole for all-day wear."),
            new Seed("Everyday Canvas Low", "Urban Sole", List.of("low-tops"), "Grey", UNISEX, 5490L, null, 3,
                    "The clean canvas sneaker that goes with everything. Vulcanised sole, cotton laces."),
            new Seed("Stride 9 Road Runner", "Strider", List.of("road-running"), "Royal Blue", MEN, 13990L, 16990L, 4,
                    "Responsive foam and a breathable engineered mesh upper for daily training miles."),
            new Seed("Scarlet Suede Stiletto", "Velora", List.of("heels"), "Red", WOMEN, 11990L, null, 5,
                    "Statement red suede on a slim 10 cm heel. Leather lining, padded footbed."),
            new Seed("Volt Cloud Runner", "Strider", List.of("road-running"), "Black/Volt", UNISEX, 14990L, null, 6,
                    "Cloud-like cushioning pods soften every landing; the neon details keep you seen."),
            new Seed("Hudson Suede Derby", "Northwind", List.of("casual"), "Tobacco", MEN, 9990L, 12990L, 7,
                    "A relaxed suede derby with a flexible rubber sole — smart enough for the office."),
            new Seed("Olive Suede Moc", "Northwind", List.of("casual"), "Olive", MEN, 8490L, null, 8,
                    "Hand-stitched moccasin construction in soft olive suede. Breaks in beautifully."),
            new Seed("Ridgeback Trail Hiker", "Kestrel Outdoor", List.of("trail-running"), "Olive/Brown", MEN, 12490L,
                    null, 9, "Rugged trail shoe with toe protection, rock plate and a sticky outsole."),
            new Seed("Azure Strap Sandal", "Velora", List.of("sandals"), "Blue", WOMEN, 7990L, 9990L, 10,
                    "Criss-cross straps on a textured stiletto — made for summer evenings."),
            new Seed("Court Classic High", "Urban Sole", List.of("high-tops"), "Red/Black", UNISEX, 15990L, null, 11,
                    "An icon of the court: premium leather high-top with a padded collar."),
            new Seed("Shadow Knit Runner", "Strider", List.of("road-running"), "Black", UNISEX, 11990L, null, 12,
                    "Seamless knit upper and a rocker sole for smooth, efficient strides."),
            new Seed("Bumblebee Retro High", "Urban Sole", List.of("high-tops"), "Yellow/Black", UNISEX, 10990L,
                    13990L, 13, "Retro basketball silhouette with bold colour blocking and a vintage midsole."),
            new Seed("Aurora Flyknit Racer", "Strider", List.of("road-running"), "Pink/Purple", UNISEX, 16990L, null,
                    14, "Featherlight racing flat with a sock-like fit. Built for race day."),
            new Seed("Gilded Uptempo", "Urban Sole", List.of("high-tops"), "Wheat Gold", MEN, 17990L, null, 15,
                    "Big, bold and cushioned — a 90s basketball legend reimagined in wheat gold."),
            new Seed("Emerald Skate Low", "Urban Sole", List.of("low-tops"), "Emerald", UNISEX, 6490L, null, 16,
                    "Durable suede and canvas skate shoe with a waffle outsole for board feel."));

    private final CatalogAdminService admin;
    private final ProductRepository products;
    private final TransactionTemplate tx;

    DemoCatalogSeeder(CatalogAdminService admin, ProductRepository products, TransactionTemplate tx) {
        this.admin = admin;
        this.products = products;
        this.tx = tx;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (products.count() > 0) {
            return;
        }
        log.info("Seeding demo catalog…");
        tx.executeWithoutResult(status -> seed());
        log.info("Seeded {} demo products", SEEDS.size());
    }

    private void seed() {
        Map<String, UUID> brandIds = new HashMap<>();
        for (String brand : List.of("Kestrel Outdoor", "Velora", "Urban Sole", "Strider", "Northwind")) {
            brandIds.put(brand, admin.createBrand(new BrandUpsert(brand, null)).id());
        }
        Map<String, UUID> categoryIds = new HashMap<>();
        category(categoryIds, "Sneakers", "sneakers", null);
        category(categoryIds, "Low-tops", "low-tops", "sneakers");
        category(categoryIds, "High-tops", "high-tops", "sneakers");
        category(categoryIds, "Running", "running", null);
        category(categoryIds, "Road running", "road-running", "running");
        category(categoryIds, "Trail running", "trail-running", "running");
        category(categoryIds, "Boots", "boots", null);
        category(categoryIds, "Heels", "heels", null);
        category(categoryIds, "Sandals", "sandals", null);
        category(categoryIds, "Casual", "casual", null);

        Random random = new Random(42);
        for (Seed seed : SEEDS) {
            var product = admin.create(new ProductUpsert(seed.name(), null, seed.description(),
                    brandIds.get(seed.brand()), seed.categories().stream().map(categoryIds::get).toList(),
                    ProductStatus.ACTIVE));
            String skuBase = product.slug().toUpperCase().replace("-", "").substring(0, 8);
            for (String size : seed.sizes()) {
                int stock = random.nextInt(10) < 2 ? 0 : 1 + random.nextInt(12);
                admin.addVariant(product.id(), new VariantUpsert(skuBase + "-" + size.replace(".", ""), size,
                        seed.color(), seed.priceCents(), seed.compareAtCents(), stock));
            }
            admin.addImage(products.findById(product.id()).orElseThrow(), image(seed.image()), seed.name());
        }
    }

    private void category(Map<String, UUID> ids, String name, String slug, String parentSlug) {
        CategoryNode node = admin.createCategory(new CategoryUpsert(name, slug,
                parentSlug == null ? null : ids.get(parentSlug)));
        ids.put(slug, node.id());
    }

    private static byte[] image(int number) {
        try (InputStream in = new ClassPathResource("seed/images/item-" + number + ".jpg").getInputStream()) {
            return in.readAllBytes();
        }
        catch (IOException e) {
            throw new IllegalStateException("Missing seed image " + number, e);
        }
    }
}
