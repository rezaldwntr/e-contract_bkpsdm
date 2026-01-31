export interface Employee {
  id?: string;
  niPppk: string;
  participantId?: string; // Opsional
  
  // Update Bagian Nama
  fullName: string;
  frontTitle?: string; // Gelar Depan (Baru)
  backTitle?: string;  // Gelar Belakang (Baru)
  
  placeOfBirth: string;
  dateOfBirth: string;
  gender: "L" | "P";
  address: string;
  city: string;
  
  // Data Jabatan
  workUnitSK: string;
  position: string;
  
  // Data Kontrak
  contractType: string;
  formationType: string;
  contractStartDate: string;
  contractEndDate: string;
  
  // Opsional
  archiveUrl?: string; 
  status?: string;
  createdAt?: string;
}