const { Client, Databases, Query, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const DEFAULT_LEAVE_ALLOCATIONS = {
  CASUAL: 12,
  SICK: 12,
  ANNUAL: 21,
  MATERNITY: 180,
  PATERNITY: 15,
  UNPAID: 0,
  COMPENSATORY: 0,
  BEREAVEMENT: 7,
};

async function checkLeaveBalances() {
  console.log('🔍 Checking leave balances...\n');

  try {
    // Get all users
    const usersResponse = await databases.listDocuments(DATABASE_ID, 'app_users');
    console.log(`Found ${usersResponse.total} users\n`);

    // Get all leave balances
    const balancesResponse = await databases.listDocuments(DATABASE_ID, 'leave_balances');
    console.log(`Found ${balancesResponse.total} leave balance records\n`);

    if (balancesResponse.total > 0) {
      console.log('📊 Existing Balance Records:');
      balancesResponse.documents.forEach((doc, index) => {
        console.log(`\n${index + 1}. User ID: ${doc.userId}`);
        console.log(`   Balance Type: ${typeof doc.leaveBalances}`);
        
        let balances = doc.leaveBalances;
        if (typeof balances === 'string') {
          try {
            balances = JSON.parse(balances);
          } catch (e) {
            console.log('   ⚠️  Failed to parse leaveBalances');
            return;
          }
        }
        
        console.log('   Balances:', balances);
      });
    }

    // Check which users don't have balances
    const usersWithoutBalances = usersResponse.documents.filter(
      user => !balancesResponse.documents.some(balance => balance.userId === user.$id)
    );

    if (usersWithoutBalances.length > 0) {
      console.log(`\n\n⚠️  ${usersWithoutBalances.length} users without leave balances:`);
      usersWithoutBalances.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name || user.email} (${user.$id})`);
      });

      console.log('\n❓ Would you like to initialize balances for these users?');
      console.log('   Run: node scripts/initialize-leave-balances.js');
    } else {
      console.log('\n✅ All users have leave balance records!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 404) {
      console.log('\n💡 Hint: The leave_balances collection might not exist.');
      console.log('   Run: npm run setup:appwrite');
    }
  }
}

checkLeaveBalances();
