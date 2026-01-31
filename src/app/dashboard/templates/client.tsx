'use client';

import { useState, useEffect } from "react";
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FirebaseStorage, FirebaseFirestore } from "@/services/firebase";
// Perhatikan import ini: menggunakan ../ (titik dua) untuk mengambil DataTable dari folder dashboard (parent)
import { DataTable } from "../data-table"; 
import { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<any>[] = [
  { accessorKey: "name", header: "Nama Template" },
  { accessorKey: "fileName", header: "Nama File Asli" },
  { accessorKey: "type", header: "Tipe" },
  { 
    accessorKey: "updatedAt", 
    header: "Terakhir Diupdate",
    cell: ({ row }) => {
        const dateStr = row.getValue("updatedAt") as string;
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID", { 
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
    }
  },
];

export function TemplateClient() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [loadingPenuh, setLoadingPenuh] = useState(false);
  const [loadingParuh, setLoadingParuh] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fetchTemplates = async () => {
    try {
      const data = await FirebaseFirestore.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Gagal ambil template:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'penuh' | 'paruh') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.DOCX')) {
      setStatus({ type: 'error', message: "Hanya menerima file .docx (Word)" });
      return;
    }

    if (type === 'penuh') setLoadingPenuh(true);
    else setLoadingParuh(true);
    setStatus(null);

    try {
      await FirebaseStorage.uploadTemplate(file, type);
      setStatus({ type: 'success', message: `Berhasil mengupload Template ${type === 'penuh' ? 'Penuh' : 'Paruh'} Waktu!` });
      fetchTemplates(); 
    } catch (error) {
      setStatus({ type: 'error', message: "Gagal mengupload. Periksa koneksi internet." });
    } finally {
      if (type === 'penuh') setLoadingPenuh(false);
      else setLoadingParuh(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p>Memuat Data Template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Template Perjanjian Kerja</h2>
        <p className="text-muted-foreground">
          Upload file master .docx yang akan digunakan untuk generate kontrak.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* PK PENUH WAKTU */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileType className="h-5 w-5 text-blue-600" />
              PK Penuh Waktu
            </CardTitle>
            <CardDescription>Template untuk pegawai Full Time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">Upload template_pk_penuh.docx</p>
              <Input 
                type="file" 
                accept=".docx" 
                onChange={(e) => handleUpload(e, 'penuh')}
                disabled={loadingPenuh}
                className="cursor-pointer max-w-xs mt-2"
              />
               {loadingPenuh && <p className="text-xs text-blue-500 mt-2 animate-pulse">Sedang mengupload...</p>}
            </div>
          </CardContent>
        </Card>

        {/* PK PARUH WAKTU */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileType className="h-5 w-5 text-orange-600" />
              PK Paruh Waktu
            </CardTitle>
            <CardDescription>Template untuk pegawai Part Time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">Upload template_pk_paruh.docx</p>
              <Input 
                type="file" 
                accept=".docx" 
                onChange={(e) => handleUpload(e, 'paruh')}
                disabled={loadingParuh}
                className="cursor-pointer max-w-xs mt-2"
              />
              {loadingParuh && <p className="text-xs text-orange-500 mt-2 animate-pulse">Sedang mengupload...</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {status && (
        <Alert variant={status.type === 'success' ? 'default' : 'destructive'} className={status.type === 'success' ? "border-green-500 text-green-700 bg-green-50" : ""}>
          {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{status.type === 'success' ? "Sukses" : "Error"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <div className="pt-4">
        <h3 className="text-lg font-semibold mb-4">Riwayat Template Aktif</h3>
        <DataTable columns={columns} data={templates} />
      </div>
    </div>
  );
}