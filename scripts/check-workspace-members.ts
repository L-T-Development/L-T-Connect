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

async function check() {
  const attrs = await databases.listAttributes(DATABASE_ID, 'workspace_members');
  console.log('workspace_members attributes:\n');
  attrs.attributes.forEach((a: any) => {
    console.log(`${a.key}: ${a.type} (required: ${a.required})`);
  });
}

check().then(() => process.exit(0));
