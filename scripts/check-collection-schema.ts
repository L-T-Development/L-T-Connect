/**
 * Check Collection Schema
 * Lists all attributes in the app_users collection
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
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_APP_USERS_ID!;

async function checkSchema() {
  try {
    console.log('🔍 Checking Collection Schema...\n');
    console.log(`Database ID: ${DATABASE_ID}`);
    console.log(`Collection ID: ${COLLECTION_ID}\n`);

    // Get collection info
    const collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
    console.log(`📋 Collection: ${collection.name} (${collection.$id})`);
    console.log(`   Created: ${collection.$createdAt}`);
    console.log(`   Updated: ${collection.$updatedAt}\n`);

    // List all attributes
    const attributes = await databases.listAttributes(DATABASE_ID, COLLECTION_ID);
    console.log(`📊 Attributes (${attributes.total} total):\n`);
    
    attributes.attributes.forEach((attr: any, index: number) => {
      console.log(`${index + 1}. ${attr.key}`);
      console.log(`   Type: ${attr.type}`);
      console.log(`   Required: ${attr.required}`);
      console.log(`   Status: ${attr.status}`);
      if (attr.size) console.log(`   Size: ${attr.size}`);
      if (attr.array) console.log(`   Array: ${attr.array}`);
      console.log('');
    });

    // List all indexes
    const indexes = await databases.listIndexes(DATABASE_ID, COLLECTION_ID);
    console.log(`📇 Indexes (${indexes.total} total):\n`);
    
    indexes.indexes.forEach((index: any, i: number) => {
      console.log(`${i + 1}. ${index.key}`);
      console.log(`   Type: ${index.type}`);
      console.log(`   Status: ${index.status}`);
      console.log(`   Attributes: ${index.attributes.join(', ')}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error checking schema:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    throw error;
  }
}

// Run the check
checkSchema()
  .then(() => {
    console.log('\n✅ Schema check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Schema check failed:', error);
    process.exit(1);
  });
