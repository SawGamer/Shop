# Demo catalogs

On first start the backend seeds one demo catalog into an empty database, chosen with
`SHOP_DEMO_CATALOG` (`footwear` by default). The shop's initial design matches the catalog; admins can
switch the design at any time under **Admin → Design**.

```bash
docker compose down -v                      # start from an empty database
SHOP_DEMO_CATALOG=electronics docker compose up --build
```

Variants have two generic option fields, `size` and `color`. Each design labels them for its kind of shop:

| Catalog / design | `size` is shown as | `color` is shown as |
|---|---|---|
| `footwear` | Size (EU) | Colour |
| `electronics` | Capacity | Colour |
| `grocery` | Pack size | Variety |
| `home` | Size | Finish |
| `beauty` | Size | Shade |
| `sports` | Size | Colour |
| `books` | Format | Language |
| `gourmet` | Portion | Flavour |

Products can have a different price per `size` value (e.g. book formats, box sizes); this is noted in the tables
as "price by size".

Images live in `backend/src/main/resources/seed/<catalog>/NN.jpg` (NN = the product number below). They are
original illustrations made for this project, except `footwear`, which reuses the photos of the original shop.

## electronics

Brands: Voltix, Nordbyte, Lumen Audio, Orbit.
Categories: Phones; Computers › Laptops, Tablets; Audio › Headphones, Speakers; Wearables; Smart home; Accessories.

| # | Product | Brand | Category | Capacity | Colours | Price € | Was € |
|---|---|---|---|---|---|---|---|
| 01 | Voltix One smartphone | Voltix | Phones | 128 GB, 256 GB, 512 GB | Midnight, Glacier | 699 | 799 |
| 02 | Voltix One Mini | Voltix | Phones | 128 GB, 256 GB | Coral, Midnight | 549 | |
| 03 | Nordbyte Air 14 laptop | Nordbyte | Laptops | 256 GB, 512 GB, 1 TB | Silver, Space Grey | 1199 | |
| 04 | Nordbyte Pro 16 laptop | Nordbyte | Laptops | 512 GB, 1 TB | Space Grey | 1899 | 2099 |
| 05 | Nordbyte Tab 11 | Nordbyte | Tablets | 64 GB, 128 GB | Silver | 449 | |
| 06 | Lumen Studio headphones | Lumen Audio | Headphones | – | Black, Sand | 299 | |
| 07 | Lumen Buds Pro | Lumen Audio | Headphones | – | White, Black | 179 | 199 |
| 08 | Lumen Boom speaker | Lumen Audio | Speakers | – | Teal, Black, Red | 99 | |
| 09 | Orbit Watch S | Orbit | Wearables | – | Graphite, Silver | 349 | |
| 10 | Orbit Band fitness tracker | Orbit | Wearables | – | Black, Lilac | 79 | |
| 11 | Orbit Home Hub | Orbit | Smart home | – | Chalk, Charcoal | 129 | |
| 12 | Voltix PowerCube 30W charger | Voltix | Accessories | – | White | 29 | |

## grocery

Brands: Green Basket, Mill & Co, Alpine Dairy, Bean Theory.
Categories: Fruit & veg › Fruit, Vegetables; Bakery; Dairy & eggs; Pantry; Drinks › Coffee & tea, Soft drinks.

| # | Product | Brand | Category | Pack size | Variety | Price € | Was € |
|---|---|---|---|---|---|---|---|
| 01 | Organic Pink Lady apples | Green Basket | Fruit | 1 kg, 2 kg | – | 3.49 | |
| 02 | Ripe avocados | Green Basket | Fruit | 2 pack, 4 pack | – | 2.99 | |
| 03 | Vine cherry tomatoes | Green Basket | Vegetables | 250 g, 500 g | – | 2.29 | |
| 04 | Sourdough loaf | Mill & Co | Bakery | 800 g | – | 4.50 | |
| 05 | Butter croissants | Mill & Co | Bakery | 4 pack, 8 pack | – | 3.20 | 3.90 |
| 06 | Whole milk 3.8% | Alpine Dairy | Dairy & eggs | 1 l | – | 1.29 | |
| 07 | Free-range eggs | Alpine Dairy | Dairy & eggs | 6 pack, 10 pack | – | 2.79 | |
| 08 | Aged Gouda | Alpine Dairy | Dairy & eggs | 200 g, 400 g | – | 3.99 | |
| 09 | Wildflower honey | Green Basket | Pantry | 250 g, 500 g | – | 5.49 | 6.49 |
| 10 | Extra virgin olive oil | Green Basket | Pantry | 500 ml, 1 l | – | 8.99 | |
| 11 | Single-origin coffee beans | Bean Theory | Coffee & tea | 250 g, 1 kg | Espresso, Filter | 9.90 | |
| 12 | Sparkling lemonade | Bean Theory | Soft drinks | 6 × 330 ml | Lemon, Blood orange | 4.99 | 5.99 |

