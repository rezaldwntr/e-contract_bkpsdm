import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { Employee, ContractTemplate } from './types';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { replacePlaceholders } from './variable-replacer';

// F4 paper size in points (1 point = 1/72 inch)
// 215mm x 330mm = 8.46 x 12.99 inches
const F4_SIZE: [number, number] = [610, 936];
const MARGIN = 50;

interface TextOptions {
  font: PDFFont;
  fontSize: number;
  lineHeight: number;
  color?: ReturnType<typeof rgb>;
  maxWidth?: number;
}

interface PdfGeneratorState {
  pdfDoc: PDFDocument;
  currentPage: PDFPage;
  currentY: number;
  timesRomanFont: PDFFont;
  timesRomanBoldFont: PDFFont;
  pageWidth: number;
  pageHeight: number;
}

// Helper to add a new page and reset Y position
function addNewPage(state: PdfGeneratorState): void {
  state.currentPage = state.pdfDoc.addPage(F4_SIZE);
  state.currentY = state.pageHeight - MARGIN;
}

// Helper to check if a new page is needed before drawing content
function checkPageBreak(state: PdfGeneratorState, requiredHeight: number): void {
  if (state.currentY - requiredHeight < MARGIN) {
    addNewPage(state);
  }
}

// Advanced function to draw justified text that handles page breaks
async function drawJustifiedText(
  state: PdfGeneratorState,
  text: string,
  options: TextOptions
) {
  const { font, fontSize, color = rgb(0, 0, 0), maxWidth } = options;
  if (!maxWidth) throw new Error('maxWidth is required for justified text.');

  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';

    // Check if whole paragraph needs a new page. A bit naive but prevents awkward single-line splits.
    const estimatedParaHeight = Math.ceil(font.widthOfTextAtSize(paragraph, fontSize) / maxWidth) * options.lineHeight;
    checkPageBreak(state, estimatedParaHeight);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = line + (line ? ' ' : '') + word;
      const lineWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (lineWidth > maxWidth && line) {
        checkPageBreak(state, options.lineHeight); // Check before drawing a line

        const wordsInLine = line.split(' ');
        const isLastLineOfParagraph = i === words.length;

        if (wordsInLine.length > 1 && !isLastLineOfParagraph) {
          const textWidth = font.widthOfTextAtSize(line.replace(/\s/g, ''), fontSize);
          const totalSpacing = maxWidth - textWidth;
          const spaceWidth = totalSpacing / (wordsInLine.length - 1);
          let currentX = MARGIN;
          for (const w of wordsInLine) {
            state.currentPage.drawText(w, { x: currentX, y: state.currentY, font, size: fontSize, color });
            currentX += font.widthOfTextAtSize(w, fontSize) + spaceWidth;
          }
        } else {
           state.currentPage.drawText(line, { x: MARGIN, y: state.currentY, font, size: fontSize, color });
        }
        state.currentY -= options.lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    // Draw the last line of the paragraph (left-aligned)
    checkPageBreak(state, options.lineHeight);
    state.currentPage.drawText(line, { x: MARGIN, y: state.currentY, font, size: fontSize, color });
    state.currentY -= options.lineHeight;
  }
}


