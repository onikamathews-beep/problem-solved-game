(() => {
"use strict";

const NOTE_KEY="growWherePlanted.noteCard.v1";
const COLOR_KEY="growWherePlanted.noteColor.v1";
const COLORS={
 cream:{label:"Soft Cream",paper:"#fbf1dc",line:"#d8bd86",ink:"#56351f"},
 blush:{label:"Soft Blush",paper:"#f3ddd6",line:"#cfaaa0",ink:"#56352f"},
 sage:{label:"Soft Sage",paper:"#dfe8d4",line:"#aebd9a",ink:"#34462f"},
 blue:{label:"Soft Blue",paper:"#dfe9ee",line:"#b1c4cc",ink:"#33454d"},
 gold:{label:"Soft Gold",paper:"#f3dfb8",line:"#d3b373",ink:"#5a3d1f"}
};

const style=document.createElement("style");
style.textContent=[
".grow-notes-fab{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:76px;height:76px;border-radius:50%;padding:0;border:2px solid #d9b763;background:#4e301d;box-shadow:0 8px 22px rgba(0,0,0,.34),0 0 0 3px rgba(255,240,191,.18);z-index:92;cursor:pointer;overflow:hidden;transition:transform .2s ease,box-shadow .2s ease}",
".grow-notes-fab:hover{transform:translateY(-2px) scale(1.035);box-shadow:0 11px 26px rgba(0,0,0,.38),0 0 0 4px rgba(255,228,142,.22)}",
".grow-notes-fab:focus-visible{outline:3px solid #ffe3a0;outline-offset:4px}.grow-notes-fab svg{width:100%;height:100%;display:block}",
".grow-notes-layer{position:fixed;inset:0;z-index:100;display:none;overflow-y:auto;padding:clamp(24px,5vh,58px) 16px 60px;background:linear-gradient(rgba(54,38,24,.38),rgba(54,38,24,.52)),url('./assets/grow-living-room.webp?v=38') center/cover fixed;backdrop-filter:blur(2px)}",
".grow-notes-layer.show{display:block}",
".grow-notes-sheet{--note-paper:#fbf1dc;--note-line:#d8bd86;--note-ink:#56351f;position:relative;width:min(92vw,760px);min-height:720px;margin:0 auto;padding:46px clamp(24px,5vw,58px) 54px;border:2px solid #c7a15a;border-radius:26px;color:var(--note-ink);background:radial-gradient(circle at 11% 7%,rgba(255,255,255,.68),transparent 28%),var(--note-paper);box-shadow:0 26px 70px rgba(25,15,8,.42),inset 0 0 0 1px rgba(255,255,255,.66);overflow:hidden}",
".grow-notes-sheet:before,.grow-notes-sheet:after{content:'❧';position:absolute;color:#73805c;font-size:64px;line-height:1;opacity:.8;pointer-events:none}.grow-notes-sheet:before{left:22px;top:20px;transform:rotate(-24deg)}.grow-notes-sheet:after{right:24px;bottom:22px;transform:rotate(156deg)}",
".grow-notes-close{position:absolute;right:18px;top:18px;width:46px;height:46px;border-radius:50%;border:2px solid #c3994e;color:#fff5dc;background:#5a341f;font:700 25px/1 Georgia,serif;box-shadow:0 4px 0 #8a642e;cursor:pointer;z-index:2}",
".grow-notes-title{margin:6px 58px 2px;text-align:center;font-family:'Segoe Script','Brush Script MT',cursive;font-size:clamp(48px,9vw,78px);font-weight:500;line-height:1;color:var(--note-ink)}.grow-notes-heart{text-align:center;color:#9d7542;font-size:25px;line-height:1;margin-bottom:18px}",
".grow-notes-editor{display:block;width:100%;min-height:470px;height:470px;padding:18px 18px 26px;border:1px solid rgba(169,135,82,.42);border-radius:18px;color:var(--note-ink);background:repeating-linear-gradient(to bottom,transparent 0 43px,var(--note-line) 44px,transparent 45px);resize:none;overflow:hidden;outline:none;font:clamp(20px,3.2vw,28px)/44px Georgia,'Times New Roman',serif;letter-spacing:.005em}",
".grow-notes-editor::placeholder{color:rgba(86,53,31,.48)}.grow-notes-editor:focus{border-color:#c69d54;box-shadow:0 0 0 3px rgba(199,161,90,.15)}.grow-notes-save{margin:12px 8px 0;text-align:right;color:rgba(86,53,31,.68);font:700 12px/1.3 system-ui,sans-serif}",
".grow-notes-settings{margin:14px 0 4px;padding:14px;border:1px solid rgba(196,166,105,.6);border-radius:16px;background:rgba(255,248,229,.62)}.grow-notes-settings h3{margin:0 0 10px;color:#324b35;font:700 19px/1.1 Georgia,serif}.grow-notes-settings-label{display:block;margin:0 0 8px;color:#5c5b50;font:800 12px/1.2 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}",
".grow-note-swatches{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.grow-note-swatch{width:44px;height:44px;border-radius:13px;border:2px solid rgba(91,70,43,.3);cursor:pointer;box-shadow:inset 0 0 0 2px rgba(255,255,255,.45),0 2px 0 rgba(72,51,31,.2);position:relative}.grow-note-swatch[aria-pressed='true']{outline:3px solid #c39d55;outline-offset:2px}.grow-note-swatch[aria-pressed='true']:after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;color:#4d3927;font:900 22px system-ui,sans-serif}",
".grow-notes-export-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.grow-notes-export-row .setting-action{min-height:44px;width:100%}.settings-card{max-height:min(88vh,760px);overflow-y:auto}",
"@media(max-width:620px){.grow-notes-fab{width:64px;height:64px;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))}.grow-notes-layer{padding:18px 10px 50px}.grow-notes-sheet{width:96vw;min-height:680px;padding:42px 18px 44px;border-radius:22px}.grow-notes-title{margin-left:52px;margin-right:52px}.grow-notes-editor{padding-left:12px;padding-right:12px}.grow-notes-export-row{grid-template-columns:1fr}}"
].join("");
document.head.append(style);

const fab=document.createElement("button");
fab.id="growNotesFab";fab.className="grow-notes-fab";fab.type="button";fab.setAttribute("aria-label","Open notes");
fab.innerHTML="<svg viewBox='0 0 100 100' aria-hidden='true'><defs><radialGradient id='nw' cx='42%' cy='35%'><stop offset='0' stop-color='#8a5a32'/><stop offset='1' stop-color='#4d2d19'/></radialGradient><linearGradient id='np' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#fff8e8'/><stop offset='1' stop-color='#e9d6ad'/></linearGradient></defs><circle cx='50' cy='50' r='48' fill='url(#nw)' stroke='#e1b95c' stroke-width='4'/><rect x='25' y='24' width='50' height='49' rx='7' fill='#e7d3a9' transform='rotate(-7 50 50)'/><rect x='21' y='27' width='56' height='50' rx='7' fill='url(#np)' stroke='#d5bd8d' stroke-width='1.5'/><path d='M30 38c8-12 18-8 21-18-2 10-8 17-20 24' fill='none' stroke='#66754d' stroke-width='2.4'/><ellipse cx='35' cy='34' rx='5' ry='2.7' fill='#7c895d' transform='rotate(-35 35 34)'/><ellipse cx='41' cy='29' rx='5' ry='2.7' fill='#7c895d' transform='rotate(22 41 29)'/><path d='M32 49h35M32 57h35M32 65h26' stroke='#c9ad76' stroke-width='1.7' stroke-linecap='round'/><g transform='rotate(17 70 61)'><rect x='68' y='36' width='7' height='40' rx='3.5' fill='#f7eed7' stroke='#c99a3a' stroke-width='2'/><path d='M68 71h7l-3.5 8z' fill='#c99a3a'/></g></svg>";
document.body.append(fab);

const layer=document.createElement("div");
layer.id="growNotesLayer";layer.className="grow-notes-layer";layer.setAttribute("role","dialog");layer.setAttribute("aria-modal","true");layer.setAttribute("aria-hidden","true");layer.setAttribute("aria-labelledby","growNotesTitle");
layer.innerHTML="<section class='grow-notes-sheet' id='growNotesSheet'><button class='grow-notes-close' id='growNotesClose' type='button' aria-label='Close notes'>×</button><h2 class='grow-notes-title' id='growNotesTitle'>Notes</h2><div class='grow-notes-heart' aria-hidden='true'>♡</div><textarea id='growNotesEditor' class='grow-notes-editor' spellcheck='true' placeholder='Write anything you want to remember from the conversation...'></textarea><div class='grow-notes-save' id='growNotesSave'>Kept until this game ends</div></section>";
document.body.append(layer);

const sheet=document.getElementById("growNotesSheet"),editor=document.getElementById("growNotesEditor"),closeBtn=document.getElementById("growNotesClose"),saveNote=document.getElementById("growNotesSave");
function colorKey(){const k=localStorage.getItem(COLOR_KEY)||"cream";return COLORS[k]?k:"cream";}
function applyColor(k){if(!COLORS[k])k="cream";localStorage.setItem(COLOR_KEY,k);const c=COLORS[k];sheet.style.setProperty("--note-paper",c.paper);sheet.style.setProperty("--note-line",c.line);sheet.style.setProperty("--note-ink",c.ink);document.querySelectorAll("[data-grow-note-color]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.growNoteColor===k)));}
function autoGrow(){editor.style.height="0px";editor.style.height=Math.max(470,editor.scrollHeight+12)+"px";}
let saveTimer=0;editor.value=localStorage.getItem(NOTE_KEY)||"";autoGrow();
editor.addEventListener("input",()=>{autoGrow();localStorage.setItem(NOTE_KEY,editor.value);saveNote.textContent="Saving…";clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveNote.textContent="Kept until this game ends",260);});
function openNotes(){applyColor(colorKey());layer.classList.add("show");layer.setAttribute("aria-hidden","false");requestAnimationFrame(()=>{autoGrow();editor.focus();});}
function closeNotes(){layer.classList.remove("show");layer.setAttribute("aria-hidden","true");fab.focus();}
fab.addEventListener("click",openNotes);closeBtn.addEventListener("click",closeNotes);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&layer.classList.contains("show")){e.preventDefault();e.stopImmediatePropagation();closeNotes();}},true);
function clearSession(){
 localStorage.removeItem(NOTE_KEY);
 editor.value="";
 autoGrow();
 saveNote.textContent="Kept until this game ends";
}
window.GrowNotesAPI={open:openNotes,close:closeNotes,clearSession};

