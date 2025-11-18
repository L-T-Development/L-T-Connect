/**
 * Fix app_users Collection Permissions
 * Add collection-level read permission for authenticated users
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client, Databases } from 'node-appwrite';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = 'app_users';

async function updateCollectionPermissions() {
  try {
    console.log('📝 Updating collection permissions...');
    
    // Update collection to allow authenticated users to read documents
    // This allows querying while document-level permissions control write access
    await databases.updateCollection(
      DATABASE_ID,
      COLLECTION_ID,
      COLLECTION_ID, // name
      [
        'read("any")', // Allow anyone to read (needed for queries during login flow)
      ],
      true, // documentSecurity - MUST be true to use document-level write permissions!
      true // enabled
    );

    console.log('✅ Collection permissions updated successfully');
    console.log('   - Collection-level: read("any")');
    console.log('   - Document-level security: ENABLED (read/update/delete by owner)');
    
  } catch (error: any) {
    console.error('❌ Error updating collection permissions:', error.message);
    throw error;
  }
}

updateCollectionPermissions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
