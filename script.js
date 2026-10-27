"use strict";
/* ===== profile-generator ===== */
const A=["Zyra","Vex","Nyx","Orin","Kael","Lum","Syl","Thar","Ixa","Quor","Vael","Eon","Drav","Mira","Cyr","Halo","Ulv","Pry","Zen","Aur","Bral","Tev","Omi","Xan"];
const B=["on","ael","ith","ura","ex","ys","ora","en","ix","um","ar","eth","is","yn","ov","al"];
const C=["Voidwalker","Starforge","Nightbloom","Ashveil","Lightbinder","Driftwood","Cinderlace","Moonglass","Stormwright","Echohollow","Ironpetal","Skyreach","Frostmere","Dawnsmith","Gloamfield","Prismborn"];
const REALM=["Aether","Umbra","Nova","Rift","Halcyon","Vortex","Mirage","Cryo","Pulsar","Lumen"];
const ELEM=["Plasma","Crystal","Shadow","Tide","Static","Ember","Frost","Gale"];
const ROLE=["Cartographer","Archivist","Wayfinder","Signalkeeper","Dreamsmith","Tidewatcher","Lorekeeper","Stargazer"];
const SYM=["◇","△","○","✦","☾","⬡","✧","◈"];
function seeds(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}
 return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^=h>>>16)>>>0}}
function rng(id){const g=seeds("zyx1:"+id);let a=g(),b=g(),c=g(),d=g();
 return()=>{a>>>=0;b>>>=0;c>>>=0;d>>>=0;let t=(a+b|0)+d|0;d=d+1|0;a=b^b>>>9;b=c+(c<<3)|0;c=c<<21|c>>>11;c=c+t|0;return(t>>>0)/4294967296}}
function normId(raw){ // exact decimal string; null if invalid
 const s=String(raw).trim();if(!/^[0-9]+$/.test(s))return null;const n=s.replace(/^0+/,"");return n===""?null:n}
function avatar(id,h1,h2,r){let s='<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="g'+id.slice(-6)+h1+'" cx="35%" cy="30%"><stop offset="0" stop-color="hsl('+h1+' 85% 62%)"/><stop offset="1" stop-color="hsl('+h2+' 70% 18%)"/></radialGradient></defs><circle cx="50" cy="50" r="48" fill="url(#g'+id.slice(-6)+h1+')" stroke="hsl('+h1+' 90% 75% / .6)"/>';
 const n=2+(r()*3|0);for(let i=0;i<n;i++){const rr=14+i*10+r()*6,a0=r()*6.28,a1=a0+1.2+r()*3,x0=50+rr*Math.cos(a0),y0=50+rr*Math.sin(a0),x1=50+rr*Math.cos(a1),y1=50+rr*Math.sin(a1);
  s+='<path d="M'+x0.toFixed(1)+' '+y0.toFixed(1)+'A'+rr.toFixed(1)+' '+rr.toFixed(1)+' 0 '+(a1-a0>3.14?1:0)+' 1 '+x1.toFixed(1)+' '+y1.toFixed(1)+'" fill="none" stroke="hsl('+(h2+i*30)%360+' 90% 72%)" stroke-width="'+(1.2+r()*1.8).toFixed(1)+'" stroke-linecap="round"/>'}
 const m=3+(r()*4|0);for(let i=0;i<m;i++)s+='<circle cx="'+(18+r()*64).toFixed(1)+'" cy="'+(18+r()*64).toFixed(1)+'" r="'+(1+r()*3.5).toFixed(1)+'" fill="hsl('+(h1+160)%360+' 90% 85% / .85)"/>';
 return s+"</svg>"}
