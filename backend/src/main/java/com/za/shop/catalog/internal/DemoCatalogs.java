package com.za.shop.catalog.internal;

import java.util.List;
import java.util.Map;

/**
 * Demo catalogs for the five storefront designs (see docs/demo-catalogs.md). Brands are fictional.
 * Variants use the generic {@code size} and {@code color} fields; each design labels them for its shop.
 */
final class DemoCatalogs {

    record Category(String name, String slug, String parentSlug) {
    }

    /**
     * @param image          number of the image in {@code seed/<catalog>/NN.jpg}
     * @param sizes          values of the {@code size} option (empty: no size)
     * @param colors         values of the {@code color} option (empty: no colour)
     * @param compareAtCents "was" price for items on sale, or null
     */
    record Product(int image, String name, String brand, String category, List<String> sizes, List<String> colors,
            long priceCents, Long compareAtCents, String description) {
    }

    /**
     * @param stockRange stock per variant is drawn from 0..stockRange (with some variants sold out)
     */
    record Catalog(String id, List<String> brands, List<Category> categories, List<Product> products, int stockRange) {
    }

    private static final List<String> NONE = List.of();

    private DemoCatalogs() {
    }

    static Catalog get(String id) {
        Catalog catalog = ALL.get(id);
        if (catalog == null) {
            throw new IllegalArgumentException("Unknown demo catalog '" + id + "'; use one of " + ALL.keySet());
        }
        return catalog;
    }

    // ───────────────────────────── footwear ─────────────────────────────
    private static final List<String> WOMEN = List.of("36", "37", "38", "39", "40", "41");
    private static final List<String> MEN = List.of("40", "41", "42", "43", "44", "45", "46");
    private static final List<String> UNISEX = List.of("38", "39", "40", "41", "42", "43", "44", "45");

    private static final Catalog FOOTWEAR = new Catalog("footwear",
            List.of("Kestrel Outdoor", "Velora", "Urban Sole", "Strider", "Northwind"),
            List.of(new Category("Sneakers", "sneakers", null), new Category("Low-tops", "low-tops", "sneakers"),
                    new Category("High-tops", "high-tops", "sneakers"), new Category("Running", "running", null),
                    new Category("Road running", "road-running", "running"),
                    new Category("Trail running", "trail-running", "running"), new Category("Boots", "boots", null),
                    new Category("Heels", "heels", null), new Category("Sandals", "sandals", null),
                    new Category("Casual", "casual", null)),
            List.of(
                    new Product(1, "Frost Trail Winter Boot", "Kestrel Outdoor", "boots", WOMEN, List.of("Sky Blue"),
                            12990, 15990L, "Water-resistant nubuck with a warm shearling collar and a grippy lug sole for icy streets."),
                    new Product(2, "Milano Perforated Pump", "Velora", "heels", WOMEN, List.of("Nude"), 8990, null,
                            "A timeless almond-toe pump in perforated suede with a cushioned insole for all-day wear."),
                    new Product(3, "Everyday Canvas Low", "Urban Sole", "low-tops", UNISEX, List.of("Grey"), 5490, null,
                            "The clean canvas sneaker that goes with everything. Vulcanised sole, cotton laces."),
                    new Product(4, "Stride 9 Road Runner", "Strider", "road-running", MEN, List.of("Royal Blue"), 13990,
                            16990L, "Responsive foam and a breathable engineered mesh upper for daily training miles."),
                    new Product(5, "Scarlet Suede Stiletto", "Velora", "heels", WOMEN, List.of("Red"), 11990, null,
                            "Statement red suede on a slim 10 cm heel. Leather lining, padded footbed."),
                    new Product(6, "Volt Cloud Runner", "Strider", "road-running", UNISEX, List.of("Black/Volt"), 14990,
                            null, "Cloud-like cushioning pods soften every landing; the neon details keep you seen."),
                    new Product(7, "Hudson Suede Derby", "Northwind", "casual", MEN, List.of("Tobacco"), 9990, 12990L,
                            "A relaxed suede derby with a flexible rubber sole — smart enough for the office."),
                    new Product(8, "Olive Suede Moc", "Northwind", "casual", MEN, List.of("Olive"), 8490, null,
                            "Hand-stitched moccasin construction in soft olive suede. Breaks in beautifully."),
                    new Product(9, "Ridgeback Trail Hiker", "Kestrel Outdoor", "trail-running", MEN,
                            List.of("Olive/Brown"), 12490, null,
                            "Rugged trail shoe with toe protection, rock plate and a sticky outsole."),
                    new Product(10, "Azure Strap Sandal", "Velora", "sandals", WOMEN, List.of("Blue"), 7990, 9990L,
                            "Criss-cross straps on a textured stiletto — made for summer evenings."),
                    new Product(11, "Court Classic High", "Urban Sole", "high-tops", UNISEX, List.of("Red/Black"), 15990,
                            null, "An icon of the court: premium leather high-top with a padded collar."),
                    new Product(12, "Shadow Knit Runner", "Strider", "road-running", UNISEX, List.of("Black"), 11990, null,
                            "Seamless knit upper and a rocker sole for smooth, efficient strides."),
                    new Product(13, "Bumblebee Retro High", "Urban Sole", "high-tops", UNISEX, List.of("Yellow/Black"),
                            10990, 13990L, "Retro basketball silhouette with bold colour blocking and a vintage midsole."),
                    new Product(14, "Aurora Flyknit Racer", "Strider", "road-running", UNISEX, List.of("Pink/Purple"),
                            16990, null, "Featherlight racing flat with a sock-like fit. Built for race day."),
                    new Product(15, "Gilded Uptempo", "Urban Sole", "high-tops", MEN, List.of("Wheat Gold"), 17990, null,
                            "Big, bold and cushioned — a 90s basketball legend reimagined in wheat gold."),
                    new Product(16, "Emerald Skate Low", "Urban Sole", "low-tops", UNISEX, List.of("Emerald"), 6490, null,
                            "Durable suede and canvas skate shoe with a waffle outsole for board feel.")),
            12);

