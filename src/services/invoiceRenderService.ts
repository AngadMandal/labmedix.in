import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { StandardBillData } from '../components/billing/StandardHalfPageBill';

export class InvoiceRenderService {
  /**
   * Generates and downloads an official A4 Half-Page PDF from an element ID or HTMLElement
   */
  public static async downloadHalfPagePdf(elementOrId: string | HTMLElement, billNumber: string): Promise<boolean> {
    const container = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!container) {
      console.warn('[InvoiceRender] Container element not found for PDF download:', elementOrId);
      return false;
    }

    try {
      const canvas = await html2canvas(container, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions: 210mm x 297mm
      // Half-Page target: 200mm width, top-aligned (approx 138-146mm height)
      const imgWidth = 200;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 5, 5, imgWidth, Math.min(287, imgHeight));
      pdf.save(`LABMEDIX_Invoice_${billNumber || 'Slip'}.pdf`);
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

