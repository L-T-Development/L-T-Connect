const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function initializeLeaveBalances() {
  console.log('🚀 Initializing leave balances for all users...\n');

  try {
    const currentYear = new Date().getFullYear();
    
    // Get all users
    const usersResponse = await databases.listDocuments(DATABASE_ID, 'app_users');
    console.log(`Found ${usersResponse.total} users\n`);

    // Get all workspaces
    const workspacesResponse = await databases.listDocuments(DATABASE_ID, 'workspaces');
    console.log(`Found ${workspacesResponse.total} workspaces\n`);

    // Get existing balances
    const balancesResponse = await databases.listDocuments(DATABASE_ID, 'leave_balances');
    console.log(`Found ${balancesResponse.total} existing balance records\n`);

    let created = 0;
    let skipped = 0;

    // For each user, create balance for their workspaces
    for (const user of usersResponse.documents) {
      // Get user's workspaces (you might need to adjust this logic)
      const userWorkspaces = workspacesResponse.documents.filter(
        ws => ws.ownerId === user.$id || true // Adjust this filter based on your workspace membership logic
      );

      for (const workspace of userWorkspaces) {
        // Check if balance already exists
        const existingBalance = balancesResponse.documents.find(
          b => b.userId === user.$id && b.workspaceId === workspace.$id && b.year === currentYear
        );

        if (existingBalance) {
          console.log(`⏭️  Skipped: ${user.name || user.email} in ${workspace.name}`);
          skipped++;
          continue;
        }

        try {
          await databases.createDocument(
            DATABASE_ID,
            'leave_balances',
            ID.unique(),
            {
              userId: user.$id,
              workspaceId: workspace.$id,
              year: currentYear,
              paidLeave: 21,     // 21 paid leave days per year
              unpaidLeave: 0,    // Unpaid leave starts at 0
              halfDay: 12,       // 12 half days per year
              compOff: 0,        // Comp off starts at 0 (earned)
            }
          );
          console.log(`✅ Created: ${user.name || user.email} - ${workspace.name}`);
          console.log(`   - Paid Leave: 21 days`);
          console.log(`   - Half Days: 12 days`);
          created++;
        } catch (error) {
          console.error(`❌ Failed for ${user.name || user.email}:`, error.message);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 404) {
      console.log('\n💡 Hint: The collection might not exist.');
      console.log('   Run: npm run setup:appwrite');
    }
  }
}

initializeLeaveBalances();