const settingsCard=document.querySelector("#settingsLayer .settings-card");
if(settingsCard){
 const roomMenu=document.getElementById("roomMenu"),block=document.createElement("div");block.className="grow-notes-settings";
 let swatches="";Object.entries(COLORS).forEach(([k,c])=>{swatches+="<button class='grow-note-swatch' type='button' data-grow-note-color='"+k+"' title='"+c.label+"' aria-label='"+c.label+"' style='background:"+c.paper+"'></button>";});
 block.innerHTML="<h3>Notes</h3><span class='grow-notes-settings-label'>Note card color</span><div class='grow-note-swatches' role='group' aria-label='Note card color'>"+swatches+"</div><span class='grow-notes-settings-label'>Export notes</span><div class='grow-notes-export-row'><button class='setting-action' id='growNotesExportPng' type='button'>Export PNG</button><button class='setting-action' id='growNotesExportPdf' type='button'>Export PDF Sheet</button></div>";
 settingsCard.insertBefore(block,roomMenu||settingsCard.lastElementChild);
 block.querySelectorAll("[data-grow-note-color]").forEach(b=>b.addEventListener("click",()=>applyColor(b.dataset.growNoteColor)));
 document.getElementById("growNotesExportPng").addEventListener("click",exportPng);
 document.getElementById("growNotesExportPdf").addEventListener("click",exportPdf);
}
applyColor(colorKey());

