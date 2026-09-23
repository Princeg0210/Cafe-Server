export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  details?: string;
  tags?: string[];
  prepTime?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export const menuData: MenuCategory[] = [
  {
    id: 'starters',
    name: 'STARTERS',
    items: [
      { 
        id: 's1', 
        name: 'FOCACCIA WITH GARLIC DIP', 
        price: 300,
        details: 'House-made rosemary & sea salt focaccia served warm with creamy roasted garlic olive oil dip.',
        tags: ['Freshly Baked', 'Chef Special'],
        prepTime: '10 mins'
      },
      { 
        id: 's2', 
        name: 'CHEESE & MUSHROOM TARTS (2 PCS)', 
        description: 'with lettuce garnish', 
        price: 400,
        details: 'Flaky artisanal pastry crusts filled with melted wild mushrooms, fontina cheese, and fresh micro-greens.',
        tags: ['Artisanal', 'Vegetarian'],
        prepTime: '12 mins'
      },
    ],
  },
  {
    id: 'primo',
    name: 'PRIMO',
    items: [
      { 
        id: 'p1', 
        name: 'CANNELLONI (CHEESE & TOMATO)', 
        price: 500,
        details: 'Hand-rolled pasta tubes stuffed with ricotta & mozzarella, baked in San Marzano tomato reduction.',
        tags: ['Signature', 'Hot Food'],
        prepTime: '18 mins'
      },
    ],
  },
  {
    id: 'pizza',
    name: 'PIZZA',
    items: [
      { id: 'pz1', name: 'MARINARA', description: 'tomato sauce w/garlic, basil, oregano, capers', price: 400, details: 'Classic Neapolitan base with intense roasted garlic, wild oregano & extra virgin olive oil.', tags: ['Woodfired', 'Vegan Option'], prepTime: '15 mins' },
      { id: 'pz2', name: 'MARGHERITA', description: 'tomato sauce, mozzarella, fresh basil', price: 500, details: 'Traditional wood-fired crust layered with creamy mozzarella Fior di Latte & fresh basil leaves.', tags: ['Best Seller', 'Woodfired'], prepTime: '15 mins' },
      { id: 'pz3', name: 'OLIVE CAPERS', description: 'tomato sauce w/garlic, basil, oregano, capers', price: 600, details: 'Tangy brine-infused pizza topped with Mediterranean black olives, salted capers & fresh herb oil.', tags: ['Woodfired', 'Spicy Tang'], prepTime: '15 mins' },
      { id: 'pz4', name: 'ZUCCHINI MUSHROOMS', price: 600, details: 'Thinly sliced tender zucchini ribbons with earthy portobello mushrooms and garlic butter.', tags: ['Vegetarian', 'Woodfired'], prepTime: '15 mins' },
      { id: 'pz5', name: 'QUATRO STAGIONE', description: 'zucchini, mushroom, olives, red & yellow capsicum', price: 700, details: 'Four seasons represented with distinct sections of fresh garden vegetables & melted mozzarella.', tags: ['House Classic', 'Woodfired'], prepTime: '15 mins' },
      { id: 'pz6', name: 'SOPHIA LOREN', description: 'sundried tomatoes, pesto, capers, rocket, feta + mozzarella', price: 800, details: 'Gourmet creation featuring fragrant basil pesto, sharp Greek feta, peppery wild rocket & sun-ripened tomatoes.', tags: ['Gourmet', 'Chef Choice'], prepTime: '15 mins' },
      { id: 'pz7', name: 'MARIA CALLAS', description: 'feta cream base, artichoke hearts, pesto, cherry tomatoes', price: 800, details: 'Rich creamy feta emulsion topped with tender artichoke hearts & sweet blistered cherry tomatoes.', tags: ['Premium', 'Cream Base'], prepTime: '15 mins' },
      { id: 'pz8', name: 'ITALA', description: 'mozzarella cheese base, broccoli cream, cherry tomatoes, capers', price: 800, details: 'Unique velvety broccoli cream base, double mozzarella, tart capers & juicy sweet tomatoes.', tags: ['Specialty', 'Woodfired'], prepTime: '15 mins' },
      { id: 'pz9', name: 'RESIDENCY', description: 'feta cream base w fried green tomatoes, capers, rocket and pesto', price: 700, details: 'Crispy fried green tomato slices over rich feta cream, drizzled with homemade pine nut pesto.', tags: ['Jaadoo Favorite', 'Crispy'], prepTime: '15 mins' },
    ],
  },
  {
    id: 'cakes',
    name: 'CAKES',
    items: [
      { id: 'c1', name: 'CLASSIC TIRAMISU', description: 'contains free-range eggs', price: 250, details: 'Layers of espresso-soaked ladyfingers and whipped mascarpone cream dusted with dark cocoa powder.', tags: ['House Dessert', 'Contains Eggs'], prepTime: 'Ready' },
      { id: 'c2', name: 'COCONUT ICE CREAM', description: 'WITH BITTER ORANGE SAUCE', price: 200, details: 'House-churned organic coconut cream ice cream topped with warm bitter orange reduction glaze.', tags: ['Refreshing', 'Citrus Glaze'], prepTime: 'Ready' },
    ],
  },
  {
    id: 'beverages',
    name: 'BEVERAGES',
    items: [
      { id: 'b1', name: 'FRESH LIME SODA', price: 100, details: 'Freshly squeezed Key lime juice with sparkling soda water & fresh mint leaves.', tags: ['Chilled', 'Custom Sweet/Salt'], prepTime: '5 mins' },
      { id: 'b2', name: 'LEMON GINGER SODA', price: 150, details: 'House ginger reduction brewed with fresh lemon juice and chilled soda.', tags: ['Digestive', 'House Brew'], prepTime: '5 mins' },
      { id: 'b3', name: 'COKE', price: 100, details: 'Chilled glass bottle served with ice and fresh lemon slice.', tags: ['Chilled'], prepTime: 'Instant' },
      { id: 'b4', name: 'HIMALAYAN MINERAL WATER', price: 50, details: 'Pure natural spring mineral water bottled at source in the high Himalayas.', tags: ['Himalayan Pure'], prepTime: 'Instant' },
      { id: 'b5', name: 'ICE TEA', description: 'Lemon & Peach flavour', price: 150, details: 'Slow-brewed black tea infused with natural peach nectar and fresh lemon zest.', tags: ['Fruity Brew', 'Chilled'], prepTime: '5 mins' },
      { id: 'b6', name: 'KOMBUCHA', description: 'with raw fruits: Lemongrass + mint, Kokom, Pineapple + rosemary, or Pomegranate', price: 250, details: 'Artisanal probiotic fermented tea infused with raw mountain botanical extracts.', tags: ['Probiotic', 'Artisanal'], prepTime: 'Instant' },
    ],
  },
  {
    id: 'hot-drinks',
    name: 'HOT DRINKS',
    items: [
      { id: 'h1', name: 'ESPRESSO', price: 150, details: 'Double shot of 100% Arabica mountain bean roast with thick caramel crema.', tags: ['100% Arabica', 'Double Shot'], prepTime: '3 mins' },
      { id: 'h2', name: 'RHODODENDRON MINT & THYME TISANE', price: 150, details: 'Wild Himalayan red rhododendron petals blended with garden mint and soothing thyme.', tags: ['Wild Harvested', 'Caffeine-Free'], prepTime: '5 mins' },
      { id: 'h3', name: 'HIMALAYAN ROSEHIP & MINT TISANE', price: 150, details: 'Vitamin C rich rosehip husks brewed with fragrant mountain spear mint.', tags: ['Antioxidant Rich', 'Herbal'], prepTime: '5 mins' },
      { id: 'h4', name: 'HIMALAYAN MIXED HERBS', price: 150, details: 'Traditional high-altitude botanical infusion of tulsi, lemongrass, ginger & black pepper.', tags: ['Immunity Booster', 'Authentic'], prepTime: '5 mins' },
    ],
  },
];
