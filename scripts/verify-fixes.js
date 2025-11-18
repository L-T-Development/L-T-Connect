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

async function verifyFixes() {
  try {
    console.log('🔍 Verifying fixes...\n');

    // Check if archived attribute exists
    console.log('1️⃣ Checking projects collection for "archived" attribute...');
    const collection = await databases.getCollection(databaseId, projectsCollectionId);
    
    const archivedAttr = collection.attributes.find(attr => attr.key === 'archived');
    
    if (archivedAttr) {
      console.log('✅ "archived" attribute found in projects collection');
      console.log(`   - Type: ${archivedAttr.type}`);
      console.log(`   - Required: ${archivedAttr.required}`);
      console.log(`   - Default: ${archivedAttr.default}`);
      console.log(`   - Status: ${archivedAttr.status}`);
    } else {
      console.log('❌ "archived" attribute NOT found in projects collection');
      console.log('   Run: node scripts/add-archived-attribute.js');
    }

    console.log('\n2️⃣ Checking attendance calendar code fix...');
    const fs = require('fs');
    const calendarCode = fs.readFileSync(
      'src/components/attendance/attendance-calendar.tsx',
      'utf-8'
    );
    
    if (calendarCode.includes('attendance.workHours !== null')) {
      console.log('✅ Null check for workHours found in attendance-calendar.tsx');
      console.log('   - Line contains: attendance.workHours !== undefined && attendance.workHours !== null');
    } else {
      console.log('❌ Null check for workHours NOT found');
      console.log('   - Fix needed in: src/components/attendance/attendance-calendar.tsx');
    }

    console.log('\n📊 Verification Summary:');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (archivedAttr && archivedAttr.status === 'available' && calendarCode.includes('attendance.workHours !== null')) {
      console.log('✅ All fixes are properly applied and ready!');
      console.log('\n🚀 You can now:');
      console.log('   - Create projects without "archived" errors');
      console.log('   - View attendance calendar without crashes');
    } else {
      console.log('⚠️  Some fixes may still be processing or incomplete');
      if (archivedAttr && archivedAttr.status !== 'available') {
        console.log('   - Wait a few seconds for "archived" attribute to become available');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    throw error;
  }
}

verifyFixes()
  .then(() => {
    console.log('\n✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
