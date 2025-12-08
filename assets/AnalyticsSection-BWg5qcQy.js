import{c as T,j as e,a as A,r as p,u as H,M as _,B as w,L as q,C as z,m as M,q as W,A as E,s as F,i as U,k as Y,l as O,t as L,T as C,b as B,d as V,e as Q,g as P,h as K,S as J}from"./index-D2A2AOn4.js";import{a as X,C as Z,B as ee}from"./ChatInterface-f4xjknmB.js";import{T as te}from"./trending-up-Dr4XT2Sc.js";import{F as G}from"./file-text-DmtXcTrl.js";import{D as ae}from"./download-WcLx35U_.js";import re from"./purify.es-B6FQ9oRL.js";/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=T("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const se=T("Lightbulb",[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]]);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=T("MessageSquareQuote",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}],["path",{d:"M8 12a2 2 0 0 0 2-2V8H8",key:"1jfesj"}],["path",{d:"M14 12a2 2 0 0 0 2-2V8h-2",key:"1dq9mh"}]]);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oe=T("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]),le=()=>e.jsxs("div",{className:"space-y-6 p-4",children:[e.jsxs("div",{className:"flex items-end gap-3",children:[e.jsx("div",{className:"w-10 h-10 rounded-full bg-[var(--bg-elevated)] animate-pulse flex-shrink-0"}),e.jsx("div",{className:"w-3/5",children:e.jsx("div",{className:"h-20 w-full rounded-lg bg-[var(--bg-elevated)] animate-pulse"})})]}),e.jsxs("div",{className:"flex items-end gap-3 flex-row-reverse",children:[e.jsx("div",{className:"w-10 h-10 rounded-full bg-[var(--bg-elevated)] animate-pulse flex-shrink-0"}),e.jsx("div",{className:"w-1/2",children:e.jsx("div",{className:"h-12 w-full rounded-lg bg-[var(--bg-elevated)] animate-pulse"})})]}),e.jsxs("div",{className:"flex items-end gap-3",children:[e.jsx("div",{className:"w-10 h-10 rounded-full bg-[var(--bg-elevated)] animate-pulse flex-shrink-0"}),e.jsx("div",{className:"w-4/5",children:e.jsx("div",{className:"h-28 w-full rounded-lg bg-[var(--bg-elevated)] animate-pulse"})})]})]}),D=[{id:"top_10_tithers",label:"Top 10 Tithers This Month",query:"Show me the top 10 highest tithers this month with their amounts",category:"tithers"},{id:"inactive_members",label:"Inactive Members (4+ weeks)",query:"List all members who have not tithed in the last 4 weeks",category:"members"},{id:"month_comparison",label:"Compare to Last Month",query:"Compare this month's total tithe to last month. What is the difference?",category:"comparison"},{id:"assembly_breakdown",label:"Total by Assembly",query:"Show total tithe amount broken down by each assembly",category:"trends"},{id:"weekly_trend",label:"Weekly Trend",query:"What is the weekly tithe trend for the past 4 weeks?",category:"trends"},{id:"new_tithers",label:"New Tithers This Month",query:"List all members who tithed for the first time this month",category:"members"},{id:"consistent_tithers",label:"Most Consistent Tithers",query:"Who are the most consistent tithers (tithed every week this month)?",category:"tithers"},{id:"average_tithe",label:"Average Tithe Amount",query:"What is the average tithe amount per person this month?",category:"trends"}],ie=({onSelectQuery:s,compact:n=!1})=>{const m=t=>{switch(t){case"tithers":return e.jsx(A,{size:14});case"trends":return e.jsx(te,{size:14});case"comparison":return e.jsx(X,{size:14});case"members":return e.jsx(A,{size:14});default:return e.jsx(oe,{size:14})}},o=t=>{switch(t){case"tithers":return"bg-green-500/10 text-green-500 hover:bg-green-500/20";case"trends":return"bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";case"comparison":return"bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";case"members":return"bg-orange-500/10 text-orange-500 hover:bg-orange-500/20";default:return"bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"}};if(n)return e.jsx("div",{className:"flex flex-wrap gap-2",children:D.slice(0,4).map(t=>e.jsxs("button",{onClick:()=>s(t.query),className:`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${o(t.category)}`,children:[m(t.category),t.label]},t.id))});const i=D.reduce((t,d)=>(t[d.category]||(t[d.category]=[]),t[d.category].push(d),t),{}),l={tithers:"👤 Tithers",trends:"📈 Trends",comparison:"📊 Comparisons",members:"👥 Members"};return e.jsxs("div",{className:"space-y-4",children:[e.jsx("h4",{className:"text-sm font-medium text-text-secondary",children:"Quick Questions"}),Object.entries(i).map(([t,d])=>e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-text-secondary mb-2",children:l[t]||t}),e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-2",children:d.map(r=>e.jsx("button",{onClick:()=>s(r.query),className:"p-3 text-left rounded-lg border border-border-color hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:`p-1 rounded ${o(r.category)}`,children:m(r.category)}),e.jsx("span",{className:"text-sm font-medium text-text-primary group-hover:text-purple-400",children:r.label})]})},r.id))})]},t))]})},ce=async(s,n,m)=>{const{type:o,startDate:i,endDate:l,assembly:t,format:d}=s;let r=n;switch(i&&(r=r.filter(u=>new Date(u.selectedDate)>=i)),l&&(r=r.filter(u=>new Date(u.selectedDate)<=l)),t&&t!=="all"&&(r=r.filter(u=>u.assemblyName===t)),o){case"weekly_summary":return R(r,t||"All Assemblies",d);case"monthly_pdf":return de(r,t||"All Assemblies",d);case"year_end":return me(r,t||"All Assemblies",d);default:return he(r,s)}},R=async(s,n,m)=>{const o=new Date,i=new Date(o.getTime()-7*24*60*60*1e3),l=s.filter(a=>new Date(a.selectedDate)>=i),t=l.reduce((a,c)=>a+c.totalTitheAmount,0),d=l.reduce((a,c)=>a+c.titherCount,0),r=new Set(l.flatMap(a=>a.titheListData.map(c=>c["Membership Number"]))).size,u=m==="text"?`
📊 WEEKLY TITHE SUMMARY
${n.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━

📅 Week: ${j(i)} - ${j(o)}

💰 Total Tithe: GHS ${t.toLocaleString()}
👥 Unique Tithers: ${r}
📝 Transactions: ${d}

Top 5 Contributors:
${S(l).map((a,c)=>`${c+1}. ${a.name}: GHS ${a.amount}`).join(`
`)}

🙏 Thank you for your faithful giving!
`.trim():`
# 📊 Weekly Tithe Summary
## ${n}

**Period:** ${j(i)} - ${j(o)}

| Metric | Value |
|--------|-------|
| 💰 Total Tithe | GHS ${t.toLocaleString()} |
| 👥 Unique Tithers | ${r} |
| 📝 Transactions | ${d} |

### Top 5 Contributors
${S(l).map((a,c)=>`${c+1}. **${a.name}**: GHS ${a.amount}`).join(`
`)}

---
🙏 *Thank you for your faithful giving!*
`.trim();return{title:`Weekly Summary - ${n}`,content:u,format:m,generatedAt:o,metadata:{period:`${j(i)} - ${j(o)}`,assembly:n,totalAmount:t,titherCount:r}}},de=async(s,n,m)=>{const o=new Date,i=new Date(o.getFullYear(),o.getMonth(),1),l=s.filter(h=>new Date(h.selectedDate)>=i),t=l.reduce((h,x)=>h+x.totalTitheAmount,0),d=new Set(l.flatMap(h=>h.titheListData.map(x=>x["Membership Number"]))).size,r=new Map;l.forEach(h=>{r.set(h.assemblyName,(r.get(h.assemblyName)||0)+h.totalTitheAmount)});const u=new Map;l.forEach(h=>{const x=ue(new Date(h.selectedDate));u.set(x,(u.get(x)||0)+h.totalTitheAmount)});const a=o.toLocaleDateString("en-US",{month:"long",year:"numeric"}),c=`
# 📈 Monthly Tithe Report
## ${n} - ${a}

---

### Summary
| Metric | Value |
|--------|-------|
| 💰 **Total Tithe** | GHS ${t.toLocaleString()} |
| 👥 **Unique Tithers** | ${d} |
| 📊 **Weekly Average** | GHS ${Math.round(t/Math.max(u.size,1)).toLocaleString()} |

---

### Weekly Breakdown
| Week | Amount |
|------|--------|
${Array.from(u.entries()).sort((h,x)=>h[0]-x[0]).map(([h,x])=>`| Week ${h} | GHS ${x.toLocaleString()} |`).join(`
`)}

---

### Assembly Breakdown
${Array.from(r.entries()).sort((h,x)=>x[1]-h[1]).map(([h,x])=>`- **${h}**: GHS ${x.toLocaleString()}`).join(`
`)}

---

### Top 10 Contributors
${S(l,10).map((h,x)=>`${x+1}. **${h.name}**: GHS ${h.amount.toLocaleString()}`).join(`
`)}

---

*Report generated by TACTMS on ${o.toLocaleString()}*
`.trim();return{title:`Monthly Report - ${n} - ${a}`,content:c,format:m,generatedAt:o,metadata:{period:a,assembly:n,totalAmount:t,titherCount:d}}},me=async(s,n,m)=>{const o=new Date,i=new Date(o.getFullYear(),0,1),l=s.filter(a=>new Date(a.selectedDate)>=i),t=l.reduce((a,c)=>a+c.totalTitheAmount,0),d=new Map;l.forEach(a=>{const c=new Date(a.selectedDate).toLocaleDateString("en-US",{month:"short"});d.set(c,(d.get(c)||0)+a.totalTitheAmount)});const r=S(l,20),u=`
# 📊 Year-End Tithe Report
## ${o.getFullYear()} - ${n}

---

## Annual Summary

| Metric | Value |
|--------|-------|
| 💰 **Total Annual Tithe** | GHS ${t.toLocaleString()} |
| 📅 **Weeks Recorded** | ${l.length} |
| 📈 **Monthly Average** | GHS ${Math.round(t/12).toLocaleString()} |

---

## Monthly Trend
| Month | Amount | % of Total |
|-------|--------|------------|
${Array.from(d.entries()).map(([a,c])=>`| ${a} | GHS ${c.toLocaleString()} | ${Math.round(c/t*100)}% |`).join(`
`)}

---

## Top 20 Contributors
| Rank | Name | Total | Avg/Week |
|------|------|-------|----------|
${r.map((a,c)=>`| ${c+1} | ${a.name} | GHS ${a.amount.toLocaleString()} | GHS ${Math.round(a.amount/l.length)} |`).join(`
`)}

---

## Highlights
- **Highest Month**: ${xe(d)}
- **Total Transactions**: ${l.reduce((a,c)=>a+c.recordCount,0).toLocaleString()}
- **Average Tithe**: GHS ${Math.round(t/Math.max(l.reduce((a,c)=>a+c.titherCount,0),1))}

---

*Glory to God for a blessed ${o.getFullYear()}!*

*Report generated by TACTMS on ${o.toLocaleString()}*
`.trim();return{title:`Year-End Report - ${n} - ${o.getFullYear()}`,content:u,format:m,generatedAt:o,metadata:{period:String(o.getFullYear()),assembly:n,totalAmount:t,titherCount:new Set(l.flatMap(a=>a.titheListData.map(c=>c["Membership Number"]))).size}}},he=async(s,n,m)=>(s.reduce((o,i)=>o+i.totalTitheAmount,0),R(s,n.assembly||"All Assemblies",n.format)),j=s=>s.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),ue=s=>{const n=new Date(s.getFullYear(),s.getMonth(),1);return Math.ceil((s.getDate()+n.getDay())/7)},S=(s,n=5)=>{const m=new Map;return s.forEach(o=>{o.titheListData.forEach(i=>{const l=String(i["Membership Number"]).split("(")[0].trim(),t=typeof i["Transaction Amount"]=="number"?i["Transaction Amount"]:parseFloat(String(i["Transaction Amount"]))||0;m.set(l,(m.get(l)||0)+t)})}),Array.from(m.entries()).sort((o,i)=>i[1]-o[1]).slice(0,n).map(([o,i])=>({name:o,amount:i}))},xe=s=>{let n={month:"",amount:0};return s.forEach((m,o)=>{m>n.amount&&(n={month:o,amount:m})}),`${n.month} (GHS ${n.amount.toLocaleString()})`},ge=({isOpen:s,onClose:n,transactionLogs:m,currentAssembly:o})=>{const[i,l]=p.useState("weekly_summary"),[t,d]=p.useState(o||"all"),[r,u]=p.useState(!1),[a,c]=p.useState(null),[h,x]=p.useState(!1),b=[{value:"weekly_summary",label:"Weekly Summary",description:"Quick summary for WhatsApp/messaging"},{value:"monthly_pdf",label:"Monthly Report",description:"Detailed report for meetings"},{value:"year_end",label:"Year-End Report",description:"Comprehensive annual summary"}],y=async()=>{u(!0),c(null);try{const g=await ce({type:i,assembly:t==="all"?void 0:t,format:"markdown"},m,"");c(g)}catch(g){console.error("Failed to generate report:",g)}finally{u(!1)}},f=async()=>{a&&(await navigator.clipboard.writeText(a.content),x(!0),setTimeout(()=>x(!1),2e3))},v=()=>{if(!a)return;const g=new Blob([a.content],{type:"text/markdown"}),$=URL.createObjectURL(g),k=document.createElement("a");k.href=$,k.download=`${a.title.replace(/\s+/g,"_")}.md`,k.click(),URL.revokeObjectURL($)},{assemblies:N}=H();return e.jsx(_,{isOpen:s,onClose:n,title:"Generate Report",size:"xl",children:e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-text-primary mb-2",children:"Report Type"}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3",children:b.map(g=>e.jsxs("button",{onClick:()=>l(g.value),className:`p-4 rounded-xl border text-left transition-all ${i===g.value?"border-purple-500 bg-purple-500/10":"border-border-color hover:border-purple-500/50"}`,children:[e.jsx("div",{className:"font-medium text-text-primary",children:g.label}),e.jsx("div",{className:"text-xs text-text-secondary mt-1",children:g.description})]},g.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-text-primary mb-2",children:"Assembly"}),e.jsxs("select",{value:t,onChange:g=>d(g.target.value),className:"w-full p-3 rounded-xl bg-hover-bg border border-border-color text-text-primary",children:[e.jsx("option",{value:"all",children:"All Assemblies"}),N.map(g=>e.jsx("option",{value:g,children:g},g))]})]}),e.jsx(w,{onClick:y,disabled:r,className:"w-full",children:r?e.jsxs(e.Fragment,{children:[e.jsx(q,{className:"animate-spin mr-2",size:16}),"Generating..."]}):e.jsxs(e.Fragment,{children:[e.jsx(G,{className:"mr-2",size:16}),"Generate Report"]})}),a&&e.jsxs("div",{className:"border border-border-color rounded-xl overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between p-3 bg-hover-bg border-b border-border-color",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"font-medium text-text-primary",children:a.title}),e.jsxs("p",{className:"text-xs text-text-secondary",children:[a.metadata.period," • GHS ",a.metadata.totalAmount.toLocaleString()]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(w,{variant:"secondary",onClick:f,className:"!px-3 !py-2",children:h?e.jsx(z,{size:16}):e.jsx(I,{size:16})}),e.jsx(w,{variant:"secondary",onClick:v,className:"!px-3 !py-2",children:e.jsx(ae,{size:16})})]})]}),e.jsx("div",{className:"p-4 max-h-96 overflow-y-auto",children:e.jsx("pre",{className:"text-sm text-text-primary whitespace-pre-wrap font-mono",children:a.content})})]})]})})},pe=F("inline-flex items-center justify-center cursor-pointer rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",{variants:{variant:{default:"bg-primary-accent-start text-white shadow-xs hover:bg-primary-accent-end",muted:"bg-muted text-muted-foreground",destructive:"bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",outline:"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",secondary:"bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",ghost:"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"},size:{default:"size-8 rounded-lg [&_svg]:size-4",sm:"size-6 [&_svg]:size-3",md:"size-10 rounded-lg [&_svg]:size-5",lg:"size-12 rounded-xl [&_svg]:size-6"}},defaultVariants:{variant:"default",size:"default"}});function be({content:s,className:n,size:m,variant:o,delay:i=3e3,onClick:l,onCopy:t,isCopied:d,onCopyChange:r,...u}){const[a,c]=p.useState(d??!1),h=a?z:I;p.useEffect(()=>{c(d??!1)},[d]);const x=p.useCallback(y=>{c(y),r==null||r(y)},[r]),b=p.useCallback(y=>{d||(s&&navigator.clipboard.writeText(s).then(()=>{x(!0),setTimeout(()=>x(!1),i),t==null||t(s)}).catch(f=>{console.error("Error copying command",f)}),l==null||l(y))},[d,s,i,l,t,x]);return e.jsx(M.button,{"data-slot":"copy-button",whileHover:{scale:1.05},whileTap:{scale:.95},className:W(pe({variant:o,size:m}),n),onClick:b,...u,children:e.jsx(E,{mode:"wait",children:e.jsx(M.span,{"data-slot":"copy-button-icon",initial:{scale:0},animate:{scale:1},exit:{scale:0},transition:{duration:.15},children:e.jsx(h,{})},a?"check":"copy")})})}const ye=({summary:s})=>{const n=s.replace(/\n/g,"<br />").replace(/\* \*\*(.*?)\*\*/g,'<li><strong class="text-[var(--primary-accent-start)]">$1</strong>').replace(/<\/strong>:(.*?)<br \/>/g,"</strong>:$1</li>").replace(/- \*\*(.*?)\*\*/g,'<li><strong class="text-[var(--primary-accent-start)]">$1</strong>').replace(/\*\*(.*?)\*\*/g,'<strong class="text-[var(--primary-accent-start)]">$1</strong>').replace(/- (.*?)(<br \/>|$)/g,'<li class="list-none ml-0 mb-1.5">$1</li>'),m=re.sanitize(n);return e.jsxs("div",{className:"content-card bg-[var(--bg-elevated)] border-l-4 border-[var(--primary-accent-start)]",children:[e.jsxs("h3",{className:"section-heading text-base !mb-3",children:[e.jsx(se,{size:18,className:"mr-3 icon-primary"}),"AI-Generated Summary"]}),e.jsx(J,{className:"h-48",children:e.jsx("ul",{className:"text-sm space-y-2 text-[var(--text-secondary)] pr-2",dangerouslySetInnerHTML:{__html:m}})})]})},ve=()=>e.jsx("div",{className:"space-y-4",children:[...Array(3)].map((s,n)=>e.jsxs("div",{className:"p-4 bg-[var(--bg-card-subtle-accent)] rounded-lg animate-pulse",children:[e.jsx("div",{className:"h-4 bg-[var(--border-color)] rounded w-1/3 mb-3"}),e.jsx("div",{className:"h-3 bg-[var(--border-color)] rounded w-full mb-1"}),e.jsx("div",{className:"h-3 bg-[var(--border-color)] rounded w-5/6"})]},n))}),fe=({reconciliationReport:s,addToast:n})=>{const[m,o]=p.useState([]),[i,l]=p.useState(!1),[t,d]=p.useState(null),r=(s==null?void 0:s.newMembers)||[],u=async()=>{if(r.length===0){n("No new members found in the current data to generate messages for.","warning");return}{n("AI features are not configured. Please contact support.","error");return}};return e.jsxs("section",{className:"content-card",children:[e.jsxs("h2",{className:"section-heading",children:[e.jsx(ne,{size:22,className:"mr-3 icon-primary"}),"AI Outreach Assistant"]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6 items-center",children:[e.jsxs("div",{children:[e.jsx("label",{htmlFor:"outreach-target",className:"form-label",children:"Select Target Group"}),e.jsxs(B,{value:"new-members",onValueChange:()=>{},disabled:!0,children:[e.jsx(V,{id:"outreach-target",className:"w-full",children:e.jsx(Q,{placeholder:"Select Target Group"})}),e.jsx(P,{className:"glassmorphism-bg border border-[var(--border-color)] rounded-xl",children:e.jsxs(K,{value:"new-members",children:["New Members (Souls Won) (",r.length,")"]})})]})]}),e.jsx("div",{className:"self-end",children:e.jsx(w,{onClick:u,isLoading:i,disabled:r.length===0||i,variant:"secondary",fullWidth:!0,children:"Generate Welcome Messages"})})]}),e.jsxs("div",{className:"mt-6 pt-6 border-t border-[var(--border-color)]",children:[i&&e.jsx(ve,{}),t&&e.jsxs("div",{className:"text-center py-6 text-[var(--danger-text)]",children:[e.jsx(C,{size:32,className:"mx-auto mb-2"}),e.jsx("p",{children:t})]}),!i&&!t&&m.length>0&&e.jsx("div",{className:"space-y-4 max-h-96 overflow-y-auto pr-2",children:m.map((a,c)=>e.jsxs("div",{className:"p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-color)]",children:[e.jsxs("div",{className:"flex justify-between items-center mb-2",children:[e.jsxs("h4",{className:"font-semibold text-[var(--text-primary)] flex items-center gap-2",children:[e.jsx(A,{size:16})," ",a.memberName]}),e.jsx(be,{content:a.message})]}),e.jsx("p",{className:"text-sm text-[var(--text-secondary)] whitespace-pre-wrap",children:a.message})]},c))}),!i&&!t&&m.length===0&&e.jsx("div",{className:"text-center py-6 text-[var(--text-muted)]",children:r.length>0?"Click 'Generate' to create personalized welcome messages for your new members.":"No new members found in the current workspace. Upload and reconcile a new file to identify them."})]})]})},Ae=()=>{var f;const{titheListData:s=[],currentAssembly:n,addToast:m,reconciliationReport:o,memberDatabase:i}=U(),l=Y("reportGenerator"),{chatHistory:t,chartData:d,isLoading:r,error:u,sendMessage:a}=O(""),c=()=>{{m("AI feature is not configured.","error");return}},h=v=>{v.trim()&&a(v)},x=s.length>0,b=t.length>0,y=(f=t[0])==null?void 0:f.summary;return e.jsxs("div",{className:"space-y-8",children:[e.jsx(fe,{reconciliationReport:o,addToast:m}),e.jsx("section",{className:"content-card",children:e.jsxs("div",{className:"flex justify-between items-center flex-wrap gap-4",children:[e.jsxs("h2",{id:"analytics-heading",className:"section-heading border-none pb-0 mb-0",children:[e.jsx(L,{size:22,className:"mr-3 icon-primary"}),"AI-Powered Analytics Chat"]}),e.jsx(w,{onClick:c,disabled:!x||r,isLoading:r&&!b,variant:"primary",children:b?`Restart Analysis for ${n}`:"Analyze with AI"}),e.jsxs(w,{onClick:()=>l.open(),variant:"secondary",className:"flex items-center gap-2",children:[e.jsx(G,{size:18}),"Generate Report"]})]})}),e.jsxs("div",{className:"min-h-[400px]",children:[u&&e.jsxs("div",{className:"content-card text-center py-10 flex flex-col items-center",children:[e.jsx(C,{size:48,className:"text-[var(--danger-text)] mb-4"}),e.jsx("h3",{className:"text-xl font-semibold text-[var(--danger-text)]",children:"Analysis Failed"}),e.jsx("p",{className:"text-[var(--text-secondary)] mt-2 max-w-md",children:u})]}),!b&&!r&&!u&&e.jsxs("div",{className:"content-card text-center py-10 flex flex-col items-center animate-fadeIn",children:[e.jsx(L,{size:52,className:"mx-auto text-[var(--text-muted)] mb-4 opacity-50"}),e.jsx("h3",{className:"text-xl font-semibold text-[var(--text-primary)]",children:"Ready for Insights?"}),e.jsx("p",{className:"text-[var(--text-secondary)] mt-2 max-w-md mb-6",children:x?`You have a list for ${n} Assembly ready. Click "Analyze with AI" to start a conversation about your data.`:"Generate or load a tithe list in the Processor view, then come back here to get an AI-powered analysis."}),x&&e.jsxs("div",{className:"w-full max-w-lg mt-4",children:[e.jsx("p",{className:"text-sm text-[var(--text-muted)] mb-3",children:"Or try a quick question:"}),e.jsx(ie,{onSelectQuery:h,compact:!0})]})]}),r&&!b&&e.jsx("div",{className:"content-card",children:e.jsx(le,{})}),b&&!u&&e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-8 items-start",children:[e.jsxs("div",{className:"lg:col-span-2 space-y-8",children:[y&&e.jsx(ye,{summary:y}),e.jsx("div",{className:"content-card",children:e.jsx(Z,{chatHistory:t,chartData:d,isLoading:r,error:u,onSendMessage:h,isOpen:!0,onToggle:()=>{}})})]}),e.jsx("div",{className:"lg:col-span-1 space-y-8 sticky top-8",children:d.length>0&&e.jsxs("div",{className:"content-card animate-fadeIn",children:[e.jsx("h3",{className:"section-heading text-base !mb-6",children:"Contribution Distribution"}),e.jsx(ee,{data:d})]})})]})]}),e.jsx(ge,{isOpen:l.isOpen,onClose:l.close,transactionLogs:[{id:"current-session",assemblyName:n||"General",timestamp:Date.now(),selectedDate:new Date().toISOString(),totalTitheAmount:s.reduce((v,N)=>v+(typeof N["Transaction Amount"]=="number"?N["Transaction Amount"]:parseFloat(String(N["Transaction Amount"]))||0),0),soulsWonCount:0,titherCount:new Set(s.map(v=>v["Membership Number"])).size,recordCount:s.length,titheListData:s,concatenationConfig:{},descriptionText:"Current Session",amountMappingColumn:null}],memberDatabase:i})]})};export{Ae as default};