    // ───────────────────────────── electronics ─────────────────────────────
    private static final Catalog ELECTRONICS = new Catalog("electronics",
            List.of("Voltix", "Nordbyte", "Lumen Audio", "Orbit"),
            List.of(new Category("Phones", "phones", null), new Category("Computers", "computers", null),
                    new Category("Laptops", "laptops", "computers"), new Category("Tablets", "tablets", "computers"),
                    new Category("Audio", "audio", null), new Category("Headphones", "headphones", "audio"),
                    new Category("Speakers", "speakers", "audio"), new Category("Wearables", "wearables", null),
                    new Category("Smart home", "smart-home", null), new Category("Accessories", "accessories", null)),
            List.of(
                    new Product(1, "Voltix One smartphone", "Voltix", "phones", List.of("128 GB", "256 GB", "512 GB"),
                            List.of("Midnight", "Glacier"), 69900, 79900L,
                            "A 6.4\" 120 Hz OLED display, all-day battery and a triple camera that shines at night."),
                    new Product(2, "Voltix One Mini", "Voltix", "phones", List.of("128 GB", "256 GB"),
                            List.of("Coral", "Midnight"), 54900, null,
                            "All the power of the One in a pocketable 5.8\" body. Fast charging, IP68."),
                    new Product(3, "Nordbyte Air 14 laptop", "Nordbyte", "laptops", List.of("256 GB", "512 GB", "1 TB"),
                            List.of("Silver", "Space Grey"), 119900, null,
                            "1.2 kg aluminium unibody, 18-hour battery and a silent fanless design."),
                    new Product(4, "Nordbyte Pro 16 laptop", "Nordbyte", "laptops", List.of("512 GB", "1 TB"),
                            List.of("Space Grey"), 189900, 209900L,
                            "A 16\" mini-LED display and workstation-class performance for creators."),
                    new Product(5, "Nordbyte Tab 11", "Nordbyte", "tablets", List.of("64 GB", "128 GB"),
                            List.of("Silver"), 44900, null,
                            "An 11\" laminated display with pen support — notes, sketches and films anywhere."),
                    new Product(6, "Lumen Studio headphones", "Lumen Audio", "headphones", NONE,
                            List.of("Black", "Sand"), 29900, null,
                            "Adaptive noise cancelling, 40-hour battery and plush memory-foam cushions."),
                    new Product(7, "Lumen Buds Pro", "Lumen Audio", "headphones", NONE, List.of("White", "Black"), 17900,
                            19900L, "Tiny earbuds with big sound, transparency mode and a wireless charging case."),
                    new Product(8, "Lumen Boom speaker", "Lumen Audio", "speakers", NONE, List.of("Teal", "Black", "Red"),
                            9900, null, "Waterproof, floats, and fills a garden party with 360° sound for 20 hours."),
                    new Product(9, "Orbit Watch S", "Orbit", "wearables", NONE, List.of("Graphite", "Silver"), 34900, null,
                            "Always-on display, ECG, GPS and a week of battery in a slim titanium case."),
                    new Product(10, "Orbit Band fitness tracker", "Orbit", "wearables", NONE, List.of("Black", "Lilac"),
                            7900, null, "Tracks sleep, steps and heart rate; 14-day battery and swim-proof."),
                    new Product(11, "Orbit Home Hub", "Orbit", "smart-home", NONE, List.of("Chalk", "Charcoal"), 12900,
                            null, "A smart display for your kitchen: recipes, calls, music and home controls."),
                    new Product(12, "Voltix PowerCube 30W charger", "Voltix", "accessories", NONE, List.of("White"), 2900,
                            null, "Fast-charges phones, tablets and earbuds from one compact GaN cube.")),
            25);

