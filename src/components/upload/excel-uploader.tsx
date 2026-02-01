'use client';

import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FirebaseFirestore } from "@/services/firebase";
import { Employee } from "@/lib/types";

interface ExcelUploaderProps {
  onSuccess?: () => void;
}

export function ExcelUploader({ onSuccess }: ExcelUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Helper: Parsing Tanggal Excel yang sering bermasalah (Serial Number vs String)
  const parseExcelDate = (val: any): string => {
    if (!val) return "";
    // Jika format Excel Serial Number (Angka)
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    }
    // Jika String, coba bersihkan
    return String(val).trim();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setProgress(10);

    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        // Convert ke JSON (Array of Arrays) untuk mapping manual yang lebih aman
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        
        setProgress(40);

        // MAPPING KOLOM EXCEL (INDONESIA) KE DATABASE (INGGRIS)
        const employees: Employee[] = data.map((row: any) => ({
          contractType: row["Jenis Formasi"] || "",
          formationType: row["Formasi"] || "",        // PENTING: Untuk logika Guru/Nakes
          formationYear: String(row["Tahun Formasi"] || ""),
          participantId: String(row["No Peserta"] || ""),
          niPppk: String(row["NIP"] || ""),
          fullName: row["Nama"] || "",
          
          frontTitle: row["Gelar Depan"] || "",
          backTitle: row["Gelar Belakang"] || "",
          
          placeOfBirth: row["Tempat Lahir"] || "",
          dateOfBirth: parseExcelDate(row["Tanggal Lahir"]),
          address: row["Alamat"] || "",
          
          education: row["Pendidikan Terakhir"] || "",
          graduationYear: String(row["Tahun Lulus"] || ""),
          
          position: row["Jabatan"] || "",
          workUnitSK: row["Unit Kerja (SK)"] || "",
          workUnitPK: row["Unit Kerja (PK)"] || "",
          tmtPosition: parseExcelDate(row["TMT Jabatan"]),
          
          payGrade: row["Golongan Ruang"] || "",
          salary: String(row["Gaji Pokok"] || ""),      // Format "2.858.800"
          salaryText: row["Terbilang"] || "",           // Format "Dua Juta..."
          
          contractStartDate: parseExcelDate(row["Tanggal Kontrak Awal"]),
          contractEndDate: parseExcelDate(row["Tanggal Kontrak Akhir"]),
          
          createdAt: new Date().toISOString(),
        }));

        console.log("Data siap upload:", employees[0]); // Debugging: Cek data pertama

        setProgress(70);

        // Upload ke Firebase
        // Kita gunakan fungsi batch yang sudah ada
        await FirebaseFirestore.addEmployees(employees);

        setProgress(100);
        
        if (onSuccess) onSuccess();
        
        setTimeout(() => {
          setIsOpen(false);
          setIsLoading(false);
          setProgress(0);
        }, 1000);

      } catch (error) {
        console.error("Error parsing excel:", error);
        alert("Gagal memproses file Excel. Pastikan format kolom sesuai.");
        setIsLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-green-600 hover:bg-green-700">
          <FileSpreadsheet className="h-4 w-4" />
          Import Data Pegawai
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Data Excel</DialogTitle>
          <DialogDescription>
            Pastikan file Excel memiliki header kolom yang sesuai (NIP, Nama, Formasi, Gaji Pokok, Terbilang, dll).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          {!isLoading ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Klik untuk upload</span> atau drag and drop
                </p>
                <p className="text-xs text-gray-500">File .xlsx atau .xls</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleFileUpload} 
              />
            </label>
          ) : (
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing data... {progress}%
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}