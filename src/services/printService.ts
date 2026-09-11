import { AuditService } from './auditService';

export class PrintService {
  /**
   * Directly prints CR80 PVC Cards in an isolated clean window with exact card dimensions
   */
  public static printCR80Card(frontElement: HTMLElement, backElement?: HTMLElement | null, title = 'LABMEDIX CR80 PVC Card'): void {
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        window.print();
        return;
      }

      // Collect styles from main document
      const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const frontHtml = frontElement.outerHTML;
      const backHtml = backElement ? backElement.outerHTML : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          ${styleElements}
          <style>
            @page {
              size: 85.60mm 53.98mm landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .card-page {
              width: 500px;
              height: 315px;
              page-break-after: always;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: auto;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .card-page:last-child {
              page-break-after: avoid;
            }
            /* Remove shadows or scale on print */
            #cr80-front, #cr80-back, #card-export-front, #card-export-back {
              transform: none !important;
              box-shadow: none !important;
              margin: 0 !important;
            }
          </style>
        </head>
        <body>
          <div class="card-page">
            ${frontHtml}
          </div>
          ${backHtml ? `<div class="card-page">${backHtml}</div>` : ''}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      AuditService.log('CARD_PRINTED', 'card', `Printed CR80 Card: ${title}`);
    } catch (err) {
      console.error('Error in printCR80Card:', err);
      window.print();
    }
  }

  /**
   * Directly prints A4 Multi-Card Sheets in an isolated clean window
   */
  public static printA4Sheet(sheetElement: HTMLElement, title = 'LABMEDIX A4 Print Sheet'): void {
    try {
      const printWindow = window.open('', '_blank', 'width=1000,height=900');
      if (!printWindow) {
        window.print();
        return;
      }

      const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const sheetHtml = sheetElement.outerHTML;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          ${styleElements}
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              display: flex;
              align-items: center;
              justify-content: center;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #a4-sheet-container {
              box-shadow: none !important;
              margin: 0 auto !important;
              width: 210mm !important;
              min-height: 297mm !important;
            }
          </style>
        </head>
        <body>
          ${sheetHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      AuditService.log('CARD_PRINTED', 'card', `Printed A4 Sheet: ${title}`);
    } catch (err) {
      console.error('Error in printA4Sheet:', err);
      window.print();
    }
  }

  /**
   * Directly prints Staff ID Badges (CR80 Portrait 54mm x 85.6mm) in clean isolated printer window
   */
  public static printStaffBadge(frontElement: HTMLElement, backElement?: HTMLElement | null, title = 'LABMEDIX Staff ID Pass'): void {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (!printWindow) {
        window.print();
        return;
      }

      const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const frontHtml = frontElement.outerHTML;
      const backHtml = backElement ? backElement.outerHTML : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          ${styleElements}
          <style>
            @page {
              size: 54mm 85.6mm portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .staff-page {
              width: 340px;
              height: 535px;
              page-break-after: always;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: auto;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .staff-page:last-child {
              page-break-after: avoid;
            }
            [id^="staff-modal-card"], [id^="staff-card"] {
              transform: none !important;
              box-shadow: none !important;
              margin: 0 !important;
            }
          </style>
        </head>
        <body>
          <div class="staff-page">
            ${frontHtml}
          </div>
          ${backHtml ? `<div class="staff-page">${backHtml}</div>` : ''}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      AuditService.log('CARD_PRINTED', 'card', `Printed Staff Pass: ${title}`);
    } catch (err) {
      console.error('Error in printStaffBadge:', err);
      window.print();
    }
  }

  public static printElement(elementId: string, title = 'LABMEDIX Print'): void {
    const el = document.getElementById(elementId);
    if (!el) {
      window.print();
      return;
    }
    this.printA4Sheet(el, title);
  }

  /**
   * Directly prints an official Pharmacy A4 Half-Page Bill in a clean isolated print window.
   * Ensures fixed half-page dimensions (portrait A4, top half ~140mm height) and prevents stretching.
   */
  public static printPharmacyA4HalfPageBill(
    billElement: HTMLElement,
    title = 'LABMEDIX Retail Pharmacy Tax Invoice'
  ): void {
    try {
      const printWindow = window.open('', '_blank', 'width=950,height=800');
      if (!printWindow) {
        window.print();
        return;
      }

      const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const billHtml = billElement.outerHTML;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          ${styleElements}
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .pharmacy-a4-half-page-container {
              width: 100% !important;
              max-width: 194mm !important;
              margin: 0 auto !important;
              background: #ffffff !important;
              color: #0f172a !important;
            }
            @media print {
              .no-print, .print\\:hidden {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="pharmacy-a4-half-page-container">
            ${billHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      AuditService.log('PHARMACY_BILL_PRINTED', 'pharmacy', `Printed A4 Half-Page Bill: ${title}`);
    } catch (err) {
      console.error('Error in printPharmacyA4HalfPageBill:', err);
      window.print();
    }
  }
}