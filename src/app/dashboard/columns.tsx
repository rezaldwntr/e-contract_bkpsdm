'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Employee } from '@/lib/types';

const StatusBadge = ({ status }: { status: Employee['status'] }) => {
  const variant: 'default' | 'secondary' | 'destructive' | 'outline' = 
    status === 'Archived' ? 'default' :
    status === 'New' ? 'secondary' :
    status === 'Error' ? 'destructive' : 'outline';
  
  const colorClass = 
    status === 'Archived' ? 'bg-green-600 hover:bg-green-700' :
    status === 'New' ? 'bg-blue-500 hover:bg-blue-600' :
    status === 'Error' ? 'bg-red-600 hover:bg-red-700' :
    'bg-gray-500 hover:bg-gray-600';


  return <Badge variant={variant} className={`text-white ${colorClass}`}>{status}</Badge>;
}

export const columns = ({ onArchive }: { onArchive: (employee: Employee) => void }): ColumnDef<Employee>[] => [
  {
    accessorKey: 'fullName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Full Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('fullName')}</div>,
  },
  {
    accessorKey: 'niPppk',
    header: 'NI PPPK',
  },
  {
    accessorKey: 'position',
    header: 'Position',
  },
  {
    accessorKey: 'contractType',
    header: 'Contract Type',
    cell: ({ row }) => {
        const type: string = row.getValue('contractType');
        return <div className="capitalize">{type.replace('_', ' ').toLowerCase()}</div>
    }
  },
   {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const employee = row.original;

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(employee.niPppk)}>
                Copy NI PPPK
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={employee.status === 'Archived'}
                onClick={() => onArchive(employee)}
              >
                Generate & Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
