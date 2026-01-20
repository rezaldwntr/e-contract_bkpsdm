import { Employee, ContractTemplate, ContractType, TemplateArticle } from '@/lib/types';
import { MOCK_EMPLOYEES } from '@/lib/placeholder-data';

// --- MOCK DATA ---

const MOCK_TEMPLATES: ContractTemplate[] = [
    {
        id: 'penuh-waktu-2024',
        name: 'PPPK Teknis Penuh Waktu 2024',
        type: 'PENUH_WAKTU',
        headerTitle: 'PERJANJIAN KERJA PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA',
        openingText: `Pada hari ini, {{HARI_INI_LONG}}, yang bertanda tangan di bawah ini:\nI. Nama Instansi\nJabatan\nAlamat\n\nDalam hal ini bertindak untuk dan atas nama Pemerintah Kabupaten, selanjutnya disebut PIHAK PERTAMA.\n\nII. Nama: {{NAMA_LENGKAP}}\nNI PPPK: {{NI_PPPK}}\nTempat, Tanggal Lahir: {{TEMPAT_LAHIR}}, {{TANGGAL_LAHIR}}\nAlamat: {{ALAMAT}}\n\nDalam hal ini bertindak untuk dan atas nama diri sendiri, selanjutnya disebut PIHAK KEDUA.`,
        articles: [
            {
                id: '1',
                title: 'PASAL 1',
                subtitle: 'MASA PERJANJIAN KERJA',
                content: 'Masa Perjanjian Kerja adalah selama {{MASA_KONTRAK_TAHUN}} ({{MASA_KONTRAK_TERBILANG}}) tahun, terhitung mulai tanggal {{TANGGAL_MULAI_KONTRAK}} sampai dengan tanggal {{TANGGAL_SELESAI_KONTRAK}}.',
            },
            {
                id: '2',
                title: 'PASAL 6',
                subtitle: 'GAJI',
                content: 'PIHAK KEDUA berhak atas gaji sebesar Rp. {{GAJI_ANGKA}},- ({{GAJI_TERBILANG}}) per bulan.',
            },
        ],
        closingText: 'Demikian Perjanjian Kerja ini dibuat untuk dilaksanakan sebagaimana mestinya.',
        createdAt: new Date('2024-05-10'),
    },
    {
        id: 'paruh-waktu-2024',
        name: 'PPPK Teknis Paruh Waktu 2024',
        type: 'PARUH_WAKTU',
        headerTitle: 'PERJANJIAN KERJA PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA (PARUH WAKTU)',
        openingText: `Dengan ini dibuat perjanjian kerja paruh waktu pada {{HARI_INI_LONG}} antara PIHAK PERTAMA dan PIHAK KEDUA:\n\nPIHAK KEDUA\nNama: {{NAMA_LENGKAP}}\nNI PPPK: {{NI_PPPK}}`,
        articles: [
            {
                id: '1',
                title: 'PASAL 1',
                subtitle: 'LINGKUP PEKERJAAN',
                content: 'PIHAK KEDUA dipekerjakan sebagai {{JABATAN}} di {{UNIT_KERJA}}.',
            },
            {
                id: '2',
                title: 'PASAL 2',
                subtitle: 'MASA BERLAKU',
                content: 'Perjanjian ini berlaku selama {{MASA_KONTRAK_TAHUN}} ({{MASA_KONTRAK_TERBILANG}}) tahun, dari {{TANGGAL_MULAI_KONTRAK}} hingga {{TANGGAL_SELESAI_KONTRAK}}.',
            }
        ],
        closingText: 'Perjanjian ini ditandatangani oleh kedua belah pihak.',
        createdAt: new Date('2024-05-11'),
    }
];

// This is a mock in-memory "database" to simulate Firestore
const employees: Employee[] = [...MOCK_EMPLOYEES];
const templates: ContractTemplate[] = [...MOCK_TEMPLATES];

// --- TEMPLATE SERVICE (MOCK) ---

