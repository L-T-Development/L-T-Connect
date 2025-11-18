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
  // Get all app_users docs
  const docs = await databases.listDocuments(DATABASE_ID, 'app_users');
  console.log(`Found ${docs.total} app_users documents`);
  
  for (const doc of docs.documents) {
    console.log(`Deleting doc ${doc.$id} and auth ${doc.userId}...`);
    try {
      await databases.deleteDocument(DATABASE_ID, 'app_users', doc.$id);
      await users.delete(doc.userId);
      console.log('✅ Deleted');
    } catch (e: any) {
      console.log('⚠️', e.message);
    }
  }
}

cleanup().then(() => process.exit(0));
