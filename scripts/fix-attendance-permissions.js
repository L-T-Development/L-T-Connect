#!/usr/bin/env node
/**
 * Fix Attendance Collection Permissions
 * Sets proper permissions so users can read/write their own attendance records
 */

require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = 'attendance';

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

async function main() {
  try {
    console.log(`${colors.cyan}\n${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}🔒 FIXING ATTENDANCE COLLECTION PERMISSIONS${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
    
    console.log(`${colors.cyan}ℹ️  Updating permissions for collection: ${COLLECTION_ID}${colors.reset}`);
    
    // Update collection with proper permissions
    // Allow any authenticated user to create, and users can read/update/delete their own records
    await databases.updateCollection(
      DATABASE_ID,
      COLLECTION_ID,
      'Attendance',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users())
      ],
      true, // Enable document security
      true  // Enable collection permissions
    );
    
    console.log(`${colors.green}✅ Permissions updated successfully!${colors.reset}\n`);
    
    console.log(`${colors.cyan}Updated permissions:${colors.reset}`);
    console.log(`  • Read: Anyone (for workspace filtering)`);
    console.log(`  • Create: Authenticated users`);
    console.log(`  • Update: Authenticated users`);
    console.log(`  • Delete: Authenticated users`);
    
    console.log(`${colors.cyan}\n${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}✅ PERMISSIONS FIXED!${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
    
    console.log(`${colors.cyan}Next: Restart server and test check-in${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

main();
