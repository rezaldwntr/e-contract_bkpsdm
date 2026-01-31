// src/lib/excel-utils.ts

import * as XLSX from 'xlsx';
import { Employee, ContractType } from './types';
import { format } from 'date-fns';

// MAPPING BARU (Sesuai Data Terbaru Anda)
const columnMapping: { [key: string]: keyof Employee } = {
  'Jenis Formasi': 'formationType',
  'Tahun Formasi': 'formationYear',
  'No Peserta': 'participantId',
  'NIP': 'niPppk',
  'Nama': 'fullName',
  'Gelar Depan': 'frontTitle',
  'Gelar Belakang': 'backTitle',
  'Tempat Lahir': 'birthPlace',
  'Tanggal Lahir': 'birthDate',
  'Pendidikan Terakhir': 'education',
  'Tahun Lulus': 'graduationYear',
  'Jabatan': 'position',
  'Unit Kerja (SK)': 'workUnitSK',
  'Unit Kerja (PK)': 'workUnitPK',
  'TMT Jabatan': 'tmtPosition',
  'Golongan Ruang': 'gradeClass',
  'Gaji Pokok': 'salaryNumeric',
  'Terbilang': 'salaryWords',
  'Tanggal Kontrak Awal': 'contractStartDate',
  'Tanggal Kontrak Akhir': 'contractEndDate'
};

// Helper: Format Tanggal Excel ke YYYY-MM-DD
const parseDate = (value: any): string => {
  if (!value) return '';
  try {
    if (typeof value === 'number') {
      // Excel Serial Date
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return format(date, 'yyyy-MM-dd');
    } else {
      // String Date (Asumsi format text sudah benar atau perlu diparse)
      const date = new Date(value);
      if (isNaN(date.getTime())) return String(value); // Kembalikan mentah jika gagal parse
      return format(date, 'yyyy-MM-dd');
    }
  } catch (e) {
    return String(value);
  }
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
        
        // Baca data (Header di baris 1)
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, header: 1 });

        if (json.length < 2) throw new Error('File Excel kosong atau header salah.');

        const header: string[] = json[0]; // Baris pertama adalah Header
        const rows = json.slice(1);

        const employees = rows.map((row): Omit<Employee, 'status'> => {
          const emp: any = {};
          
          header.forEach((colName, index) => {
            const key = columnMapping[colName.trim()]; // Trim spasi header jaga-jaga
            if (key) {
              emp[key] = row[index];
            }
          });

          // --- VALIDASI & FORMATTING ---
          
          if (!emp.niPppk) {
            // Skip baris kosong jika NIP tidak ada
            return null;
          }

          // 1. Deteksi Tipe Kontrak (Masih pakai logika PW di No Peserta)
          const isPW = String(emp.participantId || '').toUpperCase().startsWith('PW');
          
          // 2. Format Tanggal Penting
          const formattedBirthDate = parseDate(emp.birthDate);
          const formattedStartDate = parseDate(emp.contractStartDate);
          const formattedEndDate = parseDate(emp.contractEndDate);
          const formattedTmtJabatan = parseDate(emp.tmtPosition);

          // 3. Bersihkan Nilai String (Hapus spasi berlebih)
          const cleanString = (val: any) => String(val || '').trim();
          
          // 4. Perbaiki Format Gaji (Hapus "Rp" atau titik jika ada, ambil angkanya saja)
          let cleanSalary = 0;
          if (typeof emp.salaryNumeric === 'string') {
             cleanSalary = Number(emp.salaryNumeric.replace(/[^0-9]/g, ''));
          } else {
             cleanSalary = Number(emp.salaryNumeric || 0);
          }

          return {
            niPppk: cleanString(emp.niPppk),
            participantId: cleanString(emp.participantId),
            
            fullName: cleanString(emp.fullName),
            frontTitle: cleanString(emp.frontTitle).replace(/^(-|0)$/, ''), // Hapus tanda strip/- jika gelar kosong
            backTitle: cleanString(emp.backTitle).replace(/^(-|0)$/, ''),
            
            birthPlace: cleanString(emp.birthPlace),
            birthDate: formattedBirthDate,
            
            formationType: cleanString(emp.formationType),
            formationYear: cleanString(emp.formationYear),
            position: cleanString(emp.position),
            gradeClass: cleanString(emp.gradeClass),
            tmtPosition: formattedTmtJabatan,
            
            workUnitSK: cleanString(emp.workUnitSK),
            workUnitPK: cleanString(emp.workUnitPK),
            
            education: cleanString(emp.education),
            graduationYear: cleanString(emp.graduationYear),
            
            salaryNumeric: cleanSalary,
            salaryWords: cleanString(emp.salaryWords),
            
            contractStartDate: formattedStartDate,
            contractEndDate: formattedEndDate,
            
            contractType: isPW ? 'PARUH_WAKTU' : 'PENUH_WAKTU',
          };
        }).filter(Boolean) as Omit<Employee, 'status'>[]; // Hapus yang null

        resolve(employees);

      } catch (error) {
        console.error("Error parsing Excel:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};