    // ───────────────────────────── grocery ─────────────────────────────
    private static final Catalog GROCERY = new Catalog("grocery",
            List.of("Green Basket", "Mill & Co", "Alpine Dairy", "Bean Theory"),
            List.of(new Category("Fruit & veg", "fruit-veg", null), new Category("Fruit", "fruit", "fruit-veg"),
                    new Category("Vegetables", "vegetables", "fruit-veg"), new Category("Bakery", "bakery", null),
                    new Category("Dairy & eggs", "dairy-eggs", null), new Category("Pantry", "pantry", null),
                    new Category("Drinks", "drinks", null), new Category("Coffee & tea", "coffee-tea", "drinks"),
                    new Category("Soft drinks", "soft-drinks", "drinks")),
            List.of(
                    new Product(1, "Organic Pink Lady apples", "Green Basket", "fruit", List.of("1 kg", "2 kg"), NONE, 349,
                            null, "Crisp, sweet-tart apples from organic orchards. Perfect for lunchboxes."),
                    new Product(2, "Ripe avocados", "Green Basket", "fruit", List.of("2 pack", "4 pack"), NONE, 299, null,
                            "Ready to eat today — creamy Hass avocados for toast, salads and guacamole."),
                    new Product(3, "Vine cherry tomatoes", "Green Basket", "vegetables", List.of("250 g", "500 g"), NONE,
                            229, null, "Sweet little tomatoes ripened on the vine for maximum flavour."),
                    new Product(4, "Sourdough loaf", "Mill & Co", "bakery", List.of("800 g"), NONE, 450, null,
                            "Slow-fermented for 24 hours, with a crackling crust and an open, tangy crumb."),
                    new Product(5, "Butter croissants", "Mill & Co", "bakery", List.of("4 pack", "8 pack"), NONE, 320, 390L,
                            "Flaky, golden and made with French butter. Warm for five minutes for best results."),
                    new Product(6, "Whole milk 3.8%", "Alpine Dairy", "dairy-eggs", List.of("1 l"), NONE, 129, null,
                            "Fresh pasture milk from alpine farms, gently pasteurised."),
                    new Product(7, "Free-range eggs", "Alpine Dairy", "dairy-eggs", List.of("6 pack", "10 pack"), NONE, 279,
                            null, "Large eggs from hens with daily access to open meadows."),
                    new Product(8, "Aged Gouda", "Alpine Dairy", "dairy-eggs", List.of("200 g", "400 g"), NONE, 399, null,
                            "Matured for 12 months for a nutty, caramel flavour with crunchy crystals."),
                    new Product(9, "Wildflower honey", "Green Basket", "pantry", List.of("250 g", "500 g"), NONE, 549, 649L,
                            "Raw, unfiltered honey from meadow wildflowers. Spread it, stir it, drizzle it."),
                    new Product(10, "Extra virgin olive oil", "Green Basket", "pantry", List.of("500 ml", "1 l"), NONE, 899,
                            null, "Cold-pressed Arbequina olives with a fresh, peppery finish."),
                    new Product(11, "Single-origin coffee beans", "Bean Theory", "coffee-tea", List.of("250 g", "1 kg"),
                            List.of("Espresso", "Filter"), 990, null,
                            "Roasted weekly from Ethiopian Yirgacheffe beans: notes of jasmine and stone fruit."),
                    new Product(12, "Sparkling lemonade", "Bean Theory", "soft-drinks", List.of("6 × 330 ml"),
                            List.of("Lemon", "Blood orange"), 499, 599L,
                            "Real fruit juice, a little cane sugar and lots of bubbles.")),
            80);

