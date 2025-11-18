#!/usr/bin/env node
/**
 * Create Attendance Collection Script
 * This script creates the attendance collection with the correct schema
 */

require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

// Configuration
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = 'attendance';

// Initialize SDK
const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new sdk.Databases(client);

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function main() {
  try {
    log('\n' + '='.repeat(60), 'bright');
    log('🏗️  CREATE ATTENDANCE COLLECTION', 'bright');
    log('='.repeat(60), 'bright');
    
    logInfo('Creating attendance collection...');
    
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_ID,
      'Attendance'
    );
    
    logSuccess('Collection created!');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create attributes
    const attributes = [
      { method: 'createStringAttribute', args: ['userId', 50, true] },
      { method: 'createStringAttribute', args: ['workspaceId', 50, true] },
      { method: 'createStringAttribute', args: ['checkInTime', 50, true] },
      { method: 'createStringAttribute', args: ['checkOutTime', 50, false] },
      { method: 'createFloatAttribute', args: ['workHours', false] },
      { method: 'createIntegerAttribute', args: ['lateMinutes', false] },
      { method: 'createStringAttribute', args: ['location', 500, false] },
      { method: 'createBooleanAttribute', args: ['isWeekend', false] },
      { method: 'createBooleanAttribute', args: ['isHoliday', false] },
      { method: 'createStringAttribute', args: ['status', 50, false] },
      { method: 'createStringAttribute', args: ['notes', 1000, false] },
      { method: 'createStringAttribute', args: ['ipAddress', 50, false] },
      { method: 'createStringAttribute', args: ['createdBy', 50, false] },
      { method: 'createStringAttribute', args: ['createdByName', 255, false] },
    ];
    
    logInfo('Creating attributes...');
    for (const attr of attributes) {
      try {
        await databases[attr.method](DATABASE_ID, COLLECTION_ID, ...attr.args);
        logSuccess(`  ✓ ${attr.args[0]}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        logError(`  ✗ ${attr.args[0]}: ${error.message}`);
      }
    }
    
    // Create indexes
    logInfo('\nCreating indexes...');
    const indexes = [
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'checkInTime', type: 'key', attributes: ['checkInTime'] },
      { key: 'userId_workspace', type: 'key', attributes: ['userId', 'workspaceId'] },
    ];
    
    for (const index of indexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          COLLECTION_ID,
          index.key,
          index.type,
          index.attributes
        );
        logSuccess(`  ✓ ${index.key}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        logError(`  ✗ ${index.key}: ${error.message}`);
      }
    }
    
    log('\n' + '='.repeat(60), 'bright');
    logSuccess('ATTENDANCE COLLECTION CREATED SUCCESSFULLY!');
    log('='.repeat(60), 'bright');
    
    logInfo('\nNext steps:');
    logInfo('1. Restart your Next.js server: npm run dev');
    logInfo('2. Test attendance check-in');
    
  } catch (error) {
    logError(`Failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
