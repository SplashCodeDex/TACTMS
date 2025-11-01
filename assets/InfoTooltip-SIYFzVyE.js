import{c as r,j as o,I as a}from"./index-Bj-t18zv.js";/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=r("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]),c=t=>{switch(t){case"top":return"info-tooltip-top";case"bottom":return"info-tooltip-bottom";case"left":return"info-tooltip-left";case"right":return"info-tooltip-right";default:return"info-tooltip-top"}},f=({text:t,iconSize:n=18,className:s,position:i="top"})=>{const e=c(i);return o.jsxs("div",{className:`info-tooltip-container ${s||""}`,tabIndex:0,role:"tooltip",children:[o.jsx(a,{size:n,className:"info-tooltip-icon text-[var(--text-muted)] hover:text-[var(--primary-accent-start)] transition-colors"}),o.jsx("div",{className:`info-tooltip-content ${e}`,children:typeof t=="string"?o.jsx("p",{className:"text-sm",children:t}):t})]})};export{p as C,f as I};
