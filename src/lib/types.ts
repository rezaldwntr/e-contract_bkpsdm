export interface Employee {
  id?: string;
  
  // Identitas & Formasi
  contractType: string;    // Jenis Formasi (Penuh/Paruh)
  formationType: string;   // Formasi (Guru/Kesehatan/Teknis) -> KUNCI LOGIKA
  formationYear: string;   // Tahun Formasi
  participantId: string;   // No Peserta
  niPppk: string;          // NIP
  fullName: string;        // Nama
  
  // Gelar
  frontTitle?: string;     // Gelar Depan
  backTitle?: string;      // Gelar Belakang
  
  // Biodata
  placeOfBirth: string;    // Tempat Lahir
  dateOfBirth: string;     // Tanggal Lahir (Format Excel/String)
  address: string;         // Alamat
  
  // Pendidikan
  education: string;       // Pendidikan Terakhir
  graduationYear: string;  // Tahun Lulus
  
  // Pekerjaan
  position: string;        // Jabatan
  workUnitSK: string;      // Unit Kerja (SK)
  workUnitPK: string;      // Unit Kerja (PK) - Biasanya lebih spesifik
  tmtPosition: string;     // TMT Jabatan
  
  // Gaji
  payGrade: string;        // Golongan Ruang
  salary: string;          // Gaji Pokok (Rp...)
  salaryText: string;      // Terbilang
  
  // Kontrak
  contractStartDate: string; // Tanggal Kontrak Awal
  contractEndDate: string;   // Tanggal Kontrak Akhir
  
  createdAt?: string;
}