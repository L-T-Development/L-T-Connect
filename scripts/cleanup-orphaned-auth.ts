import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, Users } from 'node-appwrite';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const users = new Users(client);

async function cleanup() {
  try {
    const orphanedId = '6915a7cb001c3d1f8ae7';
    console.log(`Deleting orphaned auth account: ${orphanedId}`);
    await users.delete(orphanedId);
    console.log('✅ Deleted');
  } catch (error: any) {
    console.log('⚠️ ', error.message);
  }
}

cleanup().then(() => process.exit(0));
