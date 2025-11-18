#!/usr/bin/env node

/**
 * Appwrite Collection Setup Script
 * 
 * This script creates all necessary Appwrite collections, attributes, and indexes
 * for the L&T Connect application.
 * 
 * Prerequisites:
 * - Node.js >= 18
 * - Appwrite project created
 * - Environment variables configured in .env.local
 * 
 * Usage:
 *   node scripts/setup-appwrite.js
 */

require('dotenv').config({ path: '.env.local' });
const { Client, Databases, Storage, ID } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'ltconnect_db';
const STORAGE_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_ID || 'ltconnect_storage';

// Collection definitions
const collections = [
  {
    id: 'workspaces',
    name: 'Workspaces',
    attributes: [
      { key: 'name', type: 'string', size: 200, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'logo', type: 'string', size: 300, required: false },
      { key: 'color', type: 'string', size: 20, required: false },
      { key: 'ownerId', type: 'string', size: 50, required: true },
      { key: 'memberIds', type: 'string', size: 50, required: false, array: true },
      { key: 'inviteCode', type: 'string', size: 20, required: true },
      { key: 'settings', type: 'string', size: 3000, required: true },
    ],
    indexes: [
      { key: 'inviteCode', type: 'unique', attributes: ['inviteCode'] },
      { key: 'ownerId', type: 'key', attributes: ['ownerId'] },
    ],
  },
  {
    id: 'users',
    name: 'Users',
    attributes: [
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'avatar', type: 'string', size: 500, required: false },
      { key: 'role', type: 'string', size: 50, required: true },
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
    ],
    indexes: [
      { key: 'email', type: 'unique', attributes: ['email'] },
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'shortCode', type: 'string', size: 10, required: true },
      { key: 'description', type: 'string', size: 2000, required: false },
      { key: 'logo', type: 'string', size: 300, required: false },
      { key: 'color', type: 'string', size: 20, required: false },
      { key: 'methodology', type: 'string', size: 20, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'startDate', type: 'string', size: 30, required: false },
      { key: 'endDate', type: 'string', size: 30, required: false },
      { key: 'ownerId', type: 'string', size: 50, required: true },
      { key: 'memberIds', type: 'string', size: 50, required: false, array: true },
      { key: 'settings', type: 'string', size: 5000, required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'shortCode', type: 'key', attributes: ['shortCode'] },
    ],
  },
  {
    id: 'client_requirements',
    name: 'Client Requirements',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'projectId', type: 'string', size: 50, required: true },
      { key: 'title', type: 'string', size: 300, required: true },
      { key: 'description', type: 'string', size: 5000, required: true },
      { key: 'clientName', type: 'string', size: 200, required: true },
      { key: 'priority', type: 'string', size: 20, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'attachments', type: 'string', size: 3000, required: false },
      { key: 'createdBy', type: 'string', size: 50, required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'projectId', type: 'key', attributes: ['projectId'] },
    ],
  },
  {
    id: 'functional_requirements',
    name: 'Functional Requirements',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'projectId', type: 'string', size: 50, required: true },
      { key: 'hierarchyId', type: 'string', size: 50, required: true },
      { key: 'clientRequirementId', type: 'string', size: 50, required: false },
      { key: 'title', type: 'string', size: 300, required: true },
      { key: 'description', type: 'string', size: 5000, required: true },
      { key: 'complexity', type: 'string', size: 20, required: true },
      { key: 'reusable', type: 'boolean', required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'linkedProjectIds', type: 'string', size: 2000, required: false },
      { key: 'tags', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 50, required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'projectId', type: 'key', attributes: ['projectId'] },
      { key: 'hierarchyId_projectId', type: 'unique', attributes: ['hierarchyId', 'projectId'] },
    ],
  },
  {
    id: 'epics',
    name: 'Epics',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'projectId', type: 'string', size: 50, required: true },
      { key: 'functionalRequirementId', type: 'string', size: 50, required: false },
      { key: 'hierarchyId', type: 'string', size: 50, required: true },
      { key: 'name', type: 'string', size: 200, required: true },
      { key: 'description', type: 'string', size: 2000, required: false },
      { key: 'color', type: 'string', size: 20, required: false },
      { key: 'startDate', type: 'string', size: 30, required: false },
      { key: 'endDate', type: 'string', size: 30, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'progress', type: 'integer', required: true },
      { key: 'createdBy', type: 'string', size: 50, required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'projectId', type: 'key', attributes: ['projectId'] },
    ],
  },
  {
    id: 'sprints',
    name: 'Sprints',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'projectId', type: 'string', size: 50, required: true },
      { key: 'name', type: 'string', size: 200, required: true },
      { key: 'goal', type: 'string', size: 1000, required: false },
      { key: 'startDate', type: 'string', size: 30, required: true },
      { key: 'endDate', type: 'string', size: 30, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'retrospectiveNotes', type: 'string', size: 5000, required: false },
      { key: 'createdBy', type: 'string', size: 50, required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'projectId', type: 'key', attributes: ['projectId'] },
      { key: 'status', type: 'key', attributes: ['status'] },
    ],
  },
  {
    id: 'tasks',
    name: 'Tasks',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'projectId', type: 'string', size: 50, required: true },
      { key: 'hierarchyId', type: 'string', size: 50, required: true },
      { key: 'sprintId', type: 'string', size: 50, required: false },
      { key: 'epicId', type: 'string', size: 50, required: false },
      { key: 'parentTaskId', type: 'string', size: 50, required: false },
      { key: 'title', type: 'string', size: 300, required: true },
      { key: 'description', type: 'string', size: 5000, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'priority', type: 'string', size: 20, required: true },
      { key: 'assigneeIds', type: 'string', size: 2000, required: false },
      { key: 'createdBy', type: 'string', size: 50, required: true },
      { key: 'dueDate', type: 'string', size: 30, required: false },
      { key: 'estimatedHours', type: 'integer', required: false },
      { key: 'actualHours', type: 'integer', required: false },
      { key: 'labels', type: 'string', size: 1000, required: false },
      { key: 'attachments', type: 'string', size: 3000, required: false },
      { key: 'customFields', type: 'string', size: 3000, required: false },
      { key: 'position', type: 'integer', required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'projectId', type: 'key', attributes: ['projectId'] },
      { key: 'hierarchyId_projectId', type: 'unique', attributes: ['hierarchyId', 'projectId'] },
      { key: 'sprintId', type: 'key', attributes: ['sprintId'] },
      { key: 'status', type: 'key', attributes: ['status'] },
    ],
  },
  {
    id: 'task_comments',
    name: 'Task Comments',
    attributes: [
      { key: 'taskId', type: 'string', size: 50, required: true },
      { key: 'userId', type: 'string', size: 50, required: true },
      { key: 'content', type: 'string', size: 5000, required: true },
      { key: 'mentions', type: 'string', size: 1000, required: false },
      { key: 'attachments', type: 'string', size: 2000, required: false },
    ],
    indexes: [
      { key: 'taskId', type: 'key', attributes: ['taskId'] },
    ],
  },
  {
    id: 'attendance',
    name: 'Attendance',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'userId', type: 'string', size: 50, required: true },
      { key: 'date', type: 'string', size: 20, required: true },
      { key: 'checkIn', type: 'string', size: 50, required: false },
      { key: 'checkOut', type: 'string', size: 50, required: false },
      { key: 'workingHours', type: 'integer', required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'notes', type: 'string', size: 1000, required: false },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'date', type: 'key', attributes: ['date'] },
      { key: 'userId_date', type: 'unique', attributes: ['userId', 'date'] },
    ],
  },
  {
    id: 'leave_requests',
    name: 'Leave Requests',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'userId', type: 'string', size: 50, required: true },
      { key: 'type', type: 'string', size: 20, required: true },
      { key: 'startDate', type: 'string', size: 20, required: true },
      { key: 'endDate', type: 'string', size: 20, required: true },
      { key: 'reason', type: 'string', size: 2000, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'approvedBy', type: 'string', size: 50, required: false },
      { key: 'approvedAt', type: 'string', size: 50, required: false },
      { key: 'rejectionReason', type: 'string', size: 1000, required: false },
      { key: 'daysCount', type: 'integer', required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'status', type: 'key', attributes: ['status'] },
    ],
  },
  {
    id: 'leave_balances',
    name: 'Leave Balances',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'userId', type: 'string', size: 50, required: true },
      { key: 'year', type: 'integer', required: true },
      { key: 'paidLeave', type: 'integer', required: true },
      { key: 'unpaidLeave', type: 'integer', required: true },
      { key: 'halfDay', type: 'integer', required: true },
      { key: 'compOff', type: 'integer', required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'userId_year', type: 'unique', attributes: ['userId', 'year'] },
    ],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'userId', type: 'string', size: 50, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'message', type: 'string', size: 1000, required: true },
      { key: 'relatedEntityId', type: 'string', size: 50, required: false },
      { key: 'relatedEntityType', type: 'string', size: 50, required: false },
      { key: 'isRead', type: 'boolean', required: true },
      { key: 'actionUrl', type: 'string', size: 500, required: false },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'isRead', type: 'key', attributes: ['isRead'] },
    ],
  },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createDatabase() {
  try {
    console.log(`\n🗄️  Creating database: ${DATABASE_ID}...`);
    await databases.create(DATABASE_ID, 'L&T Connect Database');
    console.log('✅ Database created successfully!');
  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Database already exists');
    } else {
      console.error('❌ Error creating database:', error.message);
      throw error;
    }
  }
}

