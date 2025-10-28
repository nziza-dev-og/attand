'use server';
/**
 * @fileOverview An AI flow to intelligently import and enroll students into classes for a specific academic term.
 *
 * - enrollStudentsInTerm - The main function that orchestrates the student enrollment process using an AI flow.
 * - EnrollInputSchema - The Zod schema for the input data.
 * - EnrollOutputSchema - The Zod schema for the output data.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { collection, writeBatch, doc, Timestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/types';

// Define Zod schema for existing classes to provide context to the AI
const ClassInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// Define Zod schema for the input of the AI flow
export const EnrollInputSchema = z.object({
  fileContent: z.string().describe("JSON stringified array of student data from the uploaded file."),
  schoolId: z.string().describe("The ID of the school where students will be enrolled."),
  academicYearId: z.string().describe("The ID of the academic year for this enrollment."),
  termId: z.string().describe("The ID of the term within the academic year for this enrollment."),
  existingClasses: z.array(ClassInfoSchema).describe("An array of existing classes in the school to match against."),
});
export type EnrollInput = z.infer<typeof EnrollInputSchema>;

// Define Zod schema for the output of the AI flow
export const EnrollOutputSchema = z.object({
  success: z.boolean().describe("Whether the enrollment was successful."),
  importedCount: z.number().describe("The number of students successfully imported and enrolled."),
  unassignedCount: z.number().describe("The number of students imported but not assigned to a class due to mismatch."),
  error: z.string().optional().describe("Error message if the process failed."),
});
export type EnrollOutput = z.infer<typeof EnrollOutputSchema>;


// Define the database operation as a Genkit tool
const enrollStudentsTool = ai.defineTool(
  {
    name: 'enrollStudentsInDatabase',
    description: 'Enrolls a list of processed students into the database for a specific school and term.',
    inputSchema: z.object({
      studentsToEnroll: z.array(z.object({
        name: z.string(),
        studentId: z.string().optional(),
        avatarUrl: z.string().optional(),
        classId: z.string().optional().describe("The ID of the class to enroll the student in. Can be null if no match was found."),
      })),
      schoolId: z.string(),
      academicYearId: z.string(),
      termId: z.string(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        importedCount: z.number(),
        unassignedCount: z.number(),
    }),
  },
  async ({ studentsToEnroll, schoolId, academicYearId, termId }) => {
    const batch = writeBatch(db);
    let importedCount = 0;
    let unassignedCount = 0;
    
    // A map to hold classId -> [studentFirebaseId, studentFirebaseId, ...]
    const classEnrollmentUpdates = new Map<string, string[]>();

    studentsToEnroll.forEach(student => {
      const studentDocRef = doc(collection(db, "users"));
      const studentData: Omit<Student, 'id' | 'uid' > & Partial<Pick<Student, 'classIds' | 'parentIds'>> = {
        name: student.name,
        email: null,
        role: "Student",
        studentIdInfo: student.studentId || undefined,
        avatarUrl: student.avatarUrl || undefined,
        createdAt: Timestamp.now(),
        schoolId: schoolId,
        classIds: student.classId ? [student.classId] : [], // Still store on student for convenience
        parentIds: [],
      };
      batch.set(studentDocRef, studentData);
      importedCount++;

      if (student.classId) {
        if (!classEnrollmentUpdates.has(student.classId)) {
          classEnrollmentUpdates.set(student.classId, []);
        }
        classEnrollmentUpdates.get(student.classId)!.push(studentDocRef.id);
      } else {
        unassignedCount++;
      }
    });

    // Update the term's studentEnrollments
    const academicYearRef = doc(db, "academicYears", academicYearId);
    
    // We need to merge this new enrollment data with existing data for the term.
    // This is a simplified example. A real-world scenario might need to read the doc first
    // to properly merge, but for a fresh term import, this is sufficient.
    const enrollmentUpdatesForTerm: Record<string, any> = {};
    classEnrollmentUpdates.forEach((studentIds, classId) => {
        // Using dot notation to update a specific field in the map
        enrollmentUpdatesForTerm[`terms.${termId}.studentEnrollments.${classId}`] = arrayUnion(...studentIds);
    });

    if (Object.keys(enrollmentUpdatesForTerm).length > 0) {
        batch.update(academicYearRef, enrollmentUpdatesForTerm);
    }
    
    await batch.commit();

    return { success: true, importedCount, unassignedCount };
  }
);


// Define the main Genkit flow
const enrollStudentsFlow = ai.defineFlow(
  {
    name: 'enrollStudentsFlow',
    inputSchema: EnrollInputSchema,
    outputSchema: EnrollOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      prompt: `You are an intelligent school administration assistant. Your task is to process a JSON string of student data and prepare it for database enrollment for a specific school term.

      Here is the list of existing classes in the school:
      ${JSON.stringify(input.existingClasses, null, 2)}

      Here is the student data from the file:
      ${input.fileContent}

      Your instructions are:
      1.  Read each student object from the file content.
      2.  For each student, look at their 'ClassName'.
      3.  Match this 'ClassName' to the 'name' of one of the existing classes. The match should be case-insensitive and ignore leading/trailing whitespace.
      4.  If a match is found, use the corresponding 'id' of the matched class as the 'classId' for that student.
      5.  If no match is found, the 'classId' for that student should be null.
      6.  Prepare a final list of students with their processed details (name, studentId, avatarUrl, and the matched classId).
      7.  Call the 'enrollStudentsInDatabase' tool with the prepared list of students and the provided schoolId, academicYearId, and termId.
      `,
      tools: [enrollStudentsTool],
      model: 'googleai/gemini-1.5-flash',
    });

    const toolCall = llmResponse.toolCalls()[0];
    const toolResult = await toolCall.result();
    
    // The output from our tool is exactly what our flow needs to return
    const output = toolResult.output as z.infer<typeof EnrollOutputSchema>;
    return {
        success: output.success,
        importedCount: output.importedCount,
        unassignedCount: output.unassignedCount,
    };
  }
);

// Wrapper function to be called from the client component
export async function enrollStudentsInTerm(input: EnrollInput): Promise<EnrollOutput> {
  try {
    return await enrollStudentsFlow(input);
  } catch (error: any) {
    console.error("Error in enrollStudentsInTerm flow:", error);
    return {
      success: false,
      importedCount: 0,
      unassignedCount: 0,
      error: error.message || "An unexpected error occurred in the AI flow.",
    };
  }
}