## home

Brands: Oak & Ash, Hearth Studio, Lumière, Nido.
Categories: Living room › Sofas, Armchairs; Dining; Lighting; Bedroom; Decor.

| # | Product | Brand | Category | Size | Finish | Price € | Was € |
|---|---|---|---|---|---|---|---|
| 01 | Fjord 3-seater sofa | Hearth Studio | Sofas | – | Oat Linen, Forest Velvet | 1290 | 1490 |
| 02 | Lounge armchair | Hearth Studio | Armchairs | – | Cognac Leather, Oat Linen | 590 | |
| 03 | Solid oak dining table | Oak & Ash | Dining | 160 cm, 200 cm | Natural Oak, Smoked Oak | 890 | |
| 04 | Bentwood dining chair | Oak & Ash | Dining | – | Natural Oak, Black | 149 | |
| 05 | Arc floor lamp | Lumière | Lighting | – | Brass, Black | 249 | |
| 06 | Globe pendant light | Lumière | Lighting | 30 cm, 45 cm | Opal | 129 | |
| 07 | Linen bedding set | Nido | Bedroom | Single, Double, King | Clay, White | 119 | |
| 08 | Walnut bedside table | Oak & Ash | Bedroom | – | Walnut | 229 | |
| 09 | Wool area rug | Nido | Decor | 160 × 230 cm, 200 × 300 cm | Ivory | 349 | |
| 10 | Ceramic vase set | Nido | Decor | – | Sand, Sage | 49 | 59 |
| 11 | Woven storage basket | Nido | Decor | Small, Large | Natural | 35 | |
| 12 | Terracotta planter | Nido | Decor | 20 cm, 30 cm | Terracotta | 29 | |

## beauty

Brands: Lumi Skin, Velvet & Rose, Botanica, Aurel.
Categories: Skincare › Cleansers, Serums, Moisturisers; Makeup › Lips, Face; Fragrance; Body.

| # | Product | Brand | Category | Size | Shade | Price € | Was € |
|---|---|---|---|---|---|---|---|
| 01 | Hydra Glow serum | Lumi Skin | Serums | 30 ml, 50 ml | – | 34 | |
| 02 | Gentle foam cleanser | Lumi Skin | Cleansers | 150 ml | – | 18 | |
| 03 | Barrier repair cream | Lumi Skin | Moisturisers | 50 ml | – | 29 | 36 |
| 04 | Vitamin C brightening drops | Botanica | Serums | 15 ml, 30 ml | – | 27 | |
| 05 | Velvet matte lipstick | Velvet & Rose | Lips | – | Rose Nude, Classic Red, Berry, Mauve | 19 | |
| 06 | Silk lip gloss | Velvet & Rose | Lips | – | Clear, Peach, Plum | 15 | |
| 07 | Skin tint SPF 30 | Velvet & Rose | Face | – | Porcelain, Sand, Honey, Espresso | 32 | |
| 08 | Cream blush stick | Velvet & Rose | Face | – | Peony, Apricot | 22 | 26 |
| 09 | Fleur eau de parfum | Aurel | Fragrance | 50 ml, 100 ml | – | 79 | |
| 10 | Santal eau de toilette | Aurel | Fragrance | 50 ml, 100 ml | – | 65 | |
| 11 | Botanical body oil | Botanica | Body | 100 ml | – | 24 | |
| 12 | Shea hand cream | Botanica | Body | 75 ml | – | 12 | |

## sports

Brands: Summit & Co, Trailhead, Velocity, Alpine Gear.
Categories: Camping › Tents, Sleeping bags, Stoves; Hiking › Backpacks, Boots, Trekking poles; Running; Cycling; Fitness; Accessories.

| # | Product | Brand | Category | Size | Colours | Price € | Was € |
|---|---|---|---|---|---|---|---|
| 01 | Ridge 45 L trekking backpack | Trailhead | Backpacks | S/M, M/L | Forest, Ember | 149 | 179 |
| 02 | Dome tent | Summit & Co | Tents | 2 person, 3 person | Orange, Olive | 219 | |
| 03 | Cloud −5° sleeping bag | Summit & Co | Sleeping bags | Regular, Long | Navy, Moss | 129 | |
| 04 | Granite hiking boots | Trailhead | Boots | 40–46 | Brown, Grey | 169 | |
| 05 | Carbon trekking poles | Alpine Gear | Trekking poles | 110 cm, 125 cm | Black, Red | 79 | 99 |
| 06 | Beacon 400 headlamp | Alpine Gear | Accessories | – | Black, Orange | 39 | |
| 07 | Flow insulated bottle | Summit & Co | Accessories | 0.5 l, 1 l | Steel, Lime, Navy | 29 | |
| 08 | Gust wind running jacket | Velocity | Running | S, M, L, XL | Neon, Black | 99 | 129 |
| 09 | Tempo running shorts | Velocity | Running | S, M, L, XL | Black, Teal | 45 | |
| 10 | Apex cycling helmet | Velocity | Cycling | S, M, L | White, Matt Black, Red | 89 | |
| 11 | Core yoga mat | Velocity | Fitness | 4 mm, 6 mm | Purple, Teal | 35 | |
| 12 | Pocket camping stove | Summit & Co | Stoves | – | Silver | 49 | |

