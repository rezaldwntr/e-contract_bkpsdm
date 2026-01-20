'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ContractTemplate } from '@/lib/types';
import { columns } from './columns';
import { deleteTemplateAction } from './actions';
import { DataTable } from '@/app/dashboard/data-table';
import { Button } from '@/components/ui/button';

interface TemplateClientProps {
  templates: ContractTemplate[];
}

export function TemplateClient({ templates }: TemplateClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState(templates);

  const handleDelete = async (id: string) => {
    const result = await deleteTemplateAction(id);
    if (result.success) {
      toast({ title: 'Success', description: 'Template deleted successfully.' });
      // The path will be revalidated, but we can also update state for instant UI feedback
      setData(prev => prev.filter(t => t.id !== id));
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Failed to delete template.',
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Contract Templates</h2>
          <p className="text-muted-foreground">
            Manage reusable contract templates for PDF generation.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => router.push('/dashboard/templates/new')}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Template
          </Button>
        </div>
      </div>
      <DataTable 
        data={data} 
        columns={columns({ onDelete: handleDelete })} 
      />
    </>
  );
}
