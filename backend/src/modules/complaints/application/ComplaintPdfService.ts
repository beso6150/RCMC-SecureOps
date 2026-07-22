import { buildTextPdf } from '../../../shared/utils/minimalPdf.js';
import { ComplaintWithRelations } from '../domain/types.js';

class ComplaintPdfService {
  generateBuffer(complaint: ComplaintWithRelations): Buffer {
    const lines = [
      `Complaint: ${complaint.title}`,
      `Status: ${complaint.status}`,
      `Submitted: ${complaint.createdAt.toISOString()}`,
      `Submitter: ${complaint.submitter?.fullName ?? 'N/A'}`,
      `Reviewer: ${complaint.reviewer?.fullName ?? 'N/A'}`,
      `Reviewed At: ${complaint.reviewedAt?.toISOString() ?? 'N/A'}`,
      `Location: ${complaint.location?.nameEn ?? 'N/A'}`,
      `Description: ${complaint.description.slice(0, 500)}`,
      ...(complaint.reviewNotes ? [`Review Notes: ${complaint.reviewNotes.slice(0, 300)}`] : []),
    ];
    return buildTextPdf(lines);
  }
}

export const complaintPdfService = new ComplaintPdfService();
