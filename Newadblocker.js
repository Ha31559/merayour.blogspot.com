(function () {
    "use strict";
    if (window.__MERAYOUR_ADGUARD_ACTIVE__) return;
    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;
    function isBloggerPreview(){const h=(location.hostname||"").toLowerCase();return h==="blogger.com"||h.endsWith(".blogger.com")}
    if(isBloggerPreview())return;
    const CONFIG={logoUrl:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgfH8V0R4a0Zz_1R4a0s0v0y3d8w6s7q5w4e3r2t1y0u9i8o7p6a5s4d3f2g1h0j9k8l7m6n5b4v3c2x1z0a9s8d7f6g5h4j3k2l1m0n/s666",title:"Ad Blocker Detected!",message:"Merayour is free, please allow ads."};
    const WEIGHTS={CRITICAL:70,STRONG:40,MEDIUM:30,WEAK:10};
    let detectionScore=0,legitAdRendered=false;
    const pageLoadStart=performance.now();
    const incidentMap=new Map();
    const evidenceMap={NETWORK:new Set(),DOM_COSMETIC:new Set(),BROWSER_ENGINE:new Set(),RESOURCE:new Set(),REMOVAL:new Set(),SCRIPT_BLOCK:new Set(),DRILL:new Set()};
    const categoryState={NETWORK:false,DOM_COSMETIC:false,BROWSER_ENGINE:false,RESOURCE:false,REMOVAL:false,SCRIPT_BLOCK:false,DRILL:false};
    const INITIAL_GRACE=3000,ADSENSE_LOAD_GRACE=6000,INCIDENT_TTL=6000,INCIDENT_COOLDOWN=800;
    let mainContent=null,originalArticleHTML=null,originalArticleCaptured=false,articleCurrentlyReplaced=false;

    function findMainContent(){if(mainContent&&document.contains(mainContent))return mainContent;mainContent=document.querySelector("article,.post-body,.entry-content,main");return mainContent;}
    function captureOriginalArticle(){const t=findMainContent();if(!t)return false;if(!originalArticleCaptured){originalArticleHTML=t.innerHTML;originalArticleCaptured=true;}return true;}
    function nowReady(){return (performance.now()-pageLoadStart)>= (INITIAL_GRACE+ADSENSE_LOAD_GRACE);}
    const ua=navigator.userAgent||"",uaLower=ua.toLowerCase();
    function isEdgeOrDuck(){return /Edg\/|DuckDuckGo/i.test(ua);}

    function isLegitAdVisible(){
        if(document.querySelector('ins.adsbygoogle[data-ad-status="filled"]')) return true;
        const iframes=document.querySelectorAll("ins.adsbygoogle iframe");
        for(const ifr of iframes){
            const r=ifr.getBoundingClientRect();
            if(r.width>50 && r.height>50 && getComputedStyle(ifr).display!=="none") return true;
        }
        return false;
    }
    function checkRealAdRender(){
        const ads=document.querySelectorAll("ins.adsbygoogle");
        for(const ad of ads){
            const ifr=ad.querySelector("iframe");
            if(!ifr) continue;
            try{
                const doc=ifr.contentDocument;
                if(doc && doc.body && doc.body.innerHTML.length>100){legitAdRendered=true;return true;}
            }catch(e){
                if(ifr.src && ifr.src!=="about:blank") return true;
            }
        }
        return false;
    }
    function clearEvidence(){detectionScore=0;incidentMap.clear();Object.keys(categoryState).forEach(k=>categoryState[k]=false);Object.keys(evidenceMap).forEach(k=>evidenceMap[k].clear());}

    let pageLocked=false;
    function unlockPage(){const o=document.getElementById("ag-lock-overlay");if(o)o.remove();pageLocked=false;document.documentElement.style.overflow="";document.body.style.overflow="";}
    function createLockOverlay(){if(document.getElementById("ag-lock-overlay"))return;let st=document.getElementById("ag-lock-style");if(!st){st=document.createElement("style");st.id="ag-lock-style";st.textContent=`#ag-lock-overlay{position:fixed;inset:0;background:#0d1117;color:#fff;z-index:2147483647;display:flex;align-items:center;justify-content:center}`;document.head.appendChild(st);}const ov=document.createElement("div");ov.id="ag-lock-overlay";ov.innerHTML=`<div style="text-align:center"><h1>${CONFIG.title}</h1><p>${CONFIG.message}</p></div>`;document.body.appendChild(ov);}
    function blockArticleIfNeeded(){const t=findMainContent();if(!t||articleCurrentlyReplaced)return;if(!captureOriginalArticle())return;t.innerHTML=`<div style="padding:40px;text-align:center;background:#0d1117;color:#fff;min-height:60vh"><h2>Content Locked</h2><p>Please allow ads</p></div>`;articleCurrentlyReplaced=true;}
    function restoreArticleIfNeeded(){if(!articleCurrentlyReplaced||!originalArticleCaptured)return;const t=findMainContent();if(!t)return;t.innerHTML=originalArticleHTML;articleCurrentlyReplaced=false;legitAdRendered=true;clearEvidence();unlockPage();}

    const PROBE_CONFIG={MAX_CYCLES:3,START_AFTER:3000,TIMEOUT:2500};
    const probeState={pixelSuccesses:0,fetchSuccesses:0,pixelFailures:0,fetchFailures:0,cycles:0,lastProbeTime:0,stopped:false};
    async function runProbeCycle(){
        if(probeState.stopped||legitAdRendered||!nowReady()||(performance.now()-probeState.lastProbeTime<2000)) return;
        probeState.lastProbeTime=performance.now(); probeState.cycles++;
        try{const img=new Image();img.src="https://pagead2.googlesyndication.com/pagead/img/0.gif?r="+Date.now();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;setTimeout(rej,2500)});probeState.pixelSuccesses++;}catch(e){probeState.pixelFailures++;categoryState.NETWORK=true;}
        if(probeState.pixelSuccesses>0){clearEvidence();return;}
    }

    function registerIncident(id,conf,cat){const now=performance.now();if(incidentMap.has(id)&&now-incidentMap.get(id)<INCIDENT_COOLDOWN)return;incidentMap.set(id,now);detectionScore+=WEIGHTS[conf]||10;categoryState[cat]=true;}

    function checkCosmetic(){const targets=document.querySelectorAll("ins.adsbygoogle");targets.forEach(el=>{const st=getComputedStyle(el);if(st.display==="none"||st.visibility==="hidden")registerIncident("cos:"+el.id,"STRONG","DOM_COSMETIC");});}
    function checkScriptBlock(){if(document.querySelectorAll("ins.adsbygoogle").length>0 && typeof window.adsbygoogle==="undefined"){registerIncident("script:block","CRITICAL","SCRIPT_BLOCK");return true;}return false;}

    function detectBlockState(){
        if(document.querySelectorAll("ins.adsbygoogle").length===0) return false;
        if(isLegitAdVisible()||checkRealAdRender()) return false;
        if(!nowReady()) return false;
        if(probeState.pixelSuccesses>0||probeState.fetchSuccesses>0) return false;
        if(navigator.connection && /2g/.test(navigator.connection.effectiveType)) return false;

        checkScriptBlock(); checkCosmetic();

        // FIXED: hasHollowIframe - पहले 0 iframe पर true देता था
        let hasHollow=false;
        const iframes=document.querySelectorAll("ins.adsbygoogle iframe");
        if(iframes.length>0){
            for(const ifr of iframes){
                try{if(ifr.contentDocument && ifr.contentDocument.body.innerHTML.length<50) hasHollow=true;}catch(e){}
            }
        }

        const trueCount=Object.values(categoryState).filter(Boolean).length;
        const strong = categoryState.SCRIPT_BLOCK || categoryState.NETWORK || categoryState.RESOURCE || hasHollow;

        if(isEdgeOrDuck()) return strong; // Edge/Duck में 1 सबूत काफी
        return (trueCount>=2 && strong); // Normal में 2 सबूत जरूरी - यही False को रोकता है
    }

    function evaluate(){
        if(isLegitAdVisible()||checkRealAdRender()){restoreArticleIfNeeded();return;}
        if(!nowReady()) return;
        if(articleCurrentlyReplaced){createLockOverlay();return;}
        if(detectBlockState()){blockArticleIfNeeded();createLockOverlay();pageLocked=true;}
    }

    function init(){captureOriginalArticle();setTimeout(()=>{setInterval(evaluate,1000);setInterval(runProbeCycle,2500);},1000);}
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
