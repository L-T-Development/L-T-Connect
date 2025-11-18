#!/usr/bin/env node

/**
 * Migration Script: Remove Deprecated Attributes
 * 
 * This script removes the following deprecated attributes from Appwrite:
 * - sprints.capacity
 * - tasks.storyPoints
 * 
 * Run: node scripts/remove-deprecated-attributes.js
 */

const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY); // ⚠️ Requires API key with full permissions

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const SPRINTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SPRINTS_COLLECTION_ID;
const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID;

async function removeAttribute(collectionId, attributeKey, collectionName) {
  try {
    console.log(`\n🔄 Removing attribute '${attributeKey}' from '${collectionName}' collection...`);
    
    await databases.deleteAttribute(DATABASE_ID, collectionId, attributeKey);
    
    console.log(`✅ Successfully removed '${attributeKey}' from '${collectionName}'`);
    return true;
  } catch (error) {
    if (error.code === 404) {
      console.log(`ℹ️  Attribute '${attributeKey}' not found in '${collectionName}' (already removed or never existed)`);
      return true;
    } else {
      console.error(`❌ Error removing '${attributeKey}' from '${collectionName}':`, error.message);
      return false;
    }
  }
}

async function verifyAttribute(collectionId, attributeKey, collectionName) {
  try {
    const attribute = await databases.getAttribute(DATABASE_ID, collectionId, attributeKey);
    console.log(`   Found attribute '${attributeKey}' in '${collectionName}': type=${attribute.type}, required=${attribute.required}`);
    return true;
  } catch (error) {
    if (error.code === 404) {
      console.log(`   ✅ Attribute '${attributeKey}' not found in '${collectionName}' (already removed)`);
      return false;
    } else {
      console.error(`   ⚠️  Error checking attribute: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Appwrite Database Cleanup: Remove Deprecated Attributes');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`\nDatabase ID: ${DATABASE_ID}`);
  console.log(`Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}`);
  console.log(`Project: ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`);

  // Verify API key is set
  if (!process.env.APPWRITE_API_KEY) {
    console.error('\n❌ ERROR: APPWRITE_API_KEY not found in .env.local');
    console.log('\n📝 To fix this:');
    console.log('1. Go to Appwrite Console → Your Project → Settings → API Keys');
    console.log('2. Create a new API Key with "Database" scope (read + write)');
    console.log('3. Add to .env.local: APPWRITE_API_KEY=your_api_key_here');
    process.exit(1);
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('STEP 1: Verify current attributes');
  console.log('─────────────────────────────────────────────────────────');

  console.log('\n📋 Checking sprints collection:');
  const capacityExists = await verifyAttribute(SPRINTS_COLLECTION_ID, 'capacity', 'sprints');
  
  console.log('\n📋 Checking tasks collection:');
  const storyPointsExists = await verifyAttribute(TASKS_COLLECTION_ID, 'storyPoints', 'tasks');

  if (!capacityExists && !storyPointsExists) {
    console.log('\n✅ All deprecated attributes already removed! Nothing to do.');
    process.exit(0);
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('STEP 2: Remove deprecated attributes');
  console.log('─────────────────────────────────────────────────────────');

  const results = [];

  // Remove capacity from sprints
  if (capacityExists) {
    const result1 = await removeAttribute(SPRINTS_COLLECTION_ID, 'capacity', 'sprints');
    results.push(result1);
    
    // Wait a bit for Appwrite to process
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Remove storyPoints from tasks
  if (storyPointsExists) {
    const result2 = await removeAttribute(TASKS_COLLECTION_ID, 'storyPoints', 'tasks');
    results.push(result2);
    
    // Wait a bit for Appwrite to process
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('STEP 3: Verify removal');
  console.log('─────────────────────────────────────────────────────────');

  console.log('\n📋 Verifying sprints collection:');
  await verifyAttribute(SPRINTS_COLLECTION_ID, 'capacity', 'sprints');
  
  console.log('\n📋 Verifying tasks collection:');
  await verifyAttribute(TASKS_COLLECTION_ID, 'storyPoints', 'tasks');

  console.log('\n═════════════════════════════════════════════════════════');
  if (results.every(r => r)) {
    console.log('✅ SUCCESS: All deprecated attributes removed successfully!');
  } else {
    console.log('⚠️  PARTIAL SUCCESS: Some attributes could not be removed');
    console.log('    Check error messages above for details');
  }
  console.log('═════════════════════════════════════════════════════════');
  console.log('\n📝 Next Steps:');
  console.log('   1. Verify your application still works correctly');
  console.log('   2. Test creating/updating sprints and tasks');
  console.log('   3. Check that no UI shows story points or capacity');
  console.log('   4. Run: npm run type-check && npm run dev');
  console.log('');
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
