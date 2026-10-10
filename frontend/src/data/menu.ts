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
  s1: { image_url: "/jaadoo-focaccia-rosemary.png", badge: "FRESHLY BAKED" },
  s2: { image_url: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=400&q=80", badge: "HANDCRAFTED" },
  p1: { image_url: "/jaadoo-pizza-prep.png", badge: "OVEN BAKED" },
  pz1: { image_url: "/jaadoo-pizza-twilight.png", badge: "DAIRY-FREE" },
  pz2: { image_url: "/jaadoo-margherita-lakeside.png", badge: "NEAPOLITAN CLASSIC" },
  pz3: { image_url: "/pizza-olive-capers.webp", badge: "PREMIUM" },
  pz4: { image_url: "/pizza-zucchini-mushrooms.jpg", badge: "" },
  pz5: { image_url: "/pizza-quatro-stagione.webp", badge: "PREMIUM" },
  pz6: { image_url: "/pizza-sophia-loren.webp", badge: "PREMIUM" },
  pz7: { image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80", badge: "SOPIA BASE" },
  pz8: { image_url: "/pizza-itala.jpg", badge: "" },
  pz9: { image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80", badge: "LOCAL SPECIAL" },
  c1: { image_url: "/jaadoo-tiramisu-craft.jpg", badge: "HOUSE MADE" },
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
  pz1: 4, // MARINARA
  pz2: 5, // MARGHERITA
  pz3: 6, // OLIVE CAPERS
  pz4: 7, // ZUCCHINI MUSHROOMS
  pz5: 8, // QUATRO STAGIONE
  pz6: 9, // SOPHIA LOREN
  pz7: 10, // MARIA CALLAS
  pz8: 11, // ITALA
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
    subtitle: 'Freshly Baked Breads and Artisanal Starters',
    items: [
      { 
        id: 's1', 
        name: 'FOCACCIA WITH GARLIC DIP', 
        description: '',
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
        description: '',
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
    name: 'PIZZA',
    subtitle: 'Wood-Fired Neapolitan Pizzas',
    items: [
      { id: 'pz1', name: 'MARINARA', description: 'tomato sauce w/garlic, basil, oregano, capers', price: 400, details: 'Tomato sauce with garlic, basil, oregano and capers.', tags: ['Dairy-Free'], badge: 'DAIRY-FREE', image_url: ITEM_MEDIA_MAP.pz1.image_url, prepTime: '15 mins' },
      { id: 'pz2', name: 'MARGHERITA', description: 'tomato sauce w/garlic, basil, oregano, capers', price: 500, details: 'Tomato sauce with garlic, basil, oregano and capers.', tags: ['Neapolitan Classic'], badge: 'NEAPOLITAN CLASSIC', image_url: ITEM_MEDIA_MAP.pz2.image_url, prepTime: '15 mins' },
      { id: 'pz3', name: 'OLIVE CAPERS', description: 'tomato sauce w/garlic, basil, oregano, capers', price: 600, details: 'Tomato sauce with garlic, basil, oregano and capers.', tags: ['Premium'], badge: 'PREMIUM', image_url: ITEM_MEDIA_MAP.pz3.image_url, prepTime: '15 mins' },
      { id: 'pz4', name: 'ZUCCHINI MUSHROOMS', description: '', price: 600, details: 'Zucchini and mushrooms on a wood-fired Neapolitan base.', tags: ['Vegetarian'], badge: 'VEGETARIAN', image_url: ITEM_MEDIA_MAP.pz4.image_url, prepTime: '15 mins' },
      { id: 'pz5', name: 'QUATRO STAGIONE', description: 'zucchini, mushroom, olives, red & yellow capsicum', price: 700, details: 'Zucchini, mushroom, olives, red and yellow capsicum.', tags: ['Premium'], badge: 'PREMIUM', image_url: ITEM_MEDIA_MAP.pz5.image_url, prepTime: '15 mins' },
      { id: 'pz6', name: 'SOPHIA LOREN', description: 'sundried tomatoes, pesto, capers, rocket, feta + mozzarella', price: 800, details: 'Sundried tomatoes, pesto, capers, rocket, feta and mozzarella.', tags: ['Premium'], badge: 'PREMIUM', image_url: ITEM_MEDIA_MAP.pz6.image_url, prepTime: '15 mins' },
      { id: 'pz7', name: 'MARIA CALLAS', description: 'feta cream base, artichoke hearts, pesto, cherry tomatoes', price: 800, details: 'Feta cream base, artichoke hearts, pesto and cherry tomatoes.', tags: ['Cream Base'], badge: 'CREAM BASE', image_url: ITEM_MEDIA_MAP.pz7.image_url, prepTime: '15 mins' },
      { id: 'pz8', name: 'ITALA', description: 'mozzarella cheese base, broccoli cream, cherry tomatoes, capers', price: 800, details: 'Mozzarella cheese base, broccoli cream, cherry tomatoes and capers.', tags: ['Cream Base'], badge: 'CREAM BASE', image_url: ITEM_MEDIA_MAP.pz8.image_url, prepTime: '15 mins' },
      { id: 'pz9', name: 'RESIDENCY UDAIPUR', description: 'feta cream base w fried green tomatoes, capers, rocket and pesto', price: 700, details: 'Feta cream base with fried green tomatoes, capers, rocket and pesto.', tags: ['House Special'], badge: 'HOUSE SPECIAL', image_url: ITEM_MEDIA_MAP.pz9.image_url, prepTime: '15 mins' },
    ],
  },
  {
    id: 'cakes',
    name: 'CAKES',
    subtitle: 'Artisanal House Pastries and Gelato',
    items: [
      { id: 'c1', name: 'CLASSIC TIRAMISU', description: 'contains free-range eggs', price: 250, details: 'Traditional Italian tiramisu with espresso-soaked ladyfingers & mascarpone (contains free-range eggs).', tags: ['House Made', 'Arabica Coffee'], badge: 'HOUSE MADE', image_url: ITEM_MEDIA_MAP.c1.image_url, prepTime: 'Ready' },
      { id: 'c2', name: 'COCONUT ICE CREAM WITH BITTER ORANGE SAUCE', description: '', price: 200, details: 'Coconut ice cream with bitter orange sauce.', tags: ['Refreshing', 'Citrus Glaze'], badge: 'CITRUS GLAZE', image_url: ITEM_MEDIA_MAP.c2.image_url, prepTime: 'Ready' },
    ],
  },
  {
    id: 'beverages',
    name: 'BEVERAGES',
    subtitle: 'Chilled Drinks and Refreshments',
    items: [
      { id: 'b1', name: 'FRESH LIME SODA', description: '', price: 100, details: 'Fresh lime soda.', tags: ['Chilled'], badge: 'CHILLED', image_url: ITEM_MEDIA_MAP.b1.image_url, prepTime: '5 mins' },
      { id: 'b2', name: 'LEMON GINGER SODA', description: '', price: 150, details: 'Lemon ginger soda.', tags: ['Chilled'], badge: 'CHILLED', image_url: ITEM_MEDIA_MAP.b2.image_url, prepTime: '5 mins' },
      { id: 'b6', name: 'COKE', description: '', price: 100, details: 'Chilled Coke.', tags: ['Chilled'], badge: 'CHILLED', image_url: ITEM_MEDIA_MAP.b6.image_url, prepTime: 'Instant' },
      { id: 'b5', name: 'HIMALAYAN MINERAL WATER', description: '', price: 50, details: 'Himalayan mineral water.', tags: ['Natural Spring'], badge: 'NATURAL SPRING', image_url: ITEM_MEDIA_MAP.b5.image_url, prepTime: 'Instant' },
      { id: 'b3', name: 'ICE TEA', description: 'Lemon & Peach flavour', price: 150, details: 'Slow-brewed black tea infused with lemon & peach flavour.', tags: ['Cold Brewed'], badge: 'COLD BREWED', image_url: ITEM_MEDIA_MAP.b3.image_url, prepTime: '5 mins' },
      { id: 'b4', name: 'KOMBUCHA', description: 'with raw fruits: Lemongrass + mint, Kokum, Pineapple + rosemary, or Pomegranate', price: 250, details: 'Artisanal probiotic fermented tea infused with raw fruit botanicals.', tags: ['Probiotic', 'Artisanal'], badge: 'PROBIOTIC', image_url: ITEM_MEDIA_MAP.b4.image_url, prepTime: 'Instant' },
    ],
  },
  {
    id: 'hot-drinks',
    name: 'HOT DRINKS',
    subtitle: '100% Mountain Arabica Roasts and Himalayan Herbal Infusions',
    items: [
      { id: 'h1', name: 'ESPRESSO', description: '', price: 150, details: 'Espresso.', tags: ['Hot'], badge: 'HOT', image_url: ITEM_MEDIA_MAP.h1.image_url, prepTime: '3 mins' },
      { id: 'h2', name: 'RHODODENDRON MINT & THYME TISANE', description: '', price: 150, details: 'Rhododendron mint and thyme tisane.', tags: ['Tisane'], badge: 'TISANE', image_url: ITEM_MEDIA_MAP.h2.image_url, prepTime: '5 mins' },
      { id: 'h3', name: 'HIMALAYAN ROSEHIP & MINT TISANE', description: '', price: 150, details: 'Himalayan rosehip and mint tisane.', tags: ['Tisane'], badge: 'TISANE', image_url: ITEM_MEDIA_MAP.h3.image_url, prepTime: '5 mins' },
      { id: 'h4', name: 'HIMALAYAN MIXED HERBS', description: '', price: 150, details: 'Himalayan mixed herbs.', tags: ['Tisane'], badge: 'TISANE', image_url: ITEM_MEDIA_MAP.h4.image_url, prepTime: '5 mins' },
    ],
  },
];
