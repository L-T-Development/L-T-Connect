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
  try {
    await databases.deleteDocument(DATABASE_ID, 'app_users', '6915ac3c0028f1d393c6');
    console.log('✅ Deleted doc');
  } catch (e: any) { console.log('⚠️', e.message); }
  
  try {
    await users.delete('6915ac3c0006d1554899');
    console.log('✅ Deleted auth');
  } catch (e: any) { console.log('⚠️', e.message); }
}

cleanup().then(() => process.exit(0));
