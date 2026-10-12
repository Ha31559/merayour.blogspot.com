(function () {
    "use strict";
    if (window.__MERAYOUR_ADGUARD_ACTIVE__) return;
    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;

    // 1. Blogger & Preview Bypass Check
    function isBloggerPreview(){
        const h=(location.hostname||"").toLowerCase();
        const hr=(location.href||"").toLowerCase();
        const s=(location.search||"").toLowerCase();
        const p=(location.pathname||"").toLowerCase();
        const rf=(document.referrer||"").toLowerCase();
        if(h==="blogger.com"||h.endsWith(".blogger.com")||h==="draft.blogger.com")return true;
        if(/(^|[\/_-])layout-preview([\/_-]|$)/i.test(p)\vert{}\vert{}/(^\vert{}[\/_-])template-preview([\/_-]\vert{}$)/i.test(p))return true;
        if(s.includes("preview=true")||s.includes("preview=1")||s.includes("blogger.preview"))return true;
        if(hr.includes("blogger.com")&&(hr.includes("/layout")||hr.includes("/template")||hr.includes("/edit")))return true;
        if(window!==window.top&&(rf.includes("blogger.com")||rf.includes("blogspot.com")))return true;
        return false;
    }
    if(isBloggerPreview())return;

    // 2. Strict Reader Mode Detection
    function isReaderMode(){
        try{
            const href=(location.href||"").toLowerCase();
            if(href.startsWith("about:reader")||href.includes("moz-reader")||location.protocol==="about:")return true;
            if(document.documentElement.classList.contains("moz-reader-mode")||document.body.classList.contains("aboutReader")||document.querySelector(".moz-reader-content"))return true;
        }catch(e){}
        return false;
    }

    const CONFIG={
        logoUrl:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh6O5yJqzqS5Y5Y5Y5Y5Y5Y5Y5/s666",
        title:"Ad Blocker Detected!",
        message:"It looks like an ad or content blocker is preventing this page from loading properly. Merayour is a free website supported by readers and advertising. Please allow ads or whitelist Merayour."
    };
    const WEIGHTS={CRITICAL:70,STRONG:40,MEDIUM:30,WEAK:10};
    
    let detectionScore=0, legitAdRendered=false, pageLocked=false, missingAdChecks=0;
    const pageLoadStart=performance.now();
    const incidentMap=new Map();
    const evidenceMap={NETWORK:new Set(),DOM_COSMETIC:new Set(),BROWSER_ENGINE:new Set(),RESOURCE:new Set(),REMOVAL:new Set(),SCRIPT_BLOCK:new Set(),DUCKDUCKGO:new Set(),DRILL:new Set()};
    const categoryState={NETWORK:false,DOM_COSMETIC:false,BROWSER_ENGINE:false,RESOURCE:false,REMOVAL:false,SCRIPT_BLOCK:false,DUCKDUCKGO:false,DRILL:false};
    
    // Fast & Responsive Timings (From Version 1 & 5)
    const INITIAL_GRACE=1000, ADSENSE_LOAD_GRACE=2500, INCIDENT_TTL=4000;
    let mainContent=null, originalArticleHTML=null, originalArticleCaptured=false, articleCurrentlyReplaced=false, cleanStateConfirmations=0;

    function findMainContent(){
        if(mainContent&&document.documentElement.contains(mainContent))return mainContent;
        mainContent=document.querySelector("article,.post-body,.entry-content,main,#main-content");
        return mainContent;
    }

    function captureOriginalArticle(){
        const t=findMainContent();
        if(!t)return false;
        if(!originalArticleCaptured){
            originalArticleHTML=t.innerHTML;
            originalArticleCaptured=true;
        }
        return true;
    }

    function nowReady(){
        const e=performance.now()-pageLoadStart;
        return e>=INITIAL_GRACE&&e>=ADSENSE_LOAD_GRACE;
    }

    const ua=(navigator.userAgent||""), uaLower=ua.toLowerCase(), vendor=(navigator.vendor||"").toLowerCase();
    const browser={
        soul:uaLower.includes("soul")||!!window.soul||!!window.__soul_ext__,
        brave:!!(navigator.brave&&typeof navigator.brave.isBrave==="function"),
        opera:uaLower.includes("opera")||uaLower.includes("opr/"),
        chrome:!!window.chrome&&vendor.includes("google"),
        edge:uaLower.includes("edg/"),
        firefox:uaLower.includes("firefox"),
        duckduckgo:/DuckDuckGo/i.test(ua)
    };

    function isEdgeOrDuck(){return /Edg\/|DuckDuckGo/i.test(ua);}

    // Real Ad Render Check with Version 5 Whitelist Auto-Recovery Logic
    function checkRealAdRender(){
        if(isReaderMode())return false;
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
                if((doc.body?.innerHTML||"").length>50)rendered=true;
            }catch(e){
                if(ifr.src&&ifr.src!=="about:blank")rendered=true;
            }
        });

        if(rendered){
            legitAdRendered=true;
            missingAdChecks=0;
            if(cleanStateConfirmations<5)cleanStateConfirmations++;
            if(cleanStateConfirmations>=3){
                detectionScore=0;
                restoreArticleIfNeeded();
                unlockPage();
            }
        }else{
            if(legitAdRendered){
                missingAdChecks++;
                if(missingAdChecks>=3){
                    legitAdRendered=false;
                    cleanStateConfirmations=0;
                }
            }else{
                cleanStateConfirmations=0;
            }
        }
        return rendered;
    }

    // Randomized Secure UI Overlay (From Version 4)
    function unlockPage(){
        const o=document.getElementById("ag-lock-overlay");if(o)o.remove();
        const o2=document.querySelector("[data-soul-lock]");if(o2)o2.remove();
        const ls=document.getElementById("ag-lock-style");if(ls)ls.remove();
        pageLocked=false;
        if(document.documentElement){
            document.documentElement.style.removeProperty("overflow");
            document.documentElement.style.removeProperty("height");
        }
        if(document.body){
            document.body.style.removeProperty("overflow");
            document.body.style.removeProperty("height");
        }
    }

    function createLockOverlay(){
        if(document.getElementById("ag-lock-overlay")||document.querySelector("[data-soul-lock]"))return;
        const randomId="ag-"+Math.random().toString(36).substr(2,9);
        let st=document.getElementById("ag-lock-style");
        if(!st){
            st=document.createElement("style");
            st.id="ag-lock-style";
            st.textContent=`
                html,body{overflow:hidden!important}
                #${randomId}{
                    position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;
                    background:#0d1117!important;color:#fff!important;z-index:2147483647!important;
                    display:flex!important;align-items:center!important;justify-content:center!important;
                    padding:20px!important;box-sizing:border-box!important;font-family:system-ui,sans-serif!important;text-align:center!important;
                }
                #${randomId} .ag-card{
                    width:100%!important;max-width:400px!important;padding:32px 24px!important;
                    background:#161b22!important;border:1px solid #30363d!important;border-radius:12px!important;
                }
            `;
            document.head.appendChild(st);
        }
        const ov=document.createElement("div");
        ov.id=randomId;
        ov.setAttribute("data-soul-lock","1");
        const logo=CONFIG.logoUrl?`<img src="${CONFIG.logoUrl}" alt="Logo" style="max-width:80px;margin-bottom:16px;border-radius:8px" onerror="this.style.display='none'">`:"";
        ov.innerHTML=`<div class="ag-card">${logo}<h1>${CONFIG.title}</h1><p>${CONFIG.message}</p></div>`;
        (document.body||document.documentElement).appendChild(ov);
        pageLocked=true;
    }

    // Article Content Locker (Reader Mode & Adblock Protection)
    function blockArticleIfNeeded(){
        if(articleCurrentlyReplaced)return;
        const t=findMainContent();
        if(!t||!captureOriginalArticle())return;
        try{
            t.setAttribute("data-ag-original","1");
            t.innerHTML=`<div style="padding:40px 20px;text-align:center;background:#0d1117;color:#fff;min-height:50vh;display:flex;flex-direction:column;align-items:center;justify-content:center"><h2 style="color:#fff;margin-bottom:12px">Content Locked</h2><p style="color:#8b949e">Please allow ads to read this article</p></div>`;
            t.style.setProperty("display","block","important");
            articleCurrentlyReplaced=true;
        }catch(e){}
    }

    function restoreArticleIfNeeded(){
        if(!articleCurrentlyReplaced||!originalArticleCaptured)return;
        const t=findMainContent();
        if(!t)return;
        try{
            t.innerHTML=originalArticleHTML;
            articleCurrentlyReplaced=false;
        }catch(e){}
    }

    // Bait Elements for Cosmetic Filtering Detection
    function createBaits(){
        if(!document.body)return;
        ["ag-ad-bait-1","ag-ad-bait-2"].forEach(id=>{
            if(document.getElementById(id))return;
            const b=document.createElement("div");
            b.id=id;
            b.className="adsbygoogle";
            b.style.cssText="display:block!important;width:300px!important;height:250px!important;position:absolute!important;left:-9999px!important;top:-9999px!important;opacity:0.01!important;pointer-events:none!important;";
            document.body.appendChild(b);
        });
    }

    function checkCosmetic(){
        createBaits();
        document.querySelectorAll("[id^='ag-ad-bait'], ins.adsbygoogle").forEach(el=>{
            const st=getComputedStyle(el);
            if(st.display==="none"||st.visibility==="hidden"||st.opacity==="0"){
                detectionScore+=40;
            }
        });
    }

    function checkScriptBlock(){
        if(document.querySelectorAll("ins.adsbygoogle").length>0 && typeof window.adsbygoogle==="undefined"){
            detectionScore+=70;
        }
    }

    // Core Detection Heuristic
    function detectBlockState(){
        if(isReaderMode())return true;
        if(!nowReady())return false;
        if(checkRealAdRender())return false;

        const isSoul=browser.soul||window.soul||!!window.__soul_ext__;
        if(isSoul && (performance.now()-pageLoadStart)>=1500)return true;

        checkScriptBlock();
        checkCosmetic();

        if(detectionScore>=40)return true;
        return false;
    }

    // Evaluation Loop
    function evaluate(){
        if(!navigator.onLine||document.readyState==="loading")return;
        
        if(isReaderMode()){
            blockArticleIfNeeded();
            createLockOverlay();
            return;
        }

        if(checkRealAdRender()){
            restoreArticleIfNeeded();
            unlockPage();
            return;
        }

        if(detectBlockState()){
            blockArticleIfNeeded();
            createLockOverlay();
        } else {
            if(articleCurrentlyReplaced && legitAdRendered){
                restoreArticleIfNeeded();
                unlockPage();
            }
        }
    }

    function init(){
        captureOriginalArticle();
        setTimeout(()=>{
            evaluate();
            setInterval(evaluate, 400); // Fast continuous background check
            setInterval(checkRealAdRender, 600);
        }, 500);
    }

    if(document.readyState==="loading")
        document.addEventListener("DOMContentLoaded", init, {once:true});
    else
        init();
})();
