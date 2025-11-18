const sdk = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const FR_COLLECTION_ID = 'functional_requirements'; // From the env file

async function addParentRequirementIdAttribute() {
  try {
    console.log('Adding parentRequirementId attribute to Functional Requirements collection...');
    
    // Add parentRequirementId as optional string attribute
    await databases.createStringAttribute(
      DATABASE_ID,
      FR_COLLECTION_ID,
      'parentRequirementId',
      255, // size
      false, // required
      null, // default
      false // array
    );
    
    console.log('✅ Successfully added "parentRequirementId" attribute');
    console.log('\nAttribute Details:');
    console.log('  - Name: parentRequirementId');
    console.log('  - Type: String');
    console.log('  - Size: 255');
    console.log('  - Required: false');
    console.log('  - Purpose: Link FRs in parent-child hierarchy');
    
  } catch (error) {
    console.error('❌ Error adding attribute:', error.message);
    if (error.code === 409) {
      console.log('ℹ️  Attribute already exists - no action needed');
    }
  }
}

addParentRequirementIdAttribute();
