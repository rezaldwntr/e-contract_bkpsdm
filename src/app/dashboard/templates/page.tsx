import { TemplateClient } from "./client";

export default function TemplatesPage() {
  // Langsung panggil Client Component tanpa data awal
  // Data akan diambil oleh Client Component nanti
  return <TemplateClient />;
}