async function createStorage() {
  try {
    console.log(`\n📦 Creating storage bucket: ${STORAGE_ID}...`);
    await storage.createBucket(
      STORAGE_ID,
      'L&T Connect Storage',
      ['read("any")', 'create("users")', 'update("users")', 'delete("users")'],
      false, // fileSecurity
      true, // enabled
      50000000, // maxFileSize (50MB)
      ['png', 'jpeg', 'jpg', 'gif', 'pdf', 'doc', 'docx'], // allowedFileExtensions (without mime types)
      undefined, // compression
      undefined, // encryption
      undefined  // antivirus
    );
    console.log('✅ Storage bucket created successfully!');
  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Storage bucket already exists');
    } else {
      console.error('❌ Error creating storage:', error.message);
      throw error;
    }
  }
}

async function createCollection(collectionDef) {
  try {
    console.log(`\n📋 Creating collection: ${collectionDef.name}...`);
    
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      collectionDef.id,
      collectionDef.name,
      ['read("any")', 'create("users")', 'update("users")', 'delete("users")']
    );
    console.log(`✅ Collection "${collectionDef.name}" created`);

    // Create attributes
    for (const attr of collectionDef.attributes) {
      await sleep(1000); // Wait between API calls
      console.log(`   Adding attribute: ${attr.key}...`);
      
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            collectionDef.id,
            attr.key,
            attr.size,
            attr.required
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            collectionDef.id,
            attr.key,
            attr.required
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            collectionDef.id,
            attr.key,
            attr.required
          );
        }
      } catch (error) {
        if (error.code === 409) {
          console.log(`   ℹ️  Attribute "${attr.key}" already exists`);
        } else {
          throw error;
        }
      }
    }

    // Create indexes
    if (collectionDef.indexes) {
      for (const index of collectionDef.indexes) {
        await sleep(1000);
        console.log(`   Adding index: ${index.key}...`);
        
        try {
          await databases.createIndex(
            DATABASE_ID,
            collectionDef.id,
            index.key,
            index.type,
            index.attributes
          );
        } catch (error) {
          if (error.code === 409) {
            console.log(`   ℹ️  Index "${index.key}" already exists`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log(`✅ Collection "${collectionDef.name}" setup complete!`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`ℹ️  Collection "${collectionDef.name}" already exists`);
    } else {
      console.error(`❌ Error creating collection "${collectionDef.name}":`, error.message);
      throw error;
    }
  }
}

async function main() {
  console.log('🚀 L&T Connect - Appwrite Setup Script');
  console.log('=====================================\n');

  try {
    // Create database
    await createDatabase();

    // Create storage
    await createStorage();

    // Create all collections
    for (const collection of collections) {
      await createCollection(collection);
      await sleep(2000); // Wait between collections
    }

    console.log('\n🎉 Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify collections in your Appwrite console');
    console.log('2. Adjust permissions if needed');
    console.log('3. Run: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