export const FirebaseFirestore = {
  // Employee Functions
  async getEmployeeByNiPppk(niPppk: string): Promise<Employee | undefined> {
    console.log(`Firestore (Mock): Fetching employee with niPppk: ${niPppk}`);
    await new Promise(res => setTimeout(res, 300)); // Simulate async
    return employees.find(e => e.niPppk === niPppk);
  },

  async updateEmployeeStatus(niPppk: string, status: 'New' | 'Generated' | 'Archived' | 'Error'): Promise<void> {
    console.log(`Firestore (Mock): Updating status for ${niPppk} to ${status}`);
    await new Promise(res => setTimeout(res, 300)); // Simulate async
    const index = employees.findIndex(e => e.niPppk === niPppk);
    if (index !== -1) {
      employees[index].status = status;
    } else {
      console.error(`Firestore (Mock): Employee with niPppk ${niPppk} not found.`);
    }
  },

  async getEmployees(): Promise<Employee[]> {
    console.log('Firestore (Mock): Fetching all employees.');
    await new Promise(res => setTimeout(res, 500)); // Simulate async
    return [...employees].sort((a, b) => (a.fullName > b.fullName ? 1 : -1));
  },
  
  async addEmployees(newEmployees: Omit<Employee, 'status'>[]): Promise<void> {
    console.log('Firestore (Mock): Adding new employees.');
    await new Promise(res => setTimeout(res, 300)); // Simulate async
    newEmployees.forEach(newEmployee => {
        const fullEmployee: Employee = {
            ...newEmployee,
            status: 'New',
        };
        const exists = employees.some(e => e.niPppk === fullEmployee.niPppk);
        if (!exists) {
            employees.unshift(fullEmployee);
        } else {
          // Optionally update existing records
          const index = employees.findIndex(e => e.niPppk === fullEmployee.niPppk);
          employees[index] = { ...employees[index], ...fullEmployee };
        }
    });
    console.log(`Firestore (Mock): ${newEmployees.length} employees processed.`);
  },

  // Template Functions
  async getTemplates(): Promise<ContractTemplate[]> {
    console.log('Firestore (Mock): Fetching all templates.');
    await new Promise(res => setTimeout(res, 400));
    return [...templates].sort((a, b) => (a.name > b.name ? 1 : -1));
  },

  async getTemplateById(id: string): Promise<ContractTemplate | undefined> {
    console.log(`Firestore (Mock): Fetching template with id: ${id}`);
    await new Promise(res => setTimeout(res, 200));
    return templates.find(t => t.id === id);
  },

  async addTemplate(templateData: Omit<ContractTemplate, 'id' | 'createdAt'>): Promise<string> {
    console.log(`Firestore (Mock): Adding new template: ${templateData.name}`);
    await new Promise(res => setTimeout(res, 300));
    const newId = `template-${Date.now()}-${Math.random()}`;
    const newTemplate: ContractTemplate = {
      ...templateData,
      id: newId,
      createdAt: new Date(),
    };
    templates.push(newTemplate);
    return newId;
  },

  async updateTemplate(id: string, templateData: Omit<ContractTemplate, 'id' | 'createdAt'>): Promise<void> {
    console.log(`Firestore (Mock): Updating template: ${id}`);
    await new Promise(res => setTimeout(res, 300));
    const index = templates.findIndex(t => t.id === id);
    if (index !== -1) {
      templates[index] = { ...templates[index], ...templateData };
    } else {
      throw new Error("Template not found for update.");
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    console.log(`Firestore (Mock): Deleting template: ${id}`);
    await new Promise(res => setTimeout(res, 300));
    const index = templates.findIndex(t => t.id === id);
    if (index !== -1) {
      templates.splice(index, 1);
    } else {
      throw new Error("Template not found for deletion.");
    }
  },
};

// This is a mock "storage" to simulate Firebase Storage
export const FirebaseStorage = {
  async uploadPdf(path: string, dataUri: string): Promise<string> {
    console.log(`Storage (Mock): "Uploading" PDF to ${path}`);
    await new Promise(res => setTimeout(res, 1000)); // Simulate async
    const downloadURL = `https://fake-storage.firebase.com/v0/b/project.appspot.com/o/${encodeURIComponent(path)}?alt=media`;
    console.log(`Storage (Mock): Upload complete. URL: ${downloadURL}`);
    
    // For demonstration, create a downloadable link in the browser
    const blob = await (await fetch(dataUri)).blob();
    const blobUrl = URL.createObjectURL(blob);
    console.log(`Storage (Mock): PDF available for download at: ${blobUrl}`);
    
    return downloadURL;
  }
};