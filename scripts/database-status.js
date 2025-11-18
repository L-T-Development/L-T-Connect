#!/usr/bin/env node
/**
 * Complete Database Status Check
 * Shows all collections and their attributes
 */

require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
};

async function checkDatabase() {
  console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}📊 COMPLETE DATABASE STATUS${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);

  try {
    // List all collections
    const collections = await databases.listCollections(DATABASE_ID);
    
    console.log(`${colors.green}✅ Total Collections: ${collections.total}${colors.reset}\n`);
    
    const sortedCollections = collections.collections.sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    for (const collection of sortedCollections) {
      console.log(`${colors.cyan}━━━ ${collection.name} (${collection.$id}) ━━━${colors.reset}`);
      console.log(`  Attributes: ${collection.attributes.length}`);
      console.log(`  Indexes: ${collection.indexes.length}`);
      
      if (collection.attributes.length > 0) {
        console.log(`  Fields:`);
        collection.attributes.forEach(attr => {
          const type = attr.type;
          const required = attr.required ? '(required)' : '(optional)';
          const array = attr.array ? '[]' : '';
          console.log(`    - ${attr.key}: ${type}${array} ${required}`);
        });
      }
      
      console.log(``);
    }
    
    console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.green}✅ DATABASE CHECK COMPLETE${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
