'use client';

import { useState, useEffect } from "react";
// Perhatikan import ini: menggunakan ./ (titik satu) karena satu folder
import { DataTable } from "./data-table"; 
import { columns } from "./columns";
import { Employee } from "@/lib/types";
import { FirebaseFirestore } from "@/services/firebase";
import { Loader2 } from "lucide-react"; 
import { Card } from "@/components/ui/card";

export function DashboardClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await FirebaseFirestore.getEmployees();
        setEmployees(data);
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">E-Contract PPPK</h2>
          <p className="text-muted-foreground">
            Kelola data pegawai dan dokumen perjanjian kerja.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
          <p>Sedang memuat 2000+ data pegawai...</p>
          <p className="text-xs mt-1">Mohon tunggu sebentar.</p>
        </Card>
      ) : (
        <DataTable columns={columns} data={employees} />
      )}
    </div>
  );
}