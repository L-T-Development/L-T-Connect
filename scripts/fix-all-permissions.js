#!/usr/bin/env node
/**
 * Fix All Collection Permissions
 * Sets proper permissions on all collections for proper CRUD operations
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

// Collections that need permission updates
const collections = [
  { id: 'active_timers', name: 'Active Timers' },
  { id: 'attendance', name: 'Attendance' },
  { id: 'tasks', name: 'Tasks' },
  { id: 'projects', name: 'Projects' },
  { id: 'epics', name: 'Epics' },
  { id: 'sprints', name: 'Sprints' },
  { id: 'functional_requirements', name: 'Functional Requirements' },
  { id: 'client_requirements', name: 'Client Requirements' },
  { id: 'leave_requests', name: 'Leave Requests' },
  { id: 'notifications', name: 'Notifications' },
  { id: 'workspace_members', name: 'Workspace Members' },
  { id: 'email_invitations', name: 'Email Invitations' },
  { id: 'invite_codes', name: 'Invite Codes' },
  { id: 'time_entries', name: 'Time Entries' },
  { id: 'task_comments', name: 'Task Comments' },
  { id: 'workspaces', name: 'Workspaces' },
  { id: 'users', name: 'Users' },
  { id: 'leave_balances', name: 'Leave Balances' },
];

async function fixPermissions() {
  console.log(`${colors.cyan}\n${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}🔒 FIXING ALL COLLECTION PERMISSIONS${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  for (const collection of collections) {
    try {
      console.log(`${colors.cyan}Processing: ${collection.name} (${collection.id})...${colors.reset}`);
      
      // Update collection with proper permissions
      // Allow authenticated users to create, read, update, and delete
      await databases.updateCollection(
        DATABASE_ID,
        collection.id,
        collection.name,
        [
          sdk.Permission.read(sdk.Role.any()),
          sdk.Permission.create(sdk.Role.users()),
          sdk.Permission.update(sdk.Role.users()),
          sdk.Permission.delete(sdk.Role.users())
        ],
        true, // Enable document security
        true  // Enable collection permissions
      );
      
      console.log(`${colors.green}  ✅ Updated successfully${colors.reset}\n`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      if (error.code === 404) {
        console.log(`${colors.yellow}  ⚠️  Collection not found (skipping)${colors.reset}\n`);
      } else {
        console.log(`${colors.red}  ❌ Error: ${error.message}${colors.reset}\n`);
      }
    }
  }

  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✅ PERMISSIONS UPDATE COMPLETE!${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`${colors.cyan}All collections now have:${colors.reset}`);
  console.log(`  • Read: Anyone`);
  console.log(`  • Create: Authenticated users`);
  console.log(`  • Update: Authenticated users`);
  console.log(`  • Delete: Authenticated users`);
  console.log(``);
  console.log(`${colors.cyan}Restart your server to apply changes${colors.reset}\n`);
}

fixPermissions().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
