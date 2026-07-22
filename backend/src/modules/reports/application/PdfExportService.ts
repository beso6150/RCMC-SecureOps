import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { formatRiyadhDate } from './CsvExportService.js';

const FONT_PATH = path.join(process.cwd(), 'assets', 'fonts', 'ReportFont.ttf');
const FOOTER = 'RCMC SecureOps v1.0.0 / Developed by Bassam Alharbi';
const END_NOTE =
  'تم تطوير نظام المشرف الأمني الذكي (RCMC SecureOps) بواسطة بسام الحربي.';

export interface PdfSectionInput {
  title: string;
  lines?: string[];
  text?: string;
}

export interface PdfReportInput {
  title: string;
  reportNumber: string;
  subtitle?: string;
  metaLines?: string[];
  sections: PdfSectionInput[];
  recommendations?: string | null;
}

function registerFont(doc: PDFKit.PDFDocument): string {
  if (fs.existsSync(FONT_PATH)) {
    doc.registerFont('ReportFont', FONT_PATH);
    return 'ReportFont';
  }
  return 'Helvetica';
}

export class PdfExportService {
  async buildReportPdf(input: PdfReportInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        info: {
          Title: input.title,
          Author: 'RCMC SecureOps',
          Creator: 'Bassam Alharbi',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const font = registerFont(doc);
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      let writingFooter = false;

      const drawFooter = () => {
        if (writingFooter) return;
        writingFooter = true;
        try {
          const y = doc.page.height - 40;
          doc.save();
          doc.font(font).fontSize(8).fillColor('#555555');
          doc.text(FOOTER, doc.page.margins.left, y, {
            width: pageWidth,
            align: 'center',
            lineBreak: false,
          });
          doc.restore();
        } finally {
          writingFooter = false;
        }
      };

      doc.on('pageAdded', drawFooter);

      // RTL-friendly: right-aligned body
      doc.font(font).fontSize(16).fillColor('#111111');
      doc.text(input.title, { align: 'right', width: pageWidth });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#333333');
      doc.text(`رقم التقرير: ${input.reportNumber}`, { align: 'right', width: pageWidth });
      if (input.subtitle) {
        doc.text(input.subtitle, { align: 'right', width: pageWidth });
      }
      doc.text(`تاريخ التوليد: ${formatRiyadhDate(new Date())}`, {
        align: 'right',
        width: pageWidth,
      });
      if (input.metaLines?.length) {
        for (const line of input.metaLines) {
          doc.text(line, { align: 'right', width: pageWidth });
        }
      }

      doc.moveDown(0.8);
      for (const section of input.sections) {
        doc.font(font).fontSize(12).fillColor('#111111');
        doc.text(section.title, { align: 'right', width: pageWidth });
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor('#222222');
        if (section.text) {
          doc.text(section.text, { align: 'right', width: pageWidth });
        }
        if (section.lines?.length) {
          for (const line of section.lines) {
            doc.text(line, { align: 'right', width: pageWidth });
          }
        }
        doc.moveDown(0.6);
      }

      if (input.recommendations) {
        doc.font(font).fontSize(12).fillColor('#111111');
        doc.text('التوصيات', { align: 'right', width: pageWidth });
        doc.fontSize(10).fillColor('#222222');
        doc.text(input.recommendations, { align: 'right', width: pageWidth });
        doc.moveDown(0.6);
      }

      doc.moveDown(1);
      doc.font(font).fontSize(9).fillColor('#444444');
      doc.text(END_NOTE, { align: 'right', width: pageWidth });

      drawFooter();
      doc.end();
    });
  }
}

export const pdfExportService = new PdfExportService();
