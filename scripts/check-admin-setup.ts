/**
 * Check current admin/owner setup
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
const WORKSPACES_COLLECTION = 'workspaces';
const WORKSPACE_MEMBERS_COLLECTION = 'workspace_members';
const APP_USERS_COLLECTION = 'app_users';

async function checkAdminSetup() {
  try {
    console.log('📋 Checking admin/workspace setup...\n');
    
    // Get all workspaces
    const workspaces = await databases.listDocuments(DATABASE_ID, WORKSPACES_COLLECTION);
    console.log(`Found ${workspaces.documents.length} workspace(s):\n`);
    
    for (const workspace of workspaces.documents) {
      console.log(`Workspace: ${workspace.name}`);
      console.log(`  ID: ${workspace.$id}`);
      console.log(`  Owner ID: ${workspace.ownerId}`);
      console.log(`  Member IDs: ${JSON.stringify(workspace.memberIds)}`);
      
      // Check if owner is in workspace_members
      const ownerInMembers = await databases.listDocuments(
        DATABASE_ID,
        WORKSPACE_MEMBERS_COLLECTION
      );
      
      const ownerMembership = ownerInMembers.documents.find(
        (doc: any) => doc.userId === workspace.ownerId && doc.workspaceId === workspace.$id
      );
      
      if (ownerMembership) {
        console.log(`  ✅ Owner IS in workspace_members`);
      } else {
        console.log(`  ❌ Owner NOT in workspace_members`);
      }
      
      // Check owner's app_users record
      const appUsers = await databases.listDocuments(DATABASE_ID, APP_USERS_COLLECTION);
      const ownerAppUser = appUsers.documents.find((doc: any) => doc.userId === workspace.ownerId);
      
      if (ownerAppUser) {
        console.log(`  ✅ Owner has app_users record:`);
        console.log(`     - Name: ${ownerAppUser.name}`);
        console.log(`     - Email: ${ownerAppUser.userEmail}`);
        console.log(`     - isAdmin: ${ownerAppUser.isAdmin}`);
      } else {
        console.log(`  ❌ Owner has NO app_users record`);
      }
      
      console.log('');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

checkAdminSetup()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
