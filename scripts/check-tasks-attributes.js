const { Client, Databases } = require('node-appwrite');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const tasksCollectionId = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID;

async function checkTasksAttributes() {
  try {
    console.log('🔍 Checking tasks collection attributes...\n');

    const collection = await databases.getCollection(databaseId, tasksCollectionId);
    
    console.log(`Collection: ${collection.name}`);
    console.log(`Total Attributes: ${collection.attributes.length}`);
    console.log(`\nAttributes:`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    collection.attributes.forEach((attr, index) => {
      console.log(`${index + 1}. ${attr.key}`);
      console.log(`   Type: ${attr.type}`);
      console.log(`   Required: ${attr.required}`);
      if (attr.size) console.log(`   Size: ${attr.size}`);
      if (attr.default !== undefined) console.log(`   Default: ${attr.default}`);
      console.log(`   Status: ${attr.status}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n⚠️  Appwrite Limit: Collections typically have a limit of 64 attributes`);
    console.log(`Current Usage: ${collection.attributes.length} attributes`);
    
    // Check if blockedBy exists
    const blockedBy = collection.attributes.find(attr => attr.key === 'blockedBy');
    if (blockedBy) {
      console.log(`\n✅ "blockedBy" attribute already exists`);
    } else {
      console.log(`\n❌ "blockedBy" attribute does NOT exist`);
      console.log(`\n💡 Options:`);
      console.log(`   1. Remove unused attributes from the collection`);
      console.log(`   2. Use an existing attribute to store blocked task IDs`);
      console.log(`   3. Store blockedBy data in a separate collection`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

checkTasksAttributes()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
