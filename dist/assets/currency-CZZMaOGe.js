const n=(t,r=!1)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:r?2:0,maximumFractionDigits:r?2:0}).format(t);export{n as f};
