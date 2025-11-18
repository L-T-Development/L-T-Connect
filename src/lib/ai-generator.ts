// Gemini AI configuration is handled by the API route
// See: /src/app/api/ai-generate/route.ts

export interface GeneratedClientRequirement {
  title: string;
  clientName: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface GeneratedFunctionalRequirement {
  title: string;
  description: string;
  type: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'TECHNICAL' | 'BUSINESS';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  acceptanceCriteria: string[];
  businessRules: string[];
  parentId?: string; // Reference to parent FR for nesting
}

export interface GeneratedEpic {
  name: string;
  description: string;
  color: string;
  startDate?: string;
  endDate?: string;
  functionalRequirementIds: string[]; // References to FRs
}

export interface GeneratedTask {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedHours: number;
  epicId?: string; // Reference to Epic
  labels: string[];
}

export interface GeneratedHierarchy {
  clientRequirements: GeneratedClientRequirement[];
  functionalRequirements: GeneratedFunctionalRequirement[];
  epics: GeneratedEpic[];
  tasks: GeneratedTask[];
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
 * Call Gemini AI via Next.js API route
 * @param prompt The prompt to send to the model
 * @param maxRetries Number of retries if request fails
 * @returns The generated text response
 */
async function callGemini(prompt: string, maxRetries = 3): Promise<string> {
  const response = await fetch('/api/ai-generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      maxRetries,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate AI response');
  }

  const data = await response.json();
  return data.text;
}

const GENERATION_PROMPT = `You are an expert software requirements analyst and project manager. Analyze the provided document/text and generate a complete project structure.

Generate a comprehensive breakdown following this hierarchy:
1. Client Requirements - High-level business needs from client perspective
2. Functional Requirements - Detailed technical specifications (can be nested, e.g., REQ-01, REQ-01.01, REQ-01.01.01)
3. Epics - Large features grouping related work
4. Tasks - Specific implementation work items with story points

For each level, provide:
- Clear, actionable titles
- Detailed descriptions
- Appropriate priorities (LOW, MEDIUM, HIGH, CRITICAL)
- Realistic story points for tasks (use Fibonacci: 1, 2, 3, 5, 8, 13, 21)
- Estimated hours for tasks
- Acceptance criteria for functional requirements
- Business rules where applicable
- Timeline with milestones

Respond ONLY with valid JSON matching this exact structure:
{
  "clientRequirements": [
    {
      "title": "string",
      "clientName": "string (extract from document or use 'Client')",
      "description": "string",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }
  ],
  "functionalRequirements": [
    {
      "title": "string",
      "description": "string",
      "type": "FUNCTIONAL" | "NON_FUNCTIONAL" | "TECHNICAL" | "BUSINESS",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "complexity": "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
      "acceptanceCriteria": ["string"],
      "businessRules": ["string"],
      "parentId": "optional reference to parent FR for nesting"
    }
  ],
  "epics": [
    {
      "name": "string",
      "description": "string",
      "color": "hex color code",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "functionalRequirementIds": ["references to FR indices"]
    }
  ],
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "estimatedHours": number,
      "epicId": "reference to epic index",
      "labels": ["string tags"]
    }
  ],
  "timeline": {
    "projectDuration": "string (e.g., '6 months', '3 weeks')",
    "milestones": [
      {
        "name": "string",
        "date": "YYYY-MM-DD",
        "description": "string"
      }
    ]
  }
}

Important rules:
Important rules:
1. Be comprehensive but realistic
2. Break down complex requirements into nested functional requirements
3. Estimate hours based on task complexity (simple: 2-4h, medium: 4-8h, complex: 8-16h)
6. Link functional requirements to epics using indices
7. Provide realistic timeline with key milestones
8. Extract client name if mentioned in document
9. Respond with ONLY the JSON, no markdown, no explanation`;

export async function generateProjectHierarchy(
  documentText: string
): Promise<GeneratedHierarchy> {
  try {
    const prompt = `${GENERATION_PROMPT}\n\nDocument/Requirements:\n${documentText}`;

    let text = await callGemini(prompt);

    // Clean up response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Extract JSON from the response if it contains additional text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    const generated: GeneratedHierarchy = JSON.parse(text);

    // Validate structure
    if (
      !generated.clientRequirements ||
      !generated.functionalRequirements ||
      !generated.epics ||
      !generated.tasks ||
      !generated.timeline
    ) {
      throw new Error('Invalid response structure from AI');
    }

    return generated;
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    throw new Error(`Failed to generate project hierarchy: ${error.message}`);
  }
}

export async function analyzeDocument(documentText: string): Promise<{
  summary: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  estimatedDuration: string;
  recommendedTeamSize: number;
}> {
  try {
    const prompt = `Analyze this project document and provide:
1. A brief summary (2-3 sentences)
2. Project complexity (LOW, MEDIUM, HIGH, VERY_HIGH)
3. Estimated duration (e.g., "3 months", "6 weeks")
4. Recommended team size (number of developers)

Respond ONLY with valid JSON:
{
  "summary": "string",
  "complexity": "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
  "estimatedDuration": "string",
  "recommendedTeamSize": number
}

Document:\n${documentText}`;

    let text = await callGemini(prompt);

    // Clean up response
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Extract JSON from the response if it contains additional text
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    return JSON.parse(text);
  } catch (error: any) {
    console.error('Document Analysis Error:', error);
    throw new Error(`Failed to analyze document: ${error.message}`);
  }
}
