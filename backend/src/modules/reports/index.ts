import { Router } from 'express';
import reportsRoutes from './presentation/reports.routes.js';

export const reportsRouter = Router();
reportsRouter.use('/reports', reportsRoutes);

export { reportService } from './application/ReportService.js';
export { kpiService } from './application/KpiService.js';
export { reportGenerationService } from './application/ReportGenerationService.js';
export { reportApprovalService } from './application/ReportApprovalService.js';
export { reportScheduleService } from './application/ReportScheduleService.js';
export { customReportService } from './application/CustomReportService.js';
export { csvExportService } from './application/CsvExportService.js';
export { pdfExportService } from './application/PdfExportService.js';
