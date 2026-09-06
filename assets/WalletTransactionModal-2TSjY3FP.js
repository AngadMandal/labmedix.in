import{j as e}from"./vendor-motion-t-KEQA1G.js";import{r as p}from"./vendor-react-iWyn9LBO.js";import{u as $,M as R,e as x,I as P,B as f,S as T,L as F,f as I,W as O,t as k}from"./index-B-a0GgOr.js";import{B}from"./Barcode-DCq9NXeD.js";import{E as U}from"./exportService-CfZFaNz1.js";import{W as z,Z as H,x as G,y as M,I as W,p as _,b2 as Y,F as V,an as X}from"./vendor-icons-ob1DDEQa.js";const te=({isOpen:j,onClose:g,patient:t,wallet:n,onSuccess:b,defaultType:w="credit"})=>{const[l,v]=p.useState(w),[m,u]=p.useState(""),[r,i]=p.useState(""),[c,h]=p.useState(!1),{showToast:d}=$(),y=[500,1e3,2e3,5e3,1e4],C=[{label:"🩺 OPD Specialist Consultation",val:"OPD Doctor Consultation & Clinical Evaluation"},{label:"🔬 Pathology Lab Tests (CBC, Lipid, LFT)",val:"Pathology & Diagnostic Laboratory Investigations"},{label:"🩻 Radiology & Digital Imaging",val:"Radiology Digital X-Ray / USG Sonography"},{label:"💊 Pharmacy Medicines Dispensation",val:"In-House Pharmacy Medicine Prescription Fulfillment"},{label:"🏥 Daycare Ward & Surgery Advance",val:"Daycare Ward Admission & OT Procedural Advance"},{label:"⚡ Emergency Cashless Deposit",val:"24x7 Emergency Prepaid Cashless Top-up"}],A=s=>{u(s.toString())},E=s=>{i(s)},a=s=>{s.preventDefault();const o=parseFloat(m);if(isNaN(o)||o<=0){d("error","Invalid Amount","Please enter a valid positive amount.");return}if(l==="debit"&&o>n.balance){d("error","Insufficient Funds",`Patient only has ${x(n.balance)} available in health wallet.`);return}h(!0);const N=O.addTransaction(t.id,l,o,r||`Wallet ${l.toUpperCase()} - Clinical Health Services`);h(!1),N.error?d("error","Transaction Failed",N.error):(k(),d("success","Transaction Successful",`${l.toUpperCase()} of ${x(o)} settled in health wallet.`),b(N.transaction,N.wallet),g())};return e.jsx(R,{isOpen:j,onClose:g,title:`Health Wallet Command: ${t.fullName}`,maxWidth:"lg",children:e.jsxs("form",{onSubmit:a,className:"space-y-4 text-xs",children:[e.jsxs("div",{className:"p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 text-white border border-teal-500/30 flex items-center justify-between shadow-md",children:[e.jsxs("div",{className:"space-y-0.5",children:[e.jsx("span",{className:"text-[10px] text-teal-300 uppercase font-mono tracking-wider font-bold",children:"Current Available Float"}),e.jsx("div",{className:"text-2xl font-black text-emerald-400 font-mono",children:x(n.balance)}),e.jsxs("p",{className:"text-xs text-slate-300 font-semibold",children:[t.fullName," • ",e.jsx("span",{className:"font-mono text-teal-200",children:t.id})]})]}),e.jsx("div",{className:"p-3 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/40",children:e.jsx(z,{className:"w-6 h-6"})})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("label",{className:"block text-xs font-bold text-slate-700 dark:text-slate-300",children:"Transaction Action Type"}),e.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-2",children:[{id:"credit",label:"💳 Deposit (Add)",active:"bg-emerald-600 text-white border-emerald-600"},{id:"debit",label:"🏥 Bill Deduction",active:"bg-rose-600 text-white border-rose-600"},{id:"refund",label:"↩️ Refund Float",active:"bg-blue-600 text-white border-blue-600"},{id:"adjustment",label:"⚖️ Adjustment",active:"bg-purple-600 text-white border-purple-600"}].map(s=>e.jsx("button",{type:"button",onClick:()=>v(s.id),className:`py-2 px-2.5 rounded-xl font-bold border transition-all text-center ${l===s.id?`${s.active} shadow-sm`:"bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"}`,children:s.label},s.id))})]}),e.jsxs("div",{className:"space-y-1.5 pt-1",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-wider block",children:"⚡ Quick Amount Selector (INR ₹)"}),e.jsx("div",{className:"flex flex-wrap gap-1.5",children:y.map(s=>e.jsxs("button",{type:"button",onClick:()=>A(s),className:`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${m===s.toString()?"bg-teal-600 text-white border-teal-600 shadow-xs":"bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50"}`,children:["+₹",s.toLocaleString()]},s))})]}),e.jsx(P,{label:"Settlement Amount (INR ₹)",type:"number",step:"any",min:"1",placeholder:"e.g. 1500",value:m,onChange:s=>u(s.target.value),required:!0}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-wider block",children:"📋 Purpose & Clinical Service Presets (Reason for Balance Movement)"}),e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-1.5",children:C.map((s,o)=>e.jsx("button",{type:"button",onClick:()=>E(s.val),className:"text-left px-2.5 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors text-[11px] truncate",children:s.label},o))})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1",children:["Reason / Purpose of Transaction ",e.jsx("span",{className:"text-red-500",children:"*"})]}),e.jsx("input",{type:"text",className:"w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 font-semibold",placeholder:"e.g. Cardiology OPD Consult, Pathology CBC, Pharmacy Ref #98762",value:r,onChange:s=>i(s.target.value),required:!0})]}),e.jsxs("div",{className:"flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800",children:[e.jsx(f,{type:"button",variant:"outline",onClick:g,disabled:c,children:"Cancel"}),e.jsxs(f,{type:"submit",variant:l==="credit"?"primary":l==="debit"?"danger":"secondary",isLoading:c,leftIcon:e.jsx(H,{className:"w-4 h-4"}),children:["Confirm ",l.toUpperCase()," (",x(parseFloat(m)||0),")"]})]})]})})},se=({isOpen:j,onClose:g,transaction:t,patient:n})=>{if(!t)return null;const[b,w]=p.useState(()=>{const a=`receipt_print_count_${t.id}`;return parseInt(localStorage.getItem(a)||"0",10)}),l=T.getCompanyProfile(),v=T.getCards(),m=T.getMemberships(),{showToast:u}=$(),r=p.useMemo(()=>t&&v.find(a=>a.patientId===t.patientId&&a.status==="active")||null,[v,t]),i=p.useMemo(()=>r&&m.find(a=>a.id===r.membershipId)||null,[r,m]),c=p.useMemo(()=>{const a=t.notes||"Healthcare Services";let s="HEALTHCARE SERVICE",o=!1;return a.includes("[AUTO-POS]")||a.toLowerCase().includes("consult")||a.toLowerCase().includes("doctor")?(s="OPD & DOCTOR CONSULTATION",o=!0):a.toLowerCase().includes("lab")||a.toLowerCase().includes("cbc")||a.toLowerCase().includes("pathology")||a.toLowerCase().includes("test")?(s="DIAGNOSTIC PATHOLOGY & LAB",o=!0):a.toLowerCase().includes("pharmacy")||a.toLowerCase().includes("medicine")?(s="IN-HOUSE PHARMACY DISPENSATION",o=!0):a.toLowerCase().includes("daycare")||a.toLowerCase().includes("surgery")||a.toLowerCase().includes("ot")?(s="DAYCARE & SURGERY ADVANCE",o=!0):t.type==="credit"?s="PREPAID HEALTH FLOAT RECHARGE":t.type==="refund"&&(s="PATIENT FLOAT REFUND / DISPUTE"),{department:s,fullReason:a.replace("[AUTO-POS]","").trim(),isAutoPos:o}},[t]),h=b>0,d=!!(t.dueAmount&&t.dueAmount>0),y=`SHA256-${t.referenceNo}-${t.amount}-${t.patientId}`.slice(0,24),C=()=>{const a=b+1;w(a),localStorage.setItem(`receipt_print_count_${t.id}`,a.toString())},A=a=>{var D;C();const s=a==="thermal_80mm",o=window.open("","_blank",s?"width=450,height=680":"width=900,height=1000");if(!o){window.print();return}if(!document.getElementById("wallet-receipt-content")){window.print();return}const S=h?`<div style="background:#FEF3C7; border: 1px solid #D97706; padding: 4px; text-align: center; font-weight: bold; color: #92400E; margin-bottom: 6px; font-size: 10px;">⚠️ DUPLICATE REPRINT (Copy #${b+1}) — AUDIT VERIFIED</div>`:'<div style="background:#ECFDF5; border: 1px solid #059669; padding: 4px; text-align: center; font-weight: bold; color: #065F46; margin-bottom: 6px; font-size: 10px;">🔒 ORIGINAL OFFICIAL CASHLESS VOUCHER (Copy #1)</div>',L=d?`<div style="background:#FFF1F2; border: 1px solid #E11D48; padding: 6px; text-align: center; font-weight: bold; color: #9F1239; margin: 6px 0; font-size: 11px;">
           ⚠️ OUTSTANDING DUE: ₹${t.dueAmount} (STATUS: ${((D=t.paymentStatus)==null?void 0:D.toUpperCase())||"PARTIAL DUE"})
         </div>`:"";s?o.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${t.referenceNo}</title>
            <style>
              @page { size: 80mm auto; margin: 4mm; }
              body { font-family: monospace, sans-serif; font-size: 11px; margin: 0; padding: 6px; color: #000; -webkit-print-color-adjust: exact !important; }
              .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
              .reason-box { border: 1px dashed #000; background: #fafafa; padding: 6px; margin: 6px 0; }
              .total { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; font-weight: bold; font-size: 12px; margin: 6px 0; }
              .footer { text-align: center; margin-top: 8px; font-size: 8.5px; }
            </style>
          </head>
          <body>
            ${S}
            <div class="header">
              <h2 style="margin:0; font-size: 14px;">${l.name||"LABMEDIX"}</h2>
              <p style="margin:2px 0; font-size: 10px;">${l.tagline||"Confident In Care"}</p>
              <p style="margin:2px 0; font-size: 8.5px;">Helpline: ${l.helpline||"1800-889-9911"} • ${l.address||"Kolkata"}</p>
            </div>

            <div class="row"><span>Receipt No:</span><strong>${t.referenceNo}</strong></div>
            <div class="row"><span>Date/Time:</span><span>${I(t.date)}</span></div>
            <div class="row"><span>Patient:</span><strong>${(n==null?void 0:n.fullName)||t.patientId}</strong></div>
            <div class="row"><span>Patient ID:</span><span>${t.patientId}</span></div>
            <div class="row"><span>Card UID:</span><span>${(r==null?void 0:r.cardNumber)||"N/A"}</span></div>
            <div class="row"><span>Tier / Plan:</span><strong>${(i==null?void 0:i.name)||"Standard"}</strong></div>

            <!-- REASON FOR BALANCE DEDUCTION / CREDIT -->
            <div class="reason-box">
              <span style="font-size: 9px; text-transform: uppercase; color: #333; font-weight: bold; display: block;">DEPARTMENT / BILLING REASON:</span>
              <strong style="font-size: 11px; display: block; margin-top: 2px;">${c.department}</strong>
              <p style="margin: 3px 0 0 0; font-size: 9.5px;">${c.fullReason}</p>
            </div>

            ${L}

            <div class="row"><span>Opening Float:</span><span>₹${t.openingBalance}</span></div>
            <div class="row"><span>Gross Bill:</span><span>₹${t.grossAmount||t.amount}</span></div>
            <div class="row"><span>Card Savings:</span><span>-₹${t.discountAmount||0}</span></div>
            <div class="row total"><span>SETTLED FROM WALLET:</span><span>${t.type==="credit"?"+":"-"}₹${t.paidAmount||t.amount}</span></div>
            
            ${d?`<div class="row" style="color:#E11D48; font-weight:bold;"><span>OUTSTANDING DUE:</span><span>₹${t.dueAmount}</span></div>`:""}

            <div class="row"><span>Closing Available Float:</span><strong>₹${t.closingBalance}</strong></div>

            <div class="row" style="font-size: 8.5px; color: #444; margin-top: 4px;">
              <span>Security Hash:</span>
              <span>${y}</span>
            </div>
            <p style="margin: 2px 0; font-size: 8.5px; color: #555;">Cashier: ${t.createdBy}</p>

            <div class="footer">
              <p>*** ELECTRONIC RECONCILED CASHLESS VOUCHER ***</p>
              <p>ISO 9001:2015 ACCREDITED • ${l.website||"labmedix.org"}</p>
            </div>
            <script>
              setTimeout(() => { window.print(); window.close(); }, 300);
            <\/script>
          </body>
        </html>
      `):o.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Executive Statement - ${t.referenceNo}</title>
            <style>
              @page { size: A4 portrait; margin: 15mm; }
              body { font-family: sans-serif; font-size: 12px; margin: 0; padding: 20px; color: #0F172A; -webkit-print-color-adjust: exact !important; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0D9488; padding-bottom: 12px; margin-bottom: 15px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
              .box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: left; }
              th { background: #0F172A; color: #FFF; font-size: 11px; text-transform: uppercase; }
              .total-row { font-size: 14px; font-weight: bold; background: #F0FDFA; color: #0F766E; }
              .due-row { font-size: 14px; font-weight: bold; background: #FFF1F2; color: #E11D48; }
              .signature { display: flex; justify-content: space-between; margin-top: 40px; }
              .sign-box { border-top: 1px solid #94A3B8; width: 200px; text-align: center; padding-top: 6px; font-size: 11px; }
            </style>
          </head>
          <body>
            ${S}
            <div class="header">
              <div>
                <h1 style="margin:0; font-size: 20px; color: #0F172A;">${l.name||"LABMEDIX"} HEALTHCARE</h1>
                <p style="margin:3px 0; color: #0D9488; font-weight: bold;">${l.tagline||"Confident In Care"}</p>
                <p style="margin:2px 0; font-size: 10px; color: #64748B;">${l.address||"Medical Complex, Kolkata"} • 24x7 Helpline: ${l.helpline||"1800-889-9911"}</p>
              </div>
              <div style="text-align: right;">
                <h3 style="margin:0; color: #0D9488;">OFFICIAL HEALTH WALLET STATEMENT</h3>
                <p style="margin:2px 0; font-family: monospace; font-weight: bold;">REF: ${t.referenceNo}</p>
                <p style="margin:2px 0; font-size: 10px; color: #64748B;">Date: ${I(t.date)}</p>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <strong style="color: #64748B; font-size: 10px; text-transform: uppercase; display: block;">Patient & Card Details</strong>
                <strong style="font-size: 13px; display: block; margin: 3px 0;">${(n==null?void 0:n.fullName)||"Registered Patient"}</strong>
                <p style="margin:2px 0; font-family: monospace;">Patient ID: ${t.patientId}</p>
                <p style="margin:2px 0; font-family: monospace;">Health Card: ${(r==null?void 0:r.cardNumber)||"N/A"}</p>
                <p style="margin:2px 0;">Tier: <strong>${(i==null?void 0:i.name)||"Standard Plan"}</strong></p>
              </div>
              <div class="box">
                <strong style="color: #64748B; font-size: 10px; text-transform: uppercase; display: block;">Billing Authorization</strong>
                <p style="margin:3px 0;">Department: <strong>${c.department}</strong></p>
                <p style="margin:2px 0;">Action Type: <strong>${t.type.toUpperCase()}</strong></p>
                <p style="margin:2px 0;">Authorized Officer: <strong>${t.createdBy}</strong></p>
                <p style="margin:2px 0; font-family: monospace; font-size: 10px; color: #0D9488;">Security Hash: ${y}</p>
              </div>
            </div>

            <!-- ITEMIZED REASON & CHARGES TABLE -->
            <table>
              <thead>
                <tr>
                  <th>Reason / Clinical Service Description</th>
                  <th>Opening Float</th>
                  <th>Settled from Wallet</th>
                  <th>Remaining Due</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong style="font-size: 13px; color: #0F172A;">${c.department}</strong>
                    <p style="margin: 3px 0 0 0; color: #475569;">${c.fullReason}</p>
                    <small style="color: #94A3B8; font-family: monospace;">Gross: ₹${t.grossAmount||t.amount} | Savings: -₹${t.discountAmount||0}</small>
                  </td>
                  <td style="font-family: monospace;">₹${t.openingBalance}</td>
                  <td style="font-family: monospace; font-weight: bold; color: ${t.type==="credit"?"#059669":"#DC2626"};">
                    ${t.type==="credit"?"+":"-"}₹${t.paidAmount||t.amount}
                  </td>
                  <td style="font-family: monospace; font-weight: bold; color: ${d?"#E11D48":"#059669"};">
                    ${d?`₹${t.dueAmount}`:"₹0 (CLEARED)"}
                  </td>
                </tr>
                <tr class="total-row">
                  <td colspan="2">CLOSING AVAILABLE PATIENT FLOAT</td>
                  <td colspan="2" style="text-align: right; font-family: monospace;">₹${t.closingBalance}</td>
                </tr>
                ${d?`
                  <tr class="due-row">
                    <td colspan="2">⚠️ OUTSTANDING HOSPITAL DUE BALANCE</td>
                    <td colspan="2" style="text-align: right; font-family: monospace;">₹${t.dueAmount}</td>
                  </tr>
                `:""}
              </tbody>
            </table>

            <div class="signature">
              <div class="sign-box">Patient / Cardholder Signature</div>
              <div class="sign-box">Authorized Cashier / Officer</div>
            </div>

            <div style="text-align: center; margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 10px; color: #94A3B8;">
              This is a computer-generated official healthcare transaction voucher • ISO 9001:2015 Accredited • ${l.website||"labmedix.org"}
            </div>

            <script>
              setTimeout(() => { window.print(); window.close(); }, 300);
            <\/script>
          </body>
        </html>
      `),o.document.close()},E=async()=>{const a=document.getElementById("wallet-receipt-content");if(a)try{u("info","Rendering Receipt","Generating high-resolution receipt PNG..."),await U.exportToPng(a,`LABMEDIX_RECEIPT_${t.referenceNo}.png`),k(),u("success","Receipt Downloaded","Saved official transaction receipt.")}catch{u("error","Download Failed","Could not export receipt image.")}};return e.jsx(R,{isOpen:j,onClose:g,title:"Official Prepaid Health Wallet Receipt",maxWidth:"md",children:e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{id:"wallet-receipt-content",className:"p-5 bg-white text-slate-900 rounded-3xl border-2 border-slate-200 space-y-4 shadow-lg relative overflow-hidden",children:[h?e.jsxs("div",{className:"px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-[10px] flex items-center justify-between",children:[e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(G,{className:"w-3.5 h-3.5 text-amber-600"}),"DUPLICATE AUDIT COPY (Reprint #",b,")"]}),e.jsx("span",{className:"font-mono text-[9px] text-amber-700",children:"ANTI-FRAUD LOGGED"})]}):e.jsxs("div",{className:"px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-[10px] flex items-center justify-between",children:[e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(M,{className:"w-3.5 h-3.5 text-emerald-600"}),"ORIGINAL OFFICIAL CASHLESS VOUCHER (Copy #1)"]}),e.jsx("span",{className:"font-mono text-[9px] text-emerald-700",children:"SECURE TRANSACTION"})]}),e.jsxs("div",{className:"text-center border-b pb-3 space-y-1",children:[e.jsx("div",{className:"flex justify-center mb-1",children:e.jsx(F,{logoUrl:l.logoUrl,variant:"monogram",size:"md",theme:"teal"})}),e.jsxs("h3",{className:"text-base font-black text-slate-900 uppercase tracking-wide leading-none",children:[l.name||"LABMEDIX"," HEALTHCARE SYSTEM"]}),e.jsx("p",{className:"text-[11px] text-teal-700 font-bold",children:l.tagline||"Confident In Care"}),e.jsxs("p",{className:"text-[9.5px] text-slate-500 font-mono",children:["24x7 Support: ",l.helpline||"1800-889-9911"," • Estd. ",l.estdYear||"2025"]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-2 text-xs",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-slate-400 text-[10px] uppercase block font-bold",children:"Receipt / Ref No"}),e.jsx("strong",{className:"font-mono text-teal-700",children:t.referenceNo})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-slate-400 text-[10px] uppercase block font-bold",children:"Date & Time"}),e.jsx("span",{className:"font-mono",children:I(t.date)})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-slate-400 text-[10px] uppercase block font-bold",children:"Patient Name"}),e.jsx("strong",{className:"text-slate-900 font-bold",children:(n==null?void 0:n.fullName)||t.patientId})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-slate-400 text-[10px] uppercase block font-bold",children:"Patient ID & Card"}),e.jsxs("span",{className:"font-mono",children:[t.patientId," • ",e.jsx("strong",{className:"text-teal-700",children:(r==null?void 0:r.cardNumber)||"NFC Active"})]})]})]}),e.jsxs("div",{className:"p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs space-y-1.5",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("span",{className:"text-[10px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1",children:[e.jsx(W,{className:"w-3.5 h-3.5 text-teal-600"}),"Clinical Reason & Department"]}),i&&e.jsx("span",{className:"px-2 py-0.5 rounded-md text-[9px] font-black bg-white text-teal-900 border border-teal-300",children:i.name})]}),e.jsx("strong",{className:"text-sm font-black text-slate-900 block leading-tight",children:c.department}),e.jsx("p",{className:"text-xs text-slate-700 leading-relaxed font-medium",children:c.fullReason})]}),d&&e.jsxs("div",{className:"p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-center justify-between text-xs font-bold",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(_,{className:"w-4 h-4 text-rose-600 shrink-0"}),e.jsx("span",{children:"OUTSTANDING DUE PENDING:"})]}),e.jsx("span",{className:"text-base font-black text-rose-600 font-mono",children:x(t.dueAmount||0)})]}),e.jsxs("div",{className:"p-3.5 bg-slate-50 rounded-2xl space-y-1.5 text-xs border border-slate-200",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-slate-500",children:"Transaction Action:"}),e.jsx("strong",{className:"uppercase font-bold text-teal-700",children:t.type})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-slate-500",children:"Opening Available Float:"}),e.jsx("span",{className:"font-mono font-semibold",children:x(t.openingBalance)})]}),e.jsxs("div",{className:"flex justify-between text-base font-black text-slate-900 border-t border-b border-slate-300 py-1.5",children:[e.jsx("span",{children:"Settled from Wallet:"}),e.jsxs("span",{className:`font-mono ${t.type==="credit"?"text-emerald-600":"text-rose-600"}`,children:[t.type==="credit"?"+":"-",x(t.paidAmount||t.amount)]})]}),e.jsxs("div",{className:"flex justify-between font-bold",children:[e.jsx("span",{className:"text-slate-500",children:"Closing Available Float:"}),e.jsx("strong",{className:"text-slate-900 font-mono text-sm",children:x(t.closingBalance)})]})]}),e.jsxs("div",{className:"text-[10px] text-slate-500 space-y-0.5 bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"Security Hash:"}),e.jsx("span",{children:y})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"Authorized Cashier:"}),e.jsx("span",{children:t.createdBy})]})]}),e.jsxs("div",{className:"pt-2 flex flex-col items-center justify-center border-t border-slate-200",children:[e.jsx(B,{value:t.referenceNo,height:24,width:180,showText:!1}),e.jsx("span",{className:"text-[8px] text-slate-400 font-mono mt-0.5",children:"*** AUTHENTIC DIGITAL CASHLESS SETTLEMENT ***"})]})]}),e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800",children:[e.jsx(f,{variant:"outline",size:"sm",onClick:g,children:"Close"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(f,{variant:"outline",size:"sm",leftIcon:e.jsx(Y,{className:"w-3.5 h-3.5"}),onClick:E,children:"Save PNG"}),e.jsx(f,{variant:"secondary",size:"sm",leftIcon:e.jsx(V,{className:"w-3.5 h-3.5 text-blue-500"}),onClick:()=>A("a4_invoice"),children:"Print A4 Invoice"}),e.jsx(f,{variant:"primary",size:"sm",leftIcon:e.jsx(X,{className:"w-4 h-4"}),onClick:()=>A("thermal_80mm"),children:"Print 80mm POS Receipt"})]})]})]})})};export{te as W,se as a};