## books

Publishers (shown as brands): Northlight Press, Lantern Books, Quill & Page, Meadow House.
Categories: Fiction › Novels, Thrillers, Science fiction; Non-fiction › History, Self-help; Cookbooks; Children.
The books are fictional; the images are original cover illustrations with the fictional titles and authors below.

| # | Title (author) | Publisher | Category | Format · price by size | Language | Was € |
|---|---|---|---|---|---|---|
| 01 | The Salt Road (Mara Lindqvist) | Northlight Press | Novels | Paperback 14.99, Hardcover 22.99, E-book 9.99 | English, German | |
| 02 | Midnight at Harbour Nine (Jonas Pike) | Lantern Books | Thrillers | Paperback 13.99, E-book 8.99 | English | 15.99 (Paperback) |
| 03 | Orbit of Quiet Stars (Idris Vale) | Quill & Page | Science fiction | Paperback 15.99, Hardcover 24.99, E-book 10.99 | English | |
| 04 | Letters from the Vineyard (Elena Rossi) | Meadow House | Novels | Paperback 13.99, Hardcover 21.99 | English, German | |
| 05 | The Glass Archipelago (Tomas Reyes) | Northlight Press | Science fiction | Paperback 14.99, E-book 9.99 | English | |
| 06 | A Short History of Bridges (Hannah Brook) | Quill & Page | History | Hardcover 29.99, Paperback 18.99 | English | |
| 07 | The Roman Table (Luca Ferrante) | Meadow House | History | Hardcover 32.00, Paperback 19.99 | English | |
| 08 | How Small Habits Win (Dr. Nora Keane) | Lantern Books | Self-help | Paperback 16.99, E-book 11.99 | English, German | |
| 09 | The Slow Kitchen (Amelie Hart) | Meadow House | Cookbooks | Hardcover 34.99 | English | |
| 10 | One-Pan Weeknights (Sam Okafor) | Lantern Books | Cookbooks | Paperback 24.99, E-book 14.99 | English | |
| 11 | Pip and the Moon Door (Clara Finch) | Meadow House | Children | Hardcover 15.99, Paperback 9.99 | English, German | |
| 12 | The Secret of Fox Hollow (Ben Aldous) | Quill & Page | Children | Paperback 8.99, Hardcover 14.99 | English | |

## gourmet

For restaurants, patisseries and chocolate makers. This demo runs in **local fulfillment** mode (delivery slots and
pickup in two shops), see docs/api.md.
Brands: Maison Cacao, Sweet Orchard, Casa Fornaio, Little Kitchen.
Categories: Chocolate › Pralines, Bars & spreads; Cakes & pastries › Cakes, Pastries; Take-away › Pizza, Mains; Desserts.

| # | Product | Brand | Category | Portion · price by size | Flavours | Was € |
|---|---|---|---|---|---|---|
| 01 | Signature praline box | Maison Cacao | Pralines | Box of 9 19.00, Box of 16 32.00, Box of 25 46.00 | Assorted, Dark only | |
| 02 | Single-origin chocolate bar | Maison Cacao | Bars & spreads | 100 g 4.49 | Dark 70%, Milk 45%, Sea salt | |
| 03 | Hazelnut chocolate spread | Maison Cacao | Bars & spreads | 250 g 6.99, 400 g 9.99 | – | |
| 04 | Hot chocolate mix | Maison Cacao | Bars & spreads | 250 g 8.99 | Classic, Chilli | |
| 05 | Triple chocolate cake | Sweet Orchard | Cakes | Slice 4.50, Whole cake 34.00 | – | |
| 06 | Macaron box | Sweet Orchard | Pastries | Box of 6 12.00, Box of 12 22.00 | Mixed, Pistachio | |
| 07 | New York cheesecake | Sweet Orchard | Cakes | Slice 4.80, Whole cake 36.00 | Plain, Raspberry | |
| 08 | Cinnamon rolls | Sweet Orchard | Pastries | 4 pack 10.00, 8 pack 18.00 | – | 20.00 (8 pack) |
| 09 | Wood-fired pizza | Casa Fornaio | Pizza | Single 11.90, Family 17.90 | Margherita, Salame, Funghi | |
| 10 | Lasagne al forno | Casa Fornaio | Mains | Single 11.90, Family 24.90 | – | |
| 11 | Tiramisu cups | Little Kitchen | Desserts | 2 pack 7.90, 4 pack 14.90 | – | |
| 12 | Seasonal berry tart | Little Kitchen | Desserts | Slice 4.50, Whole tart 32.00 | – | |