    // ───────────────────────────── home ─────────────────────────────
    private static final Catalog HOME = new Catalog("home",
            List.of("Oak & Ash", "Hearth Studio", "Lumière", "Nido"),
            List.of(new Category("Living room", "living-room", null), new Category("Sofas", "sofas", "living-room"),
                    new Category("Armchairs", "armchairs", "living-room"), new Category("Dining", "dining", null),
                    new Category("Lighting", "lighting", null), new Category("Bedroom", "bedroom", null),
                    new Category("Decor", "decor", null)),
            List.of(
                    new Product(1, "Fjord 3-seater sofa", "Hearth Studio", "sofas", NONE,
                            List.of("Oat Linen", "Forest Velvet"), 129000, 149000L,
                            "Deep seats, feather-wrapped cushions and removable covers on a solid beech frame."),
                    new Product(2, "Lounge armchair", "Hearth Studio", "armchairs", NONE,
                            List.of("Cognac Leather", "Oat Linen"), 59000, null,
                            "A low, generous reading chair with a gently curved back and oak legs."),
                    new Product(3, "Solid oak dining table", "Oak & Ash", "dining", List.of("160 cm", "200 cm"),
                            List.of("Natural Oak", "Smoked Oak"), 89000, null,
                            "Made from FSC-certified oak with a hard-wax finish that ages beautifully."),
                    new Product(4, "Bentwood dining chair", "Oak & Ash", "dining", NONE, List.of("Natural Oak", "Black"),
                            14900, null, "A café classic: steam-bent wood, light enough to carry with one hand."),
                    new Product(5, "Arc floor lamp", "Lumière", "lighting", NONE, List.of("Brass", "Black"), 24900, null,
                            "A sweeping arc that brings soft light over the sofa without a ceiling fixture."),
                    new Product(6, "Globe pendant light", "Lumière", "lighting", List.of("30 cm", "45 cm"),
                            List.of("Opal"), 12900, null, "Hand-blown opal glass for a warm, glare-free glow."),
                    new Product(7, "Linen bedding set", "Nido", "bedroom", List.of("Single", "Double", "King"),
                            List.of("Clay", "White"), 11900, null,
                            "Stonewashed European linen that gets softer with every wash."),
                    new Product(8, "Walnut bedside table", "Oak & Ash", "bedroom", NONE, List.of("Walnut"), 22900, null,
                            "One soft-close drawer and an open shelf, in solid American walnut."),
                    new Product(9, "Wool area rug", "Nido", "decor", List.of("160 × 230 cm", "200 × 300 cm"),
                            List.of("Ivory"), 34900, null, "Hand-tufted New Zealand wool with a subtle textured weave."),
                    new Product(10, "Ceramic vase set", "Nido", "decor", NONE, List.of("Sand", "Sage"), 4900, 5900L,
                            "Three matte stoneware vases that look good with or without flowers."),
                    new Product(11, "Woven storage basket", "Nido", "decor", List.of("Small", "Large"), List.of("Natural"),
                            3500, null, "Handwoven seagrass with sturdy handles for blankets, toys or plants."),
                    new Product(12, "Terracotta planter", "Nido", "decor", List.of("20 cm", "30 cm"),
                            List.of("Terracotta"), 2900, null, "Breathable unglazed clay with a drainage hole and saucer.")),
            8);

