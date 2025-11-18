#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);

async function fix() {
  try {
    console.log('Adding watcherIds to tasks collection...');
    await databases.createStringAttribute(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      'tasks',
      'watcherIds',
      10000,
      false,
      undefined,
      true // array
    );
    console.log('✅ Added watcherIds attribute');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Done!');
  } catch (error) {
    if (error.code === 409) {
      console.log('✅ watcherIds already exists');
    } else {
      console.error('Error:', error.message);
    }
  }
}

fix();
