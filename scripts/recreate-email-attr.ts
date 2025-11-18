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

async function recreateEmail() {
  try {
    console.log('1️⃣ Deleting email attribute...');
    try {
      await databases.deleteAttribute(DATABASE_ID, 'app_users', 'email');
      console.log('✅ Deleted');
    } catch (e: any) {
      console.log('⚠️ ', e.message);
    }
    
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n2️⃣ Creating email attribute...');
    await databases.createStringAttribute(
      DATABASE_ID,
      'app_users',
      'email',
      255,
      true, // required
      undefined, // no default
      false // not array
    );
    console.log('✅ Created');
    
    console.log('\n⏳ Waiting 10 seconds for attribute to be ready...');
    await new Promise(r => setTimeout(r, 10000));
    
    const attrs = await databases.listAttributes(DATABASE_ID, 'app_users');
    const emailAttr = attrs.attributes.find((a: any) => a.key === 'email');
    console.log(`\n📊 Email attribute status: ${emailAttr?.status || 'NOT FOUND'}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

recreateEmail().then(() => process.exit(0));
