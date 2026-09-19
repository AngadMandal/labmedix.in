import { AuditService } from './auditService';

export class PrintService {
  /**
   * Directly prints CR80 PVC Cards in an isolated clean window with exact card dimensions
   */
  public static printCR80Card(frontElement: HTMLElement, backElement?: HTMLElement | null, title = 'LABMEDIX CR80 PVC Card'): void {
    try {
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (!printWindow) {
        window.print();
        return;
      }

      const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const frontHtml = frontElement.outerHTML;
      const backHtml = backElement ? backElement.outerHTML : '';

      const safeTitle = title.replace(/[<>]/g, '');

      const htmlContent = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${safeTitle}</title>
          ${styleElements}
          <style>
            @page {
              size: 85.60mm 53.98mm;
              margin: 0;
            }
            html, body {
              width: 85.60mm;
              height: 53.98mm;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body { display: block !important; }
            .cr80-print-page {
              width: 85.60mm !important;
              height: 53.98mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              page-break-after: always !important;
              break-after: page !important;
              box-sizing: border-box !important;
            }
            .cr80-print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            #cr80-front, #cr80-back, #card-export-front, #card-export-back {
              width: 85.60mm !important;
              height: 53.98mm !important;
              max-width: none !important;
              max-height: none !important;
              min-width: 0 !important;
              min-height: 0 !important;
              transform: none !important;
              transform-origin: top left !important;
              margin: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
            }
            img { max-width: 100%; }
          </style>
        </head>
        <body>
          <div class="cr80-print-page">${frontHtml}</div>
          ${backHtml ? `<div class="cr80-print-page">${backHtml}</div>` : ''}
          <script>
            (async function () {
              try {
                if (document.fonts && document.fonts.ready) await document.fonts.ready;
                const images = Array.from(document.images);
                await Promise.all(images.map(function (img) {
                  if (img.complete) return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
                  return new Promise(function (resolve) {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                  });
                }));
                await new Promise(function (resolve) {
                  requestAnimationFrame(function () {
                    requestAnimationFrame(resolve);
                  });
                });
              } catch (e) {
                console.error('CR80 print preparation failed', e);
              }
              window.focus();
              window.print();
              setTimeout(function () {
                try { window.close(); } catch (_) {}
              }, 1500);
            })();
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      AuditService.log('CARD_PRINTED', 'card', `Opened CR80 print dialog: ${title}`);
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

  /**
   * Directly prints an official Universal LABMEDIX A4 Half-Page Tax Invoice in an isolated clean window.
   * Guarantees strict A4 portrait scaling, zero unwanted blank pages, and exact screen preview parity.
   */
  public static printUniversalA4HalfPage(
    invoiceElement: HTMLElement,
    title = 'LABMEDIX Official Tax Invoice'
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

      const invoiceHtml = invoiceElement.outerHTML;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          ${styleElements}
          <style>
            @page {
              size: A4 portrait;
              margin: 4mm 6mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              overflow: hidden !important;
            }
            .a4-sheet-container {
              width: 100% !important;
              max-width: 200mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
            .universal-half-page-bill {
              border: none !important;
              box-shadow: none !important;
              margin: 0 auto !important;
              padding: 6px 10px !important;
              width: 100% !important;
              max-width: 200mm !important;
              page-break-inside: avoid !important;
              box-sizing: border-box !important;
            }
            @media print {
              .no-print, .print\\:hidden {
                display: none !important;
              }
              body * {
                visibility: visible !important;
              }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 200mm; margin: 0 auto; box-sizing: border-box;">
            ${invoiceHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 350);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      AuditService.log('BILL_PRINTED', 'billing', `Printed Universal Half-Page Invoice: ${title}`);
    } catch (err) {
      console.error('Error in printUniversalA4HalfPage:', err);
      window.print();
    }
  }

  /**
   * Prints an Official Hospital OPD Appointment Token Slip in an isolated, high-contrast window.
   * Supports standard Hospital Thermal POS (80mm) and A4 Slip formats with zero dark theme artifacts.
   */
  public static printOpdTokenSlip(
    tokenElement: HTMLElement,
    title = 'LABMEDIX OPD Appointment Token',
    format: 'thermal_80mm' | 'slip_a4' = 'thermal_80mm'
  ): void {
    try {
      const printWindow = window.open('', '_blank', 'width=520,height=750');
      if (!printWindow) {
        window.print();
        return;
      }

      const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const tokenHtml = tokenElement.outerHTML;

      const pageStyle = format === 'thermal_80mm'
        ? `
          @page {
            size: 80mm auto;
            margin: 2mm 3mm;
          }
          body {
            width: 74mm !important;
            max-width: 74mm !important;
            margin: 0 auto !important;
            padding: 2mm !important;
            font-size: 11px !important;
          }
          .token-container {
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
        `
        : `
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            width: 100% !important;
            max-width: 130mm !important;
            margin: 0 auto !important;
            padding: 6mm !important;
            font-size: 12px !important;
          }
          .token-container {
            width: 100% !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
          }
        `;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          ${styleElements}
          <style>
            ${pageStyle}
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @media print {
              .no-print, .print\\:hidden {
                display: none !important;
              }
              body * {
                visibility: visible !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="token-container">
            ${tokenHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      AuditService.log('TOKEN_PRINTED', 'clinical', `Printed OPD Appointment Token: ${title}`);
    } catch (err) {
      console.error('Error in printOpdTokenSlip:', err);
      window.print();
    }
  }
}