'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud, FileCheck2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { parseExcelFile } from '@/lib/excel-utils';
import { FirebaseFirestore } from '@/services/firebase';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);

    try {
      const employees = await parseExcelFile(file);
      await FirebaseFirestore.addEmployees(employees);

      toast({
        title: 'Import Successful',
        description: `${employees.length} employee records have been imported.`,
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Import failed:", error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message || 'Could not parse the Excel file. Please check the format.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import from Excel</DialogTitle>
          <DialogDescription>
            Upload an .xlsx or .xls file with employee data. Ensure the column headers match the template.
          </DialogDescription>
        </DialogHeader>
        <div
          {...getRootProps()}
          className={`mt-4 flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer
            ${isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'}
            transition-colors duration-200 ease-in-out`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="text-center">
              <FileCheck2 className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-2 font-semibold text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">({(file.size / 1024).toFixed(2)} KB)</p>
              <Button variant="link" size="sm" className="text-red-500 hover:text-red-700" onClick={(e) => {e.stopPropagation(); setFile(null)}}>
                <XCircle className="mr-1 h-4 w-4" /> Remove
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 font-semibold text-foreground">
                {isDragActive ? 'Drop the file here...' : 'Drag & drop a file here, or click to select'}
              </p>
              <p className="text-xs text-muted-foreground">Excel files (.xlsx, .xls) only</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
