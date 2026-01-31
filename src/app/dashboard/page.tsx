import { DashboardClient } from "./client";

// Hapus async dan await fetch data disini
export default function DashboardPage() {
  // Langsung render Client Component. Biarkan dia yang mengambil data nanti.
  return <DashboardClient />;
}