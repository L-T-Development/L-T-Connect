import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, Databases } from 'node-appwrite';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

async function listDocs() {
  try {
    const docs = await databases.listDocuments(DATABASE_ID, 'app_users');
    console.log(`Found ${docs.total} document(s):\n`);
    docs.documents.forEach((doc: any) => {
      console.log(`ID: ${doc.$id}`);
      console.log(`  User ID: ${doc.userId}`);
      console.log(`  Email: ${doc.userEmail || 'N/A'}`);
      console.log(`  Name: ${doc.name}`);
      console.log('');
    });
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

listDocs().then(() => process.exit(0));