function profile(idRaw){const id=normId(idRaw);if(!id)return null;const r=rng(id),p=a=>a[r()*a.length|0];
 const h1=r()*360|0,h2=(h1+90+(r()*120|0))%360,first=p(A)+p(B),last=p(C),realm=p(REALM),elem=p(ELEM),role=p(ROLE),sym=p(SYM),sig=(r()*0xffffff|0).toString(16).padStart(6,"0").toUpperCase();
 const bio=first+" is a "+role.toLowerCase()+" of the "+realm+" realm, bound to "+elem.toLowerCase()+" and known by the sigil "+sym+". A fictional identity generated from ID "+(id.length>24?id.slice(0,12)+"…"+id.slice(-6):id)+".";
 return{id,name:first+" "+last,h1,h2,realm,elem,role,sym,sig,bio,svg:avatar(id,h1,h2,r)}}
/* BigInt-exact stepping */
const add=(id,n)=>(BigInt(id)+BigInt(n)).toString();
const prev=id=>BigInt(id)>1n?(BigInt(id)-1n).toString():"1";
/* ===== feed (virtualized rows; scroll listener + timer recovery; no end) ===== */
const feed=document.getElementById("feed"),ROWH=180,rows=new Map();let cols=0,base="1",maxRow=0,tick=false;
const cardHTML=p=>'<button class="card" style="--c:hsl('+p.h1+' 90% 65%)" data-id="'+p.id+'" aria-label="Open profile '+p.name+' ID '+p.id+'">'+p.svg+'<span class="nm">'+p.name+'</span><span class="id">#'+p.id+'</span></button>';
function layout(){const w=feed.clientWidth-24,c=Math.max(1,Math.min(6,Math.floor((w+12)/182)));if(c!==cols){cols=c;rows.forEach(e=>e.remove());rows.clear()}}
function update(){tick=false;layout();const top=feed.getBoundingClientRect().top+scrollY,y=Math.max(0,scrollY-top),vh=innerHeight;
 const first=Math.max(0,Math.floor(y/ROWH)-3),last=Math.floor((y+vh)/ROWH)+6;
 maxRow=Math.max(maxRow,last);feed.style.height=(maxRow+8)*ROWH+"px"; // always more room below the viewport
 rows.forEach((e,k)=>{if(k<first||k>last){e.remove();rows.delete(k)}});
 for(let k=first;k<=last;k++){if(rows.has(k))continue;const e=document.createElement("div");e.className="row";e.style.top=k*ROWH+"px";e.style.height=ROWH-12+"px";e.style.gridTemplateColumns="repeat("+cols+",1fr)";
  let h="";for(let c=0;c<cols;c++)h+=cardHTML(profile(add(base,k*cols+c)));e.innerHTML=h;feed.appendChild(e);rows.set(k,e)}}
