#!/usr/bin/env node
/**
 * Fix Attendance Collection Script
 * This script adds the missing attributes to the existing attendance collection
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

// Color codes for console output
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

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Attributes that need to be added/renamed
const newAttributes = [
  { key: 'checkInTime', type: 'string', size: 50, required: true },
  { key: 'checkOutTime', type: 'string', size: 50, required: false },
  { key: 'workHours', type: 'double', required: false },
  { key: 'lateMinutes', type: 'integer', required: false },
  { key: 'location', type: 'string', size: 500, required: false },
  { key: 'isWeekend', type: 'boolean', required: false },
  { key: 'isHoliday', type: 'boolean', required: false },
  { key: 'createdBy', type: 'string', size: 50, required: false },
  { key: 'createdByName', type: 'string', size: 255, required: false },
];

async function addAttribute(attribute) {
  try {
    const { key, type, size, required } = attribute;
    
    if (type === 'string') {
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        key,
        size,
        required
      );
    } else if (type === 'integer') {
      await databases.createIntegerAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        key,
        required
      );
    } else if (type === 'double') {
      await databases.createFloatAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        key,
        required
      );
    } else if (type === 'boolean') {
      await databases.createBooleanAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        key,
        required
      );
    }
    
    logSuccess(`  ✓ Added attribute: ${key} (${type})`);
    // Wait for attribute to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (error) {
    if (error.message?.includes('already exists') || error.code === 409) {
      logWarning(`Attribute '${attribute.key}' already exists`);
      return true;
    }
    throw error;
  }
}

async function main() {
  try {
    log('\n' + '='.repeat(60), 'bright');
    log('🔧 FIX ATTENDANCE COLLECTION', 'bright');
    log('='.repeat(60), 'bright');
    
    logInfo(`Database ID: ${DATABASE_ID}`);
    logInfo(`Collection ID: ${COLLECTION_ID}`);
    logInfo('');
    
    logInfo('Adding new attributes to attendance collection...');
    
    for (const attribute of newAttributes) {
      await addAttribute(attribute);
    }
    
    log('\n' + '='.repeat(60), 'bright');
    logSuccess('ATTENDANCE COLLECTION FIXED!');
    log('='.repeat(60), 'bright');
    
    logInfo('\nNext steps:');
    logInfo('1. Go to Appwrite Console → Databases → attendance collection');
    logInfo('2. Delete old attributes: checkIn, checkOut, workingHours (if they exist)');
    logInfo('3. Restart your Next.js server: npm run dev');
    logInfo('4. Test attendance check-in');
    
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
