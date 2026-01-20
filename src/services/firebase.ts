import { Employee } from '@/lib/types';
import { MOCK_EMPLOYEES } from '@/lib/placeholder-data';

// This is a mock in-memory "database" to simulate Firestore
const employees: Employee[] = [...MOCK_EMPLOYEES];

export const FirebaseFirestore = {
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
  }
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
