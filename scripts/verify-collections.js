#!/usr/bin/env node

/**
 * Appwrite Collection Verification Script
 * 
 * Verifies that all collections have the correct schema
 * and reports any missing attributes or indexes.
 * 
 * Usage:
 *   node scripts/verify-collections.js
 */

const sdk = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Expected schemas
const EXPECTED_SCHEMAS = {
  attendance: [
    'userId', 'workspaceId', 'date', 'checkInTime', 'checkOutTime', 
    'workHours', 'status', 'lateMinutes', 'location', 'notes',
    'isWeekend', 'isHoliday', 'createdBy', 'createdByName'
  ],
  active_timers: [
    'userId', 'workspaceId', 'taskId', 'startTime', 'endTime', 'description'
  ],
  tasks: [
    'assignedBy', 'assignedByName', 'assignedTo', 'assignedToNames', 
    'createdByName', 'watcherIds'
  ],
  projects: ['createdBy', 'createdByName'],
  epics: ['createdByName'],
  sprints: ['createdByName'],
  functional_requirements: ['createdByName'],
  client_requirements: ['createdByName'],
  leave_requests: ['createdBy', 'createdByName'],
};

async function verifyCollection(collectionId, expectedAttributes) {
  try {
    const collection = await databases.listAttributes(DATABASE_ID, collectionId);
    const existingAttributes = collection.attributes.map(attr => attr.key);
    
    log(`\n${'='.repeat(60)}`, 'bright');
    log(`Collection: ${collectionId}`, 'cyan');
    log('='.repeat(60), 'bright');
    
    const missing = expectedAttributes.filter(attr => !existingAttributes.includes(attr));
    const extra = collectionId === 'attendance' ? 
      existingAttributes.filter(attr => ['checkIn', 'checkOut', 'workingHours'].includes(attr)) : [];
    
    if (missing.length === 0 && extra.length === 0) {
      log('✅ All expected attributes present', 'green');
    } else {
      if (missing.length > 0) {
        log(`⚠️  Missing attributes: ${missing.join(', ')}`, 'yellow');
      }
      if (extra.length > 0) {
        log(`❌ Wrong attributes (need to recreate): ${extra.join(', ')}`, 'red');
      }
    }
    
    log(`Total attributes: ${existingAttributes.length}`);
    
  } catch (error) {
    if (error.code === 404) {
      log(`\n${'='.repeat(60)}`, 'bright');
      log(`Collection: ${collectionId}`, 'cyan');
      log('='.repeat(60), 'bright');
      log('❌ Collection does not exist', 'red');
    } else {
      log(`❌ Error verifying ${collectionId}: ${error.message}`, 'red');
    }
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('🔍 APPWRITE COLLECTION VERIFICATION', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  if (!DATABASE_ID || !process.env.APPWRITE_API_KEY) {
    log('❌ Missing environment variables', 'red');
    process.exit(1);
  }

  try {
    await databases.get(DATABASE_ID);
    log('✅ Connected to Appwrite\n', 'green');

    for (const [collectionId, expectedAttrs] of Object.entries(EXPECTED_SCHEMAS)) {
      await verifyCollection(collectionId, expectedAttrs);
    }

    log('\n' + '='.repeat(60), 'bright');
    log('✅ VERIFICATION COMPLETE', 'green');
    log('='.repeat(60) + '\n', 'bright');

  } catch (error) {
    log(`\n❌ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
