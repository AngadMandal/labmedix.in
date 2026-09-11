import{d as c}from"./index-BDB6X0VD.js";class p{static printCR80Card(o,e,t="LABMEDIX CR80 PVC Card"){try{const n=window.open("","_blank","width=900,height=700");if(!n){window.print();return}const i=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(l=>l.outerHTML).join(`
`),a=o.outerHTML,r=e?e.outerHTML:"",d=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${t}</title>
          ${i}
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
            ${a}
          </div>
          ${r?`<div class="card-page">${r}</div>`:""}
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
      `;n.document.open(),n.document.write(d),n.document.close(),c.log("CARD_PRINTED","card",`Printed CR80 Card: ${t}`)}catch(n){console.error("Error in printCR80Card:",n),window.print()}}static printA4Sheet(o,e="LABMEDIX A4 Print Sheet"){try{const t=window.open("","_blank","width=1000,height=900");if(!t){window.print();return}const n=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(r=>r.outerHTML).join(`
`),i=o.outerHTML,a=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${e}</title>
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
          ${i}
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
      `;t.document.open(),t.document.write(a),t.document.close(),c.log("CARD_PRINTED","card",`Printed A4 Sheet: ${e}`)}catch(t){console.error("Error in printA4Sheet:",t),window.print()}}static printStaffBadge(o,e,t="LABMEDIX Staff ID Pass"){try{const n=window.open("","_blank","width=800,height=900");if(!n){window.print();return}const i=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(l=>l.outerHTML).join(`
`),a=o.outerHTML,r=e?e.outerHTML:"",d=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${t}</title>
          ${i}
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
          ${r?`<div class="staff-page">${r}</div>`:""}
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
      `;n.document.open(),n.document.write(d),n.document.close(),c.log("CARD_PRINTED","card",`Printed Staff Pass: ${t}`)}catch(n){console.error("Error in printStaffBadge:",n),window.print()}}static printElement(o,e="LABMEDIX Print"){const t=document.getElementById(o);if(!t){window.print();return}this.printA4Sheet(t,e)}static printPharmacyA4HalfPageBill(o,e="LABMEDIX Retail Pharmacy Tax Invoice"){try{const t=window.open("","_blank","width=950,height=800");if(!t){window.print();return}const n=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(r=>r.outerHTML).join(`
`),i=o.outerHTML,a=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${e}</title>
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
            ${i}
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
      `;t.document.open(),t.document.write(a),t.document.close(),c.log("PHARMACY_BILL_PRINTED","pharmacy",`Printed A4 Half-Page Bill: ${e}`)}catch(t){console.error("Error in printPharmacyA4HalfPageBill:",t),window.print()}}}export{p as P};
