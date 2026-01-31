'use client';

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { X, Filter } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [showFilters, setShowFilters] = React.useState(true);
  
  // --- SMART VISIBILITY INITIALIZATION ---
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    // Cek manual dari props 'columns' agar aman dari error
    const isEmployeeTable = columns.some((col: any) => col.accessorKey === "niPppk");
    
    if (isEmployeeTable) {
      return {
        participantId: false,
        contractType: false,
        formationType: false,
        niPppk: true,
        fullName: true,
        workUnitSK: true,
        position: true,
        actions: true
      };
    }
    return {};
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnFilters,
      columnVisibility,
    },
  });

  const isFiltered = table.getState().columnFilters.length > 0;
  const sourceRows = isFiltered ? table.getFilteredRowModel().rows : table.getCoreRowModel().rows;

  // --- SAFE COLUMN CHECKER (ANTI ERROR) ---
  // Kita buat Set ID kolom yang tersedia. Ini aman dan tidak akan memicu error console.
  const availableColumnIds = React.useMemo(() => {
    return new Set(table.getAllColumns().map(col => col.id));
  }, [table]);

  // Fungsi pengecekan aman
  const hasCol = (id: string) => availableColumnIds.has(id);

  // Helper aman untuk generate opsi filter
  const getUniqueOptions = (key: string) => {
    if (!hasCol(key)) return []; // Cek dulu sebelum akses
    
    const firstRow = sourceRows[0];
    if (!firstRow || !firstRow.original || !(key in (firstRow.original as object))) {
      return [];
    }

    const uniqueValues = Array.from(
      new Set(sourceRows.map((row: any) => row.original[key]))
    ).filter(Boolean).sort();
    return uniqueValues.map((val: any) => ({ label: val, value: val }));
  };

  // Generate Opsi hanya jika kolom ada
  const contractOptions = React.useMemo(() => getUniqueOptions("contractType"), [sourceRows, availableColumnIds]);
  const formationOptions = React.useMemo(() => getUniqueOptions("formationType"), [sourceRows, availableColumnIds]);
  const positionOptions = React.useMemo(() => getUniqueOptions("position"), [sourceRows, availableColumnIds]);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
         <h2 className="text-lg font-semibold tracking-tight">Data Table</h2>
         <Button 
            variant={showFilters ? "secondary" : "outline"}
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Sembunyikan Filter" : "Tampilkan Filter"}
         </Button>
      </div>

      {/* FILTER AREA */}
      {showFilters && (
        <div className={cn(
            "bg-muted/30 p-4 rounded-lg border space-y-3 transition-all duration-300 ease-in-out",
            showFilters ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 hidden"
        )}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Pencarian & Filter</h3>
            {isFiltered && (
                <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs">
                  Reset Filter <X className="ml-2 h-3 w-3" />
                </Button>
              )}
          </div>

          {/* BARIS 1: TEXT INPUTS (Gunakan hasCol() agar aman) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {hasCol("fullName") && (
              <Input
                placeholder="Cari Nama..."
                value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("fullName")?.setFilterValue(event.target.value)}
                className="h-9 bg-background"
              />
            )}
            
            {hasCol("niPppk") && (
              <Input
                placeholder="Cari NI PPPK..."
                value={(table.getColumn("niPppk")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("niPppk")?.setFilterValue(event.target.value)}
                className="h-9 bg-background"
              />
            )}

            {hasCol("participantId") && (
              <Input
                placeholder="Cari No. Peserta..."
                value={(table.getColumn("participantId")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("participantId")?.setFilterValue(event.target.value)}
                className="h-9 bg-background"
              />
            )}

            {hasCol("workUnitSK") && (
              <Input
                placeholder="Cari Unit Kerja..."
                value={(table.getColumn("workUnitSK")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("workUnitSK")?.setFilterValue(event.target.value)}
                className="h-9 bg-background"
              />
            )}
            
            {/* Input Khusus Template: Cari Nama File */}
             {hasCol("name") && (
              <Input
                placeholder="Cari Nama Template..."
                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                className="h-9 bg-background col-span-2"
              />
            )}
          </div>

          {/* BARIS 2: DROPDOWNS (Gunakan hasCol() agar aman) */}
          <div className="flex flex-wrap gap-2">
              {hasCol("contractType") && (
                <DataTableFacetedFilter column={table.getColumn("contractType")} title="Jenis Kontrak" options={contractOptions} />
              )}
              {hasCol("formationType") && (
                <DataTableFacetedFilter column={table.getColumn("formationType")} title="Jenis Formasi" options={formationOptions} />
              )}
              {hasCol("position") && (
                <DataTableFacetedFilter column={table.getColumn("position")} title="Jabatan" options={positionOptions} />
              )}
              
              <div className="ml-auto text-sm text-muted-foreground flex items-center bg-background px-3 py-1 rounded border">
                Total: <b>{table.getFilteredRowModel().rows.length}</b> Data
              </div>
          </div>
        </div>
      )}

      {/* TABEL */}
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">Data tidak ditemukan.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
      </div>
    </div>
  );
}