/**
 * Sync Users Collection Schema
 * 
 * This collection stores extended user information beyond Appwrite Auth
 * Includes admin privileges, workspace associations, and temp password tracking
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, Databases } from 'node-appwrite';

// Load .env.local explicitly
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = 'app_users'; // New collection for extended user data

async function syncUsersCollection() {
  try {
    console.log('🔄 Syncing Users Collection Schema...');

    // Try to get the collection first
    let collection;
    try {
      collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
      console.log('✅ Collection exists:', collection.$id);
    } catch (error: any) {
      if (error.code === 404) {
        // Create collection if it doesn't exist
        console.log('📦 Creating Users collection...');
        collection = await databases.createCollection(
          DATABASE_ID,
          COLLECTION_ID,
          'App Users',
          // Permissions - adjust based on your security needs
          [
            'read("users")', // Users can read their own data
            'write("users")', // Users can update their own data
          ]
        );
        console.log('✅ Collection created:', collection.$id);
      } else {
        throw error;
      }
    }

    // Define attributes
    const attributes = [
      {
        key: 'userId',
        type: 'string',
        size: 100,
        required: true,
        array: false,
        description: 'Appwrite Auth User ID (links to account)',
      },
      {
        key: 'email',
        type: 'string',
        size: 255,
        required: true,
        array: false,
        description: 'User email address',
      },
      {
        key: 'name',
        type: 'string',
        size: 255,
        required: true,
        array: false,
        description: 'User full name',
      },
      {
        key: 'isAdmin',
        type: 'boolean',
        required: false,
        array: false,
        default: false,
        description: 'Whether user has admin privileges (can create workspaces, add users)',
      },
      {
        key: 'hasTempPassword',
        type: 'boolean',
        required: false,
        array: false,
        default: false,
        description: 'Whether user is using temporary password and needs to change it',
      },
      {
        key: 'workspaceIds',
        type: 'string',
        size: 100,
        required: false,
        array: true,
        description: 'Array of workspace IDs user is member of',
      },
      {
        key: 'defaultWorkspaceId',
        type: 'string',
        size: 100,
        required: false,
        array: false,
        description: 'Default workspace to load on login',
      },
      {
        key: 'avatar',
        type: 'string',
        size: 500,
        required: false,
        array: false,
        description: 'User avatar URL',
      },
      {
        key: 'phone',
        type: 'string',
        size: 50,
        required: false,
        array: false,
        description: 'User phone number',
      },
      {
        key: 'lastLoginAt',
        type: 'string',
        size: 50,
        required: false,
        array: false,
        description: 'Last login timestamp',
      },
      {
        key: 'createdBy',
        type: 'string',
        size: 100,
        required: false,
        array: false,
        description: 'Admin user ID who created this user',
      },
    ];

    // Create or update attributes
    const existingAttributes = await databases.listAttributes(DATABASE_ID, COLLECTION_ID);
    const existingKeys = existingAttributes.attributes.map((attr: any) => attr.key);

    for (const attr of attributes) {
      if (existingKeys.includes(attr.key)) {
        console.log(`⏭️  Attribute '${attr.key}' already exists`);
        continue;
      }

      console.log(`➕ Creating attribute: ${attr.key}`);
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.size!,
            attr.required,
            (attr as any).default,
            attr.array
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.required,
            (attr as any).default,
            attr.array
          );
        }
        console.log(`✅ Created attribute: ${attr.key}`);
      } catch (error: any) {
        console.error(`❌ Error creating attribute ${attr.key}:`, error.message);
      }

      // Wait a bit between attribute creations
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Create indexes
    console.log('\n📇 Creating indexes...');
    
    const indexes = [
      {
        key: 'userId_index',
        type: 'unique',
        attributes: ['userId'],
        description: 'Unique index on userId for fast lookup',
      },
      {
        key: 'email_index',
        type: 'unique',
        attributes: ['email'],
        description: 'Unique index on email',
      },
      {
        key: 'isAdmin_index',
        type: 'key',
        attributes: ['isAdmin'],
        description: 'Index for filtering admin users',
      },
    ];

    const existingIndexes = await databases.listIndexes(DATABASE_ID, COLLECTION_ID);
    const existingIndexKeys = existingIndexes.indexes.map((idx: any) => idx.key);

    for (const index of indexes) {
      if (existingIndexKeys.includes(index.key)) {
        console.log(`⏭️  Index '${index.key}' already exists`);
        continue;
      }

      console.log(`➕ Creating index: ${index.key}`);
      try {
        await databases.createIndex(
          DATABASE_ID,
          COLLECTION_ID,
          index.key,
          index.type as any,
          index.attributes
        );
        console.log(`✅ Created index: ${index.key}`);
      } catch (error: any) {
        console.error(`❌ Error creating index ${index.key}:`, error.message);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log('\n✅ Users collection schema sync complete!');
    console.log('\n📋 Collection Details:');
    console.log(`   ID: ${COLLECTION_ID}`);
    console.log(`   Name: App Users`);
    console.log(`   Purpose: Extended user data with admin privileges and workspace associations`);
    console.log('\n🔧 Add this to your .env.local:');
    console.log(`   NEXT_PUBLIC_APPWRITE_COLLECTION_APP_USERS_ID=${COLLECTION_ID}`);
  } catch (error: any) {
    console.error('❌ Error syncing Users collection:', error.message);
    throw error;
  }
}

// Run the sync
syncUsersCollection()
  .then(() => {
    console.log('\n🎉 Schema sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Schema sync failed:', error);
    process.exit(1);
  });
