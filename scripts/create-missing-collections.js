#!/usr/bin/env node
/**
 * Create Missing Collections
 * Creates workspace_members, email_invitations, invite_codes, and time_entries collections
 */

require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new sdk.Databases(client);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

// Collection definitions
const collections = [
  {
    id: 'workspace_members',
    name: 'Workspace Members',
    attributes: [
      { method: 'createStringAttribute', args: ['workspaceId', 50, true] },
      { method: 'createStringAttribute', args: ['userId', 50, true] },
      { method: 'createStringAttribute', args: ['userName', 255, false] },
      { method: 'createStringAttribute', args: ['email', 255, false] },
      { method: 'createStringAttribute', args: ['role', 50, true] },
      { method: 'createStringAttribute', args: ['status', 50, false] },
      { method: 'createStringAttribute', args: ['invitedBy', 50, false] },
      { method: 'createStringAttribute', args: ['joinedAt', 50, false] },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'workspace_user', type: 'unique', attributes: ['workspaceId', 'userId'] },
    ],
  },
  {
    id: 'email_invitations',
    name: 'Email Invitations',
    attributes: [
      { method: 'createStringAttribute', args: ['workspaceId', 50, true] },
      { method: 'createStringAttribute', args: ['email', 255, true] },
      { method: 'createStringAttribute', args: ['role', 50, true] },
      { method: 'createStringAttribute', args: ['invitedBy', 50, true] },
      { method: 'createStringAttribute', args: ['invitedByName', 255, false] },
      { method: 'createStringAttribute', args: ['token', 100, true] },
      { method: 'createStringAttribute', args: ['status', 50, false] },
      { method: 'createStringAttribute', args: ['expiresAt', 50, false] },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'email', type: 'key', attributes: ['email'] },
      { key: 'token', type: 'unique', attributes: ['token'] },
    ],
  },
  {
    id: 'invite_codes',
    name: 'Invite Codes',
    attributes: [
      { method: 'createStringAttribute', args: ['workspaceId', 50, true] },
      { method: 'createStringAttribute', args: ['code', 50, true] },
      { method: 'createStringAttribute', args: ['createdBy', 50, true] },
      { method: 'createStringAttribute', args: ['createdByName', 255, false] },
      { method: 'createStringAttribute', args: ['role', 50, true] },
      { method: 'createIntegerAttribute', args: ['maxUses', false] },
      { method: 'createIntegerAttribute', args: ['usedCount', false] },
      { method: 'createStringAttribute', args: ['expiresAt', 50, false] },
      { method: 'createBooleanAttribute', args: ['isActive', true] },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'code', type: 'unique', attributes: ['code'] },
    ],
  },
  {
    id: 'time_entries',
    name: 'Time Entries',
    attributes: [
      { method: 'createStringAttribute', args: ['workspaceId', 50, true] },
      { method: 'createStringAttribute', args: ['userId', 50, true] },
      { method: 'createStringAttribute', args: ['userName', 255, false] },
      { method: 'createStringAttribute', args: ['taskId', 50, false] },
      { method: 'createStringAttribute', args: ['projectId', 50, false] },
      { method: 'createStringAttribute', args: ['startTime', 50, true] },
      { method: 'createStringAttribute', args: ['endTime', 50, false] },
      { method: 'createFloatAttribute', args: ['duration', false] },
      { method: 'createStringAttribute', args: ['description', 1000, false] },
      { method: 'createBooleanAttribute', args: ['isBillable', false] },
      { method: 'createStringAttribute', args: ['createdBy', 50, false] },
      { method: 'createStringAttribute', args: ['createdByName', 255, false] },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'taskId', type: 'key', attributes: ['taskId'] },
      { key: 'projectId', type: 'key', attributes: ['projectId'] },
      { key: 'startTime', type: 'key', attributes: ['startTime'] },
    ],
  },
];

async function createCollection(collectionId, name) {
  try {
    await databases.createCollection(
      DATABASE_ID,
      collectionId,
      name
    );
    console.log(`${colors.green}  ✅ Created collection: ${name}${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (error) {
    if (error.code === 409) {
      console.log(`${colors.yellow}  ⚠️  Collection already exists${colors.reset}`);
      return true;
    }
    throw error;
  }
}

async function createAttributes(collectionId, attributes) {
  console.log(`${colors.cyan}  Creating attributes...${colors.reset}`);
  for (const attr of attributes) {
    try {
      await databases[attr.method](DATABASE_ID, collectionId, ...attr.args);
      console.log(`${colors.green}    ✓ ${attr.args[0]}${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      if (error.code === 409) {
        console.log(`${colors.yellow}    ⚠️  ${attr.args[0]} already exists${colors.reset}`);
      } else {
        console.log(`${colors.red}    ✗ ${attr.args[0]}: ${error.message}${colors.reset}`);
      }
    }
  }
}

async function createIndexes(collectionId, indexes) {
  console.log(`${colors.cyan}  Creating indexes...${colors.reset}`);
  for (const index of indexes) {
    try {
      await databases.createIndex(
        DATABASE_ID,
        collectionId,
        index.key,
        index.type,
        index.attributes
      );
      console.log(`${colors.green}    ✓ ${index.key}${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      if (error.code === 409) {
        console.log(`${colors.yellow}    ⚠️  ${index.key} already exists${colors.reset}`);
      } else {
        console.log(`${colors.red}    ✗ ${index.key}: ${error.message}${colors.reset}`);
      }
    }
  }
}

async function setPermissions(collectionId, name) {
  try {
    await databases.updateCollection(
      DATABASE_ID,
      collectionId,
      name,
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users())
      ],
      true,
      true
    );
    console.log(`${colors.green}  ✅ Permissions set${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}  ✗ Permissions failed: ${error.message}${colors.reset}`);
  }
}

async function main() {
  console.log(`${colors.cyan}\n${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}🏗️  CREATING MISSING COLLECTIONS${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  for (const collection of collections) {
    console.log(`${colors.cyan}━━━ ${collection.name} (${collection.id}) ━━━${colors.reset}`);
    
    await createCollection(collection.id, collection.name);
    await createAttributes(collection.id, collection.attributes);
    await createIndexes(collection.id, collection.indexes);
    await setPermissions(collection.id, collection.name);
    
    console.log(``);
  }

  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✅ ALL MISSING COLLECTIONS CREATED!${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`${colors.cyan}Collections created:${colors.reset}`);
  console.log(`  1. Workspace Members - Track workspace membership`);
  console.log(`  2. Email Invitations - Email-based invites`);
  console.log(`  3. Invite Codes - Shareable invite codes`);
  console.log(`  4. Time Entries - Time tracking history`);
  console.log(``);
  console.log(`${colors.cyan}Next: Restart your server${colors.reset}\n`);
}

main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  console.error(error);
  process.exit(1);
});
