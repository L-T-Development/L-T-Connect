const { Client, Databases } = require('node-appwrite');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const projectsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_COLLECTION_ID;

async function addArchivedAttribute() {
  try {
    console.log('🔧 Adding "archived" attribute to projects collection...');

    // Add the archived attribute
    await databases.createBooleanAttribute(
      databaseId,
      projectsCollectionId,
      'archived',
      false, // required
      false  // default value
    );

    console.log('✅ Successfully added "archived" attribute to projects collection');
    console.log('⏳ Please wait a few seconds for the attribute to be ready...');
    
  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  "archived" attribute already exists in projects collection');
    } else {
      console.error('❌ Error adding archived attribute:', error.message);
      throw error;
    }
  }
}

addArchivedAttribute()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
