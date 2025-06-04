/**
 * Test API endpoints and create test data
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function createBreed(name, description) {
  try {
    const response = await fetch(`${BASE_URL}/api/breeds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description }),
    });

    const data = await response.json();
    console.log(`✅ Created breed: ${name}`, data);
    return data;
  } catch (error) {
    console.error(`❌ Failed to create breed ${name}:`, error.message);
    return null;
  }
}

async function testAPI() {
  console.log('🧪 Testing API and creating test data...\n');

  // Create breeds
  await createBreed(
    'Thoroughbred',
    'A hot-blooded horse breed best known for its use in horse racing.',
  );
  await createBreed(
    'Arabian',
    'One of the oldest horse breeds, known for endurance and intelligence.',
  );
  await createBreed('Quarter Horse', 'An American breed known for speed in quarter-mile races.');
  await createBreed('Akhal-Teke', 'A rare breed from Turkmenistan known for its metallic coat.');

  console.log('\n🎯 Test data creation complete!');
}

testAPI().catch(console.error);
