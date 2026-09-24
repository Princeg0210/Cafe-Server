export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  details?: string;
  tags?: string[];
  prepTime?: string;
  badge?: string;
  image_url?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  subtitle?: string;
  items: MenuItem[];
}

export const ITEM_MEDIA_MAP: Record<string, { image_url: string; badge: string }> = {
  s1: { image_url: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=400&q=80", badge: "FRESHLY BAKED" },
  s2: { image_url: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=400&q=80", badge: "HANDCRAFTED" },
  p1: { image_url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80", badge: "OVEN BAKED" },
  pz1: { image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80", badge: "DAIRY-FREE" },
  pz2: { image_url: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=400&q=80", badge: "NEAPOLITAN CLASSIC" },
  pz3: { image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80", badge: "MEDITERRANEAN" },
  pz4: { image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80", badge: "VEGETARIAN" },
  pz5: { image_url: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=400&q=80", badge: "SEASONAL" },
  pz6: { image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80", badge: "CHEF CHOICE" },
  pz7: { image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80", badge: "SOPIA BASE" },
  pz8: { image_url: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=400&q=80", badge: "ITALA BASE" },
  pz9: { image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80", badge: "LOCAL SPECIAL" },
  c1: { image_url: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=400&q=80", badge: "HOUSE MADE" },
  c2: { image_url: "https://images.unsplash.com/photo-1560008511-11c63416e52d?auto=format&fit=crop&w=400&q=80", badge: "CITRUS GLAZE" },
  b1: { image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80", badge: "CHILLED" },
  b2: { image_url: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=400&q=80", badge: "DIGESTIVE" },
  b3: { image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&q=80", badge: "COLD BREWED" },
  b4: { image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80", badge: "PROBIOTIC" },
  b5: { image_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80", badge: "NATURAL SPRING" },
  h1: { image_url: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=400&q=80", badge: "100% ARABICA" },
  h2: { image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80", badge: "MOUNTAIN HERBS" },
  h3: { image_url: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=400&q=80", badge: "ANTIOXIDANT" },
  h4: { image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80", badge: "IMMUNITY TONIC" },
};

export const menuData: MenuCategory[] = [
  {
    id: 'starters',
    name: 'STARTERS & SMALL PLATES',
    subtitle: 'Freshly Baked Breads & Artisanal Starters',
    items: [
      { 
        id: 's1', 
        name: 'ROSEMARY & GARLIC FOCACCIA', 
        description: 'House-baked rosemary focaccia with sea salt & roasted garlic oil dip', 
        price: 300,
        details: 'House-made rosemary & sea salt focaccia served warm with creamy roasted garlic olive oil dip.',
        tags: ['Freshly Baked', '48h Fermentation'],
        badge: 'FRESHLY BAKED',
        image_url: ITEM_MEDIA_MAP.s1.image_url,
        prepTime: '10 mins'
      },
      { 
        id: 's2', 
        name: 'CHEESE & WILD MUSHROOM TARTS', 
        description: 'Artisanal cheese & wild mushroom tartlets with fresh lettuce garnish', 
        price: 400,
        details: 'Flaky artisanal pastry crusts filled with melted wild mushrooms, fontina cheese, and fresh micro-greens.',
        tags: ['Handcrafted', 'Vegetarian'],
        badge: 'HANDCRAFTED',
        image_url: ITEM_MEDIA_MAP.s2.image_url,
        prepTime: '12 mins'
      },
    ],
  },
  {
    id: 'primo',
    name: 'OVEN-BAKED PASTA',
    subtitle: 'Traditional Hand-Rolled Italian Pasta',
    items: [
      { 
        id: 'p1', 
        name: 'TOMATO & RICOTTA CANNELLONI', 
        description: 'Ricotta & mozzarella stuffed pasta rolls baked in San Marzano passata', 
        price: 500,
        details: 'Hand-rolled pasta tubes stuffed with fresh ricotta & mozzarella, slow-baked in San Marzano tomato reduction.',
        tags: ['House Special', 'Oven Baked'],
        badge: 'OVEN BAKED',
        image_url: ITEM_MEDIA_MAP.p1.image_url,
        prepTime: '18 mins'
      },
    ],
  },
  {
    id: 'pizza',
    name: 'WOOD-FIRED NEAPOLITAN PIZZAS',
    subtitle: 'Artisanal Wood-Fired Crusts • 48h Slow Fermentation • 100% Vegetarian',
    items: [
      { id: 'pz1', name: 'MARINARA CLASSICA', description: 'San Marzano tomato sauce, roasted garlic, wild oregano, extra virgin olive oil', price: 400, details: 'Classic Neapolitan base with intense roasted garlic, wild oregano & extra virgin olive oil.', tags: ['Dairy-Free', 'Tipo 00 Flour'], badge: 'DAIRY-FREE', image_url: ITEM_MEDIA_MAP.pz1.image_url, prepTime: '15 mins' },
      { id: 'pz2', name: 'MARGHERITA BUFALA', description: 'San Marzano passata, Fior di Latte mozzarella, fresh basil leaves', price: 500, details: 'Traditional wood-fired crust layered with creamy mozzarella Fior di Latte & fresh basil leaves.', tags: ['Neapolitan Classic', 'Best Seller'], badge: 'NEAPOLITAN CLASSIC', image_url: ITEM_MEDIA_MAP.pz2.image_url, prepTime: '15 mins' },
      { id: 'pz3', name: 'OLIVE & CAPERS', description: 'San Marzano tomato base, Mediterranean olives, Sicilian capers, herb oil', price: 600, details: 'Tangy brine-infused pizza topped with Mediterranean black olives, salted capers & fresh herb oil.', tags: ['Wood-Fired', 'Herbal Note'], badge: 'MEDITERRANEAN', image_url: ITEM_MEDIA_MAP.pz3.image_url, prepTime: '15 mins' },
      { id: 'pz4', name: 'ZUCCHINI & PORTABELLO', description: 'Shaved tender zucchini ribbons, earthy portobello mushrooms, garlic butter crust', price: 600, details: 'Thinly sliced tender zucchini ribbons with earthy portobello mushrooms and garlic butter.', tags: ['Vegetarian', 'Artisanal Crust'], badge: 'VEGETARIAN', image_url: ITEM_MEDIA_MAP.pz4.image_url, prepTime: '15 mins' },
      { id: 'pz5', name: 'QUATTRO STAGIONI (FOUR SEASONS)', description: 'Artichokes, portobello mushrooms, black olives, sweet bell peppers', price: 700, details: 'Four seasons represented with distinct sections of fresh garden vegetables & melted mozzarella.', tags: ['Seasonal', 'House Classic'], badge: 'SEASONAL', image_url: ITEM_MEDIA_MAP.pz5.image_url, prepTime: '15 mins' },
      { id: 'pz6', name: 'SOPHIA LOREN GOURMET', description: 'Sundried tomatoes, pine nut pesto, wild rocket, Greek feta & mozzarella', price: 800, details: 'Gourmet creation featuring fragrant basil pesto, sharp Greek feta, peppery wild rocket & sun-ripened tomatoes.', tags: ['Gourmet Special', 'Chef Choice'], badge: 'CHEF CHOICE', image_url: ITEM_MEDIA_MAP.pz6.image_url, prepTime: '15 mins' },
      { id: 'pz7', name: 'MARIA CALLAS ARTICHOKE', description: 'Velvety feta cream base, artichoke hearts, sweet cherry tomatoes, pine pesto', price: 800, details: 'Rich creamy feta emulsion topped with tender artichoke hearts & sweet blistered cherry tomatoes.', tags: ['Cream Base', 'Specialty'], badge: 'SOPIA BASE', image_url: ITEM_MEDIA_MAP.pz7.image_url, prepTime: '15 mins' },
      { id: 'pz8', name: 'ITALA BROCCOLI CREAM', description: 'Broccoli cream base, double mozzarella, salted capers, cherry tomatoes', price: 800, details: 'Unique velvety broccoli cream base, double mozzarella, tart capers & juicy sweet tomatoes.', tags: ['Trattoria Signature', 'Creamy'], badge: 'ITALA BASE', image_url: ITEM_MEDIA_MAP.pz8.image_url, prepTime: '15 mins' },
      { id: 'pz9', name: 'RESIDENCY UDAIPUR', description: 'Feta cream, crispy green tomato fritters, pine nut pesto & wild rocket', price: 700, details: 'Crispy fried green tomato slices over rich feta cream, drizzled with homemade pine nut pesto.', tags: ['Local Special', 'Crispy Fritters'], badge: 'LOCAL SPECIAL', image_url: ITEM_MEDIA_MAP.pz9.image_url, prepTime: '15 mins' },
    ],
  },
  {
    id: 'cakes',
    name: 'TRATTORIA DESSERTS',
    subtitle: 'Artisanal House Pastries & Gelato',
    items: [
      { id: 'c1', name: 'CLASSIC TIRAMISU', description: 'Espresso-soaked ladyfingers, whipped mascarpone cream & dark cocoa', price: 250, details: 'Layers of espresso-soaked ladyfingers and whipped mascarpone cream dusted with dark cocoa powder.', tags: ['House Made', 'Arabica Coffee'], badge: 'HOUSE MADE', image_url: ITEM_MEDIA_MAP.c1.image_url, prepTime: 'Ready' },
      { id: 'c2', name: 'COCONUT GELATO WITH BITTER ORANGE', description: 'Organic coconut cream gelato topped with bitter orange glaze', price: 200, details: 'House-churned organic coconut cream ice cream topped with warm bitter orange reduction glaze.', tags: ['Refreshing', 'Citrus Glaze'], badge: 'CITRUS GLAZE', image_url: ITEM_MEDIA_MAP.c2.image_url, prepTime: 'Ready' },
    ],
  },
  {
    id: 'beverages',
    name: 'COLD DRINKS & KOMBUCHA',
    subtitle: 'House Refreshers & Botanical Ferments',
    items: [
      { id: 'b1', name: 'FRESH MINT LIMONATA', description: 'Key lime juice, sparkling soda water, fresh garden mint', price: 100, details: 'Freshly squeezed Key lime juice with sparkling soda water & fresh mint leaves.', tags: ['Chilled', 'Fresh Mint'], badge: 'CHILLED', image_url: ITEM_MEDIA_MAP.b1.image_url, prepTime: '5 mins' },
      { id: 'b2', name: 'SPARKLING LEMON GINGER', description: 'House ginger reduction, fresh lemon juice, chilled soda water', price: 150, details: 'House ginger reduction brewed with fresh lemon juice and chilled soda.', tags: ['Digestive', 'House Brew'], badge: 'DIGESTIVE', image_url: ITEM_MEDIA_MAP.b2.image_url, prepTime: '5 mins' },
      { id: 'b3', name: 'PEACH & LEMON ICED TEA', description: 'Slow-brewed black tea infused with peach nectar & lemon zest', price: 150, details: 'Slow-brewed black tea infused with natural peach nectar and fresh lemon zest.', tags: ['Cold Brewed'], badge: 'COLD BREWED', image_url: ITEM_MEDIA_MAP.b3.image_url, prepTime: '5 mins' },
      { id: 'b4', name: 'ARTISANAL KOMBUCHA', description: 'Botanical ferments: Lemongrass + Mint / Kokum / Pineapple + Rosemary / Pomegranate', price: 250, details: 'Artisanal probiotic fermented tea infused with raw mountain botanical extracts.', tags: ['Probiotic', 'Artisanal'], badge: 'PROBIOTIC', image_url: ITEM_MEDIA_MAP.b4.image_url, prepTime: 'Instant' },
      { id: 'b5', name: 'HIMALAYAN NATURAL SPRING WATER', description: 'Pure high-altitude spring water bottled at origin', price: 50, details: 'Pure natural spring mineral water bottled at source in the high Himalayas.', tags: ['Natural Spring'], badge: 'NATURAL SPRING', image_url: ITEM_MEDIA_MAP.b5.image_url, prepTime: 'Instant' },
    ],
  },
  {
    id: 'hot-drinks',
    name: 'COFFEE & MOUNTAIN TISANES',
    subtitle: '100% Mountain Arabica Roasts & Himalayan Herbal Infusions',
    items: [
      { id: 'h1', name: 'DOUBLE ARABICA ESPRESSO', description: 'Double shot 100% mountain Arabica roast with rich caramel crema', price: 150, details: 'Double shot of 100% Arabica mountain bean roast with thick caramel crema.', tags: ['100% Arabica', 'Espresso Extract'], badge: '100% ARABICA', image_url: ITEM_MEDIA_MAP.h1.image_url, prepTime: '3 mins' },
      { id: 'h2', name: 'HIMALAYAN RHODODENDRON & THYME TISANE', description: 'Wild red rhododendron petals, garden mint & thyme', price: 150, details: 'Wild Himalayan red rhododendron petals blended with garden mint and soothing thyme.', tags: ['Mountain Herbs', 'Caffeine-Free'], badge: 'MOUNTAIN HERBS', image_url: ITEM_MEDIA_MAP.h2.image_url, prepTime: '5 mins' },
      { id: 'h3', name: 'ROSEHIP & SPEARMINT TISANE', description: 'Vitamin C rich rosehip husks brewed with fragrant spearmint', price: 150, details: 'Vitamin C rich rosehip husks brewed with fragrant mountain spear mint.', tags: ['Antioxidant Rich', 'Organic'], badge: 'ANTIOXIDANT', image_url: ITEM_MEDIA_MAP.h3.image_url, prepTime: '5 mins' },
      { id: 'h4', name: 'HIMALAYAN MIXED HERB INFUSION', description: 'High-altitude botanical blend of tulsi, lemongrass, ginger & black pepper', price: 150, details: 'Traditional high-altitude botanical infusion of tulsi, lemongrass, ginger & black pepper.', tags: ['Traditional', 'Immunity Tonic'], badge: 'IMMUNITY TONIC', image_url: ITEM_MEDIA_MAP.h4.image_url, prepTime: '5 mins' },
    ],
  },
];
