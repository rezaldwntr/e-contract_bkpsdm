import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { Employee } from "./types";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { FirebaseStorage } from "@/services/firebase";

// Helper Terbilang untuk TANGGAL (Bukan Gaji, karena Gaji sudah ada di Excel)
const terbilangAngka = (angka: number): string => {
  const bil = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  if (angka < 12) return bil[angka];
  if (angka < 20) return terbilangAngka(angka - 10) + " Belas";
  if (angka < 100) return terbilangAngka(Math.floor(angka / 10)) + " Puluh " + terbilangAngka(angka % 10);
  if (angka < 200) return "Seratus " + terbilangAngka(angka - 100);
  if (angka < 1000) return terbilangAngka(Math.floor(angka / 100)) + " Ratus " + terbilangAngka(angka % 100);
  if (angka < 2000) return "Seribu " + terbilangAngka(angka - 1000);
  if (angka < 1000000) return terbilangAngka(Math.floor(angka / 1000)) + " Ribu " + terbilangAngka(angka % 1000);
  return angka.toString();
};

export const generateDocx = async (employee: Employee, date: Date) => {
  try {
    // 1. Cek Jenis Kontrak (Penuh/Paruh) dari kolom "Jenis Formasi"
    const isParuhWaktu = employee.contractType?.toLowerCase().includes("paruh");
    const templateType = isParuhWaktu ? 'paruh' : 'penuh';

    // 2. Download Template
    const url = await FirebaseStorage.getTemplateUrl(templateType);
    if (!url) {
      alert(`Template ${templateType} belum diupload!`);
      return;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal download template.");
    const content = await response.arrayBuffer();
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    // 3. LOGIKA DETEKSI FORMASI (GURU / KESEHATAN / TEKNIS)
    // Mengacu pada kolom "Formasi"
    const formasi = employee.formationType?.toLowerCase() || "";
    
    let fraseFungsional = "Fungsional"; 
    let targetDiskriminasi = "peserta didik";

    if (formasi.includes("guru")) {
        // --- KASUS GURU ---
        fraseFungsional = "Fungsional Guru";
        targetDiskriminasi = "peserta didik";
    } else if (formasi.includes("kesehatan")) {
        // --- KASUS KESEHATAN ---
        fraseFungsional = "Fungsional Kesehatan";
        targetDiskriminasi = "pasien";
    } else {
        // --- KASUS TEKNIS (Default) ---
        // Jika mengandung kata "teknis" atau lainnya
        fraseFungsional = "Fungsional";
        targetDiskriminasi = "peserta didik";
    }

    // 4. Siapkan Data Tanggal Tanda Tangan
    const tgl = parseInt(format(date, "d"));
    const thn = parseInt(format(date, "yyyy"));
    const bln = format(date, "MMMM", { locale: id }).toUpperCase();

    // 5. Format Tanggal Lahir & Kontrak (Safety check jika Excel formatnya beda)
    const safeDate = (dateString: string) => {
        try {
            const d = new Date(dateString);
            return isNaN(d.getTime()) ? dateString : format(d, "dd-MM-yyyy");
        } catch { return dateString; }
    };
    
    const safeContractDate = (dateString: string) => {
        try {
            const d = new Date(dateString);
            return isNaN(d.getTime()) ? dateString : format(d, "d MMMM yyyy", { locale: id });
        } catch { return dateString; }
    };


    // 6. RENDER DATA KE WORD
    doc.render({
      // Header & Tanggal
      nomor_sk: "1603",
      hari_terbilang: format(date, "eeee", { locale: id }).toUpperCase(),
      tanggal_terbilang: terbilangAngka(tgl).toUpperCase(),
      bulan_terbilang: bln,
      tahun_terbilang: terbilangAngka(thn).toUpperCase(),
      
      // Pejabat
      nama_bupati: "H. SAHRUJANI",
      
      // Pegawai (Identitas Pihak Kedua)
      nama_lengkap: employee.fullName,
      ni_pppk: employee.niPppk,
      tempat_lahir: employee.placeOfBirth,
      tgl_lahir: safeDate(employee.dateOfBirth),
      
      // UPDATE 1: Tambahkan Tahun Lulus
      pendidikan: employee.education,
      tahun_lulus: employee.graduationYear, // <--- Variabel Baru
      
      alamat: employee.address,
      
      // Detail Kontrak
      tgl_mulai_kontrak: safeContractDate(employee.contractStartDate),
      tgl_selesai_kontrak: safeContractDate(employee.contractEndDate),
      jabatan_tugas: employee.position,
      unit_kerja: employee.workUnitPK,
      
      // Gaji
      golongan: employee.payGrade,
      gaji_pokok: employee.salary,
      gaji_terbilang: employee.salaryText,

      // Variabel Logika Dinamis
      frase_fungsional: fraseFungsional,
      target_diskriminasi: targetDiskriminasi,
      
      gelar_depan: employee.frontTitle || "",
      gelar_belakang: employee.backTitle || "",
    });

    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(out, `Draft_PK_${employee.niPppk}.docx`);
    
  } catch (error) {
    console.error("Gagal generate DOCX:", error);
    alert("Gagal memproses dokumen. Periksa console.");
  }
};