    // ───────────────────────────── beauty ─────────────────────────────
    private static final Catalog BEAUTY = new Catalog("beauty",
            List.of("Lumi Skin", "Velvet & Rose", "Botanica", "Aurel"),
            List.of(new Category("Skincare", "skincare", null), new Category("Cleansers", "cleansers", "skincare"),
                    new Category("Serums", "serums", "skincare"), new Category("Moisturisers", "moisturisers", "skincare"),
                    new Category("Makeup", "makeup", null), new Category("Lips", "lips", "makeup"),
                    new Category("Face", "face", "makeup"), new Category("Fragrance", "fragrance", null),
                    new Category("Body", "body", null)),
            List.of(
                    new Product(1, "Hydra Glow serum", "Lumi Skin", "serums", List.of("30 ml", "50 ml"), NONE, 3400, null,
                            "Hyaluronic acid and niacinamide for plump, dewy skin. Fragrance-free."),
                    new Product(2, "Gentle foam cleanser", "Lumi Skin", "cleansers", List.of("150 ml"), NONE, 1800, null,
                            "A soft, pH-balanced foam that removes sunscreen and makeup without tightness."),
                    new Product(3, "Barrier repair cream", "Lumi Skin", "moisturisers", List.of("50 ml"), NONE, 2900,
                            3600L, "Ceramides and squalane restore dry, stressed skin overnight."),
                    new Product(4, "Vitamin C brightening drops", "Botanica", "serums", List.of("15 ml", "30 ml"), NONE,
                            2700, null, "Stable 15% vitamin C for a brighter, more even tone in four weeks."),
                    new Product(5, "Velvet matte lipstick", "Velvet & Rose", "lips", NONE,
                            List.of("Rose Nude", "Classic Red", "Berry", "Mauve"), 1900, null,
                            "Rich colour with a soft-blur matte finish that never feels dry."),
                    new Product(6, "Silk lip gloss", "Velvet & Rose", "lips", NONE, List.of("Clear", "Peach", "Plum"),
                            1500, null, "A cushiony, non-sticky gloss with a glassy shine."),
                    new Product(7, "Skin tint SPF 30", "Velvet & Rose", "face", NONE,
                            List.of("Porcelain", "Sand", "Honey", "Espresso"), 3200, null,
                            "Sheer, breathable coverage with broad-spectrum sun protection."),
                    new Product(8, "Cream blush stick", "Velvet & Rose", "face", NONE, List.of("Peony", "Apricot"), 2200,
                            2600L, "Blends with fingertips for a natural flush on cheeks and lips."),
                    new Product(9, "Fleur eau de parfum", "Aurel", "fragrance", List.of("50 ml", "100 ml"), NONE, 7900,
                            null, "Peony, pear and white musk — bright, floral and quietly addictive."),
                    new Product(10, "Santal eau de toilette", "Aurel", "fragrance", List.of("50 ml", "100 ml"), NONE, 6500,
                            null, "Creamy sandalwood, cardamom and fig leaf for a warm, woody trail."),
                    new Product(11, "Botanical body oil", "Botanica", "body", List.of("100 ml"), NONE, 2400, null,
                            "Fast-absorbing blend of jojoba, rosehip and calendula."),
                    new Product(12, "Shea hand cream", "Botanica", "body", List.of("75 ml"), NONE, 1200, null,
                            "20% shea butter for hands that work hard. Non-greasy.")),
            30);

    static final Map<String, Catalog> ALL = Map.of("footwear", FOOTWEAR, "electronics", ELECTRONICS, "grocery",
            GROCERY, "home", HOME, "beauty", BEAUTY);
}
