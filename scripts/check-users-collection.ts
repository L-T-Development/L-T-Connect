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

async function checkUsersCollection() {
  try {
    console.log('Checking OLD users collection:\n');
    
    const attrs = await databases.listAttributes(DATABASE_ID, 'users');
    console.log('Attributes in "users" collection:');
    attrs.attributes.forEach((attr: any) => {
      console.log(`  - ${attr.key} (${attr.type})`);
    });
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkUsersCollection().then(() => process.exit(0));
