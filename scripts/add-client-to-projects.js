const sdk = require('node-appwrite');

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('690c6413000a30ad36a9')
  .setKey('standard_8995a82a920de268e136610b5e659bb15d8c13de3257d2cd51bc102e69b81088e910efd008f5305226af68a8a526a80abc81de1153f331b77312583666cc6f0a41b3d447f0918102b35103ac6e1300a3ea21c1b94e7864441b1d4b0dc1215aa55c00eeb8ffe22441b6446c1a026a40e8466e5983dce4617ab0ca311a5c013a6b');

const DATABASE_ID = '690c654e001d12672ec2';

async function addClientNameToProjects() {
  console.log('🔧 Adding clientName field to projects collection...\n');
  
  try {
    await databases.createStringAttribute(
      DATABASE_ID,
      'projects',
      'clientName',
      200,
      false, // not required
      null,
      false
    );
    
    console.log('✅ Successfully added clientName attribute to projects collection');
    console.log('\nℹ️  Waiting for attribute to be available...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await databases.listAttributes(DATABASE_ID, 'projects');
    const clientNameAttr = response.attributes.find(attr => attr.key === 'clientName');
    
    if (clientNameAttr && clientNameAttr.status === 'available') {
      console.log('✅ Attribute is now available and ready to use!');
    } else {
      console.log('⏳ Attribute is still processing, it will be available shortly');
    }
    
  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  clientName attribute already exists in projects collection');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

addClientNameToProjects().catch(console.error);
