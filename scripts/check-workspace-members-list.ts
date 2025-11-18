/**
 * Check workspace_members in the database
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

async function checkWorkspaceMembers() {
  try {
    console.log('📋 Fetching all workspace_members...\n');
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      WORKSPACE_MEMBERS_COLLECTION
    );

    console.log(`Found ${response.documents.length} workspace members:\n`);
    
    response.documents.forEach((doc: any, index: number) => {
      console.log(`${index + 1}. ${doc.userName} (${doc.email})`);
      console.log(`   - ID: ${doc.$id}`);
      console.log(`   - User ID: ${doc.userId}`);
      console.log(`   - Workspace: ${doc.workspaceId}`);
      console.log(`   - Role: ${doc.role}`);
      console.log(`   - Status: ${doc.status}`);
      console.log(`   - Joined: ${doc.joinedAt}`);
      console.log('');
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

checkWorkspaceMembers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
