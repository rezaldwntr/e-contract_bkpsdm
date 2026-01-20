import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { Employee } from './types';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

// F4 paper size in points (1 point = 1/72 inch)
// 215mm x 330mm = 8.46 x 12.99 inches
const F4_SIZE: [number, number] = [610, 936];

interface TextOptions {
  font: PDFFont;
  fontSize: number;
  lineHeight: number;
  color?: ReturnType<typeof rgb>;
  maxWidth?: number;
}

// Advanced function to draw justified text
async function drawJustifiedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: TextOptions
) {
  const { font, fontSize, color = rgb(0, 0, 0), maxWidth } = options;
  if (!maxWidth) throw new Error('maxWidth is required for justified text.');

  const paragraphs = text.split('\n');
  let currentY = y;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = line + (line ? ' ' : '') + word;
      const lineWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (lineWidth > maxWidth && line) {
        const wordsInLine = line.split(' ');
        const isLastLineOfParagraph = i === words.length;

        if (wordsInLine.length > 1 && !isLastLineOfParagraph) {
          const textWidth = font.widthOfTextAtSize(line.replace(/\s/g, ''), fontSize);
          const totalSpacing = maxWidth - textWidth;
          const spaceWidth = totalSpacing / (wordsInLine.length - 1);
          let currentX = x;
          for (const w of wordsInLine) {
            page.drawText(w, { x: currentX, y: currentY, font, size: fontSize, color });
            currentX += font.widthOfTextAtSize(w, fontSize) + spaceWidth;
          }
        } else {
           // Left-align the line if it has only one word or is the last line
           page.drawText(line, { x, y: currentY, font, size: fontSize, color });
        }
        currentY -= options.lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    // Draw the last line of the paragraph (left-aligned)
    page.drawText(line, { x, y: currentY, font, size: fontSize, color });
    currentY -= options.lineHeight;
  }
  return currentY; // Return the new Y position
}


export async function generateContractPdf(employee: Employee, startDate: Date, endDate: Date): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(F4_SIZE);
  const { width, height } = page.getSize();

  // Embed fonts
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const margin = 50;
  
  // --- HEADER ---
  const headerText = 'PERJANJIAN KERJA';
  const headerTextWidth = timesRomanBoldFont.widthOfTextAtSize(headerText, 14);
  page.drawText(headerText, {
    x: (width - headerTextWidth) / 2,
    y: height - margin,
    font: timesRomanBoldFont,
    size: 14,
  });

  const subHeaderText = `Nomor: ${employee.contractNumber}`;
  const subHeaderTextWidth = timesRomanFont.widthOfTextAtSize(subHeaderText, 12);
  page.drawText(subHeaderText, {
    x: (width - subHeaderTextWidth) / 2,
    y: height - margin - 20,
    font: timesRomanFont,
    size: 12,
  });
  
  // Draw a line separator
  page.drawLine({
    start: { x: margin, y: height - margin - 30 },
    end: { x: width - margin, y: height - margin - 30 },
    thickness: 1.5,
  })


  let currentY = height - margin - 60;
  
  // --- Opening statement ---
  const openingText = `Pada hari ini, ${format(startDate, "eeee, dd MMMM yyyy", { locale: id })}, yang bertanda tangan di bawah ini:`;
  currentY = await drawJustifiedText(page, openingText, margin, currentY, {
    font: timesRomanFont,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: width - margin * 2,
  });
  currentY -= 20;

  // --- Parties Involved (PIHAK KESATU & PIHAK KEDUA) ---
  // This section would have details of the employer and employee
  // Placeholder for brevity
  const pihakPertama = `I. Nama Instansi\nJabatan\nAlamat\n\nDalam hal ini bertindak untuk dan atas nama Pemerintah Kabupaten, selanjutnya disebut PIHAK PERTAMA.`;
  page.drawText(pihakPertama, { x: margin, y: currentY, font: timesRomanFont, size: 12, lineHeight: 15});
  currentY -= 100;

  const pihakKedua = `II. Nama: ${employee.fullName}\nNI PPPK: ${employee.niPppk}\nTempat, Tanggal Lahir: ${employee.birthPlace}, ${format(parseISO(employee.birthDate), "dd MMMM yyyy", {locale: id})}\nAlamat: ${employee.address}\n\nDalam hal ini bertindak untuk dan atas nama diri sendiri, selanjutnya disebut PIHAK KEDUA.`;
  page.drawText(pihakKedua, { x: margin, y: currentY, font: timesRomanFont, size: 12, lineHeight: 15});
  currentY -= 150;

  // --- PASAL 1 (MASA PERJANJIAN KERJA) ---
  page.drawText('PASAL 1', {
    x: (width - timesRomanBoldFont.widthOfTextAtSize('PASAL 1', 14))/2,
    y: currentY,
    font: timesRomanBoldFont,
    size: 14,
  });
  currentY -= 20;
  
  const pasal1Text = `Masa Perjanjian Kerja adalah selama ${employee.contractType === 'PENUH_WAKTU' ? '5 (lima)' : '1 (satu)'} tahun, terhitung mulai tanggal ${format(startDate, 'dd MMMM yyyy', {locale:id})} sampai dengan tanggal ${format(endDate, 'dd MMMM yyyy', {locale:id})}.`;
  currentY = await drawJustifiedText(page, pasal1Text, margin, currentY, {
    font: timesRomanFont,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: width - margin * 2
  });
  currentY -= 20;


  // --- PASAL 6 (GAJI) ---
  page.drawText('PASAL 6', {
    x: (width - timesRomanBoldFont.widthOfTextAtSize('PASAL 6', 14))/2,
    y: currentY,
    font: timesRomanBoldFont,
    size: 14,
  });
  currentY -= 20;

  const pasal6Text = `PIHAK KEDUA berhak atas gaji sebesar Rp. ${employee.salaryNumeric.toLocaleString('id-ID')},- (${employee.salaryWords}) per bulan.`;
  currentY = await drawJustifiedText(page, pasal6Text, margin, currentY, {
    font: timesRomanFont,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: width - margin * 2
  });
  currentY -= 20;

  // ... other "Pasal" would be rendered here ...


  // --- Placeholder for Signature Page ---
  // The actual signature page is merged later, so we just add a placeholder page.
  const lastPage = pdfDoc.addPage(F4_SIZE);
  lastPage.drawText('Halaman Tanda Tangan', {
      x: margin,
      y: height - margin,
      font: timesRomanBoldFont,
      size: 16
  });
  lastPage.drawText('[Placeholder - Halaman ini akan diganti dengan TTD basah]', {
      x: margin,
      y: height / 2,
      font: timesRomanFont,
      size: 12
  });

  return pdfDoc.save();
}

export async function mergePdfWithSignature(
  mainPdfBytes: Uint8Array,
  signaturePdfBytes: Uint8Array
): Promise<Uint8Array> {
  // Load the main contract document
  const mainDoc = await PDFDocument.load(mainPdfBytes);

  // Load the signature document
  const signatureDoc = await PDFDocument.load(signaturePdfBytes);
  
  // Get the first page of the signature PDF
  const [signaturePage] = await mainDoc.copyPages(signatureDoc, [0]);

  // Remove the last page (placeholder) from the main document
  const pageCount = mainDoc.getPageCount();
  if (pageCount > 0) {
    mainDoc.removePage(pageCount - 1);
  }

  // Add the signature page to the main document
  mainDoc.addPage(signaturePage);

  // Save the merged document
  return mainDoc.save();
}
