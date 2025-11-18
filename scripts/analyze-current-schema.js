const sdk = require('node-appwrite');

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('690c6413000a30ad36a9')
  .setKey('standard_8995a82a920de268e136610b5e659bb15d8c13de3257d2cd51bc102e69b81088e910efd008f5305226af68a8a526a80abc81de1153f331b77312583666cc6f0a41b3d447f0918102b35103ac6e1300a3ea21c1b94e7864441b1d4b0dc1215aa55c00eeb8ffe22441b6446c1a026a40e8466e5983dce4617ab0ca311a5c013a6b');

const DATABASE_ID = '690c654e001d12672ec2';

async function analyzeSchema() {
  console.log('🔍 Analyzing Current Database Schema...\n');
  
  const collections = [
    { id: 'workspaces', name: 'workspaces' },
    { id: 'projects', name: 'projects' },
    { id: 'tasks', name: 'tasks' },
    { id: 'epics', name: 'epics' },
    { id: 'functional_requirements', name: 'functional_requirements' },
    { id: 'client_requirements', name: 'client_requirements' },
    { id: 'sprints', name: 'sprints' },
    { id: 'attendance', name: 'attendance' },
    { id: 'workspace_members', name: 'workspace_members' },
  ];

  for (const collection of collections) {
    try {
      console.log(`\n📦 Collection: ${collection.name.toUpperCase()}`);
      console.log('━'.repeat(60));
      
      const response = await databases.listAttributes(DATABASE_ID, collection.id);
      
      console.log(`Total Attributes: ${response.total}`);
      console.log('\nAttributes:');
      
      response.attributes.forEach((attr, index) => {
        console.log(`  ${index + 1}. ${attr.key}`);
        console.log(`     Type: ${attr.type}`);
        if (attr.size) console.log(`     Size: ${attr.size}`);
        if (attr.array !== undefined) console.log(`     Array: ${attr.array}`);
        console.log(`     Required: ${attr.required}`);
        if (attr.default !== undefined) console.log(`     Default: ${attr.default}`);
        console.log('');
      });
      
    } catch (error) {
      console.error(`❌ Error analyzing ${collection.name}:`, error.message);
    }
  }
}

analyzeSchema().catch(console.error);
