import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { Employee } from "./types";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { FirebaseStorage } from "@/services/firebase"; // Import Service Firebase

// ... (Fungsi terbilang biarkan saja) ...
const terbilang = (angka: number): string => { 
    // ... kode terbilang ...
    const bil = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    if (angka < 12) return bil[angka];
    if (angka < 20) return terbilang(angka - 10) + " Belas";
    if (angka < 100) return terbilang(Math.floor(angka / 10)) + " Puluh " + terbilang(angka % 10);
    if (angka < 200) return "Seratus " + terbilang(angka - 100);
    if (angka < 1000) return terbilang(Math.floor(angka / 100)) + " Ratus " + terbilang(angka % 100);
    if (angka < 2000) return "Seribu " + terbilang(angka - 1000);
    if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + " Ribu " + terbilang(angka % 1000);
    return angka.toString();
};

export const generateDocx = async (employee: Employee, date: Date) => {
  try {
    // 1. Tentukan Jenis Template Berdasarkan Data Pegawai
    // Asumsi: Di Excel kolom 'Jenis Kontrak' isinya 'Penuh Waktu' atau 'Paruh Waktu'
    const isParuhWaktu = employee.contractType?.toLowerCase().includes("paruh");
    const templateType = isParuhWaktu ? 'paruh' : 'penuh';

    console.log(`Mengambil template untuk: ${employee.contractType} -> Mode: ${templateType}`);

    // 2. Ambil URL dari Firebase Storage
    const url = await FirebaseStorage.getTemplateUrl(templateType);

    if (!url) {
      alert("Template belum diupload! Silakan upload dulu di menu Templates.");
      return;
    }

    // 3. Download File Template (Fetch)
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal mendownload template dari server.");
    
    const content = await response.arrayBuffer();
    const zip = new PizZip(content);

    // 4. Setup Docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 5. Siapkan Data (Sama seperti sebelumnya)
    const tgl = parseInt(format(date, "d"));
    const thn = parseInt(format(date, "yyyy"));
    const bln = format(date, "MMMM", { locale: id }).toUpperCase();

    doc.render({
      // --- HEADER ---
      nomor_sk: "1603", // Nanti bisa kita buat dinamis juga
      
      hari_terbilang: format(date, "eeee", { locale: id }).toUpperCase(),
      tanggal_terbilang: terbilang(tgl).toUpperCase(),
      bulan_terbilang: bln,
      tahun_terbilang: terbilang(thn).toUpperCase(),
      
      // --- DATA DINAMIS LAINNYA ---
      nama_bupati: "H. SAHRUJANI",
      
      nama_lengkap: employee.fullName,
      ni_pppk: employee.niPppk,
      tempat_lahir: employee.placeOfBirth,
      tgl_lahir: format(new Date(employee.dateOfBirth), "dd-MM-yyyy"),
      pendidikan: "S-1", 
      alamat: employee.address,
      
      tgl_mulai_kontrak: format(new Date(employee.contractStartDate), "d MMMM yyyy", { locale: id }),
      tgl_selesai_kontrak: format(new Date(employee.contractEndDate), "d MMMM yyyy", { locale: id }),
      jabatan_tugas: employee.position,
      unit_kerja: employee.workUnitSK,
      
      // Data Gaji (Bisa dibedakan logicnya jika paruh waktu beda gaji)
      golongan: "VII",            
      gaji_pokok: "2.858.800,-",  
      gaji_terbilang: "Dua Juta Delapan Ratus Lima Puluh Delapan Ribu Delapan Ratus Rupiah",
    });

    // 6. Generate & Download
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(out, `Draft_PK_${employee.niPppk}_${templateType}.docx`);
    
  } catch (error) {
    console.error("Gagal generate DOCX:", error);
    alert("Terjadi kesalahan saat memproses dokumen. Cek console untuk detail.");
  }
};