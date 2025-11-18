#!/usr/bin/env node
/**
 * Add Missing Attributes Script
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
  cyan: '\x1b[36m',
};

async function main() {
  console.log(`${colors.cyan}Adding missing attributes...${colors.reset}`);
  
  try {
    // Add date to attendance
    console.log(`\n${colors.cyan}Adding 'date' to attendance...${colors.reset}`);
    await databases.createStringAttribute(DATABASE_ID, 'attendance', 'date', 20, true);
    console.log(`${colors.green}✅ Added 'date' to attendance${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add watcherIds to tasks (should already exist, but just in case)
    console.log(`\n${colors.cyan}Adding 'watcherIds' to tasks...${colors.reset}`);
    try {
      await databases.createStringAttribute(DATABASE_ID, 'tasks', 'watcherIds', 10000, false, undefined, true);
      console.log(`${colors.green}✅ Added 'watcherIds' to tasks${colors.reset}`);
    } catch (error) {
      if (error.code === 409) {
        console.log(`${colors.green}✅ 'watcherIds' already exists in tasks${colors.reset}`);
      } else {
        throw error;
      }
    }
    
    console.log(`\n${colors.green}✅ All missing attributes added!${colors.reset}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
