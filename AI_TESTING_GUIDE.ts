/**
 * Test Script for Hugging Face AI Integration
 * 
 * This script tests the AI generator functions to ensure they work correctly.
 * 
 * Usage:
 * 1. Ensure NEXT_PUBLIC_HF_API_KEY is set in your .env.local
 * 2. Run: npm run dev
 * 3. Navigate to: http://localhost:3000/requirements
 * 4. Click "Generate with AI" button
 * 5. Paste the sample requirements below
 */

export const SAMPLE_REQUIREMENTS = `
Project: Task Management System

Overview:
We need a web-based task management system for our team of 15 developers. 
The system should help us track tasks, assign work, and monitor progress.

Requirements:

1. User Management
   - User registration and authentication
   - Role-based access control (Admin, Manager, Developer)
   - User profile management

2. Task Management
   - Create, edit, and delete tasks
   - Assign tasks to team members
   - Set priority levels (Low, Medium, High, Critical)
   - Add due dates and time estimates
   - Task status tracking (Todo, In Progress, Review, Done)

3. Project Organization
   - Group tasks into projects
   - Create project milestones
   - Track project progress
   - Generate project reports

4. Collaboration
   - Comment on tasks
   - @mention team members
   - File attachments
   - Activity feed

5. Reporting & Analytics
   - Task completion metrics
   - Team productivity dashboards
   - Burndown charts
   - Export reports to PDF

6. Notifications
   - Email notifications for task assignments
   - In-app notifications
   - Daily digest emails

Technical Requirements:
- Must be responsive (mobile-friendly)
- Support up to 100 concurrent users
- 99.9% uptime SLA
- Data backup every 24 hours
- GDPR compliant

Timeline: 4-6 months
Budget: $50,000 - $75,000
`;

export const SAMPLE_REQUIREMENTS_SHORT = `
Build a simple todo list app that allows users to:
1. Add new tasks
2. Mark tasks as complete
3. Delete tasks
4. Filter tasks by status (all, active, completed)
5. Store data locally in browser

Should be built with React and TypeScript.
Timeline: 2 weeks
`;

export const SAMPLE_REQUIREMENTS_ECOMMERCE = `
Project: E-Commerce Platform

We need a full-featured e-commerce platform for our online store.

Core Features:
1. Product Catalog
   - Browse products by category
   - Search and filter products
   - Product details with images
   - Product reviews and ratings

2. Shopping Cart
   - Add/remove items
   - Update quantities
   - Apply discount codes
   - Calculate shipping costs

3. Checkout Process
   - Guest checkout option
   - Multiple payment methods (credit card, PayPal, Apple Pay)
   - Shipping address management
   - Order summary and confirmation

4. User Accounts
   - Account creation and login
   - Order history
   - Saved addresses
   - Wishlist functionality

5. Admin Panel
   - Product management (CRUD)
   - Order management
   - Customer management
   - Analytics dashboard
   - Inventory tracking

6. Additional Features
   - Email notifications (order confirmation, shipping updates)
   - Mobile app support
   - Multi-language support (English, Spanish, French)
   - SEO optimization
   - Integration with shipping providers

Technical Requirements:
- Handle 10,000+ products
- Support 1,000 concurrent users
- Fast page load times (< 2 seconds)
- PCI DSS compliant for payments
- Automated testing coverage > 80%

Timeline: 8-10 months
Team Size: 5-7 developers
Budget: $150,000 - $200,000
`;

/**
 * Expected Response Structure
 */
export interface ExpectedResponse {
  clientRequirements: Array<{
    title: string;
    clientName: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  functionalRequirements: Array<{
    title: string;
    description: string;
    type: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'TECHNICAL' | 'BUSINESS';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    acceptanceCriteria: string[];
    businessRules: string[];
    parentId?: string;
  }>;
  epics: Array<{
    name: string;
    description: string;
    color: string;
    startDate?: string;
    endDate?: string;
    functionalRequirementIds: string[];
  }>;
  tasks: Array<{
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    storyPoints: number;
    estimatedHours: number;
    epicId?: string;
    labels: string[];
  }>;
  timeline: {
    projectDuration: string;
    milestones: Array<{
      name: string;
      date: string;
      description: string;
    }>;
  };
}

/**
 * Manual Testing Steps
 */
export const TESTING_STEPS = [
  {
    step: 1,
    title: 'Setup Environment',
    description: 'Ensure NEXT_PUBLIC_HF_API_KEY is set in .env.local',
    expectedResult: 'Environment variable is configured',
  },
  {
    step: 2,
    title: 'Start Dev Server',
    description: 'Run: npm run dev',
    expectedResult: 'Server starts on http://localhost:3000',
  },
  {
    step: 3,
    title: 'Navigate to Requirements',
    description: 'Go to Requirements page in the dashboard',
    expectedResult: 'Requirements page loads successfully',
  },
  {
    step: 4,
    title: 'Open AI Dialog',
    description: 'Click "Generate with AI" button',
    expectedResult: 'AI Generate Dialog opens',
  },
  {
    step: 5,
    title: 'Input Requirements',
    description: 'Paste sample requirements or upload PDF',
    expectedResult: 'Text appears in textarea',
  },
  {
    step: 6,
    title: 'Generate Structure',
    description: 'Click "Generate with AI" button',
    expectedResult: 'Loading screen appears with progress bar',
  },
  {
    step: 7,
    title: 'Wait for Analysis',
    description: 'Wait 10-20 seconds (first time may take longer)',
    expectedResult: 'Analysis completes, shows document summary',
  },
  {
    step: 8,
    title: 'Review Generated Content',
    description: 'Check all tabs: Client Reqs, Functional Reqs, Epics, Tasks, Timeline',
    expectedResult: 'All sections contain generated data',
  },
  {
    step: 9,
    title: 'Validate Structure',
    description: 'Verify priorities, story points, dates are reasonable',
    expectedResult: 'Generated data makes sense for the input',
  },
  {
    step: 10,
    title: 'Save to Database',
    description: 'Click "Confirm & Save All"',
    expectedResult: 'Data is saved and appears in your project',
  },
];

/**
 * Troubleshooting Common Issues
 */
export const TROUBLESHOOTING = {
  'Model is loading': {
    problem: 'First request takes 10-20 seconds',
    solution: 'This is normal. The model is being loaded into memory. Wait and it will complete.',
    prevention: 'After first use, model stays warm for ~10 minutes',
  },
  'API Key Error': {
    problem: 'Error message about missing API key',
    solution: 'Set NEXT_PUBLIC_HF_API_KEY in .env.local and restart server',
    prevention: 'Always check environment variables before testing',
  },
  'Invalid JSON': {
    problem: 'Error parsing AI response',
    solution: 'Try again with more structured input, or simplify requirements',
    prevention: 'Use clear, well-formatted requirements documents',
  },
  'Rate Limit': {
    problem: 'Too many requests',
    solution: 'Wait a few minutes or upgrade to Pro tier',
    prevention: 'Don\'t spam requests during testing',
  },
  'Timeout Error': {
    problem: 'Request takes too long',
    solution: 'Reduce input size or try again when HF servers are less busy',
    prevention: 'Keep input documents under 2000 words',
  },
};

export default {
  SAMPLE_REQUIREMENTS,
  SAMPLE_REQUIREMENTS_SHORT,
  SAMPLE_REQUIREMENTS_ECOMMERCE,
  TESTING_STEPS,
  TROUBLESHOOTING,
};
