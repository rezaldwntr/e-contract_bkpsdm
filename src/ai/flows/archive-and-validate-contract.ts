'use server';

/**
 * @fileOverview Archives a validated contract PDF to Firebase Storage and updates Firestore.
 *
 * - archiveAndValidateContract - A function that validates the final PDF contract against quality standards, archives it to Firebase Storage, and updates the Firestore record.
 * - ArchiveAndValidateContractInput - The input type for the archiveAndValidateContract function.
 * - ArchiveAndValidateContractOutput - The return type for the archiveAndValidateContract function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ArchiveAndValidateContractInputSchema = z.object({
  niPppk: z.string().describe('The NI PPPK of the employee.'),
  pdfDataUri: z.string().describe(
    'The data URI of the final merged PDF contract, including signature. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
  ),
});
export type ArchiveAndValidateContractInput = z.infer<
  typeof ArchiveAndValidateContractInputSchema
>;

const ArchiveAndValidateContractOutputSchema = z.object({
  archived: z.boolean().describe('Indicates whether the contract was successfully archived.'),
  validationResult: z.string().describe('The result of the contract validation process.'),
});
export type ArchiveAndValidateContractOutput = z.infer<
  typeof ArchiveAndValidateContractOutputSchema
>;

import {FirebaseStorage, FirebaseFirestore} from '@/services/firebase';

export async function archiveAndValidateContract(
  input: ArchiveAndValidateContractInput
): Promise<ArchiveAndValidateContractOutput> {
  return archiveAndValidateContractFlow(input);
}

const validateContractTool = ai.defineTool({
  name: 'validateContract',
  description: 'Validates the final PDF contract against pre-defined quality and compliance standards.',
  inputSchema: z.object({
    pdfDataUri: z.string().describe(
      'The data URI of the final merged PDF contract, including signature. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  }),
  outputSchema: z.string().describe('The result of the contract validation.  If there are no issues, respond with \'Contract Validated\'.'),
},
async (input) => {
  // TODO: Implement actual validation logic here, potentially using OCR or other PDF parsing techniques.
  // This is a placeholder implementation.

  // Simulate a validation check with the LLM.  For a real implementation, replace this with a PDF parsing library and actual checks.

  const {text} = await ai.generate({
    prompt: `Analyze the PDF contract provided as a data URI. Check for the following: Valid F4 dimensions, Times New Roman font usage, Justified alignment for body text, Centered alignment for headers, Correct Pasal structure (1 to 13), Presence of a signature.  Return \'Contract Validated\' if all checks pass; otherwise, describe the errors found.\n\nPDF Data URI: {{media url=pdfDataUri}}`,
  });

  return text;
});

const archiveAndValidateContractFlow = ai.defineFlow(
  {
    name: 'archiveAndValidateContractFlow',
    inputSchema: ArchiveAndValidateContractInputSchema,
    outputSchema: ArchiveAndValidateContractOutputSchema,
  },
  async input => {
    const {niPppk, pdfDataUri} = input;

    // Validate the contract using the tool
    const validationResult = await validateContractTool({
      pdfDataUri: pdfDataUri,
    });

    if (validationResult === 'Contract Validated') {
      try {
        // Upload the PDF to Firebase Storage
        await FirebaseStorage.uploadPdf(
          `archives/${niPppk}_FINAL.pdf`,
          pdfDataUri
        );

        // Update the Firestore record to 'Archived'
        await FirebaseFirestore.updateEmployeeStatus(niPppk, 'Archived');

        return {
          archived: true,
          validationResult: validationResult,
        };
      } catch (error: any) {
        console.error('Error archiving contract:', error);
        return {
          archived: false,
          validationResult: `Archiving failed: ${error.message}`,
        };
      }
    } else {
      // Contract validation failed
      return {
        archived: false,
        validationResult: validationResult,
      };
    }
  }
);
