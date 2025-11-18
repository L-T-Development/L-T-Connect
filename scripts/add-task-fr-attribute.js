const sdk = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID;

async function addFunctionalRequirementIdAttribute() {
  try {
    console.log('Adding functionalRequirementId attribute to Tasks collection...');
    
    // Add functionalRequirementId as optional string attribute
    await databases.createStringAttribute(
      DATABASE_ID,
      TASKS_COLLECTION_ID,
      'functionalRequirementId',
      255, // size
      false, // required
      null, // default
      false // array
    );
    
    console.log('✅ Successfully added "functionalRequirementId" attribute');
    console.log('\nAttribute Details:');
    console.log('  - Name: functionalRequirementId');
    console.log('  - Type: String');
    console.log('  - Size: 255');
    console.log('  - Required: false');
    console.log('  - Purpose: Link tasks to functional requirements for hierarchical naming');
    
  } catch (error) {
    console.error('❌ Error adding attribute:', error.message);
    if (error.code === 409) {
      console.log('ℹ️  Attribute may already exist');
    }
  }
}

addFunctionalRequirementIdAttribute();
