/**
 * List All Collections
 */

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

async function listCollections() {
  try {
    console.log('📚 Listing all collections in database:', DATABASE_ID, '\n');
    
    const collections = await databases.listCollections(DATABASE_ID);
    
    console.log(`Found ${collections.total} collection(s):\n`);
    
    collections.collections.forEach((col: any, index: number) => {
      console.log(`${index + 1}. ${col.name}`);
      console.log(`   ID: ${col.$id}`);
      console.log(`   Created: ${col.$createdAt}`);
      console.log(`   Documents: ${col.documentSecurity ? 'Document-level' : 'Collection-level'} security`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

listCollections()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
