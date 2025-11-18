/**
 * Fix Email Index
 * Deletes the failed email index and recreates it
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

async function fixEmailIndex() {
  try {
    console.log('🔧 Fixing Email Index...\n');

    // Delete the failed index
    try {
      console.log('1️⃣ Deleting failed email_index...');
      await databases.deleteIndex(DATABASE_ID, COLLECTION_ID, 'email_index');
      console.log('✅ Failed index deleted');
    } catch (error: any) {
      if (error.code === 404) {
        console.log('⏭️  Index already deleted or does not exist');
      } else {
        throw error;
      }
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Recreate the index
    console.log('\n2️⃣ Creating new email_index...');
    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'email_index',
      'unique' as any,
      ['email']
    );
    console.log('✅ New email index created');

    // Wait for it to process
    console.log('\n⏳ Waiting for index to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check status
    const indexes = await databases.listIndexes(DATABASE_ID, COLLECTION_ID);
    const emailIndex = indexes.indexes.find((idx: any) => idx.key === 'email_index');
    
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

    // Also fix isAdmin index while we're at it
    console.log('\n3️⃣ Fixing isAdmin_index...');
    try {
      await databases.deleteIndex(DATABASE_ID, COLLECTION_ID, 'isAdmin_index');
      console.log('✅ Deleted failed isAdmin_index');
    } catch (error: any) {
      if (error.code === 404) {
        console.log('⏭️  isAdmin_index already deleted');
      } else {
        console.log('⚠️  Could not delete isAdmin_index:', error.message);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('4️⃣ Creating new isAdmin_index...');
    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'isAdmin_index',
      'key' as any,
      ['isAdmin']
    );
    console.log('✅ New isAdmin index created');

  } catch (error: any) {
    console.error('❌ Error fixing indexes:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    throw error;
  }
}

// Run the fix
fixEmailIndex()
  .then(() => {
    console.log('\n🎉 Index fix complete!');
    console.log('\n💡 Tip: Run check-collection-schema.ts to verify the indexes are now available');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Index fix failed:', error);
    process.exit(1);
  });
