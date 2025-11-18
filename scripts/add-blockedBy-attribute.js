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

async function addBlockedByAttribute() {
  try {
    console.log('🔧 Adding "blockedBy" attribute to tasks collection...');

    // Add the blockedBy attribute as a string array (JSON stringified array of task IDs)
    await databases.createStringAttribute(
      databaseId,
      tasksCollectionId,
      'blockedBy',
      2000, // size - enough for ~40 task IDs (50 chars each)
      false, // required
      '[]'   // default value - empty array
    );

    console.log('✅ Successfully added "blockedBy" attribute to tasks collection');
    console.log('⏳ Please wait a few seconds for the attribute to be ready...');
    
  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  "blockedBy" attribute already exists in tasks collection');
    } else {
      console.error('❌ Error adding blockedBy attribute:', error.message);
      throw error;
    }
  }
}

addBlockedByAttribute()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
