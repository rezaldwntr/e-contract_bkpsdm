export type ContractType = 'PARUH_WAKTU' | 'PENUH_WAKTU';

export interface Employee {
  contractNumber: string;
  nik: string;
  participantId: string;
  fullName: string;
  birthPlace: string;
  birthDate: string; // Storing as ISO string e.g., "1988-01-15"
  gender: 'LAKI-LAKI' | 'PEREMPUAN';
  niPppk: string;
  address: string;
  position: string;
  unitName: string;
  education: string;
  gradeClass: string;
  salaryNumeric: number;
  salaryWords: string;
  graduationYear: number;
  contractType: ContractType;
  status: 'New' | 'Generated' | 'Archived' | 'Error';
  startDate?: string; // Storing as ISO string e.g., "2024-01-01"
  endDate?: string; // Storing as ISO string e.g., "2024-12-31"
}
