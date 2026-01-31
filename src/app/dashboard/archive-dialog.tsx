'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, UploadCloud, Loader2, FileText } from 'lucide-react';

// Import Firebase (Tanpa AI)
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getFirestore } from "firebase/firestore";

import { Employee } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useContractCalculator } from '@/hooks/use-contract-calculator';
import { generateContractPdf, mergePdfWithSignature } from '@/lib/pdf-utils';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface ArchiveDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const archiveSchema = z.object({
  startDate: z.date({
    required_error: 'Tanggal mulai kontrak wajib diisi.',
  }),
  signatureFile: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, 'File scan PDF wajib diupload.')
    .refine((files) => files?.[0]?.type === 'application/pdf', 'Hanya file PDF yang diperbolehkan.')
    // Validasi ukuran max 5MB
    .refine((files) => files?.[0]?.size <= 5 * 1024 * 1024, 'Ukuran file maksimal 5MB.'), 
});

export function ArchiveDialog({ employee, isOpen, onClose, onSuccess }: ArchiveDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 1. SIAPKAN DEFAULT TANGGAL DARI EXCEL
  // Cek apakah di data employee ada contractStartDate dari Excel?
  const defaultDate = employee?.contractStartDate ? new Date(employee.contractStartDate) : undefined;

  const form = useForm<z.infer<typeof archiveSchema>>({
    resolver: zodResolver(archiveSchema),
    defaultValues: {
      startDate: defaultDate, // <--- AUTO FILL DI SINI
    },
  });

  // Effect untuk update form jika data employee berubah saat dialog dibuka
  useEffect(() => {
    if (employee?.contractStartDate) {
      form.setValue('startDate', new Date(employee.contractStartDate));
    }
  }, [employee, form]);
  
  const startDate = form.watch('startDate');
  
  // Ambil tanggal akhir langsung dari data Employee (karena sudah ada di Excel)
  // Jika tidak ada di Excel, baru pakai calculator sebagai fallback
  const excelEndDate = employee?.contractEndDate ? new Date(employee.contractEndDate) : null;
  const { endDate: calculatedEndDate } = useContractCalculator(startDate, employee?.contractType || 'PENUH_WAKTU');
  
  // Prioritaskan tanggal akhir dari Excel
  const finalEndDate = excelEndDate || calculatedEndDate;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      form.setValue('signatureFile', e.target.files);
    }
  };

  const onSubmit = async (data: z.infer<typeof archiveSchema>) => {
    if (!employee) return;
    setIsLoading(true);

    try {
      const signatureFile = data.signatureFile[0];
      
      // 1. Generate Draft Kontrak Digital
      // Kirim tanggal yang sudah dipilih/otomatis
      const digitalPdfBytes = await generateContractPdf(employee, data.startDate);
      
      // 2. Load File Scan Tanda Tangan
      const signaturePdfBytes = await signatureFile.arrayBuffer();

      // 3. Gabungkan (Stitching)
      const mergedPdfBytes = await mergePdfWithSignature(digitalPdfBytes, new Uint8Array(signaturePdfBytes));
      
      // 4. Upload ke Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, `archives/${employee.niPppk}_FINAL.pdf`);
      
      await uploadBytes(storageRef, mergedPdfBytes);
      const downloadUrl = await getDownloadURL(storageRef);
      
      // 5. Update Status di Firestore
      const db = getFirestore();
      const employeeRef = doc(db, "employees", employee.niPppk);
      
      await updateDoc(employeeRef, {
        status: "Archived",
        archiveUrl: downloadUrl,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: 'Arsip Berhasil!',
        description: `Kontrak ${employee.fullName} berhasil disimpan.`,
      });
      
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Proses arsip gagal:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: error.message || 'Terjadi kesalahan.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Arsipkan Kontrak</DialogTitle>
          <DialogDescription>
            Pegawai: <b>{employee.fullName}</b>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Input Tanggal TMT */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Mulai Kontrak (TMT)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'dd MMMM yyyy') : <span>Pilih tanggal mulai</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    {/* Z-INDEX FIX: Tambahkan z-[9999] agar kalender muncul di atas dialog */}
                    <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Info Tanggal Akhir */}
            {finalEndDate && (
              <div className="text-sm bg-muted p-2 rounded-md border text-muted-foreground">
                Masa Kontrak Berakhir: <span className="font-semibold text-foreground">{format(finalEndDate, 'dd MMMM yyyy')}</span>
                {employee.contractEndDate && <span className="ml-2 text-xs text-green-600">(Sesuai Excel)</span>}
              </div>
            )}

            {/* Input File Upload */}
            <FormField
              control={form.control}
              name="signatureFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload Scan PDF (TTD Basah)</FormLabel>
                   <FormControl>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
                      <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <Input 
                        type="file" 
                        accept="application/pdf"
                        className="pl-10 cursor-pointer"
                        onChange={handleFileChange}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Proses & Arsipkan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}