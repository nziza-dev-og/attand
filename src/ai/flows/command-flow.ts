'use server';
/**
 * @fileOverview A central AI flow for understanding and executing natural language commands from an admin.
 * This flow uses a suite of tools to perform actions like generating reports or managing data.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { getAttendanceReport, addStudent } from '@/lib/services'; // Centralized services
import { School, Student, UserProfile } from '@/lib/types';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Define the input schema for the command flow
const CommandInputSchema = z.object({
  command: z.string().describe('The natural language command from the user.'),
  schoolId: z.string().describe('The ID of the school the user is administering.'),
  userId: z.string().describe('The ID of the user issuing the command.'),
  academicYearId: z.string().optional().describe('The active academic year ID, if available.'),
  termId: z.string().optional().describe('The active term ID, if available.'),
  allClasses: z.array(z.object({ id: z.string(), name: z.string() })).describe('A list of all classes in the school for context.'),
});
export type CommandInput = z.infer<typeof CommandInputSchema>;

// Define the output schema for the command flow
const CommandOutputSchema = z.object({
  response: z.string().describe('A natural language response to the user summarizing the action taken or the information found.'),
});
export type CommandOutput = z.infer<typeof CommandOutputSchema>;


// Tool: Get Attendance Report
const getAttendanceReportTool = ai.defineTool(
  {
    name: 'getAttendanceReport',
    description: 'Fetches attendance records based on specified filters like date, class, or student.',
    inputSchema: z.object({
      schoolId: z.string(),
      classId: z.string().optional(),
      studentId: z.string().optional(),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format.'),
    }),
    outputSchema: z.object({
      count: z.number(),
      summary: z.string(),
    }),
  },
  async (input) => {
    const records = await getAttendanceReport(input);
    return {
      count: records.length,
      summary: `Found ${records.length} records. Present: ${records.filter(r => r.status === 'present').length}, Absent: ${records.filter(r => r.status === 'absent').length}, Late: ${records.filter(r => r.status === 'late').length}.`,
    };
  }
);

// Tool: Add a new student
const addStudentTool = ai.defineTool(
  {
    name: 'addStudent',
    description: 'Adds a new student to the school and optionally enrolls them in a class for the current term.',
    inputSchema: z.object({
      schoolId: z.string(),
      academicYearId: z.string(),
      termId: z.string(),
      name: z.string().describe("The student's full name."),
      classId: z.string().optional().describe("The ID of the class to enroll the student in. If not provided, the student will be unassigned."),
      studentIdInfo: z.string().optional().describe("An optional student ID or roll number."),
    }),
    outputSchema: z.object({
      studentId: z.string(),
      studentName: z.string(),
      className: z.string().optional(),
    }),
  },
  async (input) => {
    const result = await addStudent(input);
    return {
      studentId: result.studentId,
      studentName: result.name,
      className: result.className,
    };
  }
);


// Define the main command flow
const commandFlow = ai.defineFlow(
  {
    name: 'commandFlow',
    inputSchema: CommandInputSchema,
    outputSchema: CommandOutputSchema,
  },
  async (input) => {
    const { command, schoolId, allClasses, academicYearId, termId } = input;

    // Provide context to the LLM
    const contextPrompt = `
      You are a helpful school administration AI assistant.
      The current school ID is: ${schoolId}.
      The current active academic year ID is: ${academicYearId || 'Not set'}.
      The current active term ID is: ${termId || 'Not set'}.

      Here are the available classes in this school:
      ${JSON.stringify(allClasses, null, 2)}

      Based on the user's command, decide which tool to use, if any.
      If adding a student, you must have the schoolId, academicYearId, and termId. If they are missing, inform the user they need an active academic year.
      If generating a report, use the provided schoolId.
      If the command is unclear or the feature is not implemented, state that clearly.
      User command: "${command}"
    `;

    const llmResponse = await ai.generate({
      prompt: contextPrompt,
      tools: [getAttendanceReportTool, addStudentTool],
      model: 'gemini-pro',
    });

    const toolCalls = llmResponse.toolCalls();

    if (toolCalls.length > 0) {
        // For simplicity, we'll process the first tool call.
        const toolCall = toolCalls[0];
        const toolResult = await toolCall.result();
        
        if(toolCall.name === 'addStudent') {
            const output = toolResult.output as any;
            return { response: `Successfully added student '${output.studentName}' (ID: ${output.studentId.substring(0,5)}...). ${output.className ? `They have been enrolled in ${output.className}.` : 'They are currently unassigned to a class.'}` };
        }
        
        if(toolCall.name === 'getAttendanceReport') {
            const output = toolResult.output as any;
            return { response: `Generated report: ${output.summary}` };
        }
        
        return { response: `Action '${toolCall.name}' completed.` };

    } else {
      // If no tool was called, return the text response from the LLM.
      const textResponse = llmResponse.text();
      return { response: textResponse || "I'm sorry, I couldn't process that command. The feature may not be implemented yet." };
    }
  }
);

// Wrapper function to be called from the client component
export async function executeCommand(input: CommandInput): Promise<CommandOutput> {
  try {
    if (!input.schoolId || !input.userId) {
        return { response: "Cannot execute command: School or User context is missing." };
    }

    // Check if AI is enabled for this user
    const userDocRef = doc(db, 'users', input.userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists() || userDoc.data()?.aiEnabled !== true) {
        return { response: "The AI assistant is currently disabled. Please enable it in the admin settings to use this feature." };
    }
    
    return await commandFlow(input);
  } catch (error: any) {
    console.error("Error in command flow:", error);
    return {
      response: `An error occurred: ${error.message || "An unexpected error occurred in the AI flow."}`,
    };
  }
}
