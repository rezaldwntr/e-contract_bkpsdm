import { FirebaseFirestore } from "@/services/firebase";
import { TemplateForm } from "../template-form";
import { notFound } from "next/navigation";

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const template = await FirebaseFirestore.getTemplateById(params.id);

  if (!template) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-primary mb-4">Edit Template</h1>
      <TemplateForm template={template} />
    </div>
  );
}
