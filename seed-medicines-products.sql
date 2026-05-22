-- Seed 4 medicines products with complete medical info

-- First, clear existing products (optional - remove if you want to keep existing)
-- DELETE FROM products WHERE name IN ('Agorut-D', 'Lowmac-Plus', 'Lexorich-M', 'Richago-4G');

-- Insert Agorut-D (Orthopedics)
INSERT INTO products (
    id, name, category, manufacturer, 
    salt_composition, uses, side_effects, storage_instructions, description,
    prescription_required, mrp, agorich_price, retailer_price, stock, 
    images, pdf_url, thumbnail, status, pack_size
) VALUES (
    gen_random_uuid(),
    'Agorut-D',
    'Orthopedics',
    'Agorich Pharma',
    'Trypsin (48mg) + Bromelain (90mg) + Rutoside (100mg) + Diclofenac (50mg)',
    'Relieves pain and inflammation in rheumatoid arthritis, ankylosing spondylitis, osteoarthritis. Also used for muscle pain, back pain, toothache, ear and throat pain.',
    'Nausea, vomiting, heartburn, diarrhea, loss of appetite, indigestion. If these side effects bother you or persist, consult your doctor immediately.',
    'Store below 25°C in a cool, dry place away from direct sunlight. Keep out of reach of children.',
    'Agorut-D Tablet is a pain relieving medicine. It helps reduce pain and inflammation in various conditions like arthritis, muscle pain, and post-operative recovery.',
    true,
    319.16,
    295.00,
    275.00,
    100,
    '["/medicines/Product/Agorut-D_Box.png", "/medicines/Product/Agorut-D.jpg"]',
    '/medicines/Product/AGORUT-D.pdf',
    '/medicines/Product/Agorut-D_Box.png',
    'ACTIVE',
    '10 Tablets'
) ON CONFLICT DO NOTHING;

-- Insert Lowmac-Plus (Neurology)
INSERT INTO products (
    id, name, category, manufacturer, 
    salt_composition, uses, side_effects, storage_instructions, description,
    prescription_required, mrp, agorich_price, retailer_price, stock, 
    images, pdf_url, thumbnail, status, pack_size
) VALUES (
    gen_random_uuid(),
    'Lowmac-Plus',
    'Neurology',
    'Agorich Pharma',
    'Methylcobalamin (1500mcg) + Alpha Lipoic Acid (100mg) + Pyridoxine (3mg) + Folic Acid (1.5mg)',
    'Supports nerve health and function. Used for diabetic neuropathy, nerve damage, vitamin B12 deficiency. Helps in maintaining healthy nervous system.',
    'Nausea, headache, loss of appetite, diarrhea. Rare allergic reactions may occur. Consult doctor if symptoms persist.',
    'Store in a cool, dry place below 30°C. Protect from light and moisture. Keep out of reach of children.',
    'Lowmac-Plus is a neuroprotective supplement containing Methylcobalamin and Alpha Lipoic Acid. It supports nerve health and is beneficial for diabetic neuropathy patients.',
    true,
    285.00,
    265.00,
    245.00,
    150,
    '["/medicines/Product/Lowmac Plus_Box.png", "/medicines/Product/Lowmac plus.jpg"]',
    '/medicines/Product/LOWMAC-PLUS.pdf',
    '/medicines/Product/Lowmac Plus_Box.png',
    'ACTIVE',
    '10 Capsules'
) ON CONFLICT DO NOTHING;

-- Insert Lexorich-M (Respiratory)
INSERT INTO products (
    id, name, category, manufacturer, 
    salt_composition, uses, side_effects, storage_instructions, description,
    prescription_required, mrp, agorich_price, retailer_price, stock, 
    images, pdf_url, thumbnail, status, pack_size
) VALUES (
    gen_random_uuid(),
    'Lexorich-M',
    'Respiratory',
    'Agorich Pharma',
    'Levocetirizine (5mg) + Montelukast (10mg)',
    'Treats allergic symptoms like runny nose, sneezing, watery eyes, itching. Effective for asthma and allergic rhinitis. Provides relief from seasonal allergies.',
    'Drowsiness, dizziness, dry mouth, headache, stomach upset. Avoid driving or operating machinery if you feel drowsy.',
    'Store below 30°C in a cool, dry place. Keep away from direct sunlight and moisture. Keep out of reach of children.',
    'Lexorich-M Tablet is an anti-allergic medicine combining Levocetirizine and Montelukast. It provides comprehensive relief from allergic symptoms and asthma.',
    true,
    175.00,
    155.00,
    145.00,
    200,
    '["/medicines/Product/Lexorich-M_Box.jpg", "/medicines/Product/Lexorich-M.jpg"]',
    '/medicines/Product/LEXORICH-M.pdf',
    '/medicines/Product/Lexorich-M_Box.jpg',
    'ACTIVE',
    '10 Tablets'
) ON CONFLICT DO NOTHING;

-- Insert Richago-4G (Neutraceuticals)
INSERT INTO products (
    id, name, category, manufacturer, 
    salt_composition, uses, side_effects, storage_instructions, description,
    prescription_required, mrp, agorich_price, retailer_price, stock, 
    images, pdf_url, thumbnail, status, pack_size
) VALUES (
    gen_random_uuid(),
    'Richago-4G',
    'Neutraceuticals',
    'Agorich Pharma',
    'Omega-3 Fatty Acids (EPA 180mg + DHA 120mg) + Green Tea Extract (100mg) + Ginkgo Biloba (60mg) + Ginseng (100mg)',
    'Boosts brain function and memory. Supports heart health, improves immunity, reduces stress and fatigue. Antioxidant properties help in overall wellness.',
    'Mild stomach upset, nausea, fishy aftertaste. Rarely, headache or allergic reactions may occur. Discontinue if severe reactions happen.',
    'Store in a cool, dry place away from direct sunlight. Keep the container tightly closed. Keep out of reach of children.',
    'Richago-4G is a premium neutraceutical supplement with Omega-3, Green Tea Extract, Ginkgo Biloba and Ginseng. It supports cognitive function, heart health and overall vitality.',
    false,
    425.00,
    385.00,
    365.00,
    80,
    '["/medicines/Product/Richago-4G_Box.png", "/medicines/Product/Richago-4G.jpg"]',
    '/medicines/Product/RICHAGO-4G.pdf',
    '/medicines/Product/Richago-4G_Box.png',
    'ACTIVE',
    '30 Softgel Capsules'
) ON CONFLICT DO NOTHING;

-- Verify inserts
SELECT name, category, mrp, agorich_price, stock, status 
FROM products 
WHERE name IN ('Agorut-D', 'Lowmac-Plus', 'Lexorich-M', 'Richago-4G');
