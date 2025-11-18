/**
 * Create Non-Unique Email Index
 * Creates a regular key index instead of unique for email
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

async function createKeyIndex() {
  try {
    console.log('🔧 Creating non-unique email index...\n');

    // Delete the failed unique index
    try {
      console.log('1️⃣ Deleting failed unique email_index...');
      await databases.deleteIndex(DATABASE_ID, COLLECTION_ID, 'email_index');
      console.log('✅ Failed index deleted');
    } catch (error: any) {
      if (error.code === 404) {
        console.log('⏭️  Index already deleted');
      } else {
        console.log('⚠️  Could not delete:', error.message);
      }
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create a regular key index (non-unique)
    console.log('\n2️⃣ Creating regular key index for email...');
    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'email_key_index',
      'key' as any,
      ['email']
    );
    console.log('✅ Key index created');

    // Wait for it to process
    console.log('\n⏳ Waiting for index to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check status
    const indexes = await databases.listIndexes(DATABASE_ID, COLLECTION_ID);
    const emailIndex = indexes.indexes.find((idx: any) => idx.key === 'email_key_index');
    
    if (emailIndex) {
      console.log(`\n📊 Email Index Status: ${emailIndex.status}`);
      if (emailIndex.status === 'available') {
        console.log('✅ Index is ready to use!');
      } else if (emailIndex.status === 'processing') {
        console.log('⏳ Index is processing... may take a few moments');
      } else {
        console.log(`⚠️  Index status: ${emailIndex.status}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error creating index:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    throw error;
  }
}

// Run the fix
createKeyIndex()
  .then(() => {
    console.log('\n🎉 Index creation complete!');
    console.log('\n💡 Now you can query by email using Query.equal()');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Index creation failed:', error);
    process.exit(1);
  });
