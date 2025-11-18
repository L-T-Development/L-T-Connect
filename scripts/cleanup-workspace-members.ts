/**
 * Clean up workspace_members records
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
const WORKSPACE_MEMBERS_COLLECTION = 'workspace_members';

async function cleanupWorkspaceMembers() {
  try {
    console.log('🧹 Cleaning up workspace_members...\n');
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      WORKSPACE_MEMBERS_COLLECTION
    );

    console.log(`Found ${response.documents.length} workspace_members records`);
    
    for (const doc of response.documents) {
      try {
        await databases.deleteDocument(
          DATABASE_ID,
          WORKSPACE_MEMBERS_COLLECTION,
          doc.$id
        );
        console.log(`✅ Deleted workspace_member: ${doc.$id}`);
      } catch (error: any) {
        console.error(`❌ Failed to delete ${doc.$id}:`, error.message);
      }
    }
    
    console.log('\n✅ Cleanup complete!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

cleanupWorkspaceMembers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
