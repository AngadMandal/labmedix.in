import{j as e}from"./vendor-motion-t-KEQA1G.js";import{r as b}from"./vendor-react-iWyn9LBO.js";import{Y as B,S as y,u as I,r as D,M as L,f as A,B as f,t as P}from"./index-4DG-C3f2.js";import{E as $}from"./exportService-_eou5ZnE.js";import{aA as E,T as z,a as F,q as k,a9 as G,aY as _,ah as R}from"./vendor-icons-EybAlOo-.js";const M=({value:g,height:l=42,barWidth:t=1.5,showText:n=!0,className:x="",lightColor:u="#FFFFFF",darkColor:h="#000000"})=>{const d=B(g),i=d.width*t,w=n?l-14:l;return e.jsx("div",{className:`inline-flex flex-col items-center select-none ${x}`,children:e.jsxs("svg",{width:i,height:l,viewBox:`0 0 ${i} ${l}`,xmlns:"http://www.w3.org/2000/svg",className:"overflow-visible",shapeRendering:"crispEdges",children:[e.jsx("rect",{width:i,height:l,fill:u}),d.barBlocks.map(c=>e.jsx("rect",{x:c.start*t,y:0,width:c.width*t,height:w,fill:h},c.start)),n&&e.jsxs("text",{x:i/2,y:l-2,textAnchor:"middle",fill:h,fontSize:"10",fontFamily:"'Courier New', Courier, monospace",fontWeight:"bold",letterSpacing:"1.5",children:["*",d.text,"*"]})]})})},Q=({isOpen:g,onClose:l,booking:t})=>{const[n,x]=b.useState("tube_standard"),[u,h]=b.useState(""),[d,i]=b.useState(!1),[w,c]=b.useState(!1),j=y.getCompanyProfile(),{showToast:p}=I();if(b.useEffect(()=>{if(t){const s=JSON.stringify({sampleId:t.bookingNo,patientId:t.patientId,patientName:t.patientName,test:t.testName,date:t.scheduledDate,lab:j.name||"LABMEDIX DIAGNOSTICS"});D(s,200).then(a=>{h(a)})}},[t,j]),!t)return null;const N=y.getPatients().find(s=>s.id===t.patientId)||{id:t.patientId,fullName:t.patientName,age:45,gender:"male",bloodGroup:"B+"},r=n==="bag_label",m=n==="avery_sticker",o=(s=>{const a=s.toLowerCase();return a.includes("cbc")||a.includes("blood count")||a.includes("hba1c")||a.includes("esr")?{name:"EDTA K2/K3 (Lavender/Purple Top)",capColor:"#8B5CF6",bg:"bg-purple-950/80",border:"border-purple-500",text:"text-purple-300",additive:"K2 EDTA Anticoagulant (Whole Blood)",drawVolume:"3.0 mL"}:a.includes("sugar")||a.includes("fbs")||a.includes("ppbs")||a.includes("glucose")?{name:"Sodium Fluoride / Potassium Oxalate (Gray Top)",capColor:"#94A3B8",bg:"bg-slate-800",border:"border-slate-400",text:"text-slate-200",additive:"Glycolysis Inhibitor (Plasma/Serum)",drawVolume:"2.0 mL"}:a.includes("pt/inr")||a.includes("coagulation")||a.includes("aptt")?{name:"Sodium Citrate 3.2% (Light Blue Top)",capColor:"#38BDF8",bg:"bg-sky-950/80",border:"border-sky-500",text:"text-sky-300",additive:"Sodium Citrate Buffer (1:9 ratio)",drawVolume:"2.7 mL"}:a.includes("electrolyte")||a.includes("blood gas")||a.includes("ammonia")?{name:"Sodium Heparin (Green Top)",capColor:"#10B981",bg:"bg-emerald-950/80",border:"border-emerald-500",text:"text-emerald-300",additive:"Sodium Heparin Anticoagulant",drawVolume:"4.0 mL"}:{name:"SST Gel / Clot Activator (Gold/Yellow Top)",capColor:"#FBBF24",bg:"bg-amber-950/80",border:"border-amber-500",text:"text-amber-300",additive:"Silica Clot Activator + Polymer Gel",drawVolume:"5.0 mL"}})(t.testName),v=()=>{navigator.clipboard.writeText(t.bookingNo),i(!0),p("success","Barcode Copied",`Sample ID ${t.bookingNo} copied to clipboard.`),setTimeout(()=>i(!1),2e3)},C=()=>{const s=window.open("","_blank","width=650,height=750");if(!s){window.print();return}const a=document.getElementById("phlebotomy-sample-label-content");if(!a){window.print();return}const T=r?"100mm 60mm":m?"70mm 36mm":"50mm 25mm";s.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vacutainer Label - ${t.bookingNo} - ${t.patientName}</title>
          <style>
            @page {
              size: ${T};
              margin: 1.5mm;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: ${r?"11px":m?"9.5px":"8px"};
              color: #000;
              margin: 0;
              padding: 2px;
              line-height: 1.2;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .label-card {
              border: 1.5px solid #000;
              border-radius: 4px;
              padding: ${r?"6px 8px":"3px 5px"};
              background: #fff;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 98%;
              box-sizing: border-box;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #000;
              padding-bottom: 2px;
              margin-bottom: 2px;
            }
            .brand-name {
              font-weight: 900;
              font-size: ${r?"12px":"8.5px"};
              text-transform: uppercase;
            }
            .badge-tag {
              font-size: 7px;
              border: 1px solid #000;
              padding: 1px 3px;
              border-radius: 2px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .patient-name {
              font-size: ${r?"13px":"9.5px"};
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              font-size: ${r?"10px":"7.5px"};
              font-family: monospace;
              margin-top: 1px;
            }
            .test-row {
              font-weight: bold;
              font-size: ${r?"11px":"8px"};
              margin-top: 2px;
              background: #eee;
              padding: 1px 3px;
              border-radius: 2px;
            }
            .barcode-container {
              text-align: center;
              margin: 2px 0;
            }
            .barcode-container svg {
              max-width: 100%;
              height: auto;
            }
            .footer-row {
              display: flex;
              justify-content: space-between;
              font-size: 6.5px;
              font-family: monospace;
              border-top: 0.5px dashed #000;
              padding-top: 1px;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            ${a.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          <\/script>
        </body>
      </html>
    `),s.document.close(),p("info","Barcode Dispatched","Real scannable Code 128 barcode sent to label printer.")},S=async()=>{const s=document.getElementById("phlebotomy-sample-label-content");if(s){c(!0);try{p("info","Rendering Label","Compiling high-resolution 300 DPI PNG label..."),await $.exportToPng(s,`LABEL_${t.bookingNo}_${t.patientName.replace(/\s+/g,"_")}`),P(),p("success","Label Image Downloaded","High-res Code 128 label saved as PNG.")}catch{p("error","Export Error","Could not export barcode label.")}finally{c(!1)}}};return e.jsx(L,{isOpen:g,onClose:l,title:"Phlebotomy Sample Tube & Vacutainer Label Printer",maxWidth:"lg",children:e.jsxs("div",{className:"space-y-4 text-xs",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(E,{className:"w-4 h-4 text-teal-400"}),e.jsx("span",{className:"text-white font-bold text-xs",children:"Standard Label Spec:"})]}),e.jsxs("div",{className:"flex flex-wrap gap-1.5",children:[e.jsx("button",{type:"button",onClick:()=>x("tube_standard"),className:`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${n==="tube_standard"?"bg-teal-600 text-white shadow-md":"bg-slate-800 text-slate-400 hover:text-white"}`,children:"💉 Tube Label (50x25mm)"}),e.jsx("button",{type:"button",onClick:()=>x("avery_sticker"),className:`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${n==="avery_sticker"?"bg-teal-600 text-white shadow-md":"bg-slate-800 text-slate-400 hover:text-white"}`,children:"🏷️ Avery Sticker (70x36mm)"}),e.jsx("button",{type:"button",onClick:()=>x("bag_label"),className:`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${n==="bag_label"?"bg-teal-600 text-white shadow-md":"bg-slate-800 text-slate-400 hover:text-white"}`,children:"📦 Biohazard Bag (100x60mm)"})]})]}),e.jsx("div",{className:"p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center shadow-2xl relative",children:e.jsxs("div",{id:"phlebotomy-sample-label-content",className:`w-full rounded-2xl bg-white text-slate-950 font-sans border-2 border-slate-900 shadow-2xl space-y-2 select-none ${r?"max-w-md p-5 text-xs":m?"max-w-sm p-4 text-[11px]":"max-w-xs p-3 text-[10px]"}`,children:[e.jsxs("div",{className:"flex items-center justify-between border-b-2 border-slate-900 pb-1.5",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(z,{className:"w-4 h-4 text-teal-600"}),e.jsxs("strong",{className:"text-[11px] font-black tracking-tight text-slate-950 uppercase",children:[j.name||"LABMEDIX"," DIAGNOSTICS"]})]}),e.jsx("span",{className:"px-2 py-0.5 rounded text-[8.5px] font-black uppercase font-mono bg-teal-100 text-teal-950 border border-teal-400",children:t.collectionType==="home_collection"?"HOME SAMPLE":"CENTRAL LAB"})]}),e.jsxs("div",{children:[e.jsx("strong",{className:"text-sm font-black text-slate-950 uppercase tracking-tight block",children:t.patientName}),e.jsxs("div",{className:"flex justify-between text-[10.5px] font-mono text-slate-800 mt-0.5",children:[e.jsxs("span",{children:["PID: ",e.jsx("strong",{children:t.patientId})]}),e.jsxs("span",{children:["Age/Sex: ",e.jsxs("strong",{children:[N.age||45,"Y/",(N.gender||"M").toUpperCase()[0]]})]}),e.jsxs("span",{children:["Blood: ",e.jsx("strong",{className:"text-rose-700",children:N.bloodGroup||"B+"})]})]})]}),e.jsxs("div",{className:"p-2 rounded-xl bg-slate-100 border border-slate-300 text-[10.5px] space-y-1",children:[e.jsxs("div",{className:"font-bold text-slate-950 line-clamp-2",children:["🔬 ",t.testName]}),e.jsxs("div",{className:"flex justify-between items-center text-slate-700 font-mono text-[9.5px] pt-0.5 border-t border-slate-200",children:[e.jsxs("span",{className:"font-bold text-purple-800 flex items-center gap-1",children:[e.jsx("span",{className:"w-2.5 h-2.5 rounded-full inline-block",style:{backgroundColor:o.capColor}}),o.name.split(" (")[0]]}),t.fastingRequired?e.jsx("span",{className:"text-rose-700 font-bold bg-rose-50 px-1 rounded border border-rose-200",children:"⚠️ FASTING 10H"}):e.jsx("span",{className:"text-emerald-700 font-bold bg-emerald-50 px-1 rounded border border-emerald-200",children:"ROUTINE"})]})]}),e.jsxs("div",{className:"py-1 flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200",children:[e.jsx("div",{className:"flex-1 text-center",children:e.jsx(M,{value:t.bookingNo,height:r?48:m?40:34,barWidth:r?1.5:m?1.25:1.05,showText:!0,className:"mx-auto"})}),u&&e.jsxs("div",{className:"shrink-0 text-center border-l pl-2 border-slate-300",children:[e.jsx("img",{src:u,alt:"Specimen QR",className:r?"w-14 h-14 rounded":"w-10 h-10 rounded"}),e.jsx("span",{className:"text-[7.5px] font-mono text-slate-600 block mt-0.5",children:"SCAN 2D"})]})]}),e.jsxs("div",{className:"flex justify-between items-center text-[8.5px] text-slate-600 border-t border-dashed border-slate-400 pt-1 font-mono",children:[e.jsxs("span",{children:["Sample ID: ",e.jsx("strong",{children:t.bookingNo})]}),e.jsxs("span",{children:["Draw: ",A(t.createdAt)]})]})]})}),e.jsxs("div",{className:`p-4 rounded-2xl ${o.bg} border ${o.border} text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md`,children:[e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"w-4 h-4 rounded-full inline-block shadow-sm ring-2 ring-white/50",style:{backgroundColor:o.capColor}}),e.jsx("strong",{className:`text-xs ${o.text}`,children:o.name})]}),e.jsxs("p",{className:"text-[11px] text-slate-300",children:["Additive: ",e.jsx("strong",{className:"text-white",children:o.additive})," • Target Draw: ",e.jsx("strong",{className:"text-amber-300",children:o.drawVolume})]})]}),e.jsxs("div",{className:"flex items-center gap-2 font-mono text-[11px] text-emerald-400 font-bold shrink-0",children:[e.jsx(F,{className:"w-4 h-4 text-emerald-400"}),"ISO 15189 / Quality Compliant"]})]}),e.jsxs("div",{className:"pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2",children:[e.jsx(f,{variant:"outline",size:"sm",onClick:l,children:"Close"}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsx(f,{variant:"outline",size:"sm",leftIcon:d?e.jsx(k,{className:"w-3.5 h-3.5 text-emerald-500"}):e.jsx(G,{className:"w-3.5 h-3.5 text-teal-400"}),onClick:v,children:d?"Copied!":"Copy Barcode ID"}),e.jsx(f,{variant:"outline",size:"sm",leftIcon:e.jsx(_,{className:"w-3.5 h-3.5 text-purple-400"}),isLoading:w,onClick:S,children:"🖼️ Download PNG Label"}),e.jsx(f,{variant:"primary",size:"sm",className:"bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 font-black shadow-lg",leftIcon:e.jsx(R,{className:"w-4 h-4"}),onClick:C,children:"🖨️ Print Real Barcode Label"})]})]})]})})};export{Q as P};
