(function () {
    "use strict";
    if (window.__MERAYOUR_ADGUARD_ACTIVE__) return;
    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;
    function isBloggerPreview(){const h=(location.hostname||"").toLowerCase();const hr=(location.href||"").toLowerCase();const s=(location.search||"").toLowerCase();const p=(location.pathname||"").toLowerCase();const rf=(document.referrer||"").toLowerCase();if(h==="blogger.com"||h.endsWith(".blogger.com")||h==="draft.blogger.com")return true;if(/(^|[\/_-])layout-preview([\/_-]|$)/i.test(p)||/(^|[\/_-])template-preview([\/_-]|$)/i.test(p))return true;if(s.includes("preview=true")||s.includes("preview=1")||s.includes("blogger.preview"))return true;if(hr.includes("blogger.com")&&(hr.includes("/layout")||hr.includes("/template")||hr.includes("/edit")))return true;if(window!==window.top&&(rf.includes("blogger.com")||rf.includes("blogspot.com")))return true;return false;}
    if(isBloggerPreview())return;
    function isReaderMode(){try{const href=(location.href||"").toLowerCase();if(href.startsWith("about:reader")||href.includes("moz-reader")||location.protocol==="about:")return true;if(document.documentElement.classList.contains("moz-reader-mode")||document.body.classList.contains("aboutReader")||document.querySelector(".moz-reader-content"))return true;}catch(e){}return false;}
    const CONFIG={logoUrl:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh6O5yJqzqS5Y5Y5Y5Y5Y5/s666",title:"Ad Blocker Detected!",message:"It looks like an ad or content blocker is preventing this page from loading properly. Merayour is a free website supported by readers and advertising. Please allow ads or whitelist Merayour."};
    const WEIGHTS={CRITICAL:70,STRONG:40,MEDIUM:30,WEAK:10};
    let detectionScore=0,legitAdRendered=false,pageLocked=false,lastAdRenderTime=0,missingAdChecks=0;
    const pageLoadStart=performance.now();
    const incidentMap=new Map();
    const evidenceMap={NETWORK:new Set(),DOM_COSMETIC:new Set(),BROWSER_ENGINE:new Set(),RESOURCE:new Set(),REMOVAL:new Set(),SCRIPT_BLOCK:new Set(),DUCKDUCKGO:new Set(),DRILL:new Set()};
    const categoryState={NETWORK:false,DOM_COSMETIC:false,BROWSER_ENGINE:false,RESOURCE:false,REMOVAL:false,SCRIPT_BLOCK:false,DUCKDUCKGO:false,DRILL:false};
    const INITIAL_GRACE=1000,ADSENSE_LOAD_GRACE=3000,INCIDENT_TTL=4000,INCIDENT_COOLDOWN=500;
    let mainContent=null,originalArticleHTML=null,originalArticleCaptured=false,articleCurrentlyReplaced=false,contentState="NORMAL",cleanStateConfirmations=0,blockStateConfirmations=0,articleRestoreInProgress=false,articleBlockInProgress=false;
    function findMainContent(){if(mainContent&&document.documentElement.contains(mainContent))return mainContent;mainContent=document.querySelector("article,.post-body,.entry-content,main,#main-content");return mainContent;}
    function agEnc(s){try{return btoa(unescape(encodeURIComponent(s)));}catch(e){return btoa(s);}}
    function agDec(s){try{return decodeURIComponent(escape(atob(s)));}catch(e){try{return atob(s);}catch(_){return s;}}}
    function captureOriginalArticle(){
        const t=findMainContent();if(!t)return false;
        if(!originalArticleCaptured){
            try{ originalArticleHTML=agEnc(t.innerHTML); }catch(e){ originalArticleHTML=t.innerHTML; }
            originalArticleCaptured=true;
            t.setAttribute("data-enc","1");
        }
        return true;
    }
    function nowReady(){return performance.now()-pageLoadStart>=INITIAL_GRACE+ADSENSE_LOAD_GRACE;}
    const ua=(navigator.userAgent||""),uaLower=ua.toLowerCase(),vendor=(navigator.vendor||"").toLowerCase();
    const browser={soul:uaLower.includes("soul")||!!window.soul||!!window.__soul_ext__,brave:!!(navigator.brave&&typeof navigator.brave.isBrave==="function"),opera:uaLower.includes("opera")||uaLower.includes("opr/"),chrome:!!window.chrome&&vendor.includes("google"),edge:uaLower.includes("edg/"),firefox:uaLower.includes("firefox"),duckduckgo:/DuckDuckGo/i.test(ua)};
    function isEdgeOrDuck(){return /Edg\/|DuckDuckGo/i.test(ua);}
    setInterval(()=>{const n=performance.now();incidentMap.forEach((ts,id)=>{if(n-ts>4000)incidentMap.delete(id)});},1000);
    function clearEvidence(){detectionScore=0;incidentMap.clear();Object.keys(categoryState).forEach(k=>categoryState[k]=false);Object.keys(evidenceMap).forEach(k=>evidenceMap[k].clear());}
    function checkRealAdRender(){
        if(isReaderMode())return false;
        const ads=document.querySelectorAll("ins.adsbygoogle,.adsbygoogle");
        let rendered=false;
        ads.forEach(ad=>{
            const ifr=ad.querySelector("iframe");if(!ifr)return;
            const r=ifr.getBoundingClientRect();const st=getComputedStyle(ifr);
            if(r.width<10||r.height<10||st.display==="none"||st.visibility==="hidden")return;
            try{const doc=ifr.contentDocument||ifr.contentWindow?.document;if(!doc)return;if((doc.body?.innerHTML||"").length>100)rendered=true;}catch(e){if(ifr.src&&ifr.src!=="about:blank")rendered=true;}
        });
        if(rendered){
            legitAdRendered=true;lastAdRenderTime=performance.now();missingAdChecks=0;
            if(cleanStateConfirmations<10)cleanStateConfirmations++;
            if(cleanStateConfirmations>=10){clearEvidence();blockStateConfirmations=0;restoreArticleIfNeeded();unlockPage();}
        }else{
            if(legitAdRendered){missingAdChecks++;if(missingAdChecks>=4){legitAdRendered=false;cleanStateConfirmations=0;}}else{cleanStateConfirmations=0;}
        }
        return rendered;
    }
    function unlockPage(){if(isReaderMode())return;const o=document.getElementById("ag-lock-overlay");if(o)o.remove();const o2=document.querySelector("[data-soul-lock]");if(o2)o2.remove();const ls=document.getElementById("ag-lock-style");if(ls)ls.remove();pageLocked=false;if(document.documentElement)document.documentElement.style.removeProperty("overflow");if(document.body)document.body.style.removeProperty("overflow");}
    function createLockOverlay(){
        if(document.getElementById("ag-lock-overlay")||document.querySelector("[data-soul-lock]"))return;
        const randomId="ag-"+Math.random().toString(36).substr(2,9);
        let st=document.getElementById("ag-lock-style");
        if(!st){st=document.createElement("style");st.id="ag-lock-style";st.textContent=`html,body{overflow:hidden!important} #${randomId}{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;background:#0d1117!important;color:#fff!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important} #${randomId}.ag-card{max-width:400px!important;padding:32px 24px!important;background:#161b22!important;border:1px solid #30363d!important;border-radius:12px!important}`;document.head.appendChild(st);}
        const ov=document.createElement("div");ov.id=randomId;ov.setAttribute("data-soul-lock","1");ov.innerHTML=`<div class="ag-card"><h1>${CONFIG.title}</h1><p>${CONFIG.message}</p></div>`;(document.body||document.documentElement).appendChild(ov);
    }
    function blockArticleIfNeeded(){
        if(articleBlockInProgress)return;
        const t=findMainContent();if(!t||!captureOriginalArticle())return;
        if(articleCurrentlyReplaced &&!browser.firefox) return;
        articleBlockInProgress=true;
        try{
            t.setAttribute("data-ag-original","1");
            // FIREFOX FIX: AdBlock ON पर सिर्फ Loading दिखाओ
            if(browser.firefox){
                t.innerHTML=`<div style="padding:40px 20px;text-align:center;background:#0d1117;color:#fff;min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center"><h2 style="color:#fff">Loading Content...</h2><p style="color:#8b949e">Please wait</p></div>`;
            } else {
                t.innerHTML=`<div style="padding:40px 20px;text-align:center;background:#0d1117;color:#fff;min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center"><h2>Content Locked</h2><p style="color:#8b949e">Please allow ads to read this article</p></div>`;
            }
            t.style.setProperty("display","block","important");
            articleCurrentlyReplaced=true;contentState="BLOCKED";
        }finally{articleBlockInProgress=false;}
    }
    function restoreArticleIfNeeded(){
        if(isReaderMode())return;
        const t=findMainContent();if(!t||!originalArticleCaptured)return;
        if(articleRestoreInProgress)return;
        // FIX: Firefox में Loading लगा है तो भी Restore करो जब Ad ON हो
        if(!articleCurrentlyReplaced &&!t.hasAttribute("data-enc")) return;
        articleRestoreInProgress=true;
        try{
            if(originalArticleHTML && originalArticleHTML.length>50){
                const dec=agDec(originalArticleHTML);
                if(dec && dec.length>50) t.innerHTML=dec;
            }
            t.removeAttribute("data-enc");t.removeAttribute("data-firefox-decoy");
            articleCurrentlyReplaced=false;contentState="NORMAL";
        }finally{articleRestoreInProgress=false;}
    }
    const PROBE_CONFIG={MAX_CYCLES:3,MIN_INTERVAL:1500,START_AFTER:2000,MAX_TOTAL_REQUESTS:10,TIMEOUT:2500,MAX_LIFETIME:60000};
    const probeState={cycles:0,pixelAttempts:0,pixelFailures:0,fetchAttempts:0,fetchFailures:0,consecutivePixelFailures:0,consecutiveFetchFailures:0,consecutiveDualFailures:0,lastProbeTime:0,stopped:false,networkSuspicion:0};
    function probeAllowed(){if(isReaderMode()||probeState.stopped||legitAdRendered||!navigator.onLine)return false;if(performance.now()-pageLoadStart<2000)return false;if(probeState.cycles>=3)return false;if(performance.now()-probeState.lastProbeTime<1500)return false;return true;}
    function updateProbeSuspicion(){let s=0;if(probeState.consecutivePixelFailures>=1)s++;if(probeState.consecutiveFetchFailures>=1)s++;if(probeState.consecutiveDualFailures>=1)s++;probeState.networkSuspicion=s;if(s>=1){categoryState.NETWORK=true;}}
    function runPixelProbe(){return new Promise(res=>{probeState.pixelAttempts++;const px=new Image();let done=false;const tm=setTimeout(()=>{if(done)return;done=true;probeState.pixelFailures++;probeState.consecutivePixelFailures++;res(false);},2500);px.onload=()=>{if(done)return;done=true;clearTimeout(tm);probeState.consecutivePixelFailures=0;res(true);};px.onerror=()=>{if(done)return;done=true;clearTimeout(tm);probeState.pixelFailures++;probeState.consecutivePixelFailures++;res(false);};px.src="https://pagead2.googlesyndication.com/pagead/img/0.gif?ag="+Date.now();});}
    async function runFetchProbe(){if(!window.fetch)return false;probeState.fetchAttempts++;try{await fetch("https://pagead2.googlesyndication.com/pagead/img/0.gif?ag="+Date.now(),{mode:"no-cors",cache:"no-store"});probeState.consecutiveFetchFailures=0;return true;}catch(e){probeState.fetchFailures++;probeState.consecutiveFetchFailures++;return false;}}
    async function runProbeCycle(){if(!probeAllowed())return;probeState.lastProbeTime=performance.now();probeState.cycles++;const [p,f]=await Promise.all([runPixelProbe(),runFetchProbe()]);if(!p&&!f)probeState.consecutiveDualFailures++;else probeState.consecutiveDualFailures=0;updateProbeSuspicion();evaluate();}
    function registerIncident(id,conf,cat,src){if(isReaderMode()||!cat)return;const n=performance.now();if(incidentMap.has(id)&&n-incidentMap.get(id)<500)return;incidentMap.set(id,n);detectionScore+=(WEIGHTS[conf]||10);categoryState[cat]=true;evidenceMap[cat].add(src||id);detectionScore+=10;setTimeout(evaluate,100);}
    function createBaits(){if(!document.body)return;["ag-ad-bait-1","ag-ad-bait-2","ag-ad-bait-3"].forEach(id=>{if(document.getElementById(id))return;const b=document.createElement("div");b.id=id;b.dataset.agBait="true";b.className="adsbygoogle";b.style.cssText="display:block!important;width:300px;height:250px;position:absolute;left:0;top:0;opacity:0.01;pointer-events:none;z-index:-1;";(document.body||document.documentElement).appendChild(b);});}
    function checkCosmetic(){if(isReaderMode()){blockArticleIfNeeded();createLockOverlay();return;}createBaits();document.querySelectorAll("[data-ag-bait],ins.adsbygoogle,.adsbygoogle").forEach(el=>{const st=getComputedStyle(el);if(st.display==="none"||st.visibility==="hidden"){const h=parseInt(el.dataset.hits||"0",10)+1;el.dataset.hits=String(h);if(h>=1)registerIncident("bait:"+el.id,"STRONG","DOM_COSMETIC",el.id);}else el.dataset.hits="0";});}
    function checkBrowserSignals(){let sc=0;if(browser.soul)sc+=50;if(window.soul||window.__soul_ext__)sc+=50;if(browser.brave)sc+=50;if(browser.opera)sc+=50;if(browser.duckduckgo)sc+=50;if(browser.firefox)sc+=20;if(browser.edge)sc+=50;if(sc>=10)registerIncident("browser:strong","STRONG","BROWSER_ENGINE","browser_strong");}
    function checkScriptBlock(){if(document.querySelectorAll("ins.adsbygoogle").length===0)return false;if(typeof window.adsbygoogle==="undefined"){registerIncident("script:blocked","CRITICAL","SCRIPT_BLOCK","adsbygoogle_blocked");return true;}return false;}
    function checkEdgeDuckForce(){if(!isEdgeOrDuck()||!nowReady()||legitAdRendered)return false;if(!checkRealAdRender()){registerIncident("drill:edge_duck","CRITICAL","DRILL","edge_duck_force");return true;}return false;}
    window.addEventListener("error",function(e){const src=e.target?.src||"";if(/googlesyndication|pagead2/i.test(src))registerIncident("resource:"+src,"STRONG","RESOURCE","resource_error");},true);
    (function(){const obs=new MutationObserver(muts=>{muts.forEach(m=>{m.removedNodes.forEach(n=>{if(n.nodeType===1&&(n.classList.contains("adsbygoogle")||n.querySelector?.(".adsbygoogle")))registerIncident("removed:ad","STRONG","REMOVAL","ad_removal");});});});obs.observe(document.documentElement,{childList:true,subtree:true});})();
    function detectBlockState(){
        if(isReaderMode())return true;
        if(browser.firefox &&!legitAdRendered && nowReady()){
            const ads=document.querySelectorAll("ins.adsbygoogle,.adsbygoogle");
            if(ads.length===0) return true;
            if(typeof window.adsbygoogle==="undefined") return true;
            if(!checkRealAdRender()) return true;
        }
        const isSoul=browser.soul||window.soul||!!window.__soul_ext__;
        if(isSoul){if(legitAdRendered)return false;if(document.querySelector('ins.adsbygoogle[data-ad-status]'))return false;if(performance.now()-pageLoadStart>=1500)return true;}
        if(document.querySelectorAll("ins.adsbygoogle,.adsbygoogle").length===0&&detectionScore>=1)return true;
        if(legitAdRendered)return false;if(!nowReady())return false;if(checkRealAdRender())return false;
        if(document.querySelector('ins.adsbygoogle[data-ad-status]'))return false;
        if(checkEdgeDuckForce()){blockStateConfirmations++;return true;}
        checkScriptBlock();checkCosmetic();checkBrowserSignals();
        const hasHollow=(()=>{const ifr=document.querySelectorAll("ins.adsbygoogle iframe");if(ifr.length===0)return categoryState.SCRIPT_BLOCK;for(const i of ifr){try{if(i.contentDocument&&i.contentDocument.body.innerHTML.length<50)return true;}catch(e){return false;}}return false;})();
        if(hasHollow)return true;if(detectionScore>=1)return true;return false;
    }
    function evaluate(){
        if(isReaderMode()){blockArticleIfNeeded();createLockOverlay();pageLocked=true;return;}
        if(browser.firefox &&!legitAdRendered && nowReady()){
            if(!checkRealAdRender()){
                blockArticleIfNeeded();createLockOverlay();pageLocked=true;return;
            }
        }
        if(!navigator.onLine||document.readyState==="loading")return;
        if(checkRealAdRender()){
            if(cleanStateConfirmations>=1){ restoreArticleIfNeeded(); }
            if(cleanStateConfirmations>=10){ unlockPage(); return; }
        }
        if(!nowReady())return;
        if(legitAdRendered&&cleanStateConfirmations>=10)return;
        if(articleCurrentlyReplaced){
            if(legitAdRendered){restoreArticleIfNeeded();unlockPage();return;}
            createLockOverlay();return;
        }
        if(detectBlockState()){blockArticleIfNeeded();createLockOverlay();pageLocked=true;}
        else {
            if(originalArticleHTML) restoreArticleIfNeeded();
        }
    }
    function init(){
        captureOriginalArticle();
        // FIX: Firefox Loading अब init में नहीं, evaluate में होगा
        setTimeout(()=>{evaluate();setInterval(evaluate,500);setInterval(runProbeCycle,2000);},300);
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
