#!/usr/bin/env node

/**
 * Appwrite Database Schema Setup Script
 * 
 * This script automatically creates and updates all required collections
 * and attributes in your Appwrite database.
 * 
 * Usage:
 *   node scripts/setup-database-schema.js
 * 
 * Prerequisites:
 *   - npm install node-appwrite
 *   - .env.local file with Appwrite credentials
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

// Sleep helper for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a new collection
 */
async function createCollection(collectionId, name) {
  try {
    log(`\n📦 Creating collection: ${name} (${collectionId})...`, 'cyan');
    
    await databases.createCollection(
      DATABASE_ID,
      collectionId,
      name,
      [
        sdk.Permission.read(sdk.Role.users()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    
    log(`✅ Collection '${name}' created successfully!`, 'green');
    return true;
  } catch (error) {
    if (error.code === 409) {
      log(`⚠️  Collection '${name}' already exists, skipping...`, 'yellow');
      return false;
    }
    log(`❌ Error creating collection '${name}': ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Create an attribute in a collection
 */
async function createAttribute(collectionId, attributeConfig) {
  const { key, type, size, required = false, array = false, defaultValue } = attributeConfig;
  
  try {
    log(`  📝 Adding attribute: ${key} (${type}${array ? '[]' : ''})...`, 'blue');
    
    // Wait a bit to avoid rate limiting
    await sleep(500);
    
    let result;
    switch (type) {
      case 'string':
        if (array) {
          result = await databases.createStringAttribute(
            DATABASE_ID,
            collectionId,
            key,
            size || 255,
            required,
            defaultValue,
            true // array
          );
        } else {
          result = await databases.createStringAttribute(
            DATABASE_ID,
            collectionId,
            key,
            size || 255,
            required,
            defaultValue
          );
        }
        break;
        
      case 'integer':
        result = await databases.createIntegerAttribute(
          DATABASE_ID,
          collectionId,
          key,
          required,
          undefined, // min
          undefined, // max
          defaultValue
        );
        break;
        
      case 'float':
        result = await databases.createFloatAttribute(
          DATABASE_ID,
          collectionId,
          key,
          required,
          undefined, // min
          undefined, // max
          defaultValue
        );
        break;
        
      case 'boolean':
        result = await databases.createBooleanAttribute(
          DATABASE_ID,
          collectionId,
          key,
          required,
          defaultValue
        );
        break;
        
      case 'datetime':
        result = await databases.createDatetimeAttribute(
          DATABASE_ID,
          collectionId,
          key,
          required,
          defaultValue
        );
        break;
        
      case 'enum':
        result = await databases.createEnumAttribute(
          DATABASE_ID,
          collectionId,
          key,
          attributeConfig.elements,
          required,
          defaultValue
        );
        break;
        
      default:
        log(`    ⚠️  Unknown attribute type: ${type}`, 'yellow');
        return;
    }
    
    log(`    ✅ Attribute '${key}' added`, 'green');
  } catch (error) {
    if (error.code === 409) {
      log(`    ⚠️  Attribute '${key}' already exists, skipping...`, 'yellow');
    } else {
      log(`    ❌ Error adding attribute '${key}': ${error.message}`, 'red');
      throw error;
    }
  }
}

/**
 * Create an index
 */
async function createIndex(collectionId, indexKey, type, attributes, orders = []) {
  try {
    log(`  🔍 Creating index: ${indexKey}...`, 'blue');
    
    // Wait to avoid rate limiting
    await sleep(500);
    
    await databases.createIndex(
      DATABASE_ID,
      collectionId,
      indexKey,
      type,
      attributes,
      orders.length > 0 ? orders : undefined
    );
    
    log(`    ✅ Index '${indexKey}' created`, 'green');
  } catch (error) {
    if (error.code === 409) {
      log(`    ⚠️  Index '${indexKey}' already exists, skipping...`, 'yellow');
    } else {
      log(`    ❌ Error creating index '${indexKey}': ${error.message}`, 'red');
      // Don't throw - indexes are not critical
    }
  }
}

/**
 * Setup active_timers collection
 */
async function setupActiveTimersCollection() {
  const collectionId = 'active_timers';
  const collectionName = 'Active Timers';
  
  await createCollection(collectionId, collectionName);
  
  // Add attributes
  const attributes = [
    { key: 'userId', type: 'string', size: 255, required: true },
    { key: 'workspaceId', type: 'string', size: 255, required: true },
    { key: 'taskId', type: 'string', size: 255, required: false },
    { key: 'startTime', type: 'datetime', required: true },
    { key: 'endTime', type: 'datetime', required: false },
    { key: 'description', type: 'string', size: 1000, required: false },
  ];
  
  for (const attr of attributes) {
    await createAttribute(collectionId, attr);
  }
  
  // Add indexes
  await createIndex(collectionId, 'userId_idx', 'key', ['userId']);
  await createIndex(collectionId, 'workspaceId_idx', 'key', ['workspaceId']);
  await createIndex(collectionId, 'taskId_idx', 'key', ['taskId']);
}

/**
 * Update existing collections with new attributes
 */
async function updateExistingCollections() {
  log('\n🔄 Updating existing collections with new attributes...', 'cyan');
  
  // Tasks collection
  log('\n📦 Updating tasks collection...', 'cyan');
  const tasksAttributes = [
    { key: 'assignedBy', type: 'string', size: 255, required: false },
    { key: 'assignedByName', type: 'string', size: 255, required: false },
    { key: 'assignedTo', type: 'string', size: 255, required: false, array: true },
    { key: 'assignedToNames', type: 'string', size: 255, required: false, array: true },
    { key: 'createdByName', type: 'string', size: 255, required: false },
  ];
  
  for (const attr of tasksAttributes) {
    await createAttribute('tasks', attr);
  }
  
  // Projects collection
  log('\n📦 Updating projects collection...', 'cyan');
  const projectsAttributes = [
    { key: 'createdBy', type: 'string', size: 255, required: false },
    { key: 'createdByName', type: 'string', size: 255, required: false },
  ];
  
  for (const attr of projectsAttributes) {
    await createAttribute('projects', attr);
  }
  
  // Epics collection
  log('\n📦 Updating epics collection...', 'cyan');
  await createAttribute('epics', { key: 'createdByName', type: 'string', size: 255, required: false });
  
  // Sprints collection
  log('\n📦 Updating sprints collection...', 'cyan');
  await createAttribute('sprints', { key: 'createdByName', type: 'string', size: 255, required: false });
  
  // Functional requirements collection
  log('\n📦 Updating functional_requirements collection...', 'cyan');
  await createAttribute('functional_requirements', { key: 'createdByName', type: 'string', size: 255, required: false });
  
  // Client requirements collection
  log('\n📦 Updating client_requirements collection...', 'cyan');
  await createAttribute('client_requirements', { key: 'createdByName', type: 'string', size: 255, required: false });
  
  // Leave requests collection
  log('\n📦 Updating leave_requests collection...', 'cyan');
  const leaveAttributes = [
    { key: 'createdBy', type: 'string', size: 255, required: false },
    { key: 'createdByName', type: 'string', size: 255, required: false },
  ];
  
  for (const attr of leaveAttributes) {
    await createAttribute('leave_requests', attr);
  }
}

/**
 * Main execution
 */
async function main() {
  log('\n🚀 Starting Appwrite Database Schema Setup...', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
    log('❌ Error: NEXT_PUBLIC_APPWRITE_ENDPOINT not found in .env.local', 'red');
    process.exit(1);
  }
  
  if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
    log('❌ Error: NEXT_PUBLIC_APPWRITE_PROJECT_ID not found in .env.local', 'red');
    process.exit(1);
  }
  
  if (!process.env.APPWRITE_API_KEY) {
    log('❌ Error: APPWRITE_API_KEY not found in .env.local', 'red');
    log('💡 Tip: Get your API key from Appwrite Console → Project Settings → API Keys', 'yellow');
    process.exit(1);
  }
  
  if (!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID) {
    log('❌ Error: NEXT_PUBLIC_APPWRITE_DATABASE_ID not found in .env.local', 'red');
    process.exit(1);
  }
  
  log('✅ Environment variables validated', 'green');
  log(`📊 Database ID: ${DATABASE_ID}`, 'blue');
  
  try {
    // Step 1: Create active_timers collection
    log('\n' + '='.repeat(60), 'cyan');
    log('STEP 1: Creating new collections', 'cyan');
    log('='.repeat(60), 'cyan');
    await setupActiveTimersCollection();
    
    // Step 2: Update existing collections
    log('\n' + '='.repeat(60), 'cyan');
    log('STEP 2: Updating existing collections', 'cyan');
    log('='.repeat(60), 'cyan');
    await updateExistingCollections();
    
    // Success!
    log('\n' + '='.repeat(60), 'green');
    log('✅ DATABASE SCHEMA SETUP COMPLETE!', 'green');
    log('='.repeat(60), 'green');
    log('\n📋 Next Steps:', 'cyan');
    log('  1. Verify collections in Appwrite Console', 'blue');
    log('  2. Restart your Next.js development server', 'blue');
    log('  3. Test attendance check-in', 'blue');
    log('  4. Test time tracking', 'blue');
    log('  5. Test task creation with assignments', 'blue');
    log('\n✨ Happy coding!', 'green');
    
  } catch (error) {
    log('\n❌ Setup failed with error:', 'red');
    log(error.message, 'red');
    log('\n💡 Tips:', 'yellow');
    log('  - Check your APPWRITE_API_KEY has proper permissions', 'yellow');
    log('  - Verify database ID is correct', 'yellow');
    log('  - Check Appwrite Console for more details', 'yellow');
    process.exit(1);
  }
}

// Run the script
main();
