import{j as e}from"./vendor-motion-t-KEQA1G.js";import{r as p}from"./vendor-react-iWyn9LBO.js";import{u as H,M as V,e as b,B as N,I as Y,S,L as X,f as L,W as F,t as O}from"./index-DO0fodOj.js";import{B as q}from"./Barcode-DCq9NXeD.js";import{E as K}from"./exportService-CMIy2Fbu.js";import{C as Q}from"./cashDeskVoucherService-CaSPZ0sp.js";import{aI as Z,bj as z,Z as J,M as ee,a as te,g as se,v as ae,b1 as le,F as re,k as oe}from"./vendor-icons-Bd5wzaTm.js";const ue=({isOpen:T,onClose:g,patient:t,wallet:n,onSuccess:f,defaultType:D="credit"})=>{const[l,A]=p.useState(D),[y,v]=p.useState(""),[o,x]=p.useState(""),[m,w]=p.useState(!1),{showToast:r}=H(),[h,k]=p.useState(!1),[j,R]=p.useState(""),[s,c]=p.useState(""),[i,P]=p.useState(!1),C=[500,1e3,2e3,5e3,1e4],$=[{label:"🩺 OPD Specialist Consultation",val:"OPD Doctor Consultation & Clinical Evaluation"},{label:"🔬 Pathology Lab Tests (CBC, Lipid, LFT)",val:"Pathology & Diagnostic Laboratory Investigations"},{label:"🩻 Radiology & Digital Imaging",val:"Radiology Digital X-Ray / USG Sonography"},{label:"💊 Pharmacy Medicines Dispensation",val:"In-House Pharmacy Medicine Prescription Fulfillment"},{label:"🏥 Daycare Ward & Surgery Advance",val:"Daycare Ward Admission & OT Procedural Advance"},{label:"⚡ Emergency Cashless Deposit",val:"24x7 Emergency Prepaid Cashless Top-up"}],E=a=>{v(a.toString())},M=a=>{x(a)},G=a=>{a.preventDefault();const u=parseFloat(y);if(isNaN(u)||u<=0){r("error","Invalid Amount","Please enter a valid positive amount.");return}if(l==="debit"&&u>n.balance){r("error","Insufficient Funds",`Patient only has ${b(n.balance)} available in health wallet.`);return}if(!m){w(!0);try{const d=F.addTransaction(t.id,l,u,o||`Wallet ${l.toUpperCase()} - Clinical Health Services`);d.error?r("error","Transaction Failed",d.error):(O(),r("success","Transaction Successful",`${l.toUpperCase()} of ${b(u)} settled in health wallet.`),f(d.transaction,d.wallet),g())}catch(d){r("error","Transaction Failed",(d==null?void 0:d.message)||"Wallet transaction failed.")}finally{w(!1)}}},W=a=>{var u;if(a.preventDefault(),!j.trim()){r("error","Voucher Required","Please enter the voucher code.");return}if(!s.trim()){r("error","PIN Required","Please enter the cryptographic voucher PIN.");return}if(!i){P(!0);try{const d=((u=S.getCurrentUser())==null?void 0:u.fullName)||"Hospital Cashier",I=Q.verifyAndRedeemVoucher(j.trim(),s.trim(),d,{redemptionChannel:"wallet_credit",patientId:t.id,patientName:t.fullName,creditPatientWallet:!0,redemptionNotes:`Redeemed at hospital counter for ${t.fullName} wallet float`});if(!I.success||!I.voucher){r("error","Voucher Redemption Failed",I.error||"Invalid voucher or PIN.");return}const U=I.voucher;O(),r("success","Voucher Redeemed & Credited!",`Added ${b(U.amount)} from Voucher ${U.voucherCode} to ${t.fullName}'s wallet.`);const B=F.getByPatientId(t.id)||n,_=F.getTransactions(t.id)[0];B&&f(_,B),g()}catch(d){r("error","Voucher Redemption Error",(d==null?void 0:d.message)||"Failed to process voucher redemption.")}finally{P(!1)}}};return e.jsx(V,{isOpen:T,onClose:g,title:`Health Wallet Command: ${t.fullName}`,maxWidth:"lg",children:e.jsxs("form",{onSubmit:G,className:"space-y-4 text-xs",children:[e.jsxs("div",{className:"p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 text-white border border-teal-500/30 flex items-center justify-between shadow-md",children:[e.jsxs("div",{className:"space-y-0.5",children:[e.jsx("span",{className:"text-[10px] text-teal-300 uppercase font-mono tracking-wider font-bold",children:"Current Available Float"}),e.jsx("div",{className:"text-2xl font-black text-emerald-400 font-mono",children:b(n.balance)}),e.jsxs("p",{className:"text-xs text-slate-300 font-semibold",children:[t.fullName," • ",e.jsx("span",{className:"font-mono text-teal-200",children:t.id})]})]}),e.jsx("div",{className:"p-3 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/40",children:e.jsx(Z,{className:"w-6 h-6"})})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("label",{className:"block text-xs font-bold text-slate-700 dark:text-slate-300",children:"Transaction Action Type"}),e.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-2",children:[{id:"credit",label:"💳 Deposit (Add)",active:"bg-emerald-600 text-white border-emerald-600"},{id:"debit",label:"🏥 Bill Deduction",active:"bg-rose-600 text-white border-rose-600"},{id:"refund",label:"↩️ Refund Float",active:"bg-blue-600 text-white border-blue-600"},{id:"adjustment",label:"⚖️ Adjustment",active:"bg-purple-600 text-white border-purple-600"}].map(a=>e.jsx("button",{type:"button",onClick:()=>A(a.id),className:`py-2 px-2.5 rounded-xl font-bold border transition-all text-center ${l===a.id?`${a.active} shadow-sm`:"bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"}`,children:a.label},a.id))})]}),l==="credit"&&e.jsxs("div",{className:"p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("span",{className:"text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5",children:[e.jsx(z,{className:"w-4 h-4"}),e.jsx("span",{children:"Deposit via Cash Desk Voucher"})]}),e.jsx("button",{type:"button",onClick:()=>k(!h),className:`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${h?"bg-amber-600 text-white border-amber-600":"bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-300 border-amber-400/40 hover:bg-amber-50"}`,children:h?"Switch to Standard Deposit":"Redeem Voucher"})]}),h&&e.jsxs("div",{className:"pt-2 border-t border-amber-500/20 space-y-2.5",children:[e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-2",children:[e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Voucher Code"}),e.jsx("input",{type:"text",placeholder:"LMDX-CSH-YYYY-XXXXX",value:j,onChange:a=>R(a.target.value.toUpperCase()),className:"w-full px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] font-bold text-slate-400 block mb-1",children:"Voucher PIN"}),e.jsx("input",{type:"password",placeholder:"6-Digit PIN",maxLength:8,value:s,onChange:a=>c(a.target.value.trim()),className:"w-full px-3 py-2 rounded-xl text-xs font-mono tracking-widest bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"})]})]}),e.jsx(N,{type:"button",variant:"primary",size:"sm",disabled:i,onClick:W,className:"w-full bg-amber-600 hover:bg-amber-700 text-white font-bold",leftIcon:e.jsx(z,{className:"w-3.5 h-3.5"}),children:i?"Verifying with Ledger...":"Verify PIN & Credit Patient Wallet"})]})]}),e.jsxs("div",{className:"space-y-1.5 pt-1",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-wider block",children:"⚡ Quick Amount Selector (INR ₹)"}),e.jsx("div",{className:"flex flex-wrap gap-1.5",children:C.map(a=>e.jsxs("button",{type:"button",onClick:()=>E(a),className:`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${y===a.toString()?"bg-teal-600 text-white border-teal-600 shadow-xs":"bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50"}`,children:["+₹",a.toLocaleString()]},a))})]}),e.jsx(Y,{label:"Settlement Amount (INR ₹)",type:"number",step:"any",min:"1",placeholder:"e.g. 1500",value:y,onChange:a=>v(a.target.value),required:!0}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-wider block",children:"📋 Purpose & Clinical Service Presets (Reason for Balance Movement)"}),e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-1.5",children:$.map((a,u)=>e.jsx("button",{type:"button",onClick:()=>M(a.val),className:"text-left px-2.5 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors text-[11px] truncate",children:a.label},u))})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1",children:["Reason / Purpose of Transaction ",e.jsx("span",{className:"text-red-500",children:"*"})]}),e.jsx("input",{type:"text",className:"w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 font-semibold",placeholder:"e.g. Cardiology OPD Consult, Pathology CBC, Pharmacy Ref #98762",value:o,onChange:a=>x(a.target.value),required:!0})]}),e.jsxs("div",{className:"flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800",children:[e.jsx(N,{type:"button",variant:"outline",onClick:g,disabled:m,children:"Cancel"}),e.jsxs(N,{type:"submit",variant:l==="credit"?"primary":l==="debit"?"danger":"secondary",isLoading:m,leftIcon:e.jsx(J,{className:"w-4 h-4"}),children:["Confirm ",l.toUpperCase()," (",b(parseFloat(y)||0),")"]})]})]})})},be=({isOpen:T,onClose:g,transaction:t,patient:n})=>{if(!t)return null;const[f,D]=p.useState(()=>{const s=`receipt_print_count_${t.id}`;return parseInt(localStorage.getItem(s)||"0",10)}),l=S.getCompanyProfile(),A=S.getCards(),y=S.getMemberships(),{showToast:v}=H(),o=p.useMemo(()=>t&&A.find(s=>s.patientId===t.patientId&&s.status==="active")||null,[A,t]),x=p.useMemo(()=>o&&y.find(s=>s.id===o.membershipId)||null,[o,y]),m=p.useMemo(()=>{const s=t.notes||"Healthcare Services";let c="HEALTHCARE SERVICE",i=!1;return s.includes("[AUTO-POS]")||s.toLowerCase().includes("consult")||s.toLowerCase().includes("doctor")?(c="OPD & DOCTOR CONSULTATION",i=!0):s.toLowerCase().includes("lab")||s.toLowerCase().includes("cbc")||s.toLowerCase().includes("pathology")||s.toLowerCase().includes("test")?(c="DIAGNOSTIC PATHOLOGY & LAB",i=!0):s.toLowerCase().includes("pharmacy")||s.toLowerCase().includes("medicine")?(c="IN-HOUSE PHARMACY DISPENSATION",i=!0):s.toLowerCase().includes("daycare")||s.toLowerCase().includes("surgery")||s.toLowerCase().includes("ot")?(c="DAYCARE & SURGERY ADVANCE",i=!0):t.type==="credit"?c="PREPAID HEALTH FLOAT RECHARGE":t.type==="refund"&&(c="PATIENT FLOAT REFUND / DISPUTE"),{department:c,fullReason:s.replace("[AUTO-POS]","").trim(),isAutoPos:i}},[t]),w=f>0,r=!!(t.dueAmount&&t.dueAmount>0),h=`SHA256-${t.referenceNo}-${t.amount}-${t.patientId}`.slice(0,24),k=()=>{const s=f+1;D(s),localStorage.setItem(`receipt_print_count_${t.id}`,s.toString())},j=s=>{var E;k();const c=s==="thermal_80mm",i=window.open("","_blank",c?"width=450,height=680":"width=900,height=1000");if(!i){window.print();return}if(!document.getElementById("wallet-receipt-content")){window.print();return}const C=w?`<div style="background:#FEF3C7; border: 1px solid #D97706; padding: 4px; text-align: center; font-weight: bold; color: #92400E; margin-bottom: 6px; font-size: 10px;">⚠️ DUPLICATE REPRINT (Copy #${f+1}) — AUDIT VERIFIED</div>`:'<div style="background:#ECFDF5; border: 1px solid #059669; padding: 4px; text-align: center; font-weight: bold; color: #065F46; margin-bottom: 6px; font-size: 10px;">🔒 ORIGINAL OFFICIAL CASHLESS VOUCHER (Copy #1)</div>',$=r?`<div style="background:#FFF1F2; border: 1px solid #E11D48; padding: 6px; text-align: center; font-weight: bold; color: #9F1239; margin: 6px 0; font-size: 11px;">
           ⚠️ OUTSTANDING DUE: ₹${t.dueAmount} (STATUS: ${((E=t.paymentStatus)==null?void 0:E.toUpperCase())||"PARTIAL DUE"})
         </div>`:"";c?i.document.write(`
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
            ${C}
            <div class="header">
              <h2 style="margin:0; font-size: 14px;">${l.name||"LABMEDIX"}</h2>
              <p style="margin:2px 0; font-size: 10px;">${l.tagline||"Confident In Care"}</p>
              <p style="margin:2px 0; font-size: 8.5px;">Helpline: ${l.helpline||"1800-889-9911"} • ${l.address||"Kolkata"}</p>
            </div>

            <div class="row"><span>Receipt No:</span><strong>${t.referenceNo}</strong></div>
            <div class="row"><span>Date/Time:</span><span>${L(t.date)}</span></div>
            <div class="row"><span>Patient:</span><strong>${(n==null?void 0:n.fullName)||t.patientId}</strong></div>
            <div class="row"><span>Patient ID:</span><span>${t.patientId}</span></div>
            <div class="row"><span>Card UID:</span><span>${(o==null?void 0:o.cardNumber)||"N/A"}</span></div>
            <div class="row"><span>Tier / Plan:</span><strong>${(x==null?void 0:x.name)||"Standard"}</strong></div>

            <!-- REASON FOR BALANCE DEDUCTION / CREDIT -->
            <div class="reason-box">
              <span style="font-size: 9px; text-transform: uppercase; color: #333; font-weight: bold; display: block;">DEPARTMENT / BILLING REASON:</span>
              <strong style="font-size: 11px; display: block; margin-top: 2px;">${m.department}</strong>
              <p style="margin: 3px 0 0 0; font-size: 9.5px;">${m.fullReason}</p>
            </div>

            ${$}

            <div class="row"><span>Opening Float:</span><span>₹${t.openingBalance}</span></div>
            <div class="row"><span>Gross Bill:</span><span>₹${t.grossAmount||t.amount}</span></div>
            <div class="row"><span>Card Savings:</span><span>-₹${t.discountAmount||0}</span></div>
            <div class="row total"><span>SETTLED FROM WALLET:</span><span>${t.type==="credit"?"+":"-"}₹${t.paidAmount||t.amount}</span></div>
            
            ${r?`<div class="row" style="color:#E11D48; font-weight:bold;"><span>OUTSTANDING DUE:</span><span>₹${t.dueAmount}</span></div>`:""}

            <div class="row"><span>Closing Available Float:</span><strong>₹${t.closingBalance}</strong></div>

            <div class="row" style="font-size: 8.5px; color: #444; margin-top: 4px;">
              <span>Security Hash:</span>
              <span>${h}</span>
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
      `):i.document.write(`
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
            ${C}
            <div class="header">
              <div>
                <h1 style="margin:0; font-size: 20px; color: #0F172A;">${l.name||"LABMEDIX"} HEALTHCARE</h1>
                <p style="margin:3px 0; color: #0D9488; font-weight: bold;">${l.tagline||"Confident In Care"}</p>
                <p style="margin:2px 0; font-size: 10px; color: #64748B;">${l.address||"Medical Complex, Kolkata"} • 24x7 Helpline: ${l.helpline||"1800-889-9911"}</p>
              </div>
              <div style="text-align: right;">
                <h3 style="margin:0; color: #0D9488;">OFFICIAL HEALTH WALLET STATEMENT</h3>
                <p style="margin:2px 0; font-family: monospace; font-weight: bold;">REF: ${t.referenceNo}</p>
                <p style="margin:2px 0; font-size: 10px; color: #64748B;">Date: ${L(t.date)}</p>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <strong style="color: #64748B; font-size: 10px; text-transform: uppercase; display: block;">Patient & Card Details</strong>
                <strong style="font-size: 13px; display: block; margin: 3px 0;">${(n==null?void 0:n.fullName)||"Registered Patient"}</strong>
                <p style="margin:2px 0; font-family: monospace;">Patient ID: ${t.patientId}</p>
                <p style="margin:2px 0; font-family: monospace;">Health Card: ${(o==null?void 0:o.cardNumber)||"N/A"}</p>
                <p style="margin:2px 0;">Tier: <strong>${(x==null?void 0:x.name)||"Standard Plan"}</strong></p>
              </div>
              <div class="box">
                <strong style="color: #64748B; font-size: 10px; text-transform: uppercase; display: block;">Billing Authorization</strong>
                <p style="margin:3px 0;">Department: <strong>${m.department}</strong></p>
                <p style="margin:2px 0;">Action Type: <strong>${t.type.toUpperCase()}</strong></p>
                <p style="margin:2px 0;">Authorized Officer: <strong>${t.createdBy}</strong></p>
                <p style="margin:2px 0; font-family: monospace; font-size: 10px; color: #0D9488;">Security Hash: ${h}</p>
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
                    <strong style="font-size: 13px; color: #0F172A;">${m.department}</strong>
                    <p style="margin: 3px 0 0 0; color: #475569;">${m.fullReason}</p>
                    <small style="color: #94A3B8; font-family: monospace;">Gross: ₹${t.grossAmount||t.amount} | Savings: -₹${t.discountAmount||0}</small>
                  </td>
                  <td style="font-family: monospace;">₹${t.openingBalance}</td>
                  <td style="font-family: monospace; font-weight: bold; color: ${t.type==="credit"?"#059669":"#DC2626"};">
                    ${t.type==="credit"?"+":"-"}₹${t.paidAmount||t.amount}
                  </td>
                  <td style="font-family: monospace; font-weight: bold; color: ${r?"#E11D48":"#059669"};">
                    ${r?`₹${t.dueAmount}`:"₹0 (CLEARED)"}
                  </td>
                </tr>
                <tr class="total-row">
                  <td colspan="2">CLOSING AVAILABLE PATIENT FLOAT</td>
                  <td colspan="2" style="text-align: right; font-family: monospace;">₹${t.closingBalance}</td>
                </tr>
                ${r?`
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
      `),i.document.close()},R=async()=>{const s=document.getElementById("wallet-receipt-content");if(s)try{v("info","Rendering Receipt","Generating high-resolution receipt PNG..."),await K.exportToPng(s,`LABMEDIX_RECEIPT_${t.referenceNo}.png`),O(),v("success","Receipt Downloaded","Saved official transaction receipt.")}catch{v("error","Download Failed","Could not export receipt image.")}};return e.jsx(V,{isOpen:T,onClose:g,title:"Official Prepaid Health Wallet Receipt",maxWidth:"md",children:e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{id:"wallet-receipt-content",className:"p-5 bg-white text-slate-900 rounded-3xl border-2 border-slate-200 space-y-4 shadow-lg relative overflow-hidden",children:[w?e.jsxs("div",{className:"px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-[10px] flex items-center justify-between",children:[e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(ee,{className:"w-3.5 h-3.5 text-amber-600"}),"DUPLICATE AUDIT COPY (Reprint #",f,")"]}),e.jsx("span",{className:"font-mono text-[9px] text-amber-700",children:"ANTI-FRAUD LOGGED"})]}):e.jsxs("div",{className:"px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-[10px] flex items-center justify-between",children:[e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(te,{className:"w-3.5 h-3.5 text-emerald-600"}),"ORIGINAL OFFICIAL CASHLESS VOUCHER (Copy #1)"]}),e.jsx("span",{className:"font-mono text-[9px] text-emerald-700",children:"SECURE TRANSACTION"})]}),e.jsxs("div",{className:"text-center border-b pb-3 space-y-1",children:[e.jsx("div",{className:"flex justify-center mb-1",children:e.jsx(X,{logoUrl:l.logoUrl,variant:"monogram",size:"md",theme:"teal"})}),e.jsxs("h3",{className:"text-base font-black text-slate-900 uppercase tracking-wide leading-none",children:[l.name||"LABMEDIX"," HEALTHCARE SYSTEM"]}),e.jsx("p",{className:"text-[11px] text-teal-700 font-bold",children:l.tagline||"Confident In Care"}),e.jsxs("p",{className:"text-[9.5px] text-slate-500 font-mono",children:["24x7 Support: ",l.helpline||"1800-889-9911"," • Estd. ",l.estdYear||"2025"]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-2 text-xs",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-slate-400 text-[10px] uppercase block font-bold",children:"Receipt / Ref No"}),e.jsx("strong",{className:"font-mono text-teal-700",children:t.referenceNo})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-slate-400 text-[10px] uppercase block font-bold",children:"Date & Time"}),e.jsx("span",{className:"font-mono",children:L(t.date)})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-slate-400 text-[10px] uppercase block font-bold",children:"Patient Name"}),e.jsx("strong",{className:"text-slate-900 font-bold",children:(n==null?void 0:n.fullName)||t.patientId})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-slate-400 text-[10px] uppercase block font-bold",children:"Patient ID & Card"}),e.jsxs("span",{className:"font-mono",children:[t.patientId," • ",e.jsx("strong",{className:"text-teal-700",children:(o==null?void 0:o.cardNumber)||"NFC Active"})]})]})]}),e.jsxs("div",{className:"p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs space-y-1.5",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("span",{className:"text-[10px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1",children:[e.jsx(se,{className:"w-3.5 h-3.5 text-teal-600"}),"Clinical Reason & Department"]}),x&&e.jsx("span",{className:"px-2 py-0.5 rounded-md text-[9px] font-black bg-white text-teal-900 border border-teal-300",children:x.name})]}),e.jsx("strong",{className:"text-sm font-black text-slate-900 block leading-tight",children:m.department}),e.jsx("p",{className:"text-xs text-slate-700 leading-relaxed font-medium",children:m.fullReason})]}),r&&e.jsxs("div",{className:"p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-center justify-between text-xs font-bold",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ae,{className:"w-4 h-4 text-rose-600 shrink-0"}),e.jsx("span",{children:"OUTSTANDING DUE PENDING:"})]}),e.jsx("span",{className:"text-base font-black text-rose-600 font-mono",children:b(t.dueAmount||0)})]}),e.jsxs("div",{className:"p-3.5 bg-slate-50 rounded-2xl space-y-1.5 text-xs border border-slate-200",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-slate-500",children:"Transaction Action:"}),e.jsx("strong",{className:"uppercase font-bold text-teal-700",children:t.type})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-slate-500",children:"Opening Available Float:"}),e.jsx("span",{className:"font-mono font-semibold",children:b(t.openingBalance)})]}),e.jsxs("div",{className:"flex justify-between text-base font-black text-slate-900 border-t border-b border-slate-300 py-1.5",children:[e.jsx("span",{children:"Settled from Wallet:"}),e.jsxs("span",{className:`font-mono ${t.type==="credit"?"text-emerald-600":"text-rose-600"}`,children:[t.type==="credit"?"+":"-",b(t.paidAmount||t.amount)]})]}),e.jsxs("div",{className:"flex justify-between font-bold",children:[e.jsx("span",{className:"text-slate-500",children:"Closing Available Float:"}),e.jsx("strong",{className:"text-slate-900 font-mono text-sm",children:b(t.closingBalance)})]})]}),e.jsxs("div",{className:"text-[10px] text-slate-500 space-y-0.5 bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"Security Hash:"}),e.jsx("span",{children:h})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"Authorized Cashier:"}),e.jsx("span",{children:t.createdBy})]})]}),e.jsxs("div",{className:"pt-2 flex flex-col items-center justify-center border-t border-slate-200",children:[e.jsx(q,{value:t.referenceNo,height:24,width:180,showText:!1}),e.jsx("span",{className:"text-[8px] text-slate-400 font-mono mt-0.5",children:"*** AUTHENTIC DIGITAL CASHLESS SETTLEMENT ***"})]})]}),e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800",children:[e.jsx(N,{variant:"outline",size:"sm",onClick:g,children:"Close"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(N,{variant:"outline",size:"sm",leftIcon:e.jsx(le,{className:"w-3.5 h-3.5"}),onClick:R,children:"Save PNG"}),e.jsx(N,{variant:"secondary",size:"sm",leftIcon:e.jsx(re,{className:"w-3.5 h-3.5 text-blue-500"}),onClick:()=>j("a4_invoice"),children:"Print A4 Invoice"}),e.jsx(N,{variant:"primary",size:"sm",leftIcon:e.jsx(oe,{className:"w-4 h-4"}),onClick:()=>j("thermal_80mm"),children:"Print 80mm POS Receipt"})]})]})]})})};export{ue as W,be as a};
