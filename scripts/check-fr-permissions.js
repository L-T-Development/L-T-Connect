const sdk = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const FR_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FUNCTIONAL_REQUIREMENTS_COLLECTION_ID;

async function checkPermissions() {
  try {
    console.log('Checking Functional Requirements collection permissions...\n');
    
    // Get collection details
    const collection = await databases.getCollection(DATABASE_ID, FR_COLLECTION_ID);
    
    console.log('Collection Name:', collection.name);
    console.log('Collection ID:', collection.$id);
    console.log('\nCurrent Permissions:');
    console.log('  - Read:', collection.$permissions?.read || collection.$permissions || 'None set');
    console.log('  - Write:', collection.$permissions?.write || 'Check in console');
    console.log('  - Create:', collection.$permissions?.create || 'Check in console');
    console.log('  - Update:', collection.$permissions?.update || 'Check in console');
    console.log('  - Delete:', collection.$permissions?.delete || 'Check in console');
    
    console.log('\nFull Permissions Object:');
    console.log(JSON.stringify(collection.$permissions, null, 2));
    
    console.log('\n📋 To fix this issue:');
    console.log('1. Go to Appwrite Console');
    console.log('2. Navigate to Databases → functional_requirements collection');
    console.log('3. Go to Settings tab');
    console.log('4. Update Permissions to:');
    console.log('   - Create: role:users');
    console.log('   - Read: role:users');
    console.log('   - Update: role:users');
    console.log('   - Delete: role:users');
    console.log('\nOR add document-level permissions in the code.');
    
  } catch (error) {
    console.error('❌ Error checking permissions:', error.message);
    if (error.code === 404) {
      console.log('\n⚠️  Collection not found. Check your environment variables.');
    }
  }
}

checkPermissions();