const sched=()=>{if(!tick){tick=true;requestAnimationFrame(update)}};
addEventListener("scroll",sched,{passive:true});addEventListener("resize",sched);setInterval(sched,1000);
feed.addEventListener("click",e=>{const b=e.target.closest(".card");if(b)go(b.dataset.id)});
/* ===== profile view + routing (hash: #/p/<id>, works on any static host) ===== */
const pv=document.getElementById("pv"),pw=document.getElementById("pw");
function go(id){location.hash="#/p/"+id}
function route(){const m=/^#\/p\/(\d+)$/.exec(location.hash);const id=m&&normId(m[1]);if(!id){pv.classList.remove("open");document.body.style.overflow="";return}show(id)}
function show(id){const p=profile(id);pv.classList.add("open");document.body.style.overflow="hidden";pv.scrollTop=0;
 pw.innerHTML='<div class="big" style="--g:hsl('+p.h1+' 90% 60% / .45)">'+p.svg+'</div><h2></h2><div class="pid" id="pidv"></div><p class="bio"></p><div class="det"></div><div class="acts"><button class="btn" id="pp">← Previous</button><button class="btn" id="pn">Next →</button></div><div class="acts"><button class="btn" id="cp">Copy Profile Link</button><button class="btn" id="sh">Share</button><button class="btn pri" id="bk">Explore More Profiles</button></div><small id="cm" role="status"></small>';
 pw.querySelector("h2").textContent=p.name;pw.querySelector("#pidv").textContent="ID "+p.id;pw.querySelector(".bio").textContent=p.bio;
 pw.querySelector(".det").innerHTML=[["Realm",p.realm],["Element",p.elem],["Role",p.role],["Sigil",p.sym+" "+p.sig]].map(a=>"<div><b>"+a[0]+"</b>"+a[1]+"</div>").join("");
 const pp=pw.querySelector("#pp");pp.disabled=p.id==="1";pp.style.opacity=p.id==="1"?.4:1;
 pp.onclick=()=>go(prev(p.id));pw.querySelector("#pn").onclick=()=>go(add(p.id,1));
 const link=location.href.split("#")[0]+"#/p/"+p.id,cm=pw.querySelector("#cm");
 pw.querySelector("#cp").onclick=async()=>{try{await navigator.clipboard.writeText(link);cm.textContent="Link copied."}catch(e){prompt("Copy this link",link)}};
 pw.querySelector("#sh").onclick=async()=>{if(navigator.share){try{await navigator.share({title:p.name+" · ZYRAVEXON",url:link})}catch(e){}}else{try{await navigator.clipboard.writeText(link);cm.textContent="Sharing is unavailable here; link copied."}catch(e){prompt("Copy this link",link)}}};
 pw.querySelector("#bk").onclick=close;pw.querySelector("#pp").focus&&pw.querySelector("#pn").focus()}
function close(){history.replaceState(null,"",location.pathname+location.search);route()}
addEventListener("hashchange",route);addEventListener("keydown",e=>{if(e.key==="Escape"){if(pv.classList.contains("open"))close();else sp.classList.remove("open")}});
/* ===== search ===== */
const sp=document.getElementById("sp"),q=document.getElementById("q"),msg=document.getElementById("msg"),res=document.getElementById("res"),sb=document.getElementById("sb");
let scanTok=0;
const say=(t,e)=>{msg.textContent=t;msg.className=e?"err":""};
sb.onclick=()=>{const o=sp.classList.toggle("open");sb.setAttribute("aria-expanded",o);if(o)q.focus()};
function doSearch(){scanTok++;res.innerHTML="";const v=q.value.trim();
 if(!v){say("Enter a positive whole number or part of a name.",1);return}
 if(/^[+-]?[\d.,eE\s]+$/.test(v)&&/\d/.test(v)){const id=normId(v);
  if(!id){say(/^0+$/.test(v)?"ID 0 does not exist. IDs start at 1.":"Not a valid ID. Use digits only: no signs, decimals, commas or spaces.",1);return}
  say("Opening profile "+(id.length>40?id.slice(0,20)+"…("+id.length+" digits)":id)+"…");sp.classList.remove("open");go(id);return}
 const needle=v.toLowerCase();if(needle.length<2){say("Type at least 2 letters.",1);return}
 // Name search strategy: names are generated, not stored, so we scan a bounded window
 // (IDs 1–30,000) in chunks. It is NOT a search of every possible identity.
 const tok=scanTok,LIM=30000,CH=1500;let i=1,found=0;say("Scanning IDs 1–30,000…");
 (function step(){if(tok!==scanTok)return;for(let n=0;n<CH&&i<=LIM&&found<20;n++,i++){const p=profile(String(i));
   if(p.name.toLowerCase().includes(needle)){found++;const li=document.createElement("li"),b=document.createElement("button");b.textContent=p.name+" — #"+p.id;b.onclick=()=>{sp.classList.remove("open");go(p.id)};li.appendChild(b);res.appendChild(li)}}
  if(found>=20||i>LIM)say(found?found+" match"+(found>1?"es":"")+" in IDs 1–"+Math.min(i-1,LIM).toLocaleString()+". Only this range is searched; enter an exact ID to reach any other profile.":"No match in IDs 1–30,000. Names beyond that range are not searched; try an exact ID.",!found);
  else setTimeout(step,0)})()}
document.getElementById("go").onclick=doSearch;q.addEventListener("keydown",e=>{if(e.key==="Enter")doSearch()});
const toFeed=()=>feed.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"});
document.getElementById("exp").onclick=toFeed;document.getElementById("exp2").onclick=toFeed;
update();route();
