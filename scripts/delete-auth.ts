import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, Users } from 'node-appwrite';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const users = new Users(client);

async function deleteAuth() {
  const ids = ['6915aa22001ea60da3bf'];
  for (const id of ids) {
    try {
      await users.delete(id);
      console.log('✅ Deleted:', id);
    } catch (e: any) {
      console.log('⚠️', id, ':', e.message);
    }
  }
}

deleteAuth().then(() => process.exit(0));
