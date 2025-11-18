const sdk = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const FR_COLLECTION_ID = 'functional_requirements';

// List of all attributes that should exist based on the code
const requiredAttributes = [
  { key: 'workspaceId', type: 'string', size: 255, required: true, array: false },
  { key: 'projectId', type: 'string', size: 255, required: true, array: false },
  { key: 'epicId', type: 'string', size: 255, required: false, array: false },
  { key: 'sprintId', type: 'string', size: 255, required: false, array: false },
  { key: 'clientRequirementId', type: 'string', size: 255, required: false, array: false },
  { key: 'parentRequirementId', type: 'string', size: 255, required: false, array: false },
  { key: 'hierarchyId', type: 'string', size: 255, required: true, array: false },
  { key: 'title', type: 'string', size: 500, required: true, array: false },
  { key: 'description', type: 'string', size: 10000, required: false, array: false },
  { key: 'type', type: 'string', size: 50, required: true, array: false },
  { key: 'complexity', type: 'string', size: 50, required: true, array: false },
  { key: 'priority', type: 'string', size: 50, required: false, array: false },
  { key: 'status', type: 'string', size: 50, required: true, array: false },
  { key: 'reusable', type: 'boolean', required: false, array: false },
  { key: 'assignedTo', type: 'string', size: 255, required: false, array: true },
  { key: 'assignedToNames', type: 'string', size: 255, required: false, array: true },
  { key: 'tags', type: 'string', size: 1000, required: false, array: false },
  { key: 'linkedProjectIds', type: 'string', size: 2000, required: false, array: false },
  { key: 'createdBy', type: 'string', size: 255, required: true, array: false },
  { key: 'createdByName', type: 'string', size: 255, required: false, array: false },
];

async function checkAndAddAttributes() {
  try {
    console.log('Fetching existing attributes from Functional Requirements collection...\n');
    
    // Get collection details
    const collection = await databases.getCollection(DATABASE_ID, FR_COLLECTION_ID);
    const existingAttributes = collection.attributes.map(attr => attr.key);
    
    console.log('Existing attributes:', existingAttributes.join(', '));
    console.log('\nChecking for missing attributes...\n');
    
    const missingAttributes = requiredAttributes.filter(
      attr => !existingAttributes.includes(attr.key)
    );
    
    if (missingAttributes.length === 0) {
      console.log('✅ All required attributes exist!');
      return;
    }
    
    console.log(`Found ${missingAttributes.length} missing attribute(s):\n`);
    
    for (const attr of missingAttributes) {
      try {
        console.log(`Adding: ${attr.key} (${attr.type})...`);
        
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            FR_COLLECTION_ID,
            attr.key,
            attr.size,
            attr.required,
            null,
            attr.array
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            FR_COLLECTION_ID,
            attr.key,
            attr.required,
            false
          );
        }
        
        console.log(`  ✅ Added: ${attr.key}\n`);
        
        // Wait a bit between attribute creations
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ℹ️  ${attr.key} already exists (409 conflict)\n`);
        } else {
          console.error(`  ❌ Error adding ${attr.key}:`, error.message, '\n');
        }
      }
    }
    
    console.log('\n🎉 All missing attributes have been added!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndAddAttributes();
