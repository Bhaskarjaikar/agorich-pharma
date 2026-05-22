// Seed 4 medicine products directly via API
const products = [
  {
    name: 'Agorut-D',
    category: 'Orthopedics',
    manufacturer: 'Agorich Pharmaceuticals Pvt Ltd',
    salt_composition: 'Trypsin (48mg) + Bromelain (90mg) + Rutoside (100mg) + Diclofenac (50mg)',
    uses: 'Relieves pain and inflammation in rheumatoid arthritis, ankylosing spondylitis, osteoarthritis. Also used for muscle pain, back pain, toothache, ear and throat pain.',
    side_effects: 'Nausea, vomiting, heartburn, diarrhea, loss of appetite, indigestion. If these side effects bother you or persist, consult your doctor immediately.',
    storage_instructions: 'Store below 25°C in a cool, dry place away from direct sunlight. Keep out of reach of children.',
    description: 'Agorut-D Tablet is a pain relieving medicine. It helps reduce pain and inflammation in various conditions like arthritis, muscle pain, and post-operative recovery.',
    prescription_required: true,
    mrp: 319.16,
    agorich_price: 295.00,
    retailer_price: 275.00,
    stock: 100,
    pack_size: '10 Tablets',
    images: ['/medicines/Product/Agorut-D.jpg', '/medicines/Product/Agorut-D_Box.png'],
    pdf_url: '/medicines/Product/AGORUT-D.pdf',
    thumbnail: '/medicines/Product/Agorut-D.jpg',
    status: 'ACTIVE'
  },
  {
    name: 'Lowmac-Plus',
    category: 'Neurology',
    manufacturer: 'Agorich Pharmaceuticals Pvt Ltd',
    salt_composition: 'Methylcobalamin (1500mcg) + Alpha Lipoic Acid (100mg) + Pyridoxine (3mg) + Folic Acid (1.5mg)',
    uses: 'Supports nerve health and function. Used for diabetic neuropathy, nerve damage, vitamin B12 deficiency. Helps in maintaining healthy nervous system.',
    side_effects: 'Nausea, headache, loss of appetite, diarrhea. Rare allergic reactions may occur. Consult doctor if symptoms persist.',
    storage_instructions: 'Store in a cool, dry place below 30°C. Protect from light and moisture. Keep out of reach of children.',
    description: 'Lowmac-Plus is a neuroprotective supplement containing Methylcobalamin and Alpha Lipoic Acid. It supports nerve health and is beneficial for diabetic neuropathy patients.',
    prescription_required: true,
    mrp: 285.00,
    agorich_price: 265.00,
    retailer_price: 245.00,
    stock: 150,
    pack_size: '10 Capsules',
    images: ['/medicines/Product/Lowmac plus.jpg', '/medicines/Product/Lowmac Plus_Box.png'],
    pdf_url: '/medicines/Product/LOWMAC-PLUS.pdf',
    thumbnail: '/medicines/Product/Lowmac plus.jpg',
    status: 'ACTIVE'
  },
  {
    name: 'Lexorich-M',
    category: 'Respiratory',
    manufacturer: 'Agorich Pharmaceuticals Pvt Ltd',
    salt_composition: 'Levocetirizine (5mg) + Montelukast (10mg)',
    uses: 'Treats allergic symptoms like runny nose, sneezing, watery eyes, itching. Effective for asthma and allergic rhinitis. Provides relief from seasonal allergies.',
    side_effects: 'Drowsiness, dizziness, dry mouth, headache, stomach upset. Avoid driving or operating machinery if you feel drowsy.',
    storage_instructions: 'Store below 30°C in a cool, dry place. Keep away from direct sunlight and moisture. Keep out of reach of children.',
    description: 'Lexorich-M Tablet is an anti-allergic medicine combining Levocetirizine and Montelukast. It provides comprehensive relief from allergic symptoms and asthma.',
    prescription_required: true,
    mrp: 175.00,
    agorich_price: 155.00,
    retailer_price: 145.00,
    stock: 200,
    pack_size: '10 Tablets',
    images: ['/medicines/Product/Lexorich-M.jpg', '/medicines/Product/Lexorich-M_Box.png'],
    pdf_url: '/medicines/Product/LEXORICH-M.pdf',
    thumbnail: '/medicines/Product/Lexorich-M.jpg',
    status: 'ACTIVE'
  },
  {
    name: 'Richago-4G',
    category: 'Neutraceuticals',
    manufacturer: 'Agorich Pharmaceuticals Pvt Ltd',
    salt_composition: 'Omega-3 Fatty Acids (EPA 180mg + DHA 120mg) + Green Tea Extract (100mg) + Ginkgo Biloba (60mg) + Ginseng (100mg)',
    uses: 'Boosts brain function and memory. Supports heart health, improves immunity, reduces stress and fatigue. Antioxidant properties help in overall wellness.',
    side_effects: 'Mild stomach upset, nausea, fishy aftertaste. Rarely, headache or allergic reactions may occur. Discontinue if severe reactions happen.',
    storage_instructions: 'Store in a cool, dry place away from direct sunlight. Keep the container tightly closed. Keep out of reach of children.',
    description: 'Richago-4G is a premium neutraceutical supplement with Omega-3, Green Tea Extract, Ginkgo Biloba and Ginseng. It supports cognitive function, heart health and overall vitality.',
    prescription_required: false,
    mrp: 425.00,
    agorich_price: 385.00,
    retailer_price: 365.00,
    stock: 80,
    pack_size: '30 Softgel Capsules',
    images: ['/medicines/Product/Richago-4G.jpg', '/medicines/Product/Richago-4G_Box.png'],
    pdf_url: '/medicines/Product/RICHAGO-4G.pdf',
    thumbnail: '/medicines/Product/Richago-4G.jpg',
    status: 'ACTIVE'
  }
];

async function seedProducts() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Seeding 4 medicine products...\n');
  
  for (const product of products) {
    try {
      const response = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token'
        },
        body: JSON.stringify(product)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${product.name} - Created successfully`);
      } else {
        console.log(`⚠️  ${product.name} - ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${product.name} - ${error.message}`);
    }
  }
  
  console.log('\n✨ Seeding complete!');
}

seedProducts();
