import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { Employee } from './types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// F4 Size
const F4_SIZE: [number, number] = [610, 936];

const formatCurrency = (val: number | undefined) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    .format(val || 0).replace('Rp', 'Rp. ');

function terbilang(angka: number): string {
  const bil = ["", "SATU", "DUA", "TIGA", "EMPAT", "LIMA", "ENAM", "TUJUH", "DELAPAN", "SEMBILAN", "SEPULUH", "SEBELAS"];
  if (angka < 12) return bil[angka];
  if (angka < 20) return terbilang(angka - 10) + " BELAS";
  if (angka < 100) return terbilang(Math.floor(angka / 10)) + " PULUH " + terbilang(angka % 10);
  if (angka < 200) return "SERATUS " + terbilang(angka - 100);
  if (angka < 1000) return terbilang(Math.floor(angka / 100)) + " RATUS " + terbilang(angka % 100);
  if (angka < 2000) return "SERIBU " + terbilang(angka - 1000);
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + " RIBU " + terbilang(angka % 1000);
  return ""; 
}

// UPDATE: Tambah parameter wajib 'signingDate'
export async function generateContractPdf(employee: Employee, signingDate: Date): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const margin = 70;
  const topMargin = 50;
  const bottomMargin = 60;
  const fontSizeBody = 11;
  const lineHeight = 14;
  
  let page = pdfDoc.addPage(F4_SIZE);
  let { width, height } = page.getSize();
  let currentY = height - topMargin;

  // --- HELPER FUNCTIONS ---
  const checkPageBreak = (neededSpace: number = 50) => {
    if (currentY < bottomMargin + neededSpace) {
      page = pdfDoc.addPage(F4_SIZE);
      currentY = height - topMargin;
    }
  };

  const drawCentered = (text: string, font: PDFFont, size: number, y: number) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y, font, size, color: rgb(0,0,0) });
  };

  const drawTextMultiLine = (text: string, options: { indent?: number, firstLineIndent?: number, isBold?: boolean } = {}) => {
    const { indent = 0, firstLineIndent = 0, isBold = false } = options;
    const font = isBold ? fontBold : fontRegular;
    const safeText = text || ''; 
    const maxWidth = width - margin - margin - indent;
    const words = safeText.split(/\s+/);
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const currentIndent = lines.length === 0 ? firstLineIndent : 0;
      const testLine = line + (line ? " " : "") + word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSizeBody);
      if (testWidth > maxWidth - currentIndent) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    for (let i = 0; i < lines.length; i++) {
      checkPageBreak(lineHeight);
      const currentIndent = i === 0 ? firstLineIndent : 0;
      page.drawText(lines[i], { x: margin + indent + currentIndent, y: currentY, font, size: fontSizeBody, color: rgb(0,0,0) });
      currentY -= lineHeight;
    }
    currentY -= 4;
  };

  const renderPasal = (nomor: string, judul: string, isi: string) => {
    checkPageBreak(80);
    currentY -= 10;
    drawCentered(nomor, fontBold, fontSizeBody, currentY);
    currentY -= lineHeight;
    drawCentered(judul, fontBold, fontSizeBody, currentY);
    currentY -= (lineHeight + 5);
    if (isi.includes('\n')) {
      const points = isi.split('\n');
      points.forEach(point => {
        const isList = /^[a-z]\.|^\(\d+\)|^\d+\./.test(point.trim());
        if (isList) {
          const labelMatch = point.match(/^([a-z]\.|\(\d+\)|\d+\.)\s/);
          const label = labelMatch ? labelMatch[0] : "";
          const content = point.substring(label.length);
          checkPageBreak(lineHeight);
          page.drawText(label.trim(), { x: margin, y: currentY, font: fontRegular, size: fontSizeBody });
          drawTextMultiLine(content, { indent: 25 }); 
        } else {
          drawTextMultiLine(point);
        }
      });
    } else {
      drawTextMultiLine(isi);
    }
  };

  // --- LOGIKA DATA ---
  const safeFormatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return ".........."; 
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return ".........."; 
      return format(date, "dd MMMM yyyy", { locale: id });
    } catch (e) { return ".........."; }
  };

  const tglLahir = safeFormatDate(employee.birthDate);
  const tglMulai = safeFormatDate(employee.contractStartDate);
  const tglAkhir = safeFormatDate(employee.contractEndDate);
  
  // LOGIKA TANGGAL MANUAL (TERBILANG)
  const hariIni = format(signingDate, "eeee", { locale: id }).toUpperCase(); 
  const bulanIni = format(signingDate, "MMMM", { locale: id }).toUpperCase(); 
  
  const tglAngka = signingDate.getDate();
  const thnAngka = signingDate.getFullYear();
  
  const tglTerbilang = terbilang(tglAngka); 
  const thnTerbilang = terbilang(thnAngka); 

  const namaLengkap = [employee.frontTitle, employee.fullName, employee.backTitle]
    .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || employee.fullName;

  // --- DRAW CONTENT ---
  // HEADER
  const noKontrak = employee.contractNumber ? employee.contractNumber : "     ";
  const textHeader3 = `Nomor 800.1.2.5/${noKontrak}/BKPSDM`; 
  drawCentered("BUPATI HULU SUNGAI UTARA", fontBold, 12, currentY);
  currentY -= 16;
  drawCentered("PERJANJIAN KERJA", fontBold, 12, currentY);
  currentY -= 16;
  drawCentered(textHeader3, fontRegular, 12, currentY);
  currentY -= 20;

  // PEMBUKAAN (Dynamic Date)
  const pembukaan = `Pada hari ini ${hariIni} tanggal ${tglTerbilang} bulan ${bulanIni} tahun ${thnTerbilang} yang bertandatangan di bawah ini:`;
  drawTextMultiLine(pembukaan);

  // IDENTITAS
  const labelWidth = 120;
  const drawIdentity = (label: string, value: string | undefined | null, isBoldVal: boolean = false) => {
    const safeValue = value || '-'; 
    checkPageBreak(lineHeight);
    page.drawText(label, { x: margin, y: currentY, font: fontRegular, size: fontSizeBody });
    page.drawText(":", { x: margin + labelWidth - 5, y: currentY, font: fontRegular, size: fontSizeBody });
    if (safeValue.length > 55) {
        const splitVal = safeValue.match(/.{1,55}/g) || [safeValue];
        splitVal.forEach((v, idx) => {
            page.drawText(v, { x: margin + labelWidth + 5, y: currentY, font: isBoldVal ? fontBold : fontRegular, size: fontSizeBody });
            if(idx < splitVal.length -1) currentY -= lineHeight;
        });
    } else {
        page.drawText(safeValue, { x: margin + labelWidth + 5, y: currentY, font: isBoldVal ? fontBold : fontRegular, size: fontSizeBody });
    }
    currentY -= lineHeight;
  };

  drawIdentity("Nama", "H. SAHRUJANI");
  drawIdentity("Jabatan", "Bupati");
  currentY -= 5;
  drawTextMultiLine("Dalam hal ini bertindak untuk dan atas nama Bupati Hulu Sungai Utara, untuk selanjutnya disebut Pihak Kesatu.");
  currentY -= 10;

  drawIdentity("Nama", namaLengkap, true);
  drawIdentity("Nomor Induk PPPK", employee.niPppk);
  drawIdentity("Tempat/tgl. Lahir", `${employee.birthPlace || '...'}, ${tglLahir}`);
  drawIdentity("Pendidikan", `${employee.education || '-'}, Tahun: ${employee.graduationYear || '-'}`);
  drawIdentity("Alamat", employee.address);
  currentY -= 5;
  drawTextMultiLine("Dalam hal ini bertindak untuk dan atas nama diri sendiri, untuk selanjutnya disebut Pihak Kedua.");
  currentY -= 15;
  drawTextMultiLine("Pihak Kesatu dan Pihak Kedua sepakat untuk mengikatkan diri satu sama lain dalam Perjanjian Kerja dengan ketentuan sebagaimana dituangkan dalam Pasal-Pasal sebagai berikut:");
  currentY -= 10;

  // PASAL
  renderPasal("Pasal 1", "Masa Perjanjian Kerja, Jabatan, dan Unit Kerja", 
    `Pihak Kesatu menerima dan mempekerjakan Pihak Kedua sebagai Pegawai Pemerintah dengan Perjanjian Kerja dengan ketentuan sebagai berikut:\n` +
    `a. Masa Perjanjian Kerja : ${tglMulai} s/d ${tglAkhir}\n` +
    `b. Jabatan : ${employee.position || '-'}\n` +
    `c. Unit Kerja : ${employee.workUnitSK || employee.unitName || '-'}`
  );

  renderPasal("Pasal 2", "Tugas Pekerjaan", 
    `Pihak Kesatu membuat dan menetapkan tugas pekerjaan yang harus dilaksanakan oleh Pihak Kedua.\n` +
    `Pihak Kedua wajib melaksanakan tugas pekerjaan yang diberikan Pihak Kesatu dengan sebaik-baiknya dan rasa tanggung jawab.`
  );

  renderPasal("Pasal 3", "Target Kinerja", 
    `(1) Pihak Kesatu membuat dan menetapkan target kinerja bagi Pihak Kedua selama masa Perjanjian Kerja.\n` +
    `(2) Pihak Kedua wajib memenuhi target kinerja yang telah ditetapkan oleh Pihak Kesatu.\n` +
    `(3) Pihak Kesatu dan Pihak Kedua menandatangani target perjanjian kinerja sesuai ketentuan peraturan perundang-undangan.`
  );

  renderPasal("Pasal 4", "Hari Kerja dan Jam Kerja", `Pihak Kedua wajib bekerja sesuai dengan hari kerja dan jam kerja yang berlaku di instansi Pihak Kesatu.`);
  renderPasal("Pasal 5", "Disiplin", 
    `Pihak Kedua wajib mematuhi kewajiban dan menghindari larangan sebagaimana diatur dalam peraturan disiplin Pegawai Pemerintah dengan Perjanjian Kerja.\n` +
    `Pihak Kedua yang melakukan pelanggaran terhadap kewajiban dan/atau larangan sebagaimana dimaksud pada ayat (1) dapat dikenakan sanksi disiplin berat berupa pemutusan hubungan perjanjian kerja tidak dengan hormat.`
  );

  const gajiRp = formatCurrency(employee.salaryNumeric);
  renderPasal("Pasal 6", "Gaji dan Tunjangan", 
    `(1) Pihak Kedua berhak mendapatkan gaji dan tunjangan sesuai dengan ketentuan peraturan perundang-undangan.\n` +
    `(2) Pihak Kedua berhak menerima gaji dalam golongan ${employee.gradeClass || '-'} sebesar ${gajiRp},- (${employee.salaryWords || '-'}).\n` +
    `(3) Pihak Kedua berhak menerima penghasilan lain yang sah sesuai dengan ketentuan peraturan perundang-undangan.\n` +
    `(4) Pembayaran gaji dan tunjangan sebagaimana dimaksud pada ayat (1) dilakukan sesuai dengan mekanisme pembayaran yang berlaku.`
  );

  renderPasal("Pasal 7", "Cuti", `Pihak Kedua berhak mendapatkan cuti tahunan, cuti sakit, cuti melahirkan, dan cuti bersama selama masa Perjanjian Kerja sesuai dengan ketentuan peraturan perundang-undangan.`);
  renderPasal("Pasal 8", "Pengembangan Kompetensi", `Pihak Kesatu memberikan pengembangan kompetensi kepada Pihak Kedua untuk mendukung pelaksanaan tugas selama masa Perjanjian Kerja dengan memperhatikan hasil penilaian kinerja Pihak Kedua.`);
  renderPasal("Pasal 9", "Penghargaan", `Pihak Kesatu dapat memberikan penghargaan kepada Pihak Kedua berupa tanda kehormatan, kesempatan prioritas untuk pengembangan kompetensi, dan/atau kesempatan menghadiri acara resmi dan/atau acara kenegaraan.`);
  renderPasal("Pasal 10", "Perlindungan", `Pihak Kesatu wajib memberikan perlindungan bagi Pihak Kedua berupa Jaminan Hari Tua, Jaminan Kesehatan, Jaminan Kecelakaan Kerja, Jaminan Kematian dan Bantuan Hukum sesuai dengan sistem jaminan sosial nasional.`);
  
  renderPasal("Pasal 11", "Pemutusan Hubungan Perjanjian Kerja", 
    `Pemutusan Hubungan Perjanjian Kerja dapat dilakukan dengan hormat atau pemutusan hubungan perjanjian kerja tidak dengan hormat.\n` +
    `Pemutusan Hubungan Perjanjian Kerja dengan hormat sebagaimana dimaksud pada ayat (1) dilakukan apabila:\n` +
    `a. Jangka waktu Perjanjian Kerja berakhir;\n` +
    `b. Meninggal dunia;\n` +
    `c. Atas permintaan sendiri;\n` +
    `d. Perampingan organisasi atau kebijakan pemerintah yang mengakibatkan pengurangan PPPK; atau\n` +
    `e. Tidak cakap jasmani dan/atau rohani sehingga tidak dapat menjalankan tugas dan kewajiban sesuai perjanjian kerja yang disepakati.\n` +
    `Pemutusan Hubungan Perjanjian Kerja tidak dengan hormat sebagaimana dimaksud pada ayat (1) dilakukan apabila:\n` +
    `a. Melakukan penyelewengan terhadap Pancasila dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945;\n` +
    `b. Dihukum penjara atau kurungan berdasarkan putusan pengadilan yang telah memiliki kekuatan hukum tetap karena melakukan tindak pidana kejahatan jabatan atau tindak pidana yang ada hubungannya dengan jabatan;\n` +
    `c. Menjadi anggota dan/atau pengurus partai politik; atau\n` +
    `d. Dihukum penjara berdasarkan putusan pengadilan yang telah memiliki kekuatan hukum tetap karena melakukan tindak pidana yang diancam pidana penjara paling singkat 2 (dua) tahun atau lebih dan tindak pidana tersebut dilakukan dengan berencana.`
  );
  
  renderPasal("Pasal 12", "Penyelesaian Perselisihan", `Apabila dalam pelaksanaan Perjanjian Kerja ini terjadi perselisihan, maka Pihak Kesatu dan Pihak Kedua sepakat menyelesaikan perselisihan tersebut sesuai dengan ketentuan peraturan perundang-undangan.`);
  renderPasal("Pasal 13", "Lain-lain", 
    `(1) Pihak Kedua bersedia melaksanakan seluruh ketentuan yang telah diatur dalam peraturan kedinasan dan peraturan lainnya yang berlaku di Pihak Kesatu.\n` +
    `(2) Pihak Kedua wajib menyimpan dan menjaga kerahasiaan baik dokumen maupun informasi milik Pihak Kesatu sesuai dengan ketentuan peraturan perundang-undangan.\n` +
    `(3) Pihak Kesatu dapat memperpanjang masa Perjanjian Kerja yang dilaksanakan sesuai dengan peraturan perundang-undangan.`
  );

  // PENUTUP
  currentY -= 10;
  drawTextMultiLine("Demikian Perjanjian Kerja ini dibuat dalam rangkap 2 (dua) oleh Pihak Kesatu dan Pihak Kedua dalam keadaan sehat dan sadar serta tanpa pengaruh ataupun paksaan dari pihak manapun, masing-masing bermaterai cukup dan mempunyai kekuatan hukum yang sama.");
  currentY -= 40;

  // HALAMAN TANDA TANGAN
  if (currentY < 150) {
    page = pdfDoc.addPage(F4_SIZE);
    currentY = height - topMargin - 20;
  }
  const colLeft = margin + 20;
  const colRight = width - margin - 150;

  page.drawText("Pihak Kesatu", { x: colLeft, y: currentY, font: fontRegular, size: fontSizeBody });
  page.drawText("Pihak Kedua", { x: colRight, y: currentY, font: fontRegular, size: fontSizeBody });
  currentY -= 80;

  page.drawText("H. SAHRUJANI", { x: colLeft, y: currentY, font: fontBold, size: fontSizeBody });
  page.drawText(namaLengkap.toUpperCase(), { x: colRight, y: currentY, font: fontBold, size: fontSizeBody });
  currentY -= 15;

  return pdfDoc.save();
}

export async function mergePdfWithSignature(mainPdfBytes: Uint8Array, signaturePdfBytes: Uint8Array): Promise<Uint8Array> {
  const mainDoc = await PDFDocument.load(mainPdfBytes);
  const signatureDoc = await PDFDocument.load(signaturePdfBytes);
  const [signaturePage] = await mainDoc.copyPages(signatureDoc, [0]);
  const pageCount = mainDoc.getPageCount();
  if (pageCount > 0) mainDoc.removePage(pageCount - 1);
  mainDoc.addPage(signaturePage);
  return mainDoc.save();
}