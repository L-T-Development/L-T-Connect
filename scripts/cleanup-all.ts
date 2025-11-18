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

async function cleanup() {
  // Delete document
  try {
    await databases.deleteDocument(DATABASE_ID, 'app_users', '6915ab36003e650c24e0');
    console.log('✅ Deleted document');
  } catch (e: any) {
    console.log('⚠️ Doc:', e.message);
  }
  
  // Delete auth
  try {
    await users.delete('6915ab36001e640f4002');
    console.log('✅ Deleted auth');
  } catch (e: any) {
    console.log('⚠️ Auth:', e.message);
  }
}

cleanup().then(() => process.exit(0));
