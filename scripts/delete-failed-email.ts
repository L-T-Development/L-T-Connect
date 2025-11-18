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

async function deleteFailed() {
  try {
    console.log('Deleting failed email attribute...');
    await databases.deleteAttribute(DATABASE_ID, 'app_users', 'email');
    console.log('✅ Deleted failed email attribute');
    
    await new Promise(r => setTimeout(r, 3000));
    
    const attrs = await databases.listAttributes(DATABASE_ID, 'app_users');
    const hasEmail = attrs.attributes.find((a: any) => a.key === 'email');
    console.log('Email attribute exists:', !!hasEmail);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

deleteFailed().then(() => process.exit(0));
