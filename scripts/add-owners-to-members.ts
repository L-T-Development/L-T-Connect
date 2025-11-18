/**
 * Add workspace owners to workspace_members
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client, Databases, ID, Users } from 'node-appwrite';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const users = new Users(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_COLLECTION = 'workspaces';
const WORKSPACE_MEMBERS_COLLECTION = 'workspace_members';

async function addOwnersToMembers() {
  try {
    console.log('🔧 Adding workspace owners to workspace_members...\n');
    
    const workspaces = await databases.listDocuments(DATABASE_ID, WORKSPACES_COLLECTION);
    
    for (const workspace of workspaces.documents) {
      console.log(`Processing workspace: ${workspace.name} (${workspace.$id})`);
      console.log(`  Owner ID: ${workspace.ownerId}`);
      
      // Get owner's auth account details
      let ownerAuth;
      try {
        ownerAuth = await users.get(workspace.ownerId);
        console.log(`  Owner: ${ownerAuth.name} (${ownerAuth.email})`);
      } catch (error: any) {
        console.log(`  ⚠️ Could not get auth account: ${error.message}`);
        continue;
      }
      
      // Check if owner is already in workspace_members
      const members = await databases.listDocuments(
        DATABASE_ID,
        WORKSPACE_MEMBERS_COLLECTION
      );
      
      const ownerMembership = members.documents.find(
        (doc: any) => doc.userId === workspace.ownerId && doc.workspaceId === workspace.$id
      );
      
      if (ownerMembership) {
        console.log(`  ✅ Owner already in workspace_members`);
      } else {
        // Add owner to workspace_members
        await databases.createDocument(
          DATABASE_ID,
          WORKSPACE_MEMBERS_COLLECTION,
          ID.unique(),
          {
            workspaceId: workspace.$id,
            userId: workspace.ownerId,
            userName: ownerAuth.name,
            email: ownerAuth.email,
            role: 'Manager', // Owner = Manager role
            status: 'ACTIVE',
            joinedAt: workspace.$createdAt || new Date().toISOString(),
            invitedBy: workspace.ownerId, // Self-invited (owner)
          }
        );
        console.log(`  ✅ Added owner to workspace_members as Manager`);
      }
      
      console.log('');
    }
    
    console.log('✅ All workspace owners processed!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

addOwnersToMembers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
