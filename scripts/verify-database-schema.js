#!/usr/bin/env node

/**
 * Appwrite Database Schema Verification Script
 * 
 * This script verifies that all required collections and attributes exist
 * in your Appwrite database.
 * 
 * Usage:
 *   node scripts/verify-database-schema.js
 */

require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

// Initialize Appwrite client
const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Expected schema
const EXPECTED_SCHEMA = {
  active_timers: ['userId', 'workspaceId', 'taskId', 'startTime', 'endTime', 'description'],
  tasks: ['assignedBy', 'assignedByName', 'assignedTo', 'assignedToNames', 'createdByName'],
  projects: ['createdBy', 'createdByName'],
  epics: ['createdByName'],
  sprints: ['createdByName'],
  functional_requirements: ['createdByName'],
  client_requirements: ['createdByName'],
  leave_requests: ['createdBy', 'createdByName'],
};

async function verifyCollection(collectionId, expectedAttributes) {
  try {
    log(`\n📦 Checking collection: ${collectionId}`, 'cyan');
    
    const collection = await databases.getCollection(DATABASE_ID, collectionId);
    log(`  ✅ Collection exists`, 'green');
    
    const existingAttributes = collection.attributes.map(attr => attr.key);
    const missing = [];
    const found = [];
    
    for (const attr of expectedAttributes) {
      if (existingAttributes.includes(attr)) {
        found.push(attr);
        log(`    ✅ ${attr}`, 'green');
      } else {
        missing.push(attr);
        log(`    ❌ ${attr} - MISSING`, 'red');
      }
    }
    
    return {
      collectionId,
      exists: true,
      totalExpected: expectedAttributes.length,
      found: found.length,
      missing: missing.length,
      missingAttributes: missing,
    };
  } catch (error) {
    if (error.code === 404) {
      log(`  ❌ Collection does not exist`, 'red');
      return {
        collectionId,
        exists: false,
        totalExpected: expectedAttributes.length,
        found: 0,
        missing: expectedAttributes.length,
        missingAttributes: expectedAttributes,
      };
    }
    throw error;
  }
}

async function main() {
  log('\n🔍 Verifying Appwrite Database Schema...', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  // Validate environment variables
  if (!process.env.APPWRITE_API_KEY) {
    log('❌ Error: APPWRITE_API_KEY not found in .env.local', 'red');
    process.exit(1);
  }
  
  log('✅ Environment variables validated', 'green');
  log(`📊 Database ID: ${DATABASE_ID}`, 'blue');
  
  try {
    const results = [];
    
    for (const [collectionId, attributes] of Object.entries(EXPECTED_SCHEMA)) {
      const result = await verifyCollection(collectionId, attributes);
      results.push(result);
    }
    
    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 VERIFICATION SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const allCollectionsExist = results.every(r => r.exists);
    const allAttributesExist = results.every(r => r.missing === 0);
    
    log(`\nCollections checked: ${results.length}`, 'blue');
    log(`Collections found: ${results.filter(r => r.exists).length}`, allCollectionsExist ? 'green' : 'yellow');
    log(`Collections missing: ${results.filter(r => !r.exists).length}`, allCollectionsExist ? 'green' : 'red');
    
    const totalAttributes = results.reduce((sum, r) => sum + r.totalExpected, 0);
    const foundAttributes = results.reduce((sum, r) => sum + r.found, 0);
    const missingAttributes = results.reduce((sum, r) => sum + r.missing, 0);
    
    log(`\nTotal attributes expected: ${totalAttributes}`, 'blue');
    log(`Attributes found: ${foundAttributes}`, foundAttributes === totalAttributes ? 'green' : 'yellow');
    log(`Attributes missing: ${missingAttributes}`, missingAttributes === 0 ? 'green' : 'red');
    
    if (!allCollectionsExist) {
      log('\n❌ Some collections are missing:', 'red');
      results.filter(r => !r.exists).forEach(r => {
        log(`  - ${r.collectionId}`, 'red');
      });
    }
    
    if (!allAttributesExist) {
      log('\n❌ Some attributes are missing:', 'red');
      results.filter(r => r.missing > 0).forEach(r => {
        log(`  - ${r.collectionId}:`, 'yellow');
        r.missingAttributes.forEach(attr => {
          log(`    - ${attr}`, 'red');
        });
      });
    }
    
    if (allCollectionsExist && allAttributesExist) {
      log('\n✅ ALL CHECKS PASSED!', 'green');
      log('Your database schema is up to date.', 'green');
      log('\n📋 Next steps:', 'cyan');
      log('  1. Restart your development server (npm run dev)', 'blue');
      log('  2. Test your application features', 'blue');
    } else {
      log('\n⚠️  SCHEMA INCOMPLETE', 'yellow');
      log('Run the setup script to create missing collections/attributes:', 'yellow');
      log('  ./scripts/setup-database.sh', 'cyan');
      log('  or', 'cyan');
      log('  node scripts/setup-database-schema.js', 'cyan');
    }
    
  } catch (error) {
    log('\n❌ Verification failed with error:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the script
main();
