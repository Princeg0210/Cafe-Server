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
  b5: { image_url: "/images/himalayan_mineral_water.jpg", badge: "NATURAL SPRING" },
  b6: { image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80", badge: "CHILLED" },
  h1: { image_url: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=400&q=80", badge: "100% ARABICA" },
  h2: { image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80", badge: "MOUNTAIN HERBS" },
  h3: { image_url: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=400&q=80", badge: "ANTIOXIDANT" },
  h4: { image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80", badge: "IMMUNITY TONIC" },
};

export const MENU_ITEM_ID_MAP: Record<string, number> = {
  s1: 1,  // FOCACCIA WITH GARLIC DIP
  s2: 2,  // CHEESE & MUSHROOM TARTS (2 PCS)
  p1: 3,  // CANNELLONI (CHEESE & TOMATO)
  pz1: 4, // MARINARA CLASSICA
  pz2: 5, // MARGHERITA BUFALA
  pz3: 6, // OLIVE & CAPERS
  pz4: 7, // ZUCCHINI & PORTABELLO
  pz5: 8, // QUATTRO STAGIONI (FOUR SEASONS)
  pz6: 9, // SOPHIA LOREN GOURMET
  pz7: 10, // MARIA CALLAS ARTICHOKE
  pz8: 11, // ITALA BROCCOLI CREAM
  pz9: 12, // RESIDENCY UDAIPUR
  c1: 13, // CLASSIC TIRAMISU
  c2: 14, // COCONUT ICE CREAM WITH BITTER ORANGE SAUCE
  b1: 15, // FRESH LIME SODA
  b2: 16, // LEMON GINGER SODA
  b6: 24, // COKE
  b5: 19, // HIMALAYAN MINERAL WATER
  b3: 17, // ICE TEA
  b4: 18, // KOMBUCHA
  h1: 20, // ESPRESSO
  h2: 21, // RHODODENDRON MINT & THYME TISANE
  h3: 22, // HIMALAYAN ROSEHIP & MINT TISANE
  h4: 23, // HIMALAYAN MIXED HERBS
};


export const menuData: MenuCategory[] = [
  {
    id: 'starters',
    name: 'STARTERS',
    subtitle: 'Freshly Baked Breads & Artisanal Starters',
    items: [
      { 
        id: 's1', 
        name: 'FOCACCIA WITH GARLIC DIP', 
        description: 'House-baked focaccia with garlic oil dip', 
        price: 300,
        details: 'House-baked focaccia served warm with creamy garlic oil dip.',
        tags: ['Freshly Baked', '48h Fermentation'],
        badge: 'FRESHLY BAKED',
        image_url: ITEM_MEDIA_MAP.s1.image_url,
        prepTime: '10 mins'
      },
      { 
        id: 's2', 
        name: 'CHEESE & MUSHROOM TARTS (2 PCS)', 
        description: 'with lettuce garnish', 
        price: 400,
        details: 'Flaky artisanal pastry crusts filled with melted cheese and wild mushrooms, served with lettuce garnish.',
        tags: ['Handcrafted', 'Vegetarian'],
        badge: 'HANDCRAFTED',
        image_url: ITEM_MEDIA_MAP.s2.image_url,
        prepTime: '12 mins'
      },
    ],
  },
  {
    id: 'primo',
    name: 'PRIMO',
    subtitle: 'Traditional Hand-Rolled Italian Pasta',
    items: [
      { 
        id: 'p1', 
        name: 'CANNELLONI (CHEESE & TOMATO)', 
        description: 'Cheese & tomato stuffed pasta rolls baked in Italian passata', 
        price: 500,
        details: 'Hand-rolled pasta tubes stuffed with fresh cheese & tomato, slow-baked in rich Italian passata.',
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
    name: 'CAKES',
    subtitle: 'Artisanal House Pastries & Gelato',
    items: [
      { id: 'c1', name: 'CLASSIC TIRAMISU', description: 'contains free-range eggs', price: 250, details: 'Traditional Italian tiramisu with espresso-soaked ladyfingers & mascarpone (contains free-range eggs).', tags: ['House Made', 'Arabica Coffee'], badge: 'HOUSE MADE', image_url: ITEM_MEDIA_MAP.c1.image_url, prepTime: 'Ready' },
      { id: 'c2', name: 'COCONUT ICE CREAM WITH BITTER ORANGE SAUCE', description: 'Artisanal coconut ice cream served with bitter orange sauce', price: 200, details: 'House-churned coconut ice cream topped with warm bitter orange sauce reduction.', tags: ['Refreshing', 'Citrus Glaze'], badge: 'CITRUS GLAZE', image_url: ITEM_MEDIA_MAP.c2.image_url, prepTime: 'Ready' },
    ],
  },
  {
    id: 'beverages',
    name: 'BEVERAGES',
    subtitle: 'Chilled Drinks & Refreshments',
    items: [
      { id: 'b1', name: 'FRESH LIME SODA', description: 'Key lime juice, sparkling soda water, fresh garden mint', price: 100, details: 'Freshly squeezed Key lime juice with sparkling soda water & fresh mint leaves.', tags: ['Chilled', 'Fresh Mint'], badge: 'CHILLED', image_url: ITEM_MEDIA_MAP.b1.image_url, prepTime: '5 mins' },
      { id: 'b2', name: 'LEMON GINGER SODA', description: 'House ginger reduction, fresh lemon juice, chilled soda water', price: 150, details: 'House ginger reduction brewed with fresh lemon juice and chilled soda.', tags: ['Digestive', 'House Brew'], badge: 'DIGESTIVE', image_url: ITEM_MEDIA_MAP.b2.image_url, prepTime: '5 mins' },
      { id: 'b6', name: 'COKE', description: 'Chilled classic Coca-Cola', price: 100, details: 'Chilled refreshing classic Coca-Cola.', tags: ['Chilled', 'Classic'], badge: 'CHILLED', image_url: ITEM_MEDIA_MAP.b6.image_url, prepTime: 'Instant' },
      { id: 'b5', name: 'HIMALAYAN MINERAL WATER', description: 'Pure mineral water bottled at origin', price: 50, details: 'Pure natural mineral water bottled at source in the Himalayas.', tags: ['Natural Spring'], badge: 'NATURAL SPRING', image_url: ITEM_MEDIA_MAP.b5.image_url, prepTime: 'Instant' },
      { id: 'b3', name: 'ICE TEA', description: 'Lemon & Peach flavour', price: 150, details: 'Slow-brewed black tea infused with lemon & peach flavour.', tags: ['Cold Brewed'], badge: 'COLD BREWED', image_url: ITEM_MEDIA_MAP.b3.image_url, prepTime: '5 mins' },
      { id: 'b4', name: 'KOMBUCHA', description: 'with raw fruits: Lemongrass + mint, Kokum, Pineapple + rosemary, or Pomegranate', price: 250, details: 'Artisanal probiotic fermented tea infused with raw fruit botanicals.', tags: ['Probiotic', 'Artisanal'], badge: 'PROBIOTIC', image_url: ITEM_MEDIA_MAP.b4.image_url, prepTime: 'Instant' },
    ],
  },
  {
    id: 'hot-drinks',
    name: 'HOT DRINKS',
    subtitle: '100% Mountain Arabica Roasts & Himalayan Herbal Infusions',
    items: [
      { id: 'h1', name: 'ESPRESSO', description: '100% mountain Arabica roast with rich crema', price: 150, details: 'Double shot of 100% Arabica mountain bean roast with thick caramel crema.', tags: ['100% Arabica', 'Espresso Extract'], badge: '100% ARABICA', image_url: ITEM_MEDIA_MAP.h1.image_url, prepTime: '3 mins' },
      { id: 'h2', name: 'RHODODENDRON MINT & THYME TISANE', description: 'Wild red rhododendron petals, garden mint & thyme', price: 150, details: 'Wild Himalayan red rhododendron petals blended with garden mint and soothing thyme.', tags: ['Mountain Herbs', 'Caffeine-Free'], badge: 'MOUNTAIN HERBS', image_url: ITEM_MEDIA_MAP.h2.image_url, prepTime: '5 mins' },
      { id: 'h3', name: 'HIMALAYAN ROSEHIP & MINT TISANE', description: 'Rosehip husks brewed with fragrant mint', price: 150, details: 'Vitamin C rich rosehip husks brewed with fragrant mountain mint.', tags: ['Antioxidant Rich', 'Organic'], badge: 'ANTIOXIDANT', image_url: ITEM_MEDIA_MAP.h3.image_url, prepTime: '5 mins' },
      { id: 'h4', name: 'HIMALAYAN MIXED HERBS', description: 'High-altitude botanical blend of tulsi, lemongrass, ginger & black pepper', price: 150, details: 'Traditional high-altitude botanical infusion of herbs.', tags: ['Traditional', 'Immunity Tonic'], badge: 'IMMUNITY TONIC', image_url: ITEM_MEDIA_MAP.h4.image_url, prepTime: '5 mins' },
    ],
  },
];
