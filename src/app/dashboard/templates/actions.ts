'use server';

import { revalidatePath } from 'next/cache';
import { FirebaseFirestore } from '@/services/firebase';

export async function deleteTemplateAction(id: string) {
  try {
    await FirebaseFirestore.deleteTemplate(id);
    revalidatePath('/dashboard/templates');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
