'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileCheck2, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getFirestore } from "firebase/firestore";

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Employee } from '@/lib/types';
import { generateContractPdf, mergePdfWithSignature } from '@/lib/pdf-utils';
import { useContractCalculator } from '@/hooks/use-contract-calculator';

interface BulkArchiveDialogProps {
  employees: Employee[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FileStatus = 'pending' | 'processing' | 'success' | 'error';

interface ProcessedFile {
  file: File;
  status: FileStatus;
  message?: string;
  matchedEmployee?: Employee;
}

export function BulkArchiveDialog({ employees, isOpen, onClose, onSuccess }: BulkArchiveDialogProps) {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: 'pending' as FileStatus
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  });

  const processFiles = async () => {
    const signingDate = employee.contractStartDate ? new Date(employee.contractStartDate) : new Date();
    const digitalPdfBytes = await generateContractPdf(employee, signingDate);
    setIsProcessing(true);
    const storage = getStorage();
    const db = getFirestore();

    const results = await Promise.all(files.map(async (item) => {
      if (item.status === 'success') return item; // Skip yang sudah sukses

      try {
        // 1. CARI NIP DARI NAMA FILE
        // Asumsi nama file: "198801012024051001_Scan.pdf" atau sekadar "198801012024051001.pdf"
        // Kita ambil string angka pertama yang panjangnya minimal 18 digit (NIP standar)
        const nipMatch = item.file.name.match(/\d{18}/);
        
        if (!nipMatch) {
          throw new Error("NIP tidak ditemukan di nama file.");
        }
        
        const nip = nipMatch[0];
        const employee = employees.find(e => e.niPppk === nip);

        if (!employee) {
          throw new Error(`Pegawai dengan NIP ${nip} tidak ditemukan di database.`);
        }

        // 2. GENERATE DRAFT DIGITAL (Halaman 1 s.d. sebelum TTD)
        // Kita perlu tanggal kontrak. Karena bulk, kita asumsikan ambil dari Excel (contractStartDate)
        // Jika tidak ada di Excel, fallback ke hari ini (ini risiko bulk, data excel harus lengkap)
        if (!employee.contractStartDate) {
           throw new Error("Tgl Kontrak belum ada di data pegawai.");
        }
        
        // Generate PDF Digital
        const digitalPdfBytes = await generateContractPdf(employee);
        
        // Load File Scan
        const signaturePdfBytes = await item.file.arrayBuffer();

        // 3. GABUNGKAN (STITCHING)
        const mergedPdfBytes = await mergePdfWithSignature(digitalPdfBytes, new Uint8Array(signaturePdfBytes));

        // 4. UPLOAD
        const storageRef = ref(storage, `archives/${employee.niPppk}_FINAL.pdf`);
        await uploadBytes(storageRef, mergedPdfBytes);
        const downloadUrl = await getDownloadURL(storageRef);

        // 5. UPDATE DATABASE
        await updateDoc(doc(db, "employees", employee.niPppk), {
          status: "Archived",
          archiveUrl: downloadUrl,
          updatedAt: new Date().toISOString()
        });

        return { ...item, status: 'success' as FileStatus, message: 'Berhasil', matchedEmployee: employee };

      } catch (error: any) {
        return { ...item, status: 'error' as FileStatus, message: error.message };
      }
    }));

    setFiles(results);
    setIsProcessing(false);
    
    // Jika ada yang sukses, refresh tabel data
    if (results.some(r => r.status === 'success')) {
      onSuccess();
    }
  };

  const handleClear = () => {
    setFiles([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Smart Bulk Archive</DialogTitle>
          <DialogDescription>
            Upload banyak file scan sekaligus. Sistem otomatis mencocokkan NIP dari nama file.
            <br />Pastikan nama file mengandung 18 digit NIP (Contoh: <code>198801012024051001_TTD.pdf</code>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Drag & drop file PDF scan di sini, atau klik untuk memilih</p>
            <p className="text-xs text-muted-foreground">Bisa pilih banyak file sekaligus</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="border rounded-md">
              <div className="p-2 bg-muted/50 border-b flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">{files.length} File Dipilih</span>
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={isProcessing} className="h-6 text-xs text-red-500">
                  Hapus Semua
                </Button>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="p-2 space-y-2">
                  {files.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-background border rounded text-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {item.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> :
                         item.status === 'error' ? <XCircle className="h-4 w-4 text-red-500 shrink-0" /> :
                         <FileCheck2 className="h-4 w-4 text-blue-500 shrink-0" />}
                        
                        <div className="truncate">
                          <p className="font-medium truncate max-w-[300px]">{item.file.name}</p>
                          {item.matchedEmployee && (
                            <p className="text-xs text-muted-foreground">Match: {item.matchedEmployee.fullName}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        {item.status === 'error' && <span className="text-xs text-red-500">{item.message}</span>}
                        {item.status === 'success' && <span className="text-xs text-green-600">Tersimpan</span>}
                        {item.status === 'pending' && <span className="text-xs text-muted-foreground">Menunggu</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Tutup
          </Button>
          <Button onClick={processFiles} disabled={files.length === 0 || isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? 'Memproses...' : 'Mulai Proses Arsip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}