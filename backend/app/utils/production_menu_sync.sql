-- ==============================================================================
-- Idempotent Production Menu Configuration Sync (Render PostgreSQL)
-- ==============================================================================
-- Preserves existing:
--   - branches (id: 1, Jaadoo Udaipur)
--   - kitchens (Single Kitchen: id: 1, Hot Food Kitchen)
--   - tables (id: 1, Table 1)
--   - table_qr (id: 1, qr_sec_b7ba9c59d35e4074a30034abb48ee0a9)
--   - existing transactional data (orders, bills, sessions)
-- Synchronizes:
--   - 6 Menu Categories (id 1..6)
--   - 24 Menu Items (id 1..24, including item #5 Margherita Bufala)
--   - Dual-kitchen mapping -> routes all items to the single real Kitchen (id: 1)
--   - Item production capacity rules (50 limit per item, preserving allocated counts)
-- ==============================================================================

BEGIN;

-- 1. Ensure Branch 1
INSERT INTO branches (id, name, address, phone, is_active, created_at)
VALUES (1, 'Jaadoo Udaipur', 'Chandpole, Udaipur', '+919876543210', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure Single Real Kitchen (Kitchen 1)
INSERT INTO kitchens (id, branch_id, name)
VALUES (1, 1, 'Hot Food Kitchen')
ON CONFLICT (id) DO NOTHING;

-- 3. Upsert Categories (id 1..6)
INSERT INTO menu_categories (id, name, display_order, is_active) VALUES
  (1, 'STARTERS', 1, true),
  (2, 'PRIMO', 2, true),
  (3, 'PIZZA', 3, true),
  (4, 'CAKES', 4, true),
  (5, 'BEVERAGES', 5, true),
  (6, 'HOT DRINKS', 6, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- 4. Upsert Menu Items (id 1..24)
INSERT INTO menu_items (id, category_id, name, description, price, tax_rate, is_available, is_active, created_at) VALUES
  (1, 1, 'FOCACCIA WITH GARLIC DIP', '', 300.00, 5.00, true, true, NOW()),
  (2, 1, 'CHEESE & MUSHROOM TARTS (2 PCS)', 'with lettuce garnish', 400.00, 5.00, true, true, NOW()),
  (3, 2, 'CANNELLONI (CHEESE & TOMATO)', '', 500.00, 5.00, true, true, NOW()),
  (4, 3, 'MARINARA', 'tomato sauce w/garlic, basil, oregano, capers', 400.00, 5.00, true, true, NOW()),
  (5, 3, 'MARGHERITA', 'tomato sauce w/garlic, basil, oregano, capers', 500.00, 5.00, true, true, NOW()),
  (6, 3, 'OLIVE CAPERS', 'tomato sauce w/garlic, basil, oregano, capers', 600.00, 5.00, true, true, NOW()),
  (7, 3, 'ZUCCHINI MUSHROOMS', '', 600.00, 5.00, true, true, NOW()),
  (8, 3, 'QUATRO STAGIONE', 'zucchini, mushroom, olives, red & yellow capsicum', 700.00, 5.00, true, true, NOW()),
  (9, 3, 'SOPHIA LOREN', 'sundried tomatoes, pesto, capers, rocket, feta + mozzarella', 800.00, 5.00, true, true, NOW()),
  (10, 3, 'MARIA CALLAS', 'feta cream base, artichoke hearts, pesto, cherry tomatoes', 800.00, 5.00, true, true, NOW()),
  (11, 3, 'ITALA', 'mozzarella cheese base, broccoli cream, cherry tomatoes, capers', 800.00, 5.00, true, true, NOW()),
  (12, 3, 'RESIDENCY UDAIPUR', 'feta cream base w fried green tomatoes, capers, rocket and pesto', 700.00, 5.00, true, true, NOW()),
  (13, 4, 'CLASSIC TIRAMISU', 'contains free-range eggs', 250.00, 5.00, true, true, NOW()),
  (14, 4, 'COCONUT ICE CREAM WITH BITTER ORANGE SAUCE', 'Coconut ice cream served with bitter orange sauce', 200.00, 5.00, true, true, NOW()),
  (15, 5, 'FRESH LIME SODA', 'Key lime juice, sparkling soda water, fresh garden mint', 100.00, 5.00, true, true, NOW()),
  (16, 5, 'LEMON GINGER SODA', 'House ginger reduction, fresh lemon juice, chilled soda water', 150.00, 5.00, true, true, NOW()),
  (17, 5, 'ICE TEA', 'Lemon & Peach flavour', 150.00, 5.00, true, true, NOW()),
  (18, 5, 'KOMBUCHA', 'with raw fruits: Lemongrass + mint, Kokum, Pineapple + rosemary, or Pomegranate', 250.00, 5.00, true, true, NOW()),
  (19, 5, 'HIMALAYAN MINERAL WATER', 'Pure mineral water bottled at origin', 50.00, 5.00, true, true, NOW()),
  (20, 6, 'ESPRESSO', '100% mountain Arabica roast with rich crema', 150.00, 5.00, true, true, NOW()),
  (21, 6, 'RHODODENDRON MINT & THYME TISANE', 'Wild red rhododendron petals, garden mint & thyme', 150.00, 5.00, true, true, NOW()),
  (22, 6, 'HIMALAYAN ROSEHIP & MINT TISANE', 'Rosehip husks brewed with fragrant mint', 150.00, 5.00, true, true, NOW()),
  (23, 6, 'HIMALAYAN MIXED HERBS', 'High-altitude botanical blend of tulsi, lemongrass, ginger & black pepper', 150.00, 5.00, true, true, NOW()),
  (24, 5, 'COKE', 'Chilled classic Coca-Cola', 100.00, 5.00, true, true, NOW())
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  tax_rate = EXCLUDED.tax_rate,
  is_available = EXCLUDED.is_available,
  is_active = EXCLUDED.is_active;

-- 5. Single Kitchen Routing (Map all 24 items to Kitchen 1)
DO $$
DECLARE
  v_item_id INT;
BEGIN
  FOR v_item_id IN 1..24 LOOP
    IF EXISTS (SELECT 1 FROM menu_item_kitchen_mapping WHERE menu_item_id = v_item_id) THEN
      UPDATE menu_item_kitchen_mapping SET kitchen_id = 1 WHERE menu_item_id = v_item_id;
    ELSE
      INSERT INTO menu_item_kitchen_mapping (menu_item_id, kitchen_id) VALUES (v_item_id, 1);
    END IF;
  END LOOP;
END $$;

-- 6. Item Capacity Rules (Ensure production limit is configured for each item)
DO $$
DECLARE
  v_item_id INT;
BEGIN
  FOR v_item_id IN 1..24 LOOP
    IF EXISTS (SELECT 1 FROM item_capacity_rules WHERE menu_item_id = v_item_id) THEN
      UPDATE item_capacity_rules SET max_production_limit = 50, is_active = true WHERE menu_item_id = v_item_id;
    ELSE
      INSERT INTO item_capacity_rules (menu_item_id, max_production_limit, allocated_count, reset_period, is_active, updated_at)
      VALUES (v_item_id, 50, 0, 'DAILY', true, NOW());
    END IF;
  END LOOP;
END $$;

-- 7. Sync Sequences
SELECT setval('menu_categories_id_seq', (SELECT max(id) FROM menu_categories));
SELECT setval('menu_items_id_seq', (SELECT max(id) FROM menu_items));
SELECT setval('menu_item_kitchen_mapping_id_seq', (SELECT max(id) FROM menu_item_kitchen_mapping));
SELECT setval('item_capacity_rules_id_seq', (SELECT max(id) FROM item_capacity_rules));

COMMIT;
