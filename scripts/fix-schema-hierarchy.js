const sdk = require('node-appwrite');

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('690c6413000a30ad36a9')
  .setKey('standard_8995a82a920de268e136610b5e659bb15d8c13de3257d2cd51bc102e69b81088e910efd008f5305226af68a8a526a80abc81de1153f331b77312583666cc6f0a41b3d447f0918102b35103ac6e1300a3ea21c1b94e7864441b1d4b0dc1215aa55c00eeb8ffe22441b6446c1a026a40e8466e5983dce4617ab0ca311a5c013a6b');

const DATABASE_ID = '690c654e001d12672ec2';

async function fixSchemaHierarchy() {
  console.log('🔧 Fixing Database Schema to Match Hierarchical Flow\n');
  console.log('Target Structure: Workspace → Project → Requirement → Epic → FR → Sprint → Task\n');
  
  try {
    // 1. Add requirementId to epics collection
    console.log('📝 Step 1: Adding requirementId to epics collection...');
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        'epics',
        'requirementId',
        50,
        false, // not required (for backward compatibility)
        null,
        false
      );
      console.log('✅ Added requirementId to epics');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  requirementId already exists in epics');
      } else {
        console.error('❌ Error adding requirementId to epics:', error.message);
      }
    }
    
    // Wait for attribute to be available
    console.log('⏳ Waiting for attribute to be available...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Add epicId to functional_requirements collection
    console.log('\n📝 Step 2: Adding epicId to functional_requirements collection...');
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        'functional_requirements',
        'epicId',
        50,
        false, // not required (for backward compatibility)
        null,
        false
      );
      console.log('✅ Added epicId to functional_requirements');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  epicId already exists in functional_requirements');
      } else {
        console.error('❌ Error adding epicId to functional_requirements:', error.message);
      }
    }
    
    // Wait for attribute to be available
    console.log('⏳ Waiting for attribute to be available...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Add sprintId to functional_requirements collection
    console.log('\n📝 Step 3: Adding sprintId to functional_requirements collection...');
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        'functional_requirements',
        'sprintId',
        50,
        false, // not required (optional field)
        null,
        false
      );
      console.log('✅ Added sprintId to functional_requirements');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  sprintId already exists in functional_requirements');
      } else {
        console.error('❌ Error adding sprintId to functional_requirements:', error.message);
      }
    }
    
    // Wait for attribute to be available
    console.log('⏳ Waiting for attribute to be available...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Add priority to functional_requirements (if missing)
    console.log('\n📝 Step 4: Adding priority to functional_requirements collection...');
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        'functional_requirements',
        'priority',
        20,
        false,
        'medium',
        false
      );
      console.log('✅ Added priority to functional_requirements');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  priority already exists in functional_requirements');
      } else {
        console.error('❌ Error adding priority to functional_requirements:', error.message);
      }
    }
    
    // Wait for attribute to be available
    console.log('⏳ Waiting for attribute to be available...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Add assignedTeam to epics (for team assignment)
    console.log('\n📝 Step 5: Adding assignedTeam to epics collection...');
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        'epics',
        'assignedTeam',
        50,
        false,
        null,
        false
      );
      console.log('✅ Added assignedTeam to epics');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  assignedTeam already exists in epics');
      } else {
        console.error('❌ Error adding assignedTeam to epics:', error.message);
      }
    }
    
    console.log('\n✅ Schema hierarchy updates completed!');
    console.log('\n📊 Updated Hierarchy:');
    console.log('   Workspace → Project → Requirement (client_requirements)');
    console.log('   Requirement → Epic (epics.requirementId)');
    console.log('   Epic → FR (functional_requirements.epicId)');
    console.log('   FR → Sprint (functional_requirements.sprintId - optional)');
    console.log('   FR/Sprint → Task (tasks.hierarchyId + tasks.sprintId)');
    
    console.log('\n⚠️  Next Steps:');
    console.log('   1. Update Epic CRUD code to use requirementId');
    console.log('   2. Update FR CRUD code to use epicId as primary parent');
    console.log('   3. Test task creation with new schema');
    console.log('   4. Run data migration if needed (migrate old data)');
    
  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
  }
}

fixSchemaHierarchy().catch(console.error);
