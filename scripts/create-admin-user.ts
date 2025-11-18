/**
 * Create Initial Admin User Script
 * 
 * This script creates the first admin user with full privileges
 * Run this once during initial setup
 * 
 * Usage: npm run create-admin
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, Databases, Account, ID } from 'node-appwrite';
import * as readline from 'readline';

// Load .env.local explicitly
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const account = new Account(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const APP_USERS_COLLECTION_ID = 'app_users';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function createAdminUser() {
  console.log('🔐 Create Initial Admin User\n');
  console.log('This script will create an admin user with full privileges.');
  console.log('The admin can create workspaces and add team members.\n');

  try {
    // Get admin details from user input
    const name = await question('Admin Name: ');
    if (!name) {
      throw new Error('Name is required');
    }

    const email = await question('Admin Email: ');
    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }

    const password = await question('Admin Password (min 8 characters): ');
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const confirmPassword = await question('Confirm Password: ');
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const phone = await question('Phone Number (optional): ');

    console.log('\n📝 Creating admin user...');

    // Step 1: Create Appwrite Auth account
    console.log('1️⃣ Creating Appwrite auth account...');
    const userId = ID.unique();
    
    // Note: We need to use the server SDK to create user with specific password
    // For production, you might want to use createUser() from the Users API
    const authUser = await account.create(
      userId,
      email,
      password,
      name
    );
    
    console.log(`✅ Auth account created: ${authUser.$id}`);

    // Step 2: Create user record in app_users collection
    console.log('2️⃣ Creating app user record...');
    const appUser = await databases.createDocument(
      DATABASE_ID,
      APP_USERS_COLLECTION_ID,
      ID.unique(),
      {
        userId: authUser.$id,
        email: email,
        name: name,
        isAdmin: true,
        hasTempPassword: false,
        workspaceIds: [],
        phone: phone || null,
        lastLoginAt: new Date().toISOString(),
        createdBy: 'system',
      }
    );

    console.log(`✅ App user record created: ${appUser.$id}`);

    console.log('\n✅ Admin user created successfully!\n');
    console.log('📋 User Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${authUser.$id}`);
    console.log(`   Admin: Yes`);
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    console.log('   The password will not be shown again.');

    rl.close();
  } catch (error: any) {
    console.error('\n❌ Error creating admin user:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run the script
console.log('Starting admin user creation...\n');
createAdminUser()
  .then(() => {
    console.log('\n🎉 Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });
