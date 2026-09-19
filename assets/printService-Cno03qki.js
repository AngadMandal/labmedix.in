import{d as m}from"./index-DpzL36cf.js";class f{static printCR80Card(i,o,t="LABMEDIX CR80 PVC Card"){try{const n=window.open("","_blank","width=1000,height=800");if(!n){window.print();return}const r=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(l=>l.outerHTML).join(`
`),a=i.outerHTML,e=o?o.outerHTML:"",d=`
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${t.replace(/[<>]/g,"")}</title>
          ${r}
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
          <div class="cr80-print-page">${a}</div>
          ${e?`<div class="cr80-print-page">${e}</div>`:""}
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
          <\/script>
        </body>
        </html>
      `;n.document.open(),n.document.write(d),n.document.close(),m.log("CARD_PRINTED","card",`Opened CR80 print dialog: ${t}`)}catch(n){console.error("Error in printCR80Card:",n),window.print()}}static printA4Sheet(i,o="LABMEDIX A4 Print Sheet"){try{const t=window.open("","_blank","width=1000,height=900");if(!t){window.print();return}const n=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(e=>e.outerHTML).join(`
`),r=i.outerHTML,a=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${o}</title>
          ${n}
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
          ${r}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          <\/script>
        </body>
        </html>
      `;t.document.open(),t.document.write(a),t.document.close(),m.log("CARD_PRINTED","card",`Printed A4 Sheet: ${o}`)}catch(t){console.error("Error in printA4Sheet:",t),window.print()}}static printStaffBadge(i,o,t="LABMEDIX Staff ID Pass"){try{const n=window.open("","_blank","width=800,height=900");if(!n){window.print();return}const r=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(d=>d.outerHTML).join(`
`),a=i.outerHTML,e=o?o.outerHTML:"",p=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${t}</title>
          ${r}
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
            ${a}
          </div>
          ${e?`<div class="staff-page">${e}</div>`:""}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          <\/script>
        </body>
        </html>
      `;n.document.open(),n.document.write(p),n.document.close(),m.log("CARD_PRINTED","card",`Printed Staff Pass: ${t}`)}catch(n){console.error("Error in printStaffBadge:",n),window.print()}}static printElement(i,o="LABMEDIX Print"){const t=document.getElementById(i);if(!t){window.print();return}this.printA4Sheet(t,o)}static printPharmacyA4HalfPageBill(i,o="LABMEDIX Retail Pharmacy Tax Invoice"){try{const t=window.open("","_blank","width=950,height=800");if(!t){window.print();return}const n=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(e=>e.outerHTML).join(`
`),r=i.outerHTML,a=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${o}</title>
          ${n}
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
            ${r}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          <\/script>
        </body>
        </html>
      `;t.document.open(),t.document.write(a),t.document.close(),m.log("PHARMACY_BILL_PRINTED","pharmacy",`Printed A4 Half-Page Bill: ${o}`)}catch(t){console.error("Error in printPharmacyA4HalfPageBill:",t),window.print()}}static printUniversalA4HalfPage(i,o="LABMEDIX Official Tax Invoice"){try{const t=window.open("","_blank","width=950,height=800");if(!t){window.print();return}const n=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(e=>e.outerHTML).join(`
`),r=i.outerHTML,a=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${o}</title>
          ${n}
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
            ${r}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 350);
            };
          <\/script>
        </body>
        </html>
      `;t.document.open(),t.document.write(a),t.document.close(),m.log("BILL_PRINTED","billing",`Printed Universal Half-Page Invoice: ${o}`)}catch(t){console.error("Error in printUniversalA4HalfPage:",t),window.print()}}static printOpdTokenSlip(i,o="LABMEDIX OPD Appointment Token",t="thermal_80mm"){try{const n=window.open("","_blank","width=520,height=750");if(!n){window.print();return}const r=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(d=>d.outerHTML).join(`
`),a=i.outerHTML,p=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${o}</title>
          ${r}
          <style>
            ${t==="thermal_80mm"?`
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
        `:`
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
        `}
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
            ${a}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 300);
            };
          <\/script>
        </body>
        </html>
      `;n.document.open(),n.document.write(p),n.document.close(),m.log("TOKEN_PRINTED","clinical",`Printed OPD Appointment Token: ${o}`)}catch(n){console.error("Error in printOpdTokenSlip:",n),window.print()}}}export{f as P};
