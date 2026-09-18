import{c as a,j as e,e as l}from"./index-jl0uuylT.js";import{c as d}from"./table-DD-ceLcX.js";import{A as i}from"./useSorting-04cc9fh_.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=a("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=a("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);function j({children:t,sortKey:s,currentSortKey:c,direction:r,onSort:n,className:m}){const o=c===s;return e.jsx(d,{onClick:()=>n(s),className:l("cursor-pointer select-none hover:bg-muted/50 transition-colors",m),children:e.jsxs("div",{className:"flex items-center gap-1",children:[t,e.jsx("span",{className:"ml-1",children:o&&r==="asc"?e.jsx(x,{className:"h-3.5 w-3.5 text-foreground"}):o&&r==="desc"?e.jsx(p,{className:"h-3.5 w-3.5 text-foreground"}):e.jsx(i,{className:"h-3.5 w-3.5 text-muted-foreground/50"})})]})})}export{j as S};