function fileName(ext){return "grow-notes-"+new Date().toISOString().slice(0,10)+"."+ext;}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1800);}
function wrap(ctx,text,maxWidth){const out=[];String(text||"").replace(/\r/g,"").split("\n").forEach(p=>{if(!p.trim()){out.push("");return;}let line="";p.split(/\s+/).forEach(w=>{const t=line?line+" "+w:w;if(ctx.measureText(t).width<=maxWidth||!line)line=t;else{out.push(line);line=w;}});out.push(line);});return out.length?out:[""];}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));}
function leaf(ctx,x,y,s,flip){ctx.save();ctx.translate(x,y);ctx.scale(flip*s,s);ctx.rotate(-.34);ctx.strokeStyle="#76835c";ctx.fillStyle="#89966a";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,70);ctx.quadraticCurveTo(30,35,65,0);ctx.stroke();[[15,52,-20],[31,34,18],[47,18,-18]].forEach(v=>{ctx.beginPath();ctx.ellipse(v[0]+v[2]*.5,v[1],18,8,v[2]>0?.5:-.5,0,Math.PI*2);ctx.fill();});ctx.restore();}
function paint(ctx,w,h,lines,start,end){
 const c=COLORS[colorKey()],m=Math.round(w*.07),left=m+36,right=w-m-36,top=275,lh=Math.round(w*.04);
 ctx.fillStyle=c.paper;ctx.fillRect(0,0,w,h);rr(ctx,m/2,m/2,w-m,h-m,32);ctx.lineWidth=4;ctx.strokeStyle="#c39d55";ctx.stroke();leaf(ctx,m+20,62,1.15,1);leaf(ctx,w-m-15,h-140,.95,-1);
 ctx.fillStyle=c.ink;ctx.textAlign="center";ctx.font="italic "+Math.round(w*.075)+"px Georgia";ctx.fillText("Notes",w/2,155);ctx.font=Math.round(w*.026)+"px Georgia";ctx.fillStyle="#9b7546";ctx.fillText("♡",w/2,202);
 ctx.strokeStyle=c.line;ctx.lineWidth=2;ctx.globalAlpha=.7;for(let y=top+lh;y<h-120;y+=lh){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();}ctx.globalAlpha=1;
 ctx.textAlign="left";ctx.fillStyle=c.ink;ctx.font=Math.round(w*.027)+"px Georgia";let y=top+lh*.72;for(let i=start;i<end;i++){ctx.fillText(lines[i],left,y);y+=lh;}
 ctx.textAlign="center";ctx.fillStyle="rgba(71,59,43,.72)";ctx.font="700 "+Math.round(w*.012)+"px system-ui";ctx.fillText("GROW WHERE YOU'RE PLANTED",w/2,h-62);
}
function blobFromCanvas(c,t,q){return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("export failed")),t,q));}
async function exportPng(){try{const w=1400,m=document.createElement("canvas").getContext("2d");m.font="38px Georgia";const lines=wrap(m,editor.value,w-250),h=Math.min(16000,Math.max(1600,300+lines.length*56+210)),c=document.createElement("canvas");c.width=w;c.height=h;paint(c.getContext("2d"),w,h,lines,0,lines.length);download(await blobFromCanvas(c,"image/png"),fileName("png"));}catch(e){console.error(e);alert("The PNG could not be created. Please try again.");}}

