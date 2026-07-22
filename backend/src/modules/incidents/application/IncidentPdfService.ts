import fs from 'node:fs/promises';
import path from 'node:path';
import { IncidentWithRelations } from '../domain/types.js';

const uploadsRoot = path.join(process.cwd(), 'uploads', 'incidents');

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return 'N/A';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function buildPdfContent(incident: IncidentWithRelations): string {
  const lines = [
    `Incident Report: ${incident.title}`,
    `Status: ${incident.status}`,
    `Severity: ${incident.severity}`,
    `Type: ${incident.type.nameEn}`,
    `Occurred At: ${incident.occurredAt.toISOString()}`,
    `Started At: ${incident.startedAt?.toISOString() ?? 'N/A'}`,
    `Closed At: ${incident.closedAt?.toISOString() ?? 'N/A'}`,
    `Duration: ${formatDuration(incident.durationMs)}`,
    `Reporter: ${incident.reporter?.fullName ?? 'N/A'}`,
    `Assignee: ${incident.assignee?.fullName ?? 'N/A'}`,
    `Description: ${incident.description.slice(0, 500)}`,
  ];

  let y = 750;
  const textOps = lines
    .map((line) => {
      const op = `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
      y -= 18;
      return op;
    })
    .join('\n');

  return textOps;
}

function buildPdfDocument(contentStream: string): Buffer {
  const stream = `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream\nendobj`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    stream + '\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

class IncidentPdfService {
  async generate(incident: IncidentWithRelations): Promise<string> {
    await fs.mkdir(uploadsRoot, { recursive: true });

    const fileName = `${incident.id}.pdf`;
    const absolutePath = path.join(uploadsRoot, fileName);
    const contentStream = buildPdfContent(incident);
    const pdfBuffer = buildPdfDocument(contentStream);

    await fs.writeFile(absolutePath, pdfBuffer);

    return `incidents/${fileName}`;
  }

  getAbsolutePath(relativePath: string): string {
    return path.join(process.cwd(), 'uploads', relativePath);
  }
}

export const incidentPdfService = new IncidentPdfService();
