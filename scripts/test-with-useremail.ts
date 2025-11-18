import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, Databases, ID } from 'node-appwrite';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

async function testCreate() {
  try {
    console.log('Testing with userEmail attribute...\n');
    
    const doc = await databases.createDocument(
      DATABASE_ID,
      'app_users',
      ID.unique(),
      {
        userId: 'test_123',
        userEmail: 'test@example.com',
        name: 'Test User',
      }
    );
    
    console.log('✅ SUCCESS! Document created!');
    console.log('ID:', doc.$id);
    
    await databases.deleteDocument(DATABASE_ID, 'app_users', doc.$id);
    console.log('✅ Cleaned up');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testCreate().then(() => process.exit(0));
