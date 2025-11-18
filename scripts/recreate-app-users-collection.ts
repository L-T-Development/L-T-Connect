import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, Databases, Users } from 'node-appwrite';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const users = new Users(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

async function recreateCollection() {
  try {
    console.log('1️⃣ Cleaning up orphaned auth account...');
    try {
      await users.delete('6915accc002de39438bb');
      console.log('✅ Deleted orphaned auth');
    } catch (e: any) {
      console.log('⏭️  No orphaned auth to delete');
    }

    console.log('\n2️⃣ Deleting old app_users collection...');
    try {
      await databases.deleteCollection(DATABASE_ID, 'app_users');
      console.log('✅ Deleted old collection');
    } catch (e: any) {
      console.log('❌ Error deleting:', e.message);
      return;
    }

    console.log('\n⏳ Waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n3️⃣ Creating new app_users collection...');
    await databases.createCollection(
      DATABASE_ID,
      'app_users',
      'App Users',
      undefined,
      undefined,
      true // documentSecurity
    );
    console.log('✅ Collection created');

    await new Promise(r => setTimeout(r, 2000));

    console.log('\n4️⃣ Creating attributes...');
    
    const attrs = [
      { key: 'userId', type: 'string', size: 100, required: true },
      { key: 'userEmail', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'isAdmin', type: 'boolean', required: false, default: false },
      { key: 'hasTempPassword', type: 'boolean', required: false, default: false },
      { key: 'workspaceIds', type: 'string', size: 100, required: false, array: true },
      { key: 'defaultWorkspaceId', type: 'string', size: 100, required: false },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'avatar', type: 'string', size: 500, required: false },
      { key: 'lastLoginAt', type: 'string', size: 50, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: false },
    ];

    for (const attr of attrs) {
      console.log(`  Creating ${attr.key}...`);
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            'app_users',
            attr.key,
            attr.size!,
            attr.required,
            undefined,
            (attr as any).array || false
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            'app_users',
            attr.key,
            attr.required,
            (attr as any).default,
            false
          );
        }
        console.log(`  ✅ ${attr.key}`);
        await new Promise(r => setTimeout(r, 1500));
      } catch (e: any) {
        console.log(`  ❌ ${attr.key}: ${e.message}`);
      }
    }

    console.log('\n5️⃣ Creating indexes...');
    await new Promise(r => setTimeout(r, 3000));

    try {
      await databases.createIndex(DATABASE_ID, 'app_users', 'userId_index', 'unique' as any, ['userId']);
      console.log('  ✅ userId_index');
    } catch (e: any) {
      console.log('  ❌ userId_index:', e.message);
    }

    await new Promise(r => setTimeout(r, 2000));

    try {
      await databases.createIndex(DATABASE_ID, 'app_users', 'userEmail_index', 'key' as any, ['userEmail']);
      console.log('  ✅ userEmail_index');
    } catch (e: any) {
      console.log('  ❌ userEmail_index:', e.message);
    }

    console.log('\n✅ Collection recreated successfully!');
    console.log('\n⏳ Wait 10 seconds for all attributes to be ready, then test again.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

recreateCollection().then(() => process.exit(0));
