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
  DropdownMenuSeparator
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
import { generateContractPdf } from "@/lib/pdf-utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// --- ActionCell (Logika Download PDF) ---
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

  if (!isMounted) {
    return (
      <Button variant="ghost" className="h-8 w-8 p-0" disabled>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    );
  }

  const handleOpenDialog = (e: Event) => {
    e.preventDefault();
    setIsDropdownOpen(false); 
    setTimeout(() => setIsDialogOpen(true), 150);
  };

  const handleGenerate = async () => {
    if (!dateValue) return;
    try {
      const selectedDate = new Date(dateValue);
      const pdfBytes = await generateContractPdf(employee, selectedDate);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `Draft_PK_${employee.niPppk}.pdf`;
      link.click();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Gagal generate PDF:", error);
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
            <FileText className="mr-2 h-4 w-4" />
            Download Draft PK
          </DropdownMenuItem>
          {employee.archiveUrl && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.open(employee.archiveUrl, '_blank')}>
                Lihat Arsip Final
              </DropdownMenuItem>
            </>
          )}
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
          <div className="flex flex-col gap-4 py-4">
            <div className="relative">
              <label className="text-sm font-medium mb-1 block text-muted-foreground">
                Tanggal:
              </label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleGenerate} disabled={!dateValue}>
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ... (Kode import dan ActionCell biarkan saja seperti sebelumnya) ...

// --- DEFINISI KOLOM FINAL (Dengan Nama Bergelar) ---
export const columns: ColumnDef<Employee>[] = [
  // 1. NI PPPK (Tampil)
  { accessorKey: "niPppk", header: "NI PPPK" },

  // 2. Nama Lengkap + Gelar (Tampil)
  { 
    accessorKey: "fullName", // Key ini tetap dipakai untuk searching/sorting
    header: "Nama Pegawai",
    // CUSTOM RENDER: Gabungkan Gelar Depan + Nama + Gelar Belakang
    cell: ({ row }) => {
      const emp = row.original;
      
      // Logika: Gelar Depan + Spasi + Nama + Koma + Spasi + Gelar Belakang
      const front = emp.frontTitle ? `${emp.frontTitle}. ` : ""; // Tambah titik spasi jika ada
      const back = emp.backTitle ? `, ${emp.backTitle}` : "";   // Tambah koma spasi jika ada
      
      // Jika gelar depan sudah mengandung titik (misal "Dr."), jangan tambah titik lagi (opsional)
      // Tapi biasanya format Excel bersih, jadi kita rakit manual:
      
      return (
        <span className="font-medium">
          {front}{emp.fullName}{back}
        </span>
      );
    }
  },

  // 3. Unit Kerja (Tampil)
  { accessorKey: "workUnitSK", header: "Unit Kerja" },
  
  // 4. Jabatan (Tampil & Filter)
  { 
    accessorKey: "position", 
    header: "Jabatan",
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },

  // --- KOLOM TERSEMBUNYI (HIDDEN) TAPI FILTER TETAP JALAN ---
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
  // -----------------------------------------------------------

  {
    id: "actions",
    cell: ({ row }) => <ActionCell employee={row.original} />,
  },
];