function ascii(s){return String(s).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[—–]/g,"-").replace(/[^\x20-\x7E\n]/g," ");}
function pdfEsc(s){return ascii(s).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");}
function hexRgb(h){return [parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255].map(n=>n.toFixed(3));}
function buildPdf(lines){
 const c=COLORS[colorKey()],rgb=hexRgb(c.paper),ink=hexRgb(c.ink),per=38,pages=[];for(let i=0;i<lines.length;i+=per)pages.push(lines.slice(i,i+per));if(!pages.length)pages=[[""]];
 const objs=[];objs[1]="<< /Type /Catalog /Pages 2 0 R >>";objs[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
 const kids=[];let n=4;pages.forEach(pg=>{const page=n++,content=n++;kids.push(page+" 0 R");let s=rgb.join(" ")+" rg 0 0 612 792 re f\n"+ink.join(" ")+" rg BT /F1 26 Tf 270 735 Td (Notes) Tj ET\n";
 s+="0.78 0.66 0.45 RG 0.7 w ";for(let y=690;y>90;y-=15)s+="75 "+y+" m 537 "+y+" l S ";s+="\nBT /F1 12 Tf 82 665 Td 0 -15 Td ";
 pg.forEach((line,j)=>{if(j)s+="0 -15 Td ";s+="("+pdfEsc(line)+") Tj ";});s+="ET\nBT /F1 8 Tf 250 48 Td (GROW WHERE YOU'RE PLANTED) Tj ET";
 objs[page]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents "+content+" 0 R >>";objs[content]="<< /Length "+ascii(s).length+" >>\nstream\n"+ascii(s)+"\nendstream";});
 objs[2]="<< /Type /Pages /Kids ["+kids.join(" ")+"] /Count "+kids.length+" >>";
 let pdf="%PDF-1.4\n",offs=[0];for(let i=1;i<n;i++){offs[i]=pdf.length;pdf+=i+" 0 obj\n"+objs[i]+"\nendobj\n";}const x=pdf.length;pdf+="xref\n0 "+n+"\n0000000000 65535 f \n";for(let i=1;i<n;i++)pdf+=String(offs[i]).padStart(10,"0")+" 00000 n \n";pdf+="trailer\n<< /Size "+n+" /Root 1 0 R >>\nstartxref\n"+x+"\n%%EOF";return new Blob([pdf],{type:"application/pdf"});
}
async function exportPdf(){try{const m=document.createElement("canvas").getContext("2d");m.font="14px Arial";const lines=wrap(m,editor.value,440);download(buildPdf(lines),fileName("pdf"));}catch(e){console.error(e);alert("The PDF could not be created. Please try again.");}}
})();