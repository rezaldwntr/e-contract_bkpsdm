'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, FileUp } from 'lucide-react';
import { Employee } from '@/lib/types';
import { columns } from './columns';
import { DataTable } from './data-table';
import { Button } from '@/components/ui/button';
import { FirebaseFirestore } from '@/services/firebase';
import { ImportDialog } from './import-dialog';
import { ArchiveDialog } from './archive-dialog';

interface DashboardClientProps {
  initialEmployees: Employee[];
}

export function DashboardClient({ initialEmployees }: DashboardClientProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isImporting, setIsImporting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const refreshEmployees = async () => {
    const data = await FirebaseFirestore.getEmployees();
    setEmployees(data);
  };

  useEffect(() => {
    refreshEmployees();
  }, []);

  const handleOpenArchiveDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsArchiving(true);
  };
  
  const handleCloseArchiveDialog = () => {
    setIsArchiving(false);
    setSelectedEmployee(null);
  }

  const handleImportSuccess = () => {
    refreshEmployees();
  };

  const handleArchiveSuccess = () => {
    refreshEmployees();
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Employee Contracts</h2>
          <p className="text-muted-foreground">
            Manage, generate, and archive employee contracts.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsImporting(true)}>
            <FileUp className="mr-2 h-4 w-4" /> Import Data
          </Button>
        </div>
      </div>
      <DataTable 
        data={employees} 
        columns={columns({ onArchive: handleOpenArchiveDialog })} 
      />
      <ImportDialog
        isOpen={isImporting}
        onClose={() => setIsImporting(false)}
        onSuccess={handleImportSuccess}
      />
      <ArchiveDialog
        employee={selectedEmployee}
        isOpen={isArchiving}
        onClose={handleCloseArchiveDialog}
        onSuccess={handleArchiveSuccess}
      />
    </>
  );
}
