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

async function calculateTotalSize() {
  try {
    console.log('📊 Calculating total attribute size...\n');

    const collection = await databases.getCollection(databaseId, tasksCollectionId);
    
    let totalSize = 0;
    let stringAttrs = [];
    
    collection.attributes.forEach((attr) => {
      if (attr.size) {
        totalSize += attr.size;
        stringAttrs.push({
          key: attr.key,
          size: attr.size,
          type: attr.type
        });
      }
    });

    console.log('String/Text Attributes with Size:');
    console.log('═══════════════════════════════════════════════════════════');
    stringAttrs.forEach(attr => {
      console.log(`${attr.key.padEnd(20)} ${attr.size.toString().padStart(6)} bytes  (${attr.type})`);
    });
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Size Used: ${totalSize} bytes`);
    console.log(`\n⚠️  Appwrite typically has a limit of ~65,535 bytes total for string attributes`);
    console.log(`Remaining: ~${65535 - totalSize} bytes`);
    
    // Check if we need both blockedBy and blocks
    console.log(`\n💡 Space needed:`);
    console.log(`   - blockedBy attribute: ~2000 bytes`);
    console.log(`   - blocks attribute: ~2000 bytes`);
    console.log(`   - Total needed: ~4000 bytes`);
    
    if (totalSize + 4000 > 65535) {
      console.log(`\n❌ Not enough space! Need to free up ${(totalSize + 4000) - 65535} bytes`);
      console.log(`\n🔧 Options to free up space:`);
      console.log(`   1. Reduce size of large attributes (description, attachments, customFields)`);
      console.log(`   2. Remove unused attributes`);
      console.log(`   3. Move large text fields to a separate collection`);
    } else {
      console.log(`\n✅ Should have enough space to add both attributes`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

calculateTotalSize()
  .then(() => {
    console.log('\n✅ Calculation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Calculation failed:', error);
    process.exit(1);
  });
