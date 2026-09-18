import{c}from"./index-jl0uuylT.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=c("Timer",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);function p(n,s){const[e,i]=n.split(":").map(Number),[r,t]=s.split(":").map(Number),u=e*60+(i||0),o=r*60+(t||0);return o>u?(o-u)/60:(24*60-u+o)/60}function a(n,s){const[e,i]=n.split(":").map(Number),[r,t]=s.split(":").map(Number),u=e*60+(i||0);return r*60+(t||0)<=u}function M(n,s,e){const[i,r]=e.split(":").map(Number),t=new Date(n);return t.setHours(i,r||0,0,0),a(s,e)&&t.setDate(t.getDate()+1),t}export{d as T,M as a,p as g};
