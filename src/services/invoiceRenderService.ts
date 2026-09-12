import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { StandardBillData } from '../components/billing/StandardHalfPageBill';

export class InvoiceRenderService {
  /**
   * Generates and downloads an official A4 Half-Page PDF
   */
  public static async downloadHalfPagePdf(elementId: string, billNumber: string): Promise<boolean> {
    const container = document.getElementById(elementId);
    if (!container) {
      console.warn('[InvoiceRender] Container element not found for PDF download:', elementId);
      return false;
    }

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions: 210mm x 297mm
      // Half-Page target: 210mm width x ~145mm height
      const imgWidth = 200; // margins on 210mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
      pdf.save(`LabMedix_Invoice_${billNumber || 'Slip'}.pdf`);
      return true;
    } catch (err) {
      console.error('[InvoiceRender] Error rendering PDF:', err);
      return false;
    }
  }

  /**
   * Trigger clean print
   */
  public static printInvoice(): void {
    window.print();
  }
}
