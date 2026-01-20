'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ContractTemplate, TemplateArticle } from '@/lib/types';
import { FirebaseFirestore } from '@/services/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PLACEHOLDER_LIST } from '@/lib/template-placeholders';

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  subtitle: z.string().min(1, 'Subtitle is required.'),
  content: z.string().min(1, 'Content is required.'),
});

const templateSchema = z.object({
  name: z.string().min(3, 'Template name is required.'),
  type: z.enum(['PENUH_WAKTU', 'PARUH_WAKTU']),
  headerTitle: z.string().min(1, 'Header title is required.'),
  openingText: z.string().optional(),
  articles: z.array(articleSchema).min(1, 'At least one article is required.'),
  closingText: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  template?: ContractTemplate;
}

function PlaceholderCheatsheet() {
  const { toast } = useToast();
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${text} copied to clipboard.`,
      duration: 2000,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Placeholders</CardTitle>
        <CardDescription>Click to copy a placeholder to use in your text fields.</CardDescription>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        <div className="grid grid-cols-1 gap-2">
          {PLACEHOLDER_LIST.map((item) => (
            <div key={item.placeholder} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <div>
                <code className="font-mono text-sm font-semibold text-primary">{item.placeholder}</code>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(item.placeholder)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const defaultValues: Partial<TemplateFormValues> = template ? {
    ...template,
    articles: template.articles.map(a => ({ title: a.title, subtitle: a.subtitle, content: a.content })),
  } : {
    name: '',
    type: 'PENUH_WAKTU',
    headerTitle: 'PERJANJIAN KERJA PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA',
    articles: [{ title: 'PASAL 1', subtitle: 'DEFINISI', content: '' }],
  };

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'articles',
  });

  const onSubmit = async (data: TemplateFormValues) => {
    setIsLoading(true);
    try {
      if (template) {
        await FirebaseFirestore.updateTemplate(template.id, data);
        toast({ title: 'Success', description: 'Template updated successfully.' });
      } else {
        await FirebaseFirestore.addTemplate(data);
        toast({ title: 'Success', description: 'Template created successfully.' });
      }
      router.push('/dashboard/templates');
      router.refresh(); // to reflect changes in the list
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      <div className="md:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PPPK Teknis Penuh Waktu 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a contract type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENUH_WAKTU">Penuh Waktu</SelectItem>
                          <SelectItem value="PARUH_WAKTU">Paruh Waktu</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="headerTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Header Title</FormLabel>
                      <FormControl>
                        <Input placeholder="PERJANJIAN KERJA..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="openingText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Text</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Text that appears before the articles..." {...field} rows={5} />
                      </FormControl>
                      <FormDescription>This text appears before the articles, after the header.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div>
              <h3 className="text-xl font-bold mb-4">Articles</h3>
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <CardHeader>
                       <CardTitle>Article {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                        className="absolute top-4 right-4"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <FormField
                        control={form.control}
                        name={`articles.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., PASAL 1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`articles.${index}.subtitle`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subtitle</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., MASA PERJANJIAN KERJA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`articles.${index}.content`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Content of the article..." {...field} rows={6} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => append({ title: `PASAL ${fields.length + 1}`, subtitle: '', content: '' })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Article
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Closing</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="closingText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closing Text</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Text that appears after the articles..." {...field} rows={4} />
                      </FormControl>
                       <FormDescription>This text appears after all articles, before the signature block.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <div className="flex justify-end gap-2">
               <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {template ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </form>
        </Form>
      </div>

       <div className="md:col-span-1">
        <PlaceholderCheatsheet />
      </div>

    </div>
  );
}
