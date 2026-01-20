'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, UploadCloud, Loader2 } from 'lucide-react';
import { archiveAndValidateContract } from '@/ai/flows/archive-and-validate-contract';

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
    required_error: 'A start date is required.',
  }),
  signatureFile: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, 'Signature PDF is required.')
    .refine((files) => files?.[0]?.type === 'application/pdf', 'Only PDF files are allowed.')
    .refine((files) => files?.[0]?.name.includes(z.string().parse(files?.[0]?.name.split('_')[0])), "Filename must contain NI PPPK."),
});

export function ArchiveDialog({ employee, isOpen, onClose, onSuccess }: ArchiveDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof archiveSchema>>({
    resolver: zodResolver(archiveSchema),
  });
  
  const startDate = form.watch('startDate');
  const { endDate } = useContractCalculator(startDate, employee?.contractType || 'PENUH_WAKTU');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      form.setValue('signatureFile', e.target.files);
    }
  };

  const onSubmit = async (data: z.infer<typeof archiveSchema>) => {
    if (!employee) return;
    setIsLoading(true);

    try {
      const signatureFile = data.signatureFile[0];
      const parsedNiPppk = signatureFile.name.split('_')[0];
      if (parsedNiPppk !== employee.niPppk) {
        throw new Error("NI PPPK in filename does not match the selected employee.");
      }

      // 1. Generate the digital part of the contract
      const digitalPdfBytes = await generateContractPdf(employee, data.startDate, endDate!);
      
      // 2. Load the uploaded signature PDF
      const signaturePdfBytes = await signatureFile.arrayBuffer();

      // 3. Merge the two PDFs
      const mergedPdfBytes = await mergePdfWithSignature(digitalPdfBytes, new Uint8Array(signaturePdfBytes));
      
      // 4. Convert to data URI for the AI flow
      const pdfDataUri = `data:application/pdf;base64,${Buffer.from(mergedPdfBytes).toString('base64')}`;
      
      // 5. Call the AI flow to validate and archive
      const result = await archiveAndValidateContract({
        niPppk: employee.niPppk,
        pdfDataUri: pdfDataUri,
      });

      if (result.archived) {
        toast({
          title: 'Success!',
          description: `Contract for ${employee.fullName} has been successfully archived.`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(`Validation Failed: ${result.validationResult}`);
      }

    } catch (error: any) {
      console.error('Archival process failed:', error);
      toast({
        variant: 'destructive',
        title: 'Archival Failed',
        description: error.message || 'An unexpected error occurred.',
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
          <DialogTitle>Generate & Archive Contract</DialogTitle>
          <DialogDescription>
            For {employee.fullName} ({employee.niPppk})
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Contract Start Date (TMT)</FormLabel>
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
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            {endDate && (
              <div className="text-sm text-muted-foreground">
                Calculated End Date: <span className="font-medium text-foreground">{format(endDate, 'PPP')}</span>
              </div>
            )}
            <FormField
              control={form.control}
              name="signatureFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scanned Signature PDF</FormLabel>
                   <FormControl>
                    <div className="relative">
                      <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input 
                        type="file" 
                        accept="application/pdf"
                        className="pl-10"
                        onChange={handleFileChange}
                        placeholder="Filename format: {NI PPPK}_TTD.pdf"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate & Archive
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
