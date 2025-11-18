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
    console.log('Testing document creation in app_users collection...\n');
    
    const doc = await databases.createDocument(
      DATABASE_ID,
      'app_users',
      ID.unique(),
      {
        userId: 'test_user_123',
        email: 'test@example.com',
        name: 'Test User',
      }
    );
    
    console.log('✅ Document created successfully!');
    console.log('Document ID:', doc.$id);
    
    // Clean up
    await databases.deleteDocument(DATABASE_ID, 'app_users', doc.$id);
    console.log('✅ Test document deleted');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Response:', error.response);
  }
}

testCreate().then(() => process.exit(0));
