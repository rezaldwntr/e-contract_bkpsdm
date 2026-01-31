'use client';

import { useState } from "react";
import { UploadCloud, FileType, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FirebaseStorage } from "@/services/firebase";

export default function TemplatesPage() {
  const [loadingPenuh, setLoadingPenuh] = useState(false);
  const [loadingParuh, setLoadingParuh] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'penuh' | 'paruh') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi file harus DOCX
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.DOCX')) {
      setStatus({ type: 'error', message: "Hanya menerima file .docx (Word)" });
      return;
    }

    if (type === 'penuh') setLoadingPenuh(true);
    else setLoadingParuh(true);
    setStatus(null);

    try {
      await FirebaseStorage.uploadTemplate(file, type);
      setStatus({ 
        type: 'success', 
        message: `Berhasil mengupload Template ${type === 'penuh' ? 'Penuh' : 'Paruh'} Waktu!` 
      });
    } catch (error) {
      setStatus({ type: 'error', message: "Gagal mengupload. Periksa koneksi internet." });
    } finally {
      if (type === 'penuh') setLoadingPenuh(false);
      else setLoadingParuh(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Template Perjanjian Kerja</h2>
        <p className="text-muted-foreground">
          Upload file master .docx yang akan digunakan untuk generate kontrak.
        </p>
      </div>

      {status && (
        <Alert variant={status.type === 'success' ? 'default' : 'destructive'} className={status.type === 'success' ? "border-green-500 text-green-700 bg-green-50" : ""}>
          {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{status.type === 'success' ? "Sukses" : "Error"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* CARD 1: PENUH WAKTU */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileType className="h-5 w-5 text-blue-600" />
              PK Penuh Waktu
            </CardTitle>
            <CardDescription>
              Digunakan untuk pegawai dengan jenis kontrak Penuh Waktu (Full Time).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">Upload template_pk_penuh.docx</p>
              <p className="text-xs text-muted-foreground mb-4">Maksimal 2 MB</p>
              
              <Input 
                type="file" 
                accept=".docx" 
                onChange={(e) => handleUpload(e, 'penuh')}
                disabled={loadingPenuh}
                className="cursor-pointer max-w-xs"
              />
            </div>
            {loadingPenuh && <p className="text-xs text-center animate-pulse">Sedang mengupload...</p>}
          </CardContent>
        </Card>

        {/* CARD 2: PARUH WAKTU */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileType className="h-5 w-5 text-orange-600" />
              PK Paruh Waktu
            </CardTitle>
            <CardDescription>
              Digunakan untuk pegawai dengan jenis kontrak Paruh Waktu (Part Time).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">Upload template_pk_paruh.docx</p>
              <p className="text-xs text-muted-foreground mb-4">Maksimal 2 MB</p>
              
              <Input 
                type="file" 
                accept=".docx" 
                onChange={(e) => handleUpload(e, 'paruh')}
                disabled={loadingParuh}
                className="cursor-pointer max-w-xs"
              />
            </div>
            {loadingParuh && <p className="text-xs text-center animate-pulse">Sedang mengupload...</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}