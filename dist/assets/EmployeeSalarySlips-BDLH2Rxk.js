import{c as K,i as ie,u as oe,x as de,r as b,j as e,$ as f,F as U,H as B,D as F,X as ne,a9 as ce,s as me}from"./index-jl0uuylT.js";import{E as xe,f as W,d as pe,P as h,a as O,c as V,e as E,b as ue}from"./pdfTheme-B61EHGdw.js";import{w as he,D as q,Y as G,b as ye}from"./DashboardLayout-CAb8zaWp.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const be=K("LockKeyhole",[["circle",{cx:"12",cy:"16",r:"1",key:"1au0dj"}],["rect",{x:"3",y:"10",width:"18",height:"12",rx:"2",key:"6s8ecr"}],["path",{d:"M7 10V7a5 5 0 0 1 10 0v3",key:"1pqi11"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=K("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]),g=["January","February","March","April","May","June","July","August","September","October","November","December"];function n(x){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}).format(x)}function T(x){return x==="paid"?"Paid":x==="processed"?"Processed":"Pending"}function ge(x){return x==="paid"?"bg-emerald-100 text-emerald-700":x==="processed"?"bg-blue-100 text-blue-700":"bg-yellow-100 text-yellow-700"}function d(x){return String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function we(){var J;const x=ie(),{user:s}=oe(),{data:r,isLoading:_}=de(),{data:i}=he(),[N,I]=b.useState([]),[$,H]=b.useState(!0),[M,v]=b.useState(""),[c,C]=b.useState(null),[j,R]=b.useState(null),[w,Y]=b.useState(null);async function X(t){H(!0),v("");const{data:y,error:m}=await me.from("payroll_records").select(`
          id,
          employee_id,
          month,
          year,
          basic_salary,
          total_allowances,
          total_deductions,
          net_salary,
          status,
          paid_at
        `).eq("employee_id",t).in("status",["processed","paid"]).order("year",{ascending:!1}).order("month",{ascending:!1});m?(console.error("Employee salary slips error:",m),v(m.message),I([])):I(y??[]),H(!1)}b.useEffect(()=>{!_&&!(r!=null&&r.isEmployee)&&x("/dashboard",{replace:!0})},[_,r==null?void 0:r.isEmployee,x]),b.useEffect(()=>{!_&&(r!=null&&r.isEmployee)&&r.employeeId&&X(r.employeeId)},[_,r==null?void 0:r.isEmployee,r==null?void 0:r.employeeId]);const Q=b.useMemo(()=>N.filter(t=>t.status==="paid").reduce((t,y)=>t+Number(y.net_salary),0),[N]),p=N[0];async function A(t){var y,m,k,D;try{R(t.id),v("");const a=new xe({orientation:"portrait",unit:"mm",format:"a4"}),u=a.internal.pageSize.getWidth(),P=a.internal.pageSize.getHeight(),l=16,Z=await W(i==null?void 0:i.logoUrl),ee=(i==null?void 0:i.companyName)||"Maa Janki Industrial Services",te=(i==null?void 0:i.companyAddress)||"";let o=pe(a,{title:"Salary Slip",subtitle:`${g[t.month-1]} ${t.year}`,companyName:ee,companyAddress:te,logoDataUrl:Z,pageWidth:u,margin:l});a.setTextColor(...h.gray),a.setFontSize(8),a.setFont("helvetica","italic"),a.text("Confidential - Employee Copy",u-l,o,{align:"right"}),o+=10,a.setTextColor(...h.dark),a.setFont("helvetica","bold"),a.setFontSize(13),a.text(((y=s==null?void 0:s.user_metadata)==null?void 0:y.full_name)||"Employee",l,o),o+=7,a.setFont("helvetica","normal"),a.setFontSize(9),a.setTextColor(...h.gray),a.text((s==null?void 0:s.email)||"",l,o),o+=11,O(a,{startY:o,theme:"grid",head:[["Employee Information","Details"]],body:[["Employee ID",t.employee_id],["Employee Email",(s==null?void 0:s.email)||"—"],["Pay Period",`${g[t.month-1]} ${t.year}`],["Payroll Status",T(t.status)],["Payment Date",t.paid_at?new Date(t.paid_at).toLocaleDateString("en-IN"):"—"]],headStyles:V,styles:{fontSize:9,cellPadding:3,textColor:h.dark},columnStyles:{0:{cellWidth:55},1:{cellWidth:"auto"}}}),o=((m=a.lastAutoTable)==null?void 0:m.finalY)+10||o+55,O(a,{startY:o,theme:"grid",head:[["Salary Component","Amount"]],body:[["Basic Salary",E(Number(t.basic_salary))],["Total Allowances",E(Number(t.total_allowances))],["Gross Salary",E(Number(t.basic_salary)+Number(t.total_allowances))],["Total Deductions",E(Number(t.total_deductions))]],headStyles:V,styles:{fontSize:9,cellPadding:3,textColor:h.dark},columnStyles:{0:{cellWidth:100},1:{halign:"right"}}}),o=((k=a.lastAutoTable)==null?void 0:k.finalY)+12||o+50,a.setFillColor(248,250,252),a.setDrawColor(...h.accent),a.roundedRect(l,o,u-l*2,24,3,3,"FD"),a.setTextColor(...h.dark),a.setFontSize(12),a.setFont("helvetica","bold"),a.text("NET SALARY",l+7,o+10),a.setFontSize(15),a.text(E(Number(t.net_salary)),u-l-7,o+12,{align:"right"}),o+=36,a.setTextColor(...h.gray),a.setFontSize(8),a.setFont("helvetica","normal"),["This is a computer-generated salary slip.","Salary information is confidential and intended only for the employee.","For any payroll discrepancy, please contact HR/Admin."].forEach((re,le)=>{a.text(`• ${re}`,l,o+le*5)});const S=Math.min(o+30,P-45);a.setDrawColor(...h.rule),a.line(l,S,l+55,S),a.line(u-l-55,S,u-l,S),a.setTextColor(...h.gray),a.setFontSize(8),a.text("Employee",l,S+5),a.text("Authorized HR / Admin",u-l,S+5,{align:"right"}),ue(a,{pageWidth:u,pageHeight:P,margin:l,pageNumber:1,totalPages:1});const ae=(((D=s==null?void 0:s.user_metadata)==null?void 0:D.full_name)||"employee").replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase(),se=g[t.month-1].toLowerCase();a.save(`MJIS-${ae}-salary-slip-${se}-${t.year}.pdf`)}catch(a){console.error("Salary slip PDF error:",a),v(a instanceof Error?a.message:"Unable to download salary slip.")}finally{R(null)}}async function z(t){var y;try{Y(t.id),v("");const m=await W(i==null?void 0:i.logoUrl),k=(i==null?void 0:i.companyName)||"Maa Janki Industrial Services",D=(i==null?void 0:i.companyAddress)||"",a=((y=s==null?void 0:s.user_metadata)==null?void 0:y.full_name)||"Employee",u=(s==null?void 0:s.email)||"",P=Number(t.basic_salary)+Number(t.total_allowances),l=window.open("","_blank","width=900,height=1100");if(!l)throw new Error("Please allow pop-ups in your browser to print the salary slip.");l.document.write(`
        <!doctype html>

        <html>
          <head>

            <meta charset="UTF-8" />

            <title>
              MJIS Salary Slip -
              ${d(g[t.month-1])} ${t.year}
            </title>

            <style>

              * {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                padding: 24px;
                background: #ffffff;
                color: #0f172a;
                font-family: Arial, Helvetica, sans-serif;
              }

              .sheet {
                max-width: 820px;
                margin: 0 auto;
                border: 1px solid #cbd5e1;
                padding: 28px;
              }

              .header {
                display: flex;
                justify-content: space-between;
                gap: 20px;
                align-items: flex-start;
                padding-bottom: 18px;
                border-bottom: 2px solid #334155;
              }

              .company {
                display: flex;
                gap: 14px;
                align-items: flex-start;
              }

              .logo {
                width: 64px;
                height: 64px;
                object-fit: contain;
              }

              .company-name {
                margin: 0;
                font-size: 20px;
                font-weight: 800;
              }

              .company-address {
                margin-top: 5px;
                color: #64748b;
                font-size: 12px;
                max-width: 350px;
                line-height: 1.5;
              }

              .document {
                text-align: right;
              }

              .document-title {
                margin: 0;
                font-size: 20px;
                font-weight: 800;
              }

              .document-period {
                margin-top: 5px;
                color: #64748b;
                font-size: 12px;
              }

              .confidential {
                margin-top: 7px;
                color: #64748b;
                font-size: 11px;
                font-style: italic;
              }

              .section {
                margin-top: 24px;
              }

              .section-title {
                margin: 0 0 10px;
                font-size: 13px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: .05em;
                color: #475569;
              }

              .employee-name {
                font-size: 18px;
                font-weight: 800;
                margin-bottom: 4px;
              }

              .employee-email {
                color: #64748b;
                font-size: 12px;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
              }

              th {
                background: #334155;
                color: #ffffff;
                text-align: left;
                padding: 9px;
                font-size: 11px;
              }

              td {
                border: 1px solid #e2e8f0;
                padding: 9px;
                font-size: 11px;
              }

              .right {
                text-align: right;
              }

              .net-box {
                margin-top: 22px;
                padding: 18px;
                border: 2px solid #334155;
                background: #f8fafc;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }

              .net-label {
                font-size: 14px;
                font-weight: 800;
              }

              .net-value {
                font-size: 20px;
                font-weight: 900;
              }

              .notes {
                margin-top: 22px;
                font-size: 10px;
                color: #64748b;
                line-height: 1.6;
              }

              .signatures {
                margin-top: 55px;
                display: flex;
                justify-content: space-between;
                gap: 40px;
              }

              .signature {
                width: 180px;
                border-top: 1px solid #94a3b8;
                padding-top: 7px;
                text-align: center;
                font-size: 10px;
                color: #64748b;
              }

              .footer {
                margin-top: 30px;
                padding-top: 12px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                gap: 15px;
                font-size: 9px;
                color: #94a3b8;
              }

              @media print {

                body {
                  padding: 0;
                }

                .sheet {
                  border: none;
                  max-width: none;
                  width: 100%;
                }

                @page {
                  size: A4;
                  margin: 12mm;
                }

              }

            </style>

          </head>

          <body>

            <div class="sheet">

              <div class="header">

                <div class="company">

                  ${m?`
                        <img
                          src="${m}"
                          class="logo"
                          alt="MJIS Logo"
                        />
                      `:""}

                  <div>

                    <h1 class="company-name">
                      ${d(k)}
                    </h1>

                    ${D?`
                          <div class="company-address">
                            ${d(D)}
                          </div>
                        `:""}

                  </div>

                </div>

                <div class="document">

                  <h2 class="document-title">
                    SALARY SLIP
                  </h2>

                  <div class="document-period">
                    ${d(g[t.month-1])} ${t.year}
                  </div>

                  <div class="confidential">
                    Confidential - Employee Copy
                  </div>

                </div>

              </div>

              <div class="section">

                <div class="section-title">
                  Employee
                </div>

                <div class="employee-name">
                  ${d(a)}
                </div>

                <div class="employee-email">
                  ${d(u)}
                </div>

              </div>

              <div class="section">

                <div class="section-title">
                  Payroll Information
                </div>

                <table>

                  <tr>
                    <th>Field</th>
                    <th>Details</th>
                  </tr>

                  <tr>
                    <td>Employee ID</td>
                    <td>${d(t.employee_id)}</td>
                  </tr>

                  <tr>
                    <td>Pay Period</td>
                    <td>${d(`${g[t.month-1]} ${t.year}`)}</td>
                  </tr>

                  <tr>
                    <td>Status</td>
                    <td>${d(T(t.status))}</td>
                  </tr>

                  <tr>
                    <td>Payment Date</td>
                    <td>${t.paid_at?d(new Date(t.paid_at).toLocaleDateString("en-IN")):"—"}</td>
                  </tr>

                </table>

              </div>

              <div class="section">

                <div class="section-title">
                  Salary Details
                </div>

                <table>

                  <tr>
                    <th>
                      Component
                    </th>

                    <th class="right">
                      Amount
                    </th>
                  </tr>

                  <tr>
                    <td>
                      Basic Salary
                    </td>

                    <td class="right">
                      ${d(n(Number(t.basic_salary)))}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Total Allowances
                    </td>

                    <td class="right">
                      +${d(n(Number(t.total_allowances)))}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Gross Salary
                    </td>

                    <td class="right">
                      ${d(n(P))}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Total Deductions
                    </td>

                    <td class="right">
                      -${d(n(Number(t.total_deductions)))}
                    </td>
                  </tr>

                </table>

              </div>

              <div class="net-box">

                <div class="net-label">
                  NET SALARY
                </div>

                <div class="net-value">
                  ${d(n(Number(t.net_salary)))}
                </div>

              </div>

              <div class="notes">

                <div>
                  • This is a computer-generated salary slip.
                </div>

                <div>
                  • Salary information is confidential and intended only for the employee.
                </div>

                <div>
                  • For any payroll discrepancy, please contact HR/Admin.
                </div>

              </div>

              <div class="signatures">

                <div class="signature">
                  Employee
                </div>

                <div class="signature">
                  Authorized HR / Admin
                </div>

              </div>

              <div class="footer">

                <div>
                  ${d(k)}
                </div>

                <div>
                  Generated on
                  ${d(new Date().toLocaleDateString("en-IN"))}
                </div>

              </div>

            </div>

            <script>

              window.addEventListener(
                "load",
                function () {
                  setTimeout(
                    function () {
                      window.print();

                      window.addEventListener(
                        "afterprint",
                        function () {
                          window.close();
                        }
                      );
                    },
                    350
                  );
                }
              );

            <\/script>

          </body>
        </html>
      `),l.document.close()}catch(m){console.error("Salary slip print error:",m),v(m instanceof Error?m.message:"Unable to print salary slip.")}finally{Y(null)}}return _?e.jsx(q,{children:e.jsx("div",{className:"flex min-h-[50vh] items-center justify-center",children:e.jsx(f,{className:"h-8 w-8 animate-spin text-primary"})})}):r!=null&&r.isEmployee?e.jsx(q,{children:e.jsxs("div",{className:"min-w-0 space-y-6 overflow-x-hidden",children:[e.jsx("div",{className:"min-w-0",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",children:e.jsx(G,{className:"h-5 w-5"})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("h1",{className:"truncate text-xl font-bold sm:text-2xl",children:"My Salary Slips"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"View, download and print your salary statements."})]})]})}),e.jsxs("div",{className:"flex items-start gap-3 rounded-2xl border border-border bg-card p-4",children:[e.jsx(be,{className:"mt-0.5 h-5 w-5 shrink-0 text-primary"}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-sm font-semibold",children:"Private employee information"}),e.jsx("p",{className:"mt-1 text-xs leading-5 text-muted-foreground sm:text-sm",children:"Only salary slips belonging to your authenticated employee account are available here."})]})]}),M&&e.jsx("div",{className:"break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700",children:M}),!$&&e.jsxs("div",{className:"grid grid-cols-1 gap-4 sm:grid-cols-2",children:[e.jsx("div",{className:"rounded-2xl border border-border bg-card p-5 shadow-sm",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700",children:e.jsx(U,{className:"h-5 w-5"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Available Slips"}),e.jsx("p",{className:"text-2xl font-bold",children:N.length})]})]})}),e.jsx("div",{className:"rounded-2xl border border-border bg-card p-5 shadow-sm",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700",children:e.jsx(G,{className:"h-5 w-5"})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Total Paid"}),e.jsx("p",{className:"truncate text-xl font-bold sm:text-2xl",children:n(Q)})]})]})})]}),p&&!$&&e.jsx("div",{className:"rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6",children:e.jsxs("div",{className:"flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-bold uppercase tracking-wide text-primary",children:"Latest Salary Slip"}),e.jsxs("h2",{className:"mt-1 text-xl font-bold",children:[g[p.month-1]," ",p.year]}),e.jsxs("p",{className:"mt-1 text-sm text-muted-foreground",children:["Net Salary:"," ",e.jsx("span",{className:"font-bold text-foreground",children:n(Number(p.net_salary))})]})]}),e.jsxs("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-3",children:[e.jsxs("button",{type:"button",onClick:()=>C(p),className:"inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold transition hover:bg-muted",children:[e.jsx(B,{className:"h-4 w-4"}),"View"]}),e.jsxs("button",{type:"button",onClick:()=>void z(p),disabled:w===p.id,className:"inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold transition hover:bg-muted disabled:opacity-50",children:[w===p.id?e.jsx(f,{className:"h-4 w-4 animate-spin"}):e.jsx(L,{className:"h-4 w-4"}),"Print"]}),e.jsxs("button",{type:"button",onClick:()=>void A(p),disabled:j===p.id,className:"inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50",children:[j===p.id?e.jsx(f,{className:"h-4 w-4 animate-spin"}):e.jsx(F,{className:"h-4 w-4"}),"Download PDF"]})]})]})}),$?e.jsx("div",{className:"flex min-h-[300px] items-center justify-center rounded-2xl border border-border bg-card",children:e.jsx(f,{className:"h-8 w-8 animate-spin text-primary"})}):N.length===0?e.jsxs("div",{className:"flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 text-center",children:[e.jsx(U,{className:"h-12 w-12 text-muted-foreground"}),e.jsx("h3",{className:"mt-4 text-lg font-semibold",children:"No salary slips available"}),e.jsx("p",{className:"mt-2 max-w-md text-sm leading-6 text-muted-foreground",children:"Your processed or paid salary slips will appear here after payroll is generated by HR."})]}):e.jsx("div",{className:"grid gap-4",children:N.map(t=>e.jsxs("div",{className:"min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5",children:[e.jsxs("div",{className:"flex min-w-0 items-start justify-between gap-3",children:[e.jsxs("div",{className:"min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ye,{className:"h-4 w-4 shrink-0 text-muted-foreground"}),e.jsxs("h3",{className:"truncate font-bold",children:[g[t.month-1]," ",t.year]})]}),e.jsx("p",{className:"mt-2 text-sm text-muted-foreground",children:"Net Salary"}),e.jsx("p",{className:"text-lg font-bold text-primary",children:n(Number(t.net_salary))})]}),e.jsx("span",{className:`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${ge(t.status)}`,children:T(t.status)})]}),e.jsxs("div",{className:"mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3",children:[e.jsxs("div",{className:"rounded-xl bg-muted/50 p-3",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Basic Salary"}),e.jsx("p",{className:"mt-1 font-semibold",children:n(Number(t.basic_salary))})]}),e.jsxs("div",{className:"rounded-xl bg-muted/50 p-3",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Allowances"}),e.jsxs("p",{className:"mt-1 font-semibold text-emerald-600",children:["+",n(Number(t.total_allowances))]})]}),e.jsxs("div",{className:"rounded-xl bg-muted/50 p-3",children:[e.jsx("p",{className:"text-xs text-muted-foreground",children:"Deductions"}),e.jsxs("p",{className:"mt-1 font-semibold text-destructive",children:["-",n(Number(t.total_deductions))]})]})]}),e.jsxs("div",{className:"mt-4 border-t border-border pt-4",children:[e.jsxs("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-3",children:[e.jsxs("button",{type:"button",onClick:()=>C(t),className:"inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted",children:[e.jsx(B,{className:"h-4 w-4"}),"View"]}),e.jsxs("button",{type:"button",onClick:()=>void z(t),disabled:w===t.id,className:"inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50",children:[w===t.id?e.jsx(f,{className:"h-4 w-4 animate-spin"}):e.jsx(L,{className:"h-4 w-4"}),"Print"]}),e.jsxs("button",{type:"button",onClick:()=>void A(t),disabled:j===t.id,className:"inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50",children:[j===t.id?e.jsx(f,{className:"h-4 w-4 animate-spin"}):e.jsx(F,{className:"h-4 w-4"}),"Download PDF"]})]}),e.jsx("p",{className:"mt-3 text-xs text-muted-foreground",children:t.paid_at?`Paid ${new Date(t.paid_at).toLocaleDateString("en-IN")}`:"Payroll processed"})]})]},t.id))}),c&&e.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6",children:[e.jsx("div",{className:"absolute inset-0 bg-black/40",onClick:()=>C(null)}),e.jsxs("div",{className:"relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-4 shadow-2xl sm:p-6",children:[e.jsxs("div",{className:"flex items-start justify-between gap-4 border-b border-border pb-5",children:[e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-xs font-bold uppercase tracking-wide text-primary",children:"Salary Slip"}),e.jsxs("h2",{className:"mt-1 truncate text-xl font-bold",children:[g[c.month-1]," ",c.year]})]}),e.jsx("button",{type:"button",onClick:()=>C(null),className:"shrink-0 rounded-lg p-2 hover:bg-muted",children:e.jsx(ne,{className:"h-5 w-5"})})]}),e.jsxs("div",{className:"mt-5 rounded-xl border border-border bg-muted/30 p-4",children:[e.jsx("div",{className:"text-xs font-bold uppercase tracking-wide text-muted-foreground",children:"Employee"}),e.jsx("div",{className:"mt-2 font-semibold",children:((J=s==null?void 0:s.user_metadata)==null?void 0:J.full_name)||"Employee"}),e.jsx("div",{className:"mt-1 break-all text-sm text-muted-foreground",children:s==null?void 0:s.email})]}),e.jsxs("div",{className:"mt-5 grid gap-3",children:[e.jsxs("div",{className:"rounded-xl border border-border p-4",children:[e.jsx("div",{className:"text-sm text-muted-foreground",children:"Basic Salary"}),e.jsx("div",{className:"mt-1 text-lg font-bold",children:n(Number(c.basic_salary))})]}),e.jsxs("div",{className:"rounded-xl border border-border p-4",children:[e.jsx("div",{className:"text-sm text-muted-foreground",children:"Total Allowances"}),e.jsxs("div",{className:"mt-1 text-lg font-bold text-emerald-600",children:["+",n(Number(c.total_allowances))]})]}),e.jsxs("div",{className:"rounded-xl border border-border p-4",children:[e.jsx("div",{className:"text-sm text-muted-foreground",children:"Total Deductions"}),e.jsxs("div",{className:"mt-1 text-lg font-bold text-destructive",children:["-",n(Number(c.total_deductions))]})]})]}),e.jsx("div",{className:"mt-5 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5",children:e.jsxs("div",{className:"flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",children:[e.jsx("span",{className:"text-lg font-bold",children:"Net Salary"}),e.jsx("span",{className:"text-2xl font-black text-primary",children:n(Number(c.net_salary))})]})}),e.jsxs("div",{className:"mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2",children:[e.jsxs("button",{type:"button",onClick:()=>void z(c),disabled:w===c.id,className:"inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 font-bold hover:bg-muted disabled:opacity-50",children:[w===c.id?e.jsx(f,{className:"h-4 w-4 animate-spin"}):e.jsx(L,{className:"h-4 w-4"}),"Print Salary Slip"]}),e.jsxs("button",{type:"button",onClick:()=>void A(c),disabled:j===c.id,className:"inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50",children:[j===c.id?e.jsx(f,{className:"h-4 w-4 animate-spin"}):e.jsx(F,{className:"h-4 w-4"}),"Download PDF"]})]}),e.jsxs("div",{className:"mt-5 flex items-center gap-3 rounded-xl bg-muted/50 p-4 text-xs leading-5 text-muted-foreground",children:[e.jsx(ce,{className:"h-5 w-5 shrink-0 text-primary"}),e.jsx("span",{children:"This is a computer-generated salary slip for the authenticated employee account."})]})]})]})]})}):null}export{we as default};
