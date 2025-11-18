const sdk = require('node-appwrite');

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('690c6413000a30ad36a9')
  .setKey('standard_8995a82a920de268e136610b5e659bb15d8c13de3257d2cd51bc102e69b81088e910efd008f5305226af68a8a526a80abc81de1153f331b77312583666cc6f0a41b3d447f0918102b35103ac6e1300a3ea21c1b94e7864441b1d4b0dc1215aa55c00eeb8ffe22441b6446c1a026a40e8466e5983dce4617ab0ca311a5c013a6b');

const DATABASE_ID = '690c654e001d12672ec2';

async function verifyAllFixes() {
  console.log('🔍 Verifying All Schema Fixes...\n');
  
  const checks = [];
  
  try {
    // 1. Check projects.archived
    console.log('1️⃣  Checking projects.archived attribute...');
    const projectsAttrs = await databases.listAttributes(DATABASE_ID, 'projects');
    const archived = projectsAttrs.attributes.find(attr => attr.key === 'archived');
    if (archived && archived.type === 'boolean' && archived.status === 'available') {
      console.log('   ✅ projects.archived exists (boolean, available)');
      checks.push({ name: 'projects.archived', status: 'PASS' });
    } else if (archived) {
      console.log(`   ⚠️  projects.archived exists but status: ${archived.status}`);
      checks.push({ name: 'projects.archived', status: 'PENDING' });
    } else {
      console.log('   ❌ projects.archived MISSING');
      checks.push({ name: 'projects.archived', status: 'FAIL' });
    }
    
    // 2. Check tasks.assignedTo (array type)
    console.log('\n2️⃣  Checking tasks.assignedTo attribute (must be array)...');
    const tasksAttrs = await databases.listAttributes(DATABASE_ID, 'tasks');
    const assignedTo = tasksAttrs.attributes.find(attr => attr.key === 'assignedTo');
    if (assignedTo && assignedTo.array === true && assignedTo.status === 'available') {
      console.log('   ✅ tasks.assignedTo is array type (available)');
      checks.push({ name: 'tasks.assignedTo', status: 'PASS' });
    } else if (assignedTo) {
      console.log(`   ⚠️  tasks.assignedTo exists but array=${assignedTo.array}, status=${assignedTo.status}`);
      checks.push({ name: 'tasks.assignedTo', status: 'WARNING' });
    } else {
      console.log('   ❌ tasks.assignedTo MISSING');
      checks.push({ name: 'tasks.assignedTo', status: 'FAIL' });
    }
    
    // 3. Check tasks.assignedToNames (array type)
    console.log('\n3️⃣  Checking tasks.assignedToNames attribute (must be array)...');
    const assignedToNames = tasksAttrs.attributes.find(attr => attr.key === 'assignedToNames');
    if (assignedToNames && assignedToNames.array === true && assignedToNames.status === 'available') {
      console.log('   ✅ tasks.assignedToNames is array type (available)');
      checks.push({ name: 'tasks.assignedToNames', status: 'PASS' });
    } else if (assignedToNames) {
      console.log(`   ⚠️  tasks.assignedToNames exists but array=${assignedToNames.array}, status=${assignedToNames.status}`);
      checks.push({ name: 'tasks.assignedToNames', status: 'WARNING' });
    } else {
      console.log('   ❌ tasks.assignedToNames MISSING');
      checks.push({ name: 'tasks.assignedToNames', status: 'FAIL' });
    }
    
    // 4. Check epics.requirementId
    console.log('\n4️⃣  Checking epics.requirementId attribute...');
    const epicsAttrs = await databases.listAttributes(DATABASE_ID, 'epics');
    const requirementId = epicsAttrs.attributes.find(attr => attr.key === 'requirementId');
    if (requirementId && requirementId.status === 'available') {
      console.log('   ✅ epics.requirementId exists (available)');
      checks.push({ name: 'epics.requirementId', status: 'PASS' });
    } else if (requirementId) {
      console.log(`   ⚠️  epics.requirementId exists but status: ${requirementId.status}`);
      checks.push({ name: 'epics.requirementId', status: 'PENDING' });
    } else {
      console.log('   ❌ epics.requirementId MISSING');
      checks.push({ name: 'epics.requirementId', status: 'FAIL' });
    }
    
    // 5. Check functional_requirements.epicId
    console.log('\n5️⃣  Checking functional_requirements.epicId attribute...');
    const frsAttrs = await databases.listAttributes(DATABASE_ID, 'functional_requirements');
    const epicId = frsAttrs.attributes.find(attr => attr.key === 'epicId');
    if (epicId && epicId.status === 'available') {
      console.log('   ✅ functional_requirements.epicId exists (available)');
      checks.push({ name: 'functional_requirements.epicId', status: 'PASS' });
    } else if (epicId) {
      console.log(`   ⚠️  functional_requirements.epicId exists but status: ${epicId.status}`);
      checks.push({ name: 'functional_requirements.epicId', status: 'PENDING' });
    } else {
      console.log('   ❌ functional_requirements.epicId MISSING');
      checks.push({ name: 'functional_requirements.epicId', status: 'FAIL' });
    }
    
    // 6. Check functional_requirements.sprintId
    console.log('\n6️⃣  Checking functional_requirements.sprintId attribute...');
    const sprintId = frsAttrs.attributes.find(attr => attr.key === 'sprintId');
    if (sprintId && sprintId.status === 'available') {
      console.log('   ✅ functional_requirements.sprintId exists (available)');
      checks.push({ name: 'functional_requirements.sprintId', status: 'PASS' });
    } else if (sprintId) {
      console.log(`   ⚠️  functional_requirements.sprintId exists but status: ${sprintId.status}`);
      checks.push({ name: 'functional_requirements.sprintId', status: 'PENDING' });
    } else {
      console.log('   ❌ functional_requirements.sprintId MISSING');
      checks.push({ name: 'functional_requirements.sprintId', status: 'FAIL' });
    }
    
    // 7. Check functional_requirements.priority
    console.log('\n7️⃣  Checking functional_requirements.priority attribute...');
    const priority = frsAttrs.attributes.find(attr => attr.key === 'priority');
    if (priority && priority.status === 'available') {
      console.log('   ✅ functional_requirements.priority exists (available)');
      checks.push({ name: 'functional_requirements.priority', status: 'PASS' });
    } else if (priority) {
      console.log(`   ⚠️  functional_requirements.priority exists but status: ${priority.status}`);
      checks.push({ name: 'functional_requirements.priority', status: 'PENDING' });
    } else {
      console.log('   ❌ functional_requirements.priority MISSING');
      checks.push({ name: 'functional_requirements.priority', status: 'FAIL' });
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(70));
    
    const passed = checks.filter(c => c.status === 'PASS').length;
    const pending = checks.filter(c => c.status === 'PENDING').length;
    const failed = checks.filter(c => c.status === 'FAIL').length;
    const warnings = checks.filter(c => c.status === 'WARNING').length;
    
    console.log(`\n✅ Passed:  ${passed}/${checks.length}`);
    if (pending > 0) console.log(`⏳ Pending: ${pending}/${checks.length} (attributes still processing)`);
    if (warnings > 0) console.log(`⚠️  Warnings: ${warnings}/${checks.length}`);
    if (failed > 0) console.log(`❌ Failed:  ${failed}/${checks.length}`);
    
    console.log('\n' + '='.repeat(70));
    
    if (failed === 0 && warnings === 0 && pending === 0) {
      console.log('🎉 ALL CHECKS PASSED! System is ready.');
      console.log('\n✅ You can now:');
      console.log('   1. Create tasks without assignedTo errors');
      console.log('   2. Create projects without archived errors');
      console.log('   3. View attendance calendar without crashes');
      console.log('   4. Update Epic/FR code to use new hierarchy');
    } else if (pending > 0) {
      console.log('⏳ Some attributes are still processing.');
      console.log('   Wait a few seconds and run this script again.');
    } else {
      console.log('⚠️  Some checks failed. Review errors above.');
    }
    
    console.log('\n📚 Documentation:');
    console.log('   - SCHEMA_FIX_SUMMARY.md - Complete fix documentation');
    console.log('   - SCHEMA_ARCHITECTURE.md - Architecture details');
    
  } catch (error) {
    console.error('\n❌ Verification Error:', error.message);
  }
}

verifyAllFixes().catch(console.error);
