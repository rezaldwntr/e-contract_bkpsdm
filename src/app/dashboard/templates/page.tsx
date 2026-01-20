import { FirebaseFirestore } from "@/services/firebase";
import { TemplateClient } from "./client";

export default async function TemplatesPage() {
  const templates = await FirebaseFirestore.getTemplates();
  return <TemplateClient templates={templates} />;
}
