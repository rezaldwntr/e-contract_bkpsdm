import { FirebaseFirestore } from "@/services/firebase";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  // Fetch initial data on the server
  const initialEmployees = await FirebaseFirestore.getEmployees();

  return <DashboardClient initialEmployees={initialEmployees} />;
}
