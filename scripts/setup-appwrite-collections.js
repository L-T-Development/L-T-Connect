#!/usr/bin/env node

/**
 * Appwrite Collection Setup Script
 * 
 * This script automatically creates and updates Appwrite collections
 * to match the application's schema requirements.
 * 
 * Usage:
 *   node scripts/setup-appwrite-collections.js
 * 
 * Prerequisites:
 *   1. Install node-appwrite: npm install node-appwrite
 *   2. Set environment variables in .env.local
 *   3. Have Appwrite API key with proper permissions
 */

const sdk = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

// Initialize Appwrite Client
const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Color codes for console output
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

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Helper to create attribute with retry
async function createAttribute(collectionId, attributeConfig, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { key, type, size, required, xdefault, array } = attributeConfig;
      
      switch (type) {
        case 'string':
          if (array) {
            await databases.createStringAttribute(
              DATABASE_ID,
              collectionId,
              key,
              size || 255,
              required || false,
              xdefault,
              true // array
            );
          } else {
            await databases.createStringAttribute(
              DATABASE_ID,
              collectionId,
              key,
              size || 255,
              required || false,
              xdefault
            );
          }
          break;
        case 'integer':
          await databases.createIntegerAttribute(
            DATABASE_ID,
            collectionId,
            key,
            required || false,
            null,
            null,
            xdefault
          );
          break;
        case 'float':
        case 'double':
          await databases.createFloatAttribute(
            DATABASE_ID,
            collectionId,
            key,
            required || false,
            null,
            null,
            xdefault
          );
          break;
        case 'boolean':
          await databases.createBooleanAttribute(
            DATABASE_ID,
            collectionId,
            key,
            required || false,
            xdefault
          );
          break;
        case 'datetime':
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            collectionId,
            key,
            required || false,
            xdefault
          );
          break;
        default:
          throw new Error(`Unknown attribute type: ${type}`);
      }
      
      return true;
    } catch (error) {
      if (error.message?.includes('already exists') || error.code === 409) {
        logWarning(`Attribute '${attributeConfig.key}' already exists in ${collectionId}`);
        return true;
      }
      
      if (i === retries - 1) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

// Helper to create index
async function createIndex(collectionId, indexConfig) {
  try {
    const { key, type, attributes } = indexConfig;
    await databases.createIndex(
      DATABASE_ID,
      collectionId,
      key,
      type,
      attributes
    );
    return true;
  } catch (error) {
    if (error.message?.includes('already exists') || error.code === 409) {
      logWarning(`Index '${indexConfig.key}' already exists in ${collectionId}`);
      return true;
    }
    throw error;
  }
}

// Collection Schemas
const COLLECTION_SCHEMAS = {
  // ===== NEW COLLECTION: active_timers =====
  active_timers: {
    name: 'Active Timers',
    create: true, // Create if doesn't exist
    attributes: [
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'workspaceId', type: 'string', size: 255, required: true },
      { key: 'taskId', type: 'string', size: 255, required: false },
      { key: 'startTime', type: 'datetime', required: true },
      { key: 'endTime', type: 'datetime', required: false },
      { key: 'description', type: 'string', size: 1000, required: false },
    ],
    indexes: [
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'taskId', type: 'key', attributes: ['taskId'] },
    ],
  },

  // ===== UPDATE: attendance collection =====
  attendance: {
    name: 'Attendance',
    recreate: true, // Delete and recreate (has wrong attribute names)
    attributes: [
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'workspaceId', type: 'string', size: 255, required: true },
      { key: 'date', type: 'string', size: 50, required: true },
      { key: 'checkInTime', type: 'string', size: 255, required: true }, // FIXED NAME
      { key: 'checkOutTime', type: 'string', size: 255, required: false }, // FIXED NAME
      { key: 'workHours', type: 'float', required: false }, // FIXED NAME
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'lateMinutes', type: 'integer', required: false },
      { key: 'location', type: 'string', size: 500, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'isWeekend', type: 'boolean', required: false, xdefault: false },
      { key: 'isHoliday', type: 'boolean', required: false, xdefault: false },
      { key: 'createdBy', type: 'string', size: 255, required: false },
      { key: 'createdByName', type: 'string', size: 255, required: false },
    ],
    indexes: [
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'date', type: 'key', attributes: ['date'] },
      { key: 'userId_date', type: 'unique', attributes: ['userId', 'date'] },
    ],
  },

  // ===== UPDATE: tasks collection =====
  tasks: {
    name: 'Tasks',
    addAttributes: [ // Only add new attributes
      { key: 'assignedBy', type: 'string', size: 255, required: false },
      { key: 'assignedByName', type: 'string', size: 255, required: false },
      { key: 'assignedTo', type: 'string', size: 255, required: false, array: true },
      { key: 'assignedToNames', type: 'string', size: 255, required: false, array: true },
      { key: 'createdByName', type: 'string', size: 255, required: false },
      { key: 'watcherIds', type: 'string', size: 255, required: false, array: true },
    ],
  },

  // ===== UPDATE: projects collection =====
  projects: {
    name: 'Projects',
    addAttributes: [
      { key: 'createdBy', type: 'string', size: 255, required: false },
      { key: 'createdByName', type: 'string', size: 255, required: false },
    ],
  },

  // ===== UPDATE: epics collection =====
  epics: {
    name: 'Epics',
    addAttributes: [
      { key: 'createdByName', type: 'string', size: 255, required: false },
    ],
  },

  // ===== UPDATE: sprints collection =====
  sprints: {
    name: 'Sprints',
    addAttributes: [
      { key: 'createdByName', type: 'string', size: 255, required: false },
    ],
  },

  // ===== UPDATE: functional_requirements collection =====
  functional_requirements: {
    name: 'Functional Requirements',
    addAttributes: [
      { key: 'createdByName', type: 'string', size: 255, required: false },
    ],
  },

  // ===== UPDATE: client_requirements collection =====
  client_requirements: {
    name: 'Client Requirements',
    addAttributes: [
      { key: 'createdByName', type: 'string', size: 255, required: false },
    ],
  },

  // ===== UPDATE: leave_requests collection =====
  leave_requests: {
    name: 'Leave Requests',
    addAttributes: [
      { key: 'createdBy', type: 'string', size: 255, required: false },
      { key: 'createdByName', type: 'string', size: 255, required: false },
    ],
  },
};

