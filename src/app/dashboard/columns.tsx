'use client';

import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Employee } from "@/lib/types";
import { format } from "date-fns";

// --- PERBAIKAN UTAMA DI SINI ---
// Ganti import dari PDF ke DOCX Generator
// Hapus: import { generateContractPdf } from "@/lib/pdf-utils";
import { generateDocx } from "@/lib/docx-generator"; 

const ActionCell = ({ employee }: { employee: Employee }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [dateValue, setDateValue] = useState<string>(
    employee.contractStartDate 
      ? format(new Date(employee.contractStartDate), "yyyy-MM-dd") 
      : format(new Date(), "yyyy-MM-dd")
  );

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) return <Button variant="ghost" className="h-8 w-8 p-0" disabled><MoreHorizontal className="h-4 w-4" /></Button>;

  const handleOpenDialog = (e: Event) => {
    e.preventDefault();
    setIsDropdownOpen(false); 
    setTimeout(() => setIsDialogOpen(true), 150);
  };

  const handleGenerate = async () => {
    if (!dateValue) return;
    try {
      const selectedDate = new Date(dateValue);
      
      // PANGGIL GENERATOR DOCX (Bukan PDF lagi)
      await generateDocx(employee, selectedDate);
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Gagal generate Dokumen:", error);
      alert("Gagal mendownload. Cek template sudah diupload atau belum.");
    }
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Buka menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
          <DropdownMenuItem onSelect={(e: any) => handleOpenDialog(e)}>
            {/* Ubah Icon & Teks agar user tau ini Word */}
            <FileText className="mr-2 h-4 w-4 text-blue-600" />
            Download Draft PK (Word)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Pilih Tanggal Tanda Tangan</DialogTitle>
            <DialogDescription>
              Tentukan tanggal penandatanganan Perjanjian Kerja.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-1 block text-muted-foreground">Tanggal:</label>
            <input
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleGenerate} disabled={!dateValue}>Download .DOCX</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const columns: ColumnDef<Employee>[] = [
  // Definisi kolom SAMA SEPERTI SEBELUMNYA
  { accessorKey: "niPppk", header: "NI PPPK" },
  { 
    accessorKey: "fullName", 
    header: "Nama Pegawai",
    cell: ({ row }) => {
      const emp = row.original;
      const front = emp.frontTitle ? `${emp.frontTitle}. ` : "";
      const back = emp.backTitle ? `, ${emp.backTitle}` : "";
      return <span className="font-medium">{front}{emp.fullName}{back}</span>;
    }
  },
  { accessorKey: "workUnitSK", header: "Unit Kerja" },
  { 
    accessorKey: "position", 
    header: "Jabatan",
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  
  // Kolom Hidden
  { accessorKey: "participantId", header: "No. Peserta" },
  { 
    accessorKey: "contractType", 
    header: "Jenis Kontrak",
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  { 
    accessorKey: "formationType", 
    header: "Jenis Formasi",
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },

  {
    id: "actions",
    cell: ({ row }) => <ActionCell employee={row.original} />,
  },
];