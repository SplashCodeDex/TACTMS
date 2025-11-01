import{c as r,j as o}from"./index-Bq4oxRZ8.js";import{I as a}from"./info-C2TkxqS3.js";/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=r("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]),c=t=>{switch(t){case"top":return"info-tooltip-top";case"bottom":return"info-tooltip-bottom";case"left":return"info-tooltip-left";case"right":return"info-tooltip-right";default:return"info-tooltip-top"}},m=({text:t,iconSize:i=18,className:n,position:s="top"})=>{const e=c(s);return o.jsxs("div",{className:`info-tooltip-container ${n||""}`,tabIndex:0,role:"tooltip",children:[o.jsx(a,{size:i,className:"info-tooltip-icon text-[var(--text-muted)] hover:text-[var(--primary-accent-start)] transition-colors"}),o.jsx("div",{className:`info-tooltip-content ${e}`,children:typeof t=="string"?o.jsx("p",{className:"text-sm",children:t}):t})]})};export{f as C,m as I};
