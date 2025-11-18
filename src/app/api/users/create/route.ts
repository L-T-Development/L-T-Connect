/**
 * API Route: Create User
 * Server-side endpoint for creating Appwrite auth accounts and sending emails
 * This ensures sensitive operations only happen server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, ID, Users, Permission, Role } from 'node-appwrite';
import { sendWelcomeEmail, sendWorkspaceInvitation, generateTempPassword } from '@/lib/email';

// Initialize Appwrite server client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // Server-side API key

const databases = new Databases(client);
const users = new Users(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const APP_USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_APP_USERS_ID!;
const WORKSPACE_MEMBERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_WORKSPACE_MEMBERS_ID!;
const WORKSPACES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;
const PENDING_ACCESS_COLLECTION_ID = 'pending_workspace_access';

interface CreateUserRequest {
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  workspaceId: string;
  workspaceName: string;
  createdBy: string;
  createdByName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    const { name, email, roleId, roleName, workspaceId, workspaceName, createdBy, createdByName } = body;

    console.log('🔧 Using DATABASE_ID:', DATABASE_ID);
    console.log('🔧 Using APP_USERS_COLLECTION_ID:', APP_USERS_COLLECTION_ID);

    // Validate required fields
    if (!name || !email || !roleId || !roleName || !workspaceId || !workspaceName || !createdBy || !createdByName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Check if user already exists in this workspace
    // First check workspace_members for this specific workspace
    const workspaceMembersResponse = await databases.listDocuments(
      DATABASE_ID,
      WORKSPACE_MEMBERS_COLLECTION_ID
    );
    
    const existingInWorkspace = workspaceMembersResponse.documents.find(
      (doc: any) => doc.email === email && doc.workspaceId === workspaceId
    );
    
    if (existingInWorkspace) {
      return NextResponse.json(
        { error: 'A user with this email already exists in this workspace' },
        { status: 400 }
      );
    }

    // Step 2: Check if user exists in app_users (for cross-workspace invitations)
    // NOTE: Using 'userEmail' instead of 'email' due to Appwrite attribute issue
    const allUsers = await databases.listDocuments(
      DATABASE_ID,
      APP_USERS_COLLECTION_ID
    );

    const existingUsers = {
      documents: allUsers.documents.filter((doc: any) => doc.userEmail === email)
    };

    const userExists = existingUsers.documents.length > 0;

    if (userExists) {
      // User exists - send workspace invitation
      const existingUser = existingUsers.documents[0];
      
      // Check if already in this workspace
      const workspaceIds = (existingUser.workspaceIds as string[]) || [];
      if (workspaceIds.includes(workspaceId)) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace' },
          { status: 400 }
        );
      }

      // Create pending workspace access request
      const invitationToken = ID.unique();
      
      await databases.createDocument(
        DATABASE_ID,
        PENDING_ACCESS_COLLECTION_ID,
        ID.unique(),
        {
          userId: existingUser.userId,
          email,
          name,
          workspaceId,
          workspaceName,
          requestedBy: createdBy,
          requestedByName: createdByName,
          roleId,
          roleName,
          status: 'PENDING',
          invitationToken,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        }
      );

      // Send invitation email
      await sendWorkspaceInvitation({
        name,
        email,
        workspaceName,
        invitedBy: createdByName,
        invitationToken,
      });

      return NextResponse.json({
        success: true,
        type: 'invitation',
        message: 'Workspace invitation sent to existing user',
      });
    }

    // Step 2: Create new user
    const tempPassword = generateTempPassword();
    const newUserId = ID.unique();

    // Create Appwrite Auth account using server SDK
    try {
      await users.create(
        newUserId,
        email,
        undefined, // phone (optional)
        tempPassword,
        name
      );
      console.log('✅ Appwrite auth account created:', newUserId);
    } catch (authError: any) {
      console.error('Error creating Appwrite auth account:', authError);
      return NextResponse.json(
        { error: `Failed to create auth account: ${authError.message}` },
        { status: 500 }
      );
    }

    // Step 3: Create app_users record
    try {
      // Create with all fields at once (no update needed)
      const documentData: any = {
        userId: newUserId,
        userEmail: email,
        name: name,
        isAdmin: false,
        hasTempPassword: true,
        workspaceIds: [workspaceId],
        defaultWorkspaceId: workspaceId,
        phone: '',
        avatar: '',
        lastLoginAt: new Date().toISOString(),
        createdBy: createdBy,
      };

      console.log('📝 Creating app_users document...');

      await databases.createDocument(
        DATABASE_ID,
        APP_USERS_COLLECTION_ID,
        ID.unique(),
        documentData,
        [
          Permission.read(Role.user(newUserId)),
          Permission.update(Role.user(newUserId)),
          Permission.delete(Role.user(newUserId)),
        ]
      );
      
      console.log('✅ app_users record created successfully');
    } catch (dbError: any) {
      // If app_users creation fails, try to delete the auth account
      try {
        await users.delete(newUserId);
      } catch (deleteError) {
        console.error('Failed to cleanup auth account:', deleteError);
      }
      
      console.error('Error creating app_users record:', dbError);
      return NextResponse.json(
        { error: `Failed to create user record: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Step 4: Add to workspace_members
    try {
      await databases.createDocument(
        DATABASE_ID,
        WORKSPACE_MEMBERS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          userId: newUserId,
          userName: name,
          email: email,
          role: roleName, // workspace_members uses 'role' not 'roleId/roleName'
          status: 'ACTIVE',
          joinedAt: new Date().toISOString(),
          invitedBy: createdBy,
        },
        [
          Permission.read(Role.user(newUserId)),
          Permission.update(Role.user(newUserId)),
        ]
      );
      console.log('✅ workspace_members record created');
    } catch (memberError: any) {
      console.error('Error adding to workspace_members:', memberError);
      // Don't fail the entire operation, just log the error
    }

    // Step 5: Add user to workspace's memberIds array
    try {
      // Fetch the workspace
      const workspace = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        workspaceId
      );

      // Add new user to memberIds array
      const currentMemberIds = Array.isArray(workspace.memberIds) ? workspace.memberIds : [];
      if (!currentMemberIds.includes(newUserId)) {
        await databases.updateDocument(
          DATABASE_ID,
          WORKSPACES_COLLECTION_ID,
          workspaceId,
          {
            memberIds: [...currentMemberIds, newUserId],
          }
        );
        console.log('✅ User added to workspace memberIds');
      }
    } catch (workspaceError: any) {
      console.error('Error updating workspace memberIds:', workspaceError);
      // Don't fail the entire operation, just log the error
    }

    // Step 6: Send welcome email
    try {
      await sendWelcomeEmail({
        name,
        email,
        tempPassword,
        workspaceName,
      });
      console.log('✅ Welcome email sent');
    } catch (emailError: any) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the operation if email fails, user is still created
    }

    return NextResponse.json({
      success: true,
      type: 'new_user',
      message: 'User created successfully',
      userId: newUserId,
    });

  } catch (error: any) {
    console.error('Error in create user API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
