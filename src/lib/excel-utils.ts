import * as XLSX from 'xlsx';
import { Employee, ContractType } from './types';
import { format } from 'date-fns';

// Maps Excel headers to Employee interface keys. CRITICAL for data ingestion.
const columnMapping: { [key: string]: keyof Employee } = {
  'Nomor Kontrak P3K': 'contractNumber',
  'NIK': 'nik',
  'No Peserta': 'participantId',
  'Nama': 'fullName',
  'Tempat Lahir': 'birthPlace',
  'Tanggal Lahir': 'birthDate',
  'Jenis Kelamin': 'gender',
  'NI P3K': 'niPppk',
  'Alamat': 'address',
  'Jabatan': 'position',
  'Unit Kerja': 'unitName',
  'Pendidikan': 'education',
  'Golongan': 'gradeClass',
  'Gaji': 'salaryNumeric',
  'Terbilang': 'salaryWords',
  'Tahun Lulus': 'graduationYear',
};

// Helper to convert Excel serial date to JS Date
const excelDateToJSDate = (serial: number) => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
};


export const parseExcelFile = (file: File): Promise<Omit<Employee, 'status'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, header: 1 });

        if (json.length < 2) {
          throw new Error('Excel file is empty or has no data rows.');
        }

        const header: string[] = json[0];
        const rows = json.slice(1);

        const employees = rows.map((row): Omit<Employee, 'status'> => {
          const employeeData: Partial<Employee> = {};
          
          header.forEach((colName, index) => {
            const key = columnMapping[colName.trim()];
            if (key) {
              (employeeData as any)[key] = row[index];
            }
          });

          // Data transformation and validation
          if (!employeeData.niPppk) {
            throw new Error(`Row missing required field 'NI P3K'. Data: ${JSON.stringify(row)}`);
          }

          const contractType: ContractType = (employeeData.participantId || '').toString().toUpperCase().startsWith('PW') 
            ? 'PARUH_WAKTU' 
            : 'PENUH_WAKTU';

          // Handle date conversion carefully
          let birthDateStr: string;
          if (typeof employeeData.birthDate === 'number') {
            birthDateStr = format(excelDateToJSDate(employeeData.birthDate), 'yyyy-MM-dd');
          } else if (typeof employeeData.birthDate === 'string') {
            // Attempt to parse various string formats, assuming 'dd/mm/yyyy' or 'mm/dd/yyyy' etc.
            // For robustness, this part may need a more sophisticated date parsing library
            birthDateStr = format(new Date(employeeData.birthDate), 'yyyy-MM-dd');
          } else {
            birthDateStr = format(new Date(), 'yyyy-MM-dd'); // Fallback
          }


          return {
            contractNumber: String(employeeData.contractNumber || ''),
            nik: String(employeeData.nik || ''),
            participantId: String(employeeData.participantId || ''),
            fullName: String(employeeData.fullName || ''),
            birthPlace: String(employeeData.birthPlace || ''),
            birthDate: birthDateStr,
            gender: employeeData.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN',
            niPppk: String(employeeData.niPppk),
            address: String(employeeData.address || ''),
            position: String(employeeData.position || ''),
            unitName: String(employeeData.unitName || ''),
            education: String(employeeData.education || ''),
            gradeClass: String(employeeData.gradeClass || ''),
            salaryNumeric: Number(employeeData.salaryNumeric || 0),
            salaryWords: String(employeeData.salaryWords || ''),
            graduationYear: Number(employeeData.graduationYear || 0),
            contractType: contractType,
          };
        });

        resolve(employees);

      } catch (error) {
        console.error("Error parsing Excel file:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};
