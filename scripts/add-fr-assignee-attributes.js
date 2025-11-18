const sdk = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

// Initialize Appwrite client with API key
const client = new sdk.Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const FR_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_REQUIREMENTS_COLLECTION_ID;

async function addAssigneeAttributes() {
    try {
        console.log('🚀 Starting to add assignee attributes to functional_requirements collection...');
        console.log(`Database ID: ${DATABASE_ID}`);
        console.log(`Collection ID: ${FR_COLLECTION_ID}`);
        console.log('');

        // Add assignedTo attribute (array of user IDs)
        console.log('⏳ Adding "assignedTo" attribute...');
        try {
            await databases.createStringAttribute(
                DATABASE_ID,
                FR_COLLECTION_ID,
                'assignedTo',
                255,
                false, // not required
                undefined, // no default value
                true // array
            );
            console.log('✅ Successfully added "assignedTo" attribute (string array)');
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️  "assignedTo" attribute already exists, skipping...');
            } else {
                throw error;
            }
        }

        // Wait for attribute to be available
        console.log('⏳ Waiting for attribute to be available...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Add assignedToNames attribute (array of user names)
        console.log('⏳ Adding "assignedToNames" attribute...');
        try {
            await databases.createStringAttribute(
                DATABASE_ID,
                FR_COLLECTION_ID,
                'assignedToNames',
                255,
                false, // not required
                undefined, // no default value
                true // array
            );
            console.log('✅ Successfully added "assignedToNames" attribute (string array)');
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️  "assignedToNames" attribute already exists, skipping...');
            } else {
                throw error;
            }
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ SUCCESS! Attributes added to functional_requirements');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('📝 Added Attributes:');
        console.log('  1. assignedTo (string array) - Stores user IDs');
        console.log('  2. assignedToNames (string array) - Stores user names');
        console.log('');
        console.log('🎉 Your system is now ready to:');
        console.log('  • Assign team members to functional requirements');
        console.log('  • Track who is working on each FR');
        console.log('  • Display team assignments in the sprint board');
        console.log('');
        console.log('💡 Next Steps:');
        console.log('  1. Restart your dev server if it\'s running');
        console.log('  2. Go to Sprint Backlog page');
        console.log('  3. Switch to "Functional Requirements" tab');
        console.log('  4. Assign team members to FRs!');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ ERROR: Failed to add attributes');
        console.error('═══════════════════════════════════════════════════════');
        console.error('');
        console.error('Error Details:', error.message);
        console.error('Error Code:', error.code || 'N/A');
        console.error('');
        
        if (error.code === 401) {
            console.error('🔐 Authentication Error:');
            console.error('  • Check your APPWRITE_API_KEY in .env.local');
            console.error('  • Ensure the API key has Database permissions');
            console.error('');
        } else if (error.code === 404) {
            console.error('🔍 Not Found Error:');
            console.error('  • Verify DATABASE_ID:', DATABASE_ID);
            console.error('  • Verify COLLECTION_ID:', FR_COLLECTION_ID);
            console.error('  • Check these values in your Appwrite Console');
            console.error('');
        } else if (error.message.includes('Rate limit')) {
            console.error('⏰ Rate Limit Error:');
            console.error('  • Wait a few minutes and try again');
            console.error('  • Appwrite has rate limits for API calls');
            console.error('');
        }
        
        console.error('📚 Troubleshooting:');
        console.error('  1. Verify .env.local has correct values');
        console.error('  2. Check Appwrite Console → Settings → API Keys');
        console.error('  3. Ensure API key has "Database" scope enabled');
        console.error('  4. Verify collection exists in Appwrite Console');
        console.error('');
        
        process.exit(1);
    }
}

// Run the script
addAssigneeAttributes();
