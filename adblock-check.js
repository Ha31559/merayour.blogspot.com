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

    // 🛡️ MULTI-CATEGORY EVIDENCE TRACKER & COOLDOWN SYSTEM
    let isLegitAdRendered = false; 
    let detectionScore = 0;
    const signalCooldowns = new Map();
    const domHidingHistory = new Map();

    const categoriesDetected = {
        NETWORK: false,
        DOM_COSMETIC: false,
        BROWSER_ENGINE: false
    };

    const isInitWindowPassed = () => performance.now() > 2500;

    // 🔰 STANDARD BROWSER PROTECTION LAYER
    const ua = navigator.userAgent.toLowerCase();
    const isStandardChrome = (window.chrome || window.navigator.vendor.includes("Google")) && 
                             !ua.includes("soul") && 
                             !ua.includes("opera") && 
                             !ua.includes("opr") && 
                             !window.soul && 
                             !window.__soul_ext__;

    // Dynamic Threshold (Raises if legitimate ad renders)
    function getLockThreshold() {
        let baseThreshold = isStandardChrome ? 90 : 70;
        return isLegitAdRendered ? baseThreshold + 50 : baseThreshold;
    }

    // 🔒 Full-page overlay injector
    function lockPage() {
        if (document.getElementById("ag-lock-overlay")) return;

        const style = document.createElement("style");
        style.textContent = `
            html, body { overflow: hidden !important; height: 100% !important; }
            #ag-lock-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background-color: #0d1117; color: #ffffff; z-index: 2147483647;
                display: flex; align-items: center; justify-content: center;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                text-align: center; padding: 20px; box-sizing: border-box;
            }
            .ag-card {
                background: #161b22; border: 1px solid #30363d; border-radius: 12px;
                padding: 32px 24px; max-width: 400px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            .ag-logo { max-width: 80px; max-height: 80px; margin-bottom: 16px; border-radius: 8px; object-fit: contain; }
            #ag-lock-overlay h1 { font-size: 22px; margin: 0 0 12px 0; color: #f0f6fc; font-weight: 600; }
            #ag-lock-overlay p { font-size: 14px; color: #8b949e; line-height: 1.6; margin: 0; }
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

    // 🎯 INTELLIGENT SIGNAL CHECKER (Category Requirement + Cooldown)
    function addSignalAndCheck(signalKey, weight, category) {
        const now = performance.now();
        
        // Cooldown Rule: Prevent same event from inflating score continuously
        if (signalCooldowns.has(signalKey) && (now - signalCooldowns.get(signalKey) < 5000)) {
            return;
        }
        signalCooldowns.set(signalKey, now);

        detectionScore += weight;
        if (category) categoriesDetected[category] = true;

        // RULE: Requires Score >= Threshold AND Multi-category evidence (or Explicit Engine Trait)
        const hasSufficientCategories = (categoriesDetected.NETWORK && categoriesDetected.DOM_COSMETIC) || categoriesDetected.BROWSER_ENGINE;
        
        if (detectionScore >= getLockThreshold() && hasSufficientCategories && isInitWindowPassed()) {
            lockPage();
        }
    }

    // 🌐 Global Error Interceptor (Single Network Deduplication)
    window.addEventListener("error", function (e) {
        if (e && e.target && (e.target.src || "").match(/googlesyndication|googletagmanager|google-analytics/i)) {
            addSignalAndCheck("script_error_intercept", 50, "NETWORK");
        }
    }, true);

    // 🪤 HoneyTrap & Cosmetic Filter
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

    // 📦 Real AdSense IFRAME Size Inspector
    function checkRealAdSenseRender() {
        const adContainers = document.querySelectorAll('.adsbygoogle');
        if (adContainers.length > 0) {
            adContainers.forEach(container => {
                const iframe = container.querySelector('iframe[id^="aswft_"]');
                if (iframe) {
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        isLegitAdRendered = true; // Dynamic Threshold Safety Layer Active!
                    }
                }
            });
        }
    }

    // 🚀 Comprehensive Deep Check System
    async function runAllChecks() {
        checkRealAdSenseRender();

        // 1. Soul Browser Anti-Stub Check
        const isFakeGtag = typeof window.gtag === "function" && typeof window.google_tag_data === "undefined";
        const isAdsByGoogleStubbed = Array.isArray(window.adsbygoogle) && window.adsbygoogle.loaded !== true && window.adsbygoogle.length > 0;

        if (isFakeGtag || isAdsByGoogleStubbed) {
            addSignalAndCheck("stub_check", 60, "BROWSER_ENGINE");
        }

        // 2. Opera Native Adblock Hiding Trap
        const operaTrap = document.createElement("div");
        operaTrap.className = "ad-zone ad_box google_adsense";
        operaTrap.style.cssText = "width:10px!important;height:10px!important;position:absolute!important;left:-9999px!important;";
        (document.body || document.documentElement).appendChild(operaTrap);

        const isOperaBlocking = window.getComputedStyle(operaTrap).display === "none" || operaTrap.offsetHeight === 0;
        operaTrap.remove();

        if (isOperaBlocking) {
            addSignalAndCheck("opera_trap", 60, "DOM_COSMETIC");
        }

        // 3. Real Image/Pixel Load Verification with Micro-Confirmation
        const testPixel = new Image();
        testPixel.onerror = function () { 
            if (navigator.onLine) {
                // Micro-Confirm before assigning weight
                setTimeout(() => {
                    const retryPixel = new Image();
                    retryPixel.onerror = () => addSignalAndCheck("pixel_failure", 40, "NETWORK");
                    retryPixel.src = "https://pagead2.googlesyndication.com/pagead/img/0.gif?retry=" + Math.random();
                }, 600);
            }
        };
        testPixel.src = "https://pagead2.googlesyndication.com/pagead/img/0.gif?" + Math.random();

        // 4. Persistence-based DOM Hiding Check
        const bait = createBaitTrap();
        if (bait) {
            const style = window.getComputedStyle(bait);
            const isHidden = style.display === "none" || style.visibility === "hidden" || bait.offsetHeight === 0;
            
            if (isHidden) {
                const previousVisits = domHidingHistory.get("bait_trap") || 0;
                domHidingHistory.set("bait_trap", previousVisits + 1);
                
                // Strong signal only when hidden across multiple consecutive checks (Persistence)
                if (previousVisits >= 1) {
                    addSignalAndCheck("bait_trap_persistent", 70, "DOM_COSMETIC");
                }
            } else {
                domHidingHistory.set("bait_trap", 0);
            }
        }

        // 5. Unfilled Status Neutral Inspector
        const activeAdIns = document.querySelector("ins.adsbygoogle[data-ad-status]");
        if (activeAdIns) {
            const hasIframe = activeAdIns.querySelector("iframe");
            const isUnfilled = activeAdIns.getAttribute("data-ad-status") === "unfilled";
            const style = window.getComputedStyle(activeAdIns);
            
            if (hasIframe) isLegitAdRendered = true;
            
            // Unfilled status is neutral (0 weight). Only score if non-unfilled is force-hidden.
            if (!hasIframe && style.display === "none" && !isUnfilled) {
                addSignalAndCheck("ins_ad_hidden", 30, "DOM_COSMETIC");
            }
        }

        // 6. Network Ping Check (correlated with online state)
        try {
            await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
                method: "HEAD",
                mode: "no-cors",
                cache: "no-store"
            });
        } catch (err) {
            if (navigator.onLine) {
                addSignalAndCheck("network_fetch_fail", 40, "NETWORK");
            }
        }
    }

    // ⚡ Kernel Observer Engine
    (function godModeKernel() {
        // Soul Engine Fingerprint Corroboration
        (function detectSoulEngine() {
            let soulConfidenceScore = 0;
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('soul')) soulConfidenceScore += 50;
            if (window.soul || window.__soul_ext__ || (window.external && 'Soul' in window.external)) {
                soulConfidenceScore += 60;
            }

            if (soulConfidenceScore >= 80) {
                addSignalAndCheck("soul_engine_traits", 90, "BROWSER_ENGINE");
            }
        })();

        // Network Interception
        const handleNetworkFailure = (url) => {
            if (navigator.onLine && typeof url === 'string' && (url.includes('pagead2') || url.includes('doubleclick') || url.includes('googlesyndication'))) {
                addSignalAndCheck("network_xhr_fetch", 50, "NETWORK");
            }
        };

        const xhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            this.addEventListener('error', () => handleNetworkFailure(url));
            return xhrOpen.apply(this, arguments);
        };

        if (window.fetch) {
            const nativeFetch = window.fetch;
            window.fetch = function(...args) {
                const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                return nativeFetch.apply(this, args).catch((err) => {
                    handleNetworkFailure(url);
                    throw err;
                });
            };
        }
    })();

    // 💓 Scanner Cycle
    function initSystem() {
        setTimeout(() => {
            runAllChecks();
            setInterval(runAllChecks, 2500); 
        }, 2000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSystem);
    } else {
        initSystem();
    }
})();
