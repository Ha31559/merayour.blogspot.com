(function () {
    "use strict";

    // ==========================================
    // ⚙️ CUSTOMIZATION CONFIGURATION
    // ==========================================
    const CONFIG = {
        logoUrl: "https://blogger.googleusercontent.com/img/a/AVvXsEhaZtN16Z4U9z--I9xFPXPpFPqQXh9Q4KbMSy3yElIrhilHz3K8p_yT_Vb-FLxWdgGuvMXdhnceynqtPxGx2690kGB33A-VQUFWy8lwKSd8tPKl5ZTG3sr_dk-57wVbk8PHki2zI8xI5KvOP3IPUCV7jqWvxznVHyArqw5cTA2FfJOZVYoB1k2AFFy5sDaQ=s666", 
        title: "Hey Buddy!",
        message: "merayour made possible by the support of our readers. To keep our stories free for everyone, please continue reading on a standard browser without active content blockers."
    };

    // 🌐 [VERSION 2] Global Error Interceptor (Catches network-level script blocks in Soul/Brave)
    window.addEventListener("error", function (e) {
        if (e && e.target && (e.target.src || "").match(/googlesyndication|googletagmanager|google-analytics/i)) {
            lockPage();
        }
    }, true);

    // 🔒 Full-page overlay injector (CSS + DOM with Broken Image Handler)
    function lockPage() {
        if (document.getElementById("ag-lock-overlay")) return;

        const style = document.createElement("style");
        style.textContent = `
            html, body { 
                overflow: hidden !important; 
                height: 100% !important; 
            }
            #ag-lock-overlay {
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100vw; 
                height: 100vh;
                background-color: #0d1117; 
                color: #ffffff; 
                z-index: 2147483647;
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                text-align: center; 
                padding: 20px;
                box-sizing: border-box;
            }
            .ag-card {
                background: #161b22;
                border: 1px solid #30363d;
                border-radius: 12px;
                padding: 32px 24px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            .ag-logo {
                max-width: 80px;
                max-height: 80px;
                margin-bottom: 16px;
                border-radius: 8px;
                object-fit: contain;
            }
            #ag-lock-overlay h1 { 
                font-size: 22px; 
                margin: 0 0 12px 0; 
                color: #f0f6fc;
                font-weight: 600;
            }
            #ag-lock-overlay p { 
                font-size: 14px; 
                color: #8b949e; 
                line-height: 1.6;
                margin: 0;
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement("div");
        overlay.id = "ag-lock-overlay";
        
        const logoHTML = CONFIG.logoUrl 
            ? `<img src="${CONFIG.logoUrl}" alt="Logo" class="ag-logo" onerror="this.style.display='none'" />` 
            : "";

        overlay.innerHTML = `
            <div class="ag-card">
                ${logoHTML}
                <h1>${CONFIG.title}</h1>
                <p>${CONFIG.message}</p>
            </div>
        `;

        (document.body || document.documentElement).appendChild(overlay);
    }

    // 🪤 [VERSION 1 & 3] Invisible HoneyTrap & Cosmetic Filter Hiding Detector
    function createBaitTrap() {
        let bait = document.getElementById("adsbygoogle-bait");
        if (!bait) {
            bait = document.createElement("div");
            bait.id = "adsbygoogle-bait";
            bait.className = "adsbygoogle ad-banner ad-unit google-ad pub_300x250";
            bait.style.cssText = "width: 1px !important; height: 1px !important; position: absolute !important; left: -9999px !important; top: -9999px !important; opacity: 0.01 !important;";
            (document.body || document.documentElement).appendChild(bait);
        }
        return bait;
    }

    // 📦 [VERSION 1] Real AdSense IFRAME Size Inspector
    function isRealAdSenseBlocked() {
        const adContainers = document.querySelectorAll('.adsbygoogle');
        if (adContainers.length > 0) {
            let isAnyAdLoaded = false;
            adContainers.forEach(container => {
                const iframe = container.querySelector('iframe[id^="aswft_"]');
                if (iframe) {
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        isAnyAdLoaded = true;
                    }
                }
            });
            if (!isAnyAdLoaded) return true;
        }
        return false;
    }

    // 🚀 [ALL VERSIONS COMBINED] Comprehensive Deep Check System
    async function runAllChecks() {
                // 🔥 SOUL BROWSER ANTI-STUB CHECK
        const isFakeGtag = typeof window.gtag === "function" && typeof window.google_tag_data === "undefined";
        const isAdsByGoogleStubbed = Array.isArray(window.adsbygoogle) && window.adsbygoogle.loaded !== true;

        if (isFakeGtag || isAdsByGoogleStubbed) {
            lockPage();
            return;
        }
// 🎭 1. Opera Native Adblock Hiding Trap (Opera विशिष्ट CSS फ़िल्टर)
const operaTrap = document.createElement("div");
operaTrap.className = "ad-zone ad_box google_adsense";
operaTrap.style.cssText = "width:10px!important;height:10px!important;position:absolute!important;left:-9999px!important;";
(document.body || document.documentElement).appendChild(operaTrap);

const isOperaBlocking = window.getComputedStyle(operaTrap).display === "none" || operaTrap.offsetHeight === 0;
operaTrap.remove();

// 🕵️ 2. Real Image/Pixel Load Verification (Soul & Opera दोनों का नेटवर्क ब्लॉकर)
let isPixelBlocked = false;
const testPixel = new Image();
testPixel.onerror = function () { isPixelBlocked = true; };
testPixel.src = "https://pagead2.googlesyndication.com/pagead/img/0.gif?" + Math.random();

if (isOperaBlocking || isPixelBlocked) {
    lockPage();
    return;
}
        // 📱 MOBILE VIEW FIX (Add-on right after previous pixel check)
        const mobileTrap = document.createElement("ins");
        mobileTrap.className = "adsbygoogle ad-unit";
        mobileTrap.style.cssText = "display:block !important; width:300px !important; height:250px !important; position:absolute !important; left:-9999px !important;";
        (document.body || document.documentElement).appendChild(mobileTrap);

        const isMobileBlocked = window.getComputedStyle(mobileTrap).display === "none" || mobileTrap.clientHeight === 0;
        mobileTrap.remove();

        if (isMobileBlocked) {
            lockPage();
            return;
        }
        // 🛡️ 1. Dynamic AdSense Frame Render Check (iframe Render Detection)
        const activeAdIns = document.querySelector("ins.adsbygoogle");
        if (activeAdIns) {
            const hasIframe = activeAdIns.querySelector("iframe");
            const isUnfilled = activeAdIns.getAttribute("data-ad-status") === "unfilled";
            if (!hasIframe || isUnfilled) {
                lockPage();
                return;
            }
        }

        // 🛡️ 2. Shadow DOM & Script Element Interception (Brave / Soul Deep Blocker)
        if (window.google_ad_client === undefined && document.querySelector(".adsbygoogle")) {
            lockPage();
            return;
        }

        // 🛡️ 3. Execution Delay Verification (Detect Silent JS Pausing)
        const startCheck = performance.now();
        for (let i = 0; i < 1000; i++) { Math.sqrt(i); }
        const endCheck = performance.now();
        if (endCheck - startCheck > 500) { // If browser aggressively throttled script
            lockPage();
            return;
        }

        // 1. Check Bait & Cosmetic Hiding (EasyList/ABP filters)
        const bait = createBaitTrap();
        if (bait) {
            const style = window.getComputedStyle(bait);
            const rect = bait.getBoundingClientRect();
            if (
                style.display === "none" || 
                style.visibility === "hidden" || 
                style.opacity === "0" || 
                style.height === "0px" || 
                rect.height === 0
            ) {
                lockPage();
                return;
            }
        }

        // 2. Check Real AdSense IFRAMEs
        if (isRealAdSenseBlocked()) {
            lockPage();
            return;
        }

        // 3. Check Google Analytics & Global Objects (शुरुआत वाला ओरिजिनल लॉजिक)
        const isGtagAvailable = typeof window.gtag === "function";
        const isRealTagLoaded = typeof window.google_tag_data !== "undefined";
        const isAdblockLoaded = typeof window.adsbygoogle === "undefined" || (window.adsbygoogle && window.adsbygoogle.loaded === false);

        if (!isGtagAvailable || !isRealTagLoaded || isAdblockLoaded) {
            lockPage();
            return;
        }

        // 4. Network Ping Check (AdSense ping)
        try {
            await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
                method: "HEAD",
                mode: "no-cors",
                cache: "no-store"
            });
        } catch (err) {
            lockPage();
        }
    }

    // 💓 Continuous Heartbeat & Scanner
    function initSystem() {
        runAllChecks();
        setInterval(runAllChecks, 1500); // हर 1.5 सेकंड में पूरी जर्नी के सारे चेक्स दोहराए जाएंगे
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSystem);
    } else {
        initSystem();
    }
})();
