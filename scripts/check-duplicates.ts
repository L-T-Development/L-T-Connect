/**
 * Check for Duplicate Emails
 * Finds duplicate email addresses that prevent unique index creation
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, Databases } from 'node-appwrite';

// Load .env.local explicitly
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_APP_USERS_ID!;

async function checkDuplicates() {
  try {
    console.log('🔍 Checking for duplicate emails...\n');

    // Get all documents
    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
    console.log(`📊 Total documents: ${response.total}\n`);

    if (response.total === 0) {
      console.log('✅ No documents found - collection is empty');
      return;
    }

    // Count emails
    const emailCounts: Record<string, number> = {};
    const emailDocs: Record<string, any[]> = {};

    response.documents.forEach((doc: any) => {
      const email = doc.email || 'null';
      emailCounts[email] = (emailCounts[email] || 0) + 1;
      if (!emailDocs[email]) {
        emailDocs[email] = [];
      }
      emailDocs[email].push(doc);
    });

    // Find duplicates
    const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate emails found!');
      console.log('\n📋 Documents in collection:');
      response.documents.forEach((doc: any) => {
        console.log(`   - ${doc.email || 'NO EMAIL'} (${doc.name || 'NO NAME'}) - ID: ${doc.$id}`);
      });
    } else {
      console.log(`❌ Found ${duplicates.length} duplicate email(s):\n`);
      duplicates.forEach(([email, count]) => {
        console.log(`📧 Email: ${email} (${count} times)`);
        emailDocs[email].forEach((doc: any) => {
          console.log(`   - ID: ${doc.$id}`);
          console.log(`     Name: ${doc.name || 'NO NAME'}`);
          console.log(`     User ID: ${doc.userId || 'NO USER ID'}`);
          console.log(`     Created: ${doc.$createdAt}`);
          console.log('');
        });
      });

      console.log('\n💡 To fix: Delete duplicate documents manually in Appwrite Console');
      console.log('   or use the Appwrite API to delete by document ID');
    }

  } catch (error: any) {
    console.error('❌ Error checking duplicates:', error.message);
    throw error;
  }
}

// Run the check
checkDuplicates()
  .then(() => {
    console.log('\n✅ Duplicate check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Duplicate check failed:', error);
    process.exit(1);
  });
