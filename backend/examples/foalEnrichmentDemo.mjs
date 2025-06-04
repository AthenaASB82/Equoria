#!/usr/bin/env node

/**
 * Foal Enrichment API Demonstration
 *
 * This script demonstrates how to use the new POST /api/foals/{foalId}/enrichment endpoint
 * to complete enrichment activities for foals and track their bonding and stress levels.
 *
 * Usage: node backend/examples/foalEnrichmentDemo.js
 */

import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const DEMO_FOAL_ID = 1; // You'll need to have a foal with this ID in your database

/**
 * Make an API request to the enrichment endpoint
 */
async function completeEnrichmentActivity(foalId, day, activity) {
  try {
    console.log(
      `\n🎯 Attempting to complete activity: "${activity}" on day ${day} for foal ${foalId}`,
    );

    const response = await fetch(`${API_BASE_URL}/api/foals/${foalId}/enrichment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        day,
        activity,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Success! ${data.message}`);
      console.log('   📊 Updated Levels:');
      console.log(
        `      🤝 Bond Score: ${data.data.updated_levels.bond_score} (${data.data.changes.bond_change >= 0 ? '+' : ''}${data.data.changes.bond_change})`,
      );
      console.log(
        `      😰 Stress Level: ${data.data.updated_levels.stress_level} (${data.data.changes.stress_change >= 0 ? '+' : ''}${data.data.changes.stress_change})`,
      );
      console.log(`   🎭 Outcome: ${data.data.activity.outcome}`);
      console.log(`   📝 Training Record ID: ${data.data.training_record_id}`);

      return data.data;
    } else {
      console.log(`❌ Error: ${data.message}`);
      if (data.errors) {
        data.errors.forEach(error => console.log(`   - ${error.msg}`));
      }
      return null;
    }
  } catch (error) {
    console.error(`💥 Request failed: ${error.message}`);
    return null;
  }
}

/**
 * Demonstrate the API with various scenarios
 */
async function runDemo() {
  console.log('🐴 Foal Enrichment API Demonstration');
  console.log('=====================================');

  console.log(`\n📋 Testing with foal ID: ${DEMO_FOAL_ID}`);
  console.log('Note: Make sure you have a foal with this ID in your database (age 0 or 1)');

  // Test 1: Valid day 3 activity - Trailer Exposure
  await completeEnrichmentActivity(DEMO_FOAL_ID, 3, 'Trailer Exposure');

  // Test 2: Valid day 3 activity - Halter Introduction
  await completeEnrichmentActivity(DEMO_FOAL_ID, 3, 'Halter Introduction');

  // Test 3: Different activity name format (underscore)
  await completeEnrichmentActivity(DEMO_FOAL_ID, 3, 'leading_practice');

  // Test 4: Case insensitive activity name
  await completeEnrichmentActivity(DEMO_FOAL_ID, 3, 'HANDLING EXERCISES');

  // Test 5: Day 1 activity
  await completeEnrichmentActivity(DEMO_FOAL_ID, 1, 'Feeding Assistance');

  // Test 6: Day 0 activity
  await completeEnrichmentActivity(DEMO_FOAL_ID, 0, 'Gentle Touch');

  console.log('\n🧪 Testing Error Scenarios:');

  // Test 7: Invalid day (too high)
  await completeEnrichmentActivity(DEMO_FOAL_ID, 7, 'Trailer Exposure');

  // Test 8: Activity not appropriate for day
  await completeEnrichmentActivity(DEMO_FOAL_ID, 0, 'Trailer Exposure');

  // Test 9: Non-existent foal
  await completeEnrichmentActivity(99999, 3, 'Trailer Exposure');

  // Test 10: Invalid activity name
  await completeEnrichmentActivity(DEMO_FOAL_ID, 3, 'Flying Lessons');

  console.log('\n✨ Demo completed!');
  console.log('\n📚 Available Activities by Day:');
  console.log('Day 0: Gentle Touch, Quiet Presence, Soft Voice');
  console.log('Day 1: Feeding Assistance, Grooming Introduction, Play Interaction');
  console.log('Day 2: Walking Practice, Environment Exploration, Social Introduction');
  console.log('Day 3: Halter Introduction, Leading Practice, Handling Exercises, Trailer Exposure');
  console.log('Day 4: Obstacle Introduction, Advanced Grooming, Training Games');
  console.log('Day 5: Confidence Building, New Experiences, Independence Practice');
  console.log('Day 6: Final Assessment, Graduation Ceremony, Future Planning');

  console.log('\n🔧 API Endpoint Details:');
  console.log('POST /api/foals/{foalId}/enrichment');
  console.log('Request Body: { "day": 0-6, "activity": "Activity Name" }');
  console.log('Response: Updated bond_score and stress_level with activity outcome');
}

/**
 * Check if server is running
 */
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/ping`);
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    } else {
      console.log('❌ Server responded with error');
      return false;
    }
  } catch (error) {
    console.log("❌ Cannot connect to server. Make sure it's running on port 3000");
    console.log('   Start the server with: npm run dev');
    return false;
  }
}

// Run the demonstration
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runDemo();
  }
}

main().catch(console.error);
