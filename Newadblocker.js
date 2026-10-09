(function () {
    "use strict";
    if (window.__MERAYOUR_ADGUARD_ACTIVE__) return;
    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;
    function isBloggerPreview(){const h=(location.hostname||"").toLowerCase();const hr=(location.href||"").toLowerCase();const s=(location.search||"").toLowerCase();const p=(location.pathname||"").toLowerCase();const rf=(document.referrer||"").toLowerCase();if(h==="blogger.com"||h.endsWith(".blogger.com")||h==="draft.blogger.com")return true;if(/(^|[\/_-])layout-preview([\/_-]|$)/i.test(p)||/(^|[\/_-])template-preview([\/_-]|$)/i.test(p))return true;if(s.includes("preview=true")||s.includes("preview=1")||s.includes("blogger.preview"))return true;if(hr.includes("blogger.com")&&(hr.includes("/layout")||hr.includes("/template")||hr.includes("/edit")))return true;if(window!==window.top&&(rf.includes("blogger.com")||rf.includes("blogspot.com")))return true;return false;}
    if(isBloggerPreview())return;
    const CONFIG={logoUrl:"https://blogger.googleusercontent.[STRIPPED 205 bytes]s666",title:"Ad Blocker Detected!",message:"It looks like an ad or content blocker is preventing this page from loading properly. Merayour is a free website supported by readers and advertising. Please allow ads or whitelist Merayour."};
    const WEIGHTS={CRITICAL:70,STRONG:40,MEDIUM:30,WEAK:10};
    let detectionScore=0,legitAdRendered=false,pageLocked=false,lastAdRenderTime=0,missingAdChecks=0;
    const pageLoadStart=performance.now();
    const incidentMap=new Map();
    const evidenceMap={NETWORK:new Set(),DOM_COSMETIC:new Set(),BROWSER_ENGINE:new Set(),RESOURCE:new Set(),REMOVAL:new Set(),SCRIPT_BLOCK:new Set(),DUCKDUCKGO:new Set(),DRILL:new Set()};
    const categoryState={NETWORK:false,DOM_COSMETIC:false,BROWSER_ENGINE:false,RESOURCE:false,REMOVAL:false,SCRIPT_BLOCK:false,DUCKDUCKGO:false,DRILL:false};
    // V8.1 FAST: 3 sec me snap
    const INITIAL_GRACE=1000,ADSENSE_LOAD_GRACE=8000,INCIDENT_TTL=4000,INCIDENT_COOLDOWN=300,LOCAL_WATCH_INTERVAL=500,NETWORK_WATCH_INTERVAL=2000,AD_MISSING_CONFIRMATIONS=8,REBLOCK_GRACE=3000,CLEAN_CONFIRMATIONS_REQUIRED=1;
    let mainContent=null,originalArticleHTML=null,originalArticleCaptured=false,articleCurrentlyReplaced=false,contentState="NORMAL",cleanStateConfirmations=0,blockStateConfirmations=0,articleRestoreInProgress=false,articleBlockInProgress=false;
    function findMainContent(){if(mainContent&&document.documentElement.contains(mainContent))return mainContent;mainContent=document.querySelector("article,.post-body,.entry-content,main,#main-content");return mainContent;}
    function captureOriginalArticle(){const t=findMainContent();if(!t)return false;if(!originalArticleCaptured){originalArticleHTML=t.innerHTML;originalArticleCaptured=true;}return true;}
    function nowReady(){const e=performance.now()-pageLoadStart;return e>=INITIAL_GRACE&&e>=ADSENSE_LOAD_GRACE;}
    const ua=(navigator.userAgent||""),uaLower=ua.toLowerCase(),vendor=(navigator.vendor||"").toLowerCase();
    const browser={soul:uaLower.includes("soul")||!!window.soul||!!window.__soul_ext__,brave:!!(navigator.brave&&typeof navigator.brave.isBrave==="function"),opera:uaLower.includes("opera")||uaLower.includes("opr/"),chrome:!!window.chrome&&vendor.includes("google"),edge:uaLower.includes("edg/"),firefox:uaLower.includes("firefox"),safari:/safari/.test(uaLower)&&!/chrome|crios|android/.test(uaLower),duckduckgo:/DuckDuckGo/i.test(ua)};
    function isEdgeOrDuck(){return /Edg\/|DuckDuckGo/i.test(ua);}
    function isAggressive(){return true;}
    function getThreshold(){return 1;}
    setInterval(()=>{const n=performance.now();incidentMap.forEach((ts,id)=>{if(n-ts>INCIDENT_TTL)incidentMap.delete(id)});},1000);
    function clearEvidence(){detectionScore=0;incidentMap.clear();Object.keys(categoryState).forEach(k=>categoryState[k]=false);Object.keys(evidenceMap).forEach(k=>evidenceMap[k].clear());}
    function isAdAttempted(){const ads=document.querySelectorAll("ins.adsbygoogle");if(ads.length===0)return false;return true;}
    // YONDU DRILL: iframe ke andar ghus ke check
    function checkRealAdRender(){
        const ads=document.querySelectorAll("ins.adsbygoogle,.adsbygoogle");
        let rendered=false;
        ads.forEach(ad=>{
            const ifr=ad.querySelector("iframe");
            if(!ifr)return;
            const r=ifr.getBoundingClientRect();
            const st=getComputedStyle(ifr);
            if(r.width<10||r.height<10||st.display==="none"||st.visibility==="hidden")return;
            try{
                const doc=ifr.contentDocument||ifr.contentWindow?.document;
                if(!doc)return;
                const bodyLen=(doc.body?.innerHTML||"").length;
                if(bodyLen>100)rendered=true;
            }catch(e){
                if(ifr.src&&ifr.src!=="about:blank"&&!ifr.src.includes("about:blank")){
                    rendered=true;
                }
            }
        });
        if(rendered){
            legitAdRendered=true;lastAdRenderTime=performance.now();missingAdChecks=0;clearEvidence();
            cleanStateConfirmations=0;blockStateConfirmations=0;stopProbing();restoreArticleIfNeeded();unlockPage();
        }
        return rendered;
    }
    function unlockPage(){const o=document.getElementById("ag-lock-overlay");if(o)o.remove();const ls=document.getElementById("ag-lock-style");if(ls)ls.remove();pageLocked=false;if(document.documentElement){document.documentElement.style.removeProperty("overflow");document.documentElement.style.removeProperty("height");}if(document.body){document.body.style.removeProperty("overflow");document.body.style.removeProperty("height");}}
    function createLockOverlay(){if(document.getElementById("ag-lock-overlay"))return;let st=document.getElementById("ag-lock-style");if(!st){st=document.createElement("style");st.id="ag-lock-style";st.textContent=`html,body{overflow:hidden!important} #ag-lock-overlay{position:fixed;inset:0;width:100vw;height:100vh;background:#0d1117;color:#fff;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:system-ui,sans-serif;text-align:center} #ag-lock-overlay.ag-card{width:100%;max-width:400px;padding:32px 24px;background:#161b22;border:1px solid #30363d;border-radius:12px}`;document.head.appendChild(st);}const ov=document.createElement("div");ov.id="ag-lock-overlay";const logo=CONFIG.logoUrl?`<img src="${CONFIG.logoUrl}" alt="Merayour" style="max-width:80px;margin-bottom:16px;border-radius:8px" onerror="this.style.display='none'">`:"";ov.innerHTML=`<div class="ag-card">${logo}<h1>${CONFIG.title}</h1><p>${CONFIG.message}</p></div>`;(document.body||document.documentElement).appendChild(ov);}
    // READER MODE BLOCK: pura article hata do
    function blockArticleIfNeeded(){
        if(articleBlockInProgress||articleCurrentlyReplaced)return;
        const t=findMainContent();if(!t||!captureOriginalArticle())return;
        articleBlockInProgress=true;
        try{
            t.setAttribute("data-ag-original","1");
            t.innerHTML=`<div style="padding:40px 20px;text-align:center;background:#0d1117;color:#fff;min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center"><h2 style="color:#fff;margin-bottom:12px">Content Locked</h2><p style="color:#8b949e">Please allow ads to read this article</p></div>`;
            t.style.setProperty("display","block","important");
            articleCurrentlyReplaced=true;contentState="BLOCKED";
        }finally{articleBlockInProgress=false;}
    }
    function restoreArticleIfNeeded(){if(articleRestoreInProgress||!articleCurrentlyReplaced||!originalArticleCaptured)return;const t=findMainContent();if(!t)return;articleRestoreInProgress=true;try{t.innerHTML=originalArticleHTML;articleCurrentlyReplaced=false;contentState="NORMAL";}finally{articleRestoreInProgress=false;}}
    const PROBE_CONFIG={MAX_CYCLES:3,MIN_INTERVAL:1500,START_AFTER:2000,MAX_TOTAL_REQUESTS:10,FAILURE_CONFIRMATIONS:1,TIMEOUT:2500,MAX_LIFETIME:60000};
    const probeState={cycles:0,pixelAttempts:0,pixelSuccesses:0,pixelFailures:0,fetchAttempts:0,fetchSuccesses:0,fetchFailures:0,consecutivePixelFailures:0,consecutiveFetchFailures:0,consecutiveDualFailures:0,lastProbeTime:0,stopped:false,networkSuspicion:0};
    function probeAllowed(){if(probeState.stopped||legitAdRendered||!navigator.onLine||document.visibilityState==="hidden")return false;const e=performance.now()-pageLoadStart;if(e<PROBE_CONFIG.START_AFTER||e>PROBE_CONFIG.MAX_LIFETIME)return false;if(probeState.cycles>=PROBE_CONFIG.MAX_CYCLES)return false;if(probeState.pixelAttempts+probeState.fetchAttempts>=PROBE_CONFIG.MAX_TOTAL_REQUESTS)return false;if(performance.now()-probeState.lastProbeTime<PROBE_CONFIG.MIN_INTERVAL)return false;return true;}
    function updateProbeSuspicion(){let s=0;if(probeState.consecutivePixelFailures>=1)s++;if(probeState.consecutiveFetchFailures>=1)s++;if(probeState.consecutiveDualFailures>=1)s++;if(probeState.pixelFailures>=1&&probeState.fetchFailures>=1)s++;probeState.networkSuspicion=Math.min(4,s);if(probeState.networkSuspicion>=1){categoryState.NETWORK=true;evidenceMap.NETWORK.add("intelligent_probe");}}
    function runPixelProbe(){return new Promise(res=>{if(!navigator.onLine){res(false);return;}probeState.pixelAttempts++;const px=new Image();let done=false;const tm=setTimeout(()=>{if(done)return;done=true;probeState.pixelFailures++;probeState.consecutivePixelFailures++;px.src="";res(false);},PROBE_CONFIG.TIMEOUT);px.onload=()=>{if(done)return;done=true;clearTimeout(tm);probeState.pixelSuccesses++;probeState.consecutivePixelFailures=0;res(true);};px.onerror=()=>{if(done)return;done=true;clearTimeout(tm);probeState.pixelFailures++;probeState.consecutivePixelFailures++;res(false);};px.src="https://pagead2.googlesyndication.com/pagead/img/0.gif?ag=ag-"+probeState.pixelAttempts;});}
    async function runFetchProbe(){if(!navigator.onLine||!window.fetch)return false;probeState.fetchAttempts++;const ctrl=typeof AbortController!=="undefined"?new AbortController():null;let tid=null;if(ctrl)tid=setTimeout(()=>{try{ctrl.abort();}catch(_){}},PROBE_CONFIG.TIMEOUT);try{await window.fetch("https://pagead2.googlesyndication.com/pagead/img/0.gif?ag=ag-"+probeState.fetchAttempts,{method:"GET",mode:"no-cors",cache:"no-store",credentials:"omit",signal:ctrl?ctrl.signal:undefined});if(tid)clearTimeout(tid);probeState.fetchSuccesses++;probeState.consecutiveFetchFailures=0;return true;}catch(e){if(tid)clearTimeout(tid);probeState.fetchFailures++;probeState.consecutiveFetchFailures++;return false;}}
    async function runProbeCycle(){if(!probeAllowed())return;probeState.lastProbeTime=performance.now();probeState.cycles++;const [p,f]=await Promise.all([runPixelProbe(),runFetchProbe()]);if(!p&&!f)probeState.consecutiveDualFailures++;else probeState.consecutiveDualFailures=0;updateProbeSuspicion();if(p||f)probeState.networkSuspicion=Math.max(0,probeState.networkSuspicion-1);evaluate();}
    function stopProbing(){probeState.stopped=true;}
    function registerIncident(id,conf,cat,src){if(!cat)return;const n=performance.now();if(incidentMap.has(id)&&n-incidentMap.get(id)<INCIDENT_COOLDOWN)return;incidentMap.set(id,n);const w=WEIGHTS[conf]||WEIGHTS.WEAK;detectionScore+=w;categoryState[cat]=true;if(evidenceMap[cat])evidenceMap[cat].add(src||id);detectionScore+=10;setTimeout(evaluate,100);}
    function createBaits(){if(!document.body)return;["ag-ad-bait-1","ag-ad-bait-2","ag-ad-bait-3"].forEach((id,i)=>{if(document.getElementById(id))return;const b=document.createElement("div");b.id=id;b.dataset.agBait="true";b.className="adsbygoogle";b.style.cssText="display:block!important;visibility:visible!important;width:300px!important;height:250px!important;position:absolute!important;left:0!important;top:0!important;opacity:0.01!important;pointer-events:none!important;z-index:-1!important;";(document.body||document.documentElement).appendChild(b);});}
    function checkCosmetic(){createBaits();const targets=document.querySelectorAll("[data-ag-bait],ins.adsbygoogle,.adsbygoogle");targets.forEach(el=>{const st=getComputedStyle(el);if(st.display==="none"||st.visibility==="hidden"){const h=parseInt(el.dataset.hits||"0",10)+1;el.dataset.hits=String(h);if(h>=1)registerIncident("bait:"+el.id,"STRONG","DOM_COSMETIC",el.id);}else el.dataset.hits="0";});}
    function checkBrowserSignals(){let sc=0;if(browser.soul)sc+=50;if(window.soul||window.__soul_ext__)sc+=50;if(browser.brave)sc+=50;if(browser.opera)sc+=50;if(browser.duckduckgo)sc+=50;if(browser.firefox)sc+=20;if(browser.edge)sc+=50;if(sc>=10)registerIncident("browser:strong","STRONG","BROWSER_ENGINE","browser_strong");}
    function checkScriptBlock(){const ads=document.querySelectorAll("ins.adsbygoogle");if(ads.length===0)return false;if(typeof window.adsbygoogle==="undefined"){registerIncident("script:blocked","CRITICAL","SCRIPT_BLOCK","adsbygoogle_blocked");categoryState.SCRIPT_BLOCK=true;return true;}return false;}
    function checkEdgeDuckForce(){if(!isEdgeOrDuck())return false;if(!nowReady())return false;if(legitAdRendered)return false;if(!checkRealAdRender()){registerIncident("drill:edge_duck","CRITICAL","DRILL","edge_duck_force");categoryState.DRILL=true;return true;}return false;}
    function inspectAdState(){const ads=document.querySelectorAll("ins.adsbygoogle,.adsbygoogle");let visible=0;ads.forEach(ad=>{const ifr=ad.querySelector("iframe");if(ifr){const r=ifr.getBoundingClientRect();const st=getComputedStyle(ifr);if(r.width>0&&r.height>0&&st.display!=="none"&&st.visibility!=="hidden"&&st.opacity!=="0"){try{const doc=ifr.contentDocument;if(doc&&doc.body&&doc.body.innerHTML.length>100)visible++;else if(!doc)visible++;}catch(e){visible++;}}}});if(visible>0){clearEvidence();restoreArticleIfNeeded();unlockPage();stopProbing();}}
    window.addEventListener("error",function(e){const t=e.target;const src=t?.src||t?.href||"";if(/googlesyndication|pagead2|doubleclick|googleadservices/i.test(src)){registerIncident("resource:error:"+src,"STRONG","RESOURCE","resource_error");}},true);
    (function(){const oOpen=XMLHttpRequest.prototype.open,oSend=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(m,u){this.__ag_url=typeof u==="string"?u:"";return oOpen.apply(this,arguments);};XMLHttpRequest.prototype.send=function(){this.addEventListener("error",()=>{const u=this.__ag_url||"";if(/pagead2|googlesyndication|doubleclick|googleadservices/i.test(u)){registerIncident("xhr:error:"+u,"STRONG","RESOURCE","xhr_error");}});return oSend.apply(this,arguments);};})();
    (function(){if(!window.fetch)return;const orig=window.fetch;window.fetch=function(...a){const url=typeof a[0]==="string"?a[0]:a[0]?.url||"";return orig.apply(this,a).catch(err=>{if(/pagead2|googlesyndication|doubleclick|googleadservices/i.test(url)){registerIncident("fetch:error:"+url,"STRONG","RESOURCE","fetch_error");}throw err;});};})();
    function inspectRemovedNode(n){if(n.nodeType!==1)return;const isAd=n.classList?.contains("adsbygoogle")||n.matches?.("ins.adsbygoogle")||n.querySelector?.(".adsbygoogle, ins.adsbygoogle");if(isAd)registerIncident("removed:"+(n.id||n.className||"ad-node"),"STRONG","REMOVAL","ad_removal");}
    (function(){const obs=new MutationObserver(muts=>{muts.forEach(m=>{m.removedNodes.forEach(inspectRemovedNode);});});obs.observe(document.documentElement,{childList:true,subtree:true});})();
    function detectBlockState(){
    const adSlots=document.querySelectorAll("ins.adsbygoogle,.adsbygoogle");
    if(adSlots.length===0)return false;
    if(legitAdRendered)return false;
    if(!nowReady())return false;
    if(checkRealAdRender())return false;
    if(document.querySelector('ins.adsbygoogle[data-ad-status]')) return false;
    const anyIframe=document.querySelector('ins.adsbygoogle iframe');
    if(anyIframe){
        const r=anyIframe.getBoundingClientRect();
        if(r.width>20 && r.height>20) return false;
    }
    if(checkEdgeDuckForce()){blockStateConfirmations++;return true;}
    checkScriptBlock(); checkCosmetic(); checkBrowserSignals();
    const hasHollowIframe=(()=>{
        const iframes=document.querySelectorAll("ins.adsbygoogle iframe");
        if(iframes.length===0)return false;
        for(const ifr of iframes){
            try{ const doc=ifr.contentDocument; if(!doc)continue; if(doc.body.innerHTML.length<50) return true; }catch(e){continue;}
        }
        return false;
    })();
    const trueCat=Object.values(categoryState).filter(v=>v===true).length;
    const hasStrong=categoryState.SCRIPT_BLOCK || categoryState.NETWORK || categoryState.RESOURCE;
    if(isEdgeOrDuck()){
        if(hasHollowIframe) return true;
        if(detectionScore>=1) return true;
    } else {
        if(trueCat>=3 && hasStrong && hasHollowIframe) return true;
        if(categoryState.SCRIPT_BLOCK && hasHollowIframe && categoryState.NETWORK) return true;
    }
    return false;
}
    })();
        const trueCat = Object.values(categoryState).filter(v=>v===true).length;
const hasStrong = categoryState.SCRIPT_BLOCK || categoryState.NETWORK || categoryState.RESOURCE;

if(isEdgeOrDuck()){
  if(hasHollowIframe) return true;
  if(detectionScore>=1) return true;
} else {
  // Normal Chrome - यही तुम्हें चाहिए
  if(trueCat>=2 && hasStrong) return true;
}
        return false;
    }
    function evaluate(){if(!navigator.onLine)return;if(document.readyState==="loading")return;if(checkRealAdRender())return;if(!nowReady())return;if(articleCurrentlyReplaced){if(checkRealAdRender()){restoreArticleIfNeeded();unlockPage();return;}createLockOverlay();return;}if(detectBlockState()){blockArticleIfNeeded();createLockOverlay();pageLocked=true;return;}}
    function init(){captureOriginalArticle();setTimeout(()=>{evaluate();setInterval(evaluate,500);setInterval(runProbeCycle,2000);},500);}
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
