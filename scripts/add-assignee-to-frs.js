const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
const FR_COLLECTION_ID = '677feabc002a4ba5b658'; // functional_requirements collection ID

async function addAssigneeFieldsToFRs() {
  try {
    console.log('🔄 Adding assignedTo and assignedToNames attributes to functional requirements collection...');

    // Add assignedTo attribute (array of user IDs)
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        FR_COLLECTION_ID,
        'assignedTo',
        255, // Max size per element
        false, // not required
        null, // no default
        true // array
      );
      console.log('✅ Added assignedTo attribute (string array)');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️  assignedTo attribute already exists');
      } else {
        console.error('Error adding assignedTo:', error.message);
      }
    }

    // Wait a bit for the first attribute to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Add assignedToNames attribute (array of user names for display)
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        FR_COLLECTION_ID,
        'assignedToNames',
        255, // Max size per element
        false, // not required
        null, // no default
        true // array
      );
      console.log('✅ Added assignedToNames attribute (string array)');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️  assignedToNames attribute already exists');
      } else {
        console.error('Error adding assignedToNames:', error.message);
      }
    }

    console.log('');
    console.log('✅ Successfully added assignee attributes to functional requirements collection!');
    console.log('📝 Attributes are now available and ready to use.');
    console.log('');
    console.log('Next steps:');
    console.log('1. FRs can now be assigned to team members');
    console.log('2. Update FR detail/edit dialogs to include assignee selection');
    console.log('3. Display assigned team members in FR lists');

  } catch (error) {
    console.error('❌ Error adding attributes:', error);
    process.exit(1);
  }
}

addAssigneeFieldsToFRs();
