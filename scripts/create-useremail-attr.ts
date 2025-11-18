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

async function createUserEmail() {
  try {
    console.log('Creating userEmail attribute...');
    await databases.createStringAttribute(
      DATABASE_ID,
      'app_users',
      'userEmail',
      255,
      true,
      undefined,
      false
    );
    console.log('✅ Created userEmail attribute');
    
    console.log('\n⏳ Waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    
    const attrs = await databases.listAttributes(DATABASE_ID, 'app_users');
    const attr = attrs.attributes.find((a: any) => a.key === 'userEmail');
    console.log(`Status: ${attr?.status || 'NOT FOUND'}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

createUserEmail().then(() => process.exit(0));