// Check if collection exists
async function collectionExists(collectionId) {
  try {
    await databases.getCollection(DATABASE_ID, collectionId);
    return true;
  } catch (error) {
    if (error.code === 404) return false;
    throw error;
  }
}

// Delete collection
async function deleteCollection(collectionId) {
  try {
    await databases.deleteCollection(DATABASE_ID, collectionId);
    logSuccess(`Deleted collection: ${collectionId}`);
    // Wait for deletion to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (error) {
    if (error.code === 404) {
      logWarning(`Collection '${collectionId}' doesn't exist (already deleted)`);
      return true;
    }
    throw error;
  }
}

// Create collection
async function createCollection(collectionId, name) {
  try {
    await databases.createCollection(
      DATABASE_ID,
      collectionId,
      name,
      [sdk.Permission.read(sdk.Role.any())],
      [sdk.Permission.create(sdk.Role.any()), sdk.Permission.update(sdk.Role.any()), sdk.Permission.delete(sdk.Role.any())]
    );
    logSuccess(`Created collection: ${collectionId}`);
    // Wait for collection creation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (error) {
    if (error.message?.includes('already exists') || error.code === 409) {
      logWarning(`Collection '${collectionId}' already exists`);
      return true;
    }
    throw error;
  }
}

// Process a single collection
async function processCollection(collectionId, schema) {
  log(`\n${'='.repeat(60)}`, 'bright');
  logInfo(`Processing collection: ${collectionId}`);
  log('='.repeat(60), 'bright');

  const exists = await collectionExists(collectionId);

  // Handle recreation (for attendance)
  if (schema.recreate) {
    if (exists) {
      logWarning(`Collection needs to be recreated (has wrong schema)`);
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question(`⚠️  Delete and recreate '${collectionId}' collection? (yes/no): `, resolve);
      });
      rl.close();

      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        await deleteCollection(collectionId);
        await createCollection(collectionId, schema.name);
      } else {
        logWarning(`Skipped recreation of '${collectionId}'`);
        return;
      }
    } else {
      await createCollection(collectionId, schema.name);
    }

    // Create all attributes
    logInfo(`Creating attributes for ${collectionId}...`);
    for (const attr of schema.attributes) {
      try {
        await createAttribute(collectionId, attr);
        logSuccess(`  ✓ Created attribute: ${attr.key} (${attr.type})`);
        // Wait between attributes
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logError(`  ✗ Failed to create attribute '${attr.key}': ${error.message}`);
      }
    }

    // Create indexes
    if (schema.indexes) {
      logInfo(`Creating indexes for ${collectionId}...`);
      // Wait for attributes to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      for (const index of schema.indexes) {
        try {
          await createIndex(collectionId, index);
          logSuccess(`  ✓ Created index: ${index.key}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logError(`  ✗ Failed to create index '${index.key}': ${error.message}`);
        }
      }
    }
  }
  // Handle new collection creation
  else if (schema.create) {
    if (!exists) {
      await createCollection(collectionId, schema.name);
      
      // Create all attributes
      logInfo(`Creating attributes for ${collectionId}...`);
      for (const attr of schema.attributes) {
        try {
          await createAttribute(collectionId, attr);
          logSuccess(`  ✓ Created attribute: ${attr.key} (${attr.type})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logError(`  ✗ Failed to create attribute '${attr.key}': ${error.message}`);
        }
      }

      // Create indexes
      if (schema.indexes) {
        logInfo(`Creating indexes for ${collectionId}...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        for (const index of schema.indexes) {
          try {
            await createIndex(collectionId, index);
            logSuccess(`  ✓ Created index: ${index.key}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            logError(`  ✗ Failed to create index '${index.key}': ${error.message}`);
          }
        }
      }
    } else {
      logWarning(`Collection '${collectionId}' already exists. Skipping creation.`);
    }
  }
  // Handle adding attributes to existing collection
  else if (schema.addAttributes) {
    if (!exists) {
      logWarning(`Collection '${collectionId}' doesn't exist. Skipping.`);
      return;
    }

    logInfo(`Adding new attributes to ${collectionId}...`);
    for (const attr of schema.addAttributes) {
      try {
        await createAttribute(collectionId, attr);
        logSuccess(`  ✓ Added attribute: ${attr.key} (${attr.type}${attr.array ? '[]' : ''})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        // Attribute might already exist
        if (error.message?.includes('already exists') || error.code === 409) {
          logWarning(`  ~ Attribute '${attr.key}' already exists`);
        } else {
          logError(`  ✗ Failed to add attribute '${attr.key}': ${error.message}`);
        }
      }
    }
  }

  logSuccess(`Completed processing: ${collectionId}\n`);
}

// Main execution
async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 APPWRITE COLLECTION SETUP SCRIPT', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  // Validate environment variables
  if (!DATABASE_ID) {
    logError('NEXT_PUBLIC_APPWRITE_DATABASE_ID not found in .env.local');
    process.exit(1);
  }

  if (!process.env.APPWRITE_API_KEY) {
    logError('APPWRITE_API_KEY not found in .env.local');
    logError('Please add your Appwrite API key to .env.local');
    process.exit(1);
  }

  logInfo(`Database ID: ${DATABASE_ID}`);
  logInfo(`Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}\n`);

  try {
    // Test connection
    logInfo('Testing Appwrite connection...');
    await databases.get(DATABASE_ID);
    logSuccess('Connected to Appwrite successfully!\n');

    // Process each collection
    for (const [collectionId, schema] of Object.entries(COLLECTION_SCHEMAS)) {
      try {
        await processCollection(collectionId, schema);
      } catch (error) {
        logError(`Failed to process collection '${collectionId}': ${error.message}`);
        console.error(error);
      }
    }

    log('\n' + '='.repeat(60), 'bright');
    log('✅ SETUP COMPLETE!', 'green');
    log('='.repeat(60), 'bright');
    
    logInfo('\nNext steps:');
    logInfo('1. Restart your Next.js server: npm run dev');
    logInfo('2. Test attendance check-in');
    logInfo('3. Test time tracking');
    logInfo('4. Test workspace deletion');
    log('');

  } catch (error) {
    logError(`\n❌ Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { processCollection, COLLECTION_SCHEMAS };