export async function generateContractPdf(
    employee: Employee, 
    template: ContractTemplate,
    startDate: Date, 
    endDate: Date
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(F4_SIZE);
  const { width, height } = page.getSize();

  const state: PdfGeneratorState = {
    pdfDoc,
    currentPage: page,
    currentY: height - MARGIN,
    timesRomanFont: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    timesRomanBoldFont: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    pageWidth: width,
    pageHeight: height,
  };

  const dates = { startDate, endDate };

  // --- HEADER ---
  const headerText = replacePlaceholders(template.headerTitle, employee, dates);
  const headerTextWidth = state.timesRomanBoldFont.widthOfTextAtSize(headerText, 14);
  checkPageBreak(state, 50);
  state.currentPage.drawText(headerText, {
    x: (width - headerTextWidth) / 2,
    y: state.currentY,
    font: state.timesRomanBoldFont,
    size: 14,
  });
  state.currentY -= 20;

  const subHeaderText = replacePlaceholders(`Nomor: ${employee.contractNumber}`, employee, dates);
  const subHeaderTextWidth = state.timesRomanFont.widthOfTextAtSize(subHeaderText, 12);
  state.currentPage.drawText(subHeaderText, {
    x: (width - subHeaderTextWidth) / 2,
    y: state.currentY,
    font: state.timesRomanFont,
    size: 12,
  });
  state.currentY -= 10;
  
  state.currentPage.drawLine({
    start: { x: MARGIN, y: state.currentY },
    end: { x: width - MARGIN, y: state.currentY },
    thickness: 1.5,
  });
  state.currentY -= 30;

  // --- Opening statement ---
  if (template.openingText) {
    const openingText = replacePlaceholders(template.openingText, employee, dates);
    await drawJustifiedText(state, openingText, {
        font: state.timesRomanFont,
        fontSize: 12,
        lineHeight: 18,
        maxWidth: width - MARGIN * 2,
    });
    state.currentY -= 20;
  }

  // --- ARTICLES ---
  for (const article of template.articles) {
    checkPageBreak(state, 60); // Estimate space for title + subtitle + some content

    const articleTitle = replacePlaceholders(article.title, employee, dates);
    const titleWidth = state.timesRomanBoldFont.widthOfTextAtSize(articleTitle, 12);
    state.currentPage.drawText(articleTitle, {
        x: (width - titleWidth) / 2,
        y: state.currentY,
        font: state.timesRomanBoldFont,
        size: 12,
    });
    state.currentY -= 18;

    const articleSubtitle = replacePlaceholders(article.subtitle, employee, dates);
    const subtitleWidth = state.timesRomanBoldFont.widthOfTextAtSize(articleSubtitle, 12);
     state.currentPage.drawText(articleSubtitle, {
        x: (width - subtitleWidth) / 2,
        y: state.currentY,
        font: state.timesRomanBoldFont,
        size: 12,
    });
    state.currentY -= 25;

    const articleContent = replacePlaceholders(article.content, employee, dates);
    await drawJustifiedText(state, articleContent, {
        font: state.timesRomanFont,
        fontSize: 12,
        lineHeight: 18,
        maxWidth: width - MARGIN * 2,
    });
    state.currentY -= 20; // Space after article
  }

  // --- Closing Text ---
  if (template.closingText) {
    const closingText = replacePlaceholders(template.closingText, employee, dates);
     await drawJustifiedText(state, closingText, {
        font: state.timesRomanFont,
        fontSize: 12,
        lineHeight: 18,
        maxWidth: width - MARGIN * 2,
    });
    state.currentY -= 20;
  }
  
  // --- Placeholder for Signature Page ---
  const lastPage = pdfDoc.addPage(F4_SIZE);
  lastPage.drawText('Halaman Tanda Tangan', {
      x: MARGIN,
      y: height - MARGIN,
      font: state.timesRomanBoldFont,
      size: 16
  });
  lastPage.drawText('[Placeholder - Halaman ini akan diganti dengan TTD basah]', {
      x: MARGIN,
      y: height / 2,
      font: state.timesRomanFont,
      size: 12
  });

  return pdfDoc.save();
}

export async function mergePdfWithSignature(
  mainPdfBytes: Uint8Array,
  signaturePdfBytes: Uint8Array
): Promise<Uint8Array> {
  const mainDoc = await PDFDocument.load(mainPdfBytes);
  const signatureDoc = await PDFDocument.load(signaturePdfBytes);
  const [signaturePage] = await mainDoc.copyPages(signatureDoc, [0]);
  const pageCount = mainDoc.getPageCount();
  if (pageCount > 0) {
    mainDoc.removePage(pageCount - 1);
  }
  mainDoc.addPage(signaturePage);
  return mainDoc.save();
}
