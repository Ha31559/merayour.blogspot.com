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

    // 🛡️ STATE MANAGEMENT & INCIDENT ENGINE
    let isLegitAdRendered = false; 
    let detectionScore = 0;
    
    // Track Incidents & Persistence
    const activeIncidents = new Set();
    const persistenceMap = new Map();
    const signalCooldowns = new Map();

    const categoriesDetected = {
        NETWORK: false,
        DOM_COSMETIC: false,
        BROWSER_ENGINE: false
    };

    const isInitWindowPassed = () => performance.now() > 2500;

    // 🔰 BROWSER BASELINE CLASSIFICATION
    const ua = navigator.userAgent.toLowerCase();
    const isStandardChrome = (window.chrome || window.navigator.vendor.includes("Google")) && 
                             !ua.includes("soul") && 
                             !ua.includes("opera") && 
                             !ua.includes("opr") && 
                             !window.soul && 
                             !window.__soul_ext__;

    function getLockThreshold() {
        let baseThreshold = isStandardChrome ? 90 : 70;
        return isLegitAdRendered ? baseThreshold + 50 : baseThreshold; // Negative evidence raises threshold
    }

    // 🔒 Full-page Overlay Injector
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

    // 🎯 CONFIDENCE ENGINE & VERDICT EVALUATOR
    function registerSignal(incidentKey, weight, category, isFastPath = false) {
        const now = performance.now();
        
        // Cooldown Rule: Prevent duplicate inflation for 5 seconds
        if (signalCooldowns.has(incidentKey) && (now - signalCooldowns.get(incidentKey) < 5000)) {
            return;
        }
        signalCooldowns.set(incidentKey, now);

        if (!activeIncidents.has(incidentKey)) {
            activeIncidents.add(incidentKey);
            detectionScore += weight;
        }

        if (category) categoriesDetected[category] = true;

        // FAST-PATH: Explicit Browser Engine Traits lock instantly
        if (isFastPath && isInitWindowPassed()) {
            lockPage();
            return;
        }

        // CONFIDENCE MATRIX: Score Threshold + Multi-category Cross-Verification
        const categoryCount = Object.values(categoriesDetected).filter(Boolean).length;
        const hasHighConfidence = categoryCount >= 2 || categoriesDetected.BROWSER_ENGINE;

        if (detectionScore >= getLockThreshold() && hasHighConfidence && isInitWindowPassed()) {
            lockPage();
        }
    }

    // 📉 SCORE DECAY SYSTEM (Neutralizes temporary glitches)
    setInterval(() => {
        if (detectionScore > 0 && activeIncidents.size === 0) {
            detectionScore = Math.max(0, detectionScore - 10);
        }
        activeIncidents.clear(); // Clear incidents for fresh evaluation in next cycle
    }, 6000);

    // 🌐 SIGNAL DEDUPLICATION: Single Network Failure Incident Handler
    function handleNetworkIncident(source) {
        if (!navigator.onLine) return;
        
        // Micro-confirmation delay to filter transient drops
        setTimeout(() => {
            if (navigator.onLine) {
                registerSignal("NETWORK_BLOCK_INCIDENT", 50, "NETWORK");
            }
        }, 600);
    }

    // Intercept Global Script Load Errors
    window.addEventListener("error", function (e) {
        if (e && e.target && (e.target.src || "").match(/googlesyndication|googletagmanager|google-analytics/i)) {
            handleNetworkIncident("script_error");
        }
    }, true);

    // 🪤 HoneyTrap / Bait Trap Creation
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

    // 📦 Legitimate AdSense Render Verification
    function checkRealAdSenseRender() {
        const adContainers = document.querySelectorAll('.adsbygoogle');
        if (adContainers.length > 0) {
            adContainers.forEach(container => {
                const iframe = container.querySelector('iframe[id^="aswft_"]');
                if (iframe) {
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        isLegitAdRendered = true; // Negative Evidence Applied
                    }
                }
            });
        }
    }

    // 🚀 MAIN DETECTION SYSTEM SCANNER
    async function runAllChecks() {
        checkRealAdSenseRender();

        // 1. Soul Browser Anti-Stub Check (Fast-Path Evidence)
        const isFakeGtag = typeof window.gtag === "function" && typeof window.google_tag_data === "undefined";
        const isAdsByGoogleStubbed = Array.isArray(window.adsbygoogle) && window.adsbygoogle.loaded !== true && window.adsbygoogle.length > 0;

        if (isFakeGtag || isAdsByGoogleStubbed) {
            registerSignal("stub_check", 80, "BROWSER_ENGINE", true);
        }

        // 2. Opera Native Adblock Hiding Trap
        const operaTrap = document.createElement("div");
        operaTrap.className = "ad-zone ad_box google_adsense";
        operaTrap.style.cssText = "width:10px!important;height:10px!important;position:absolute!important;left:-9999px!important;";
        (document.body || document.documentElement).appendChild(operaTrap);

        const isOperaBlocking = window.getComputedStyle(operaTrap).display === "none" || operaTrap.offsetHeight === 0;
        operaTrap.remove();

        if (isOperaBlocking) {
            registerSignal("opera_trap", 60, "DOM_COSMETIC");
        }

        // 3. Image Pixel Failure Test
        const testPixel = new Image();
        testPixel.onerror = () => handleNetworkIncident("pixel_fail");
        testPixel.src = "https://pagead2.googlesyndication.com/pagead/img/0.gif?" + Math.random();

        // 4. Persistence-Based Cosmetic Hiding Check
        const bait = createBaitTrap();
        if (bait) {
            const style = window.getComputedStyle(bait);
            const isHidden = style.display === "none" || style.visibility === "hidden" || bait.offsetHeight === 0;
            
            if (isHidden) {
                const count = (persistenceMap.get("bait_trap") || 0) + 1;
                persistenceMap.set("bait_trap", count);
                
                // Persistence Rule: Requires 2 consecutive observations
                if (count >= 2) {
                    registerSignal("bait_trap_persistent", 70, "DOM_COSMETIC");
                }
            } else {
                persistenceMap.set("bait_trap", 0);
            }
        }

        // 5. Unfilled Status Neutral Check
        const activeAdIns = document.querySelector("ins.adsbygoogle[data-ad-status]");
        if (activeAdIns) {
            const hasIframe = activeAdIns.querySelector("iframe");
            const isUnfilled = activeAdIns.getAttribute("data-ad-status") === "unfilled";
            const style = window.getComputedStyle(activeAdIns);
            
            if (hasIframe) isLegitAdRendered = true;
            if (!hasIframe && style.display === "none" && !isUnfilled) {
                registerSignal("ins_ad_hidden", 40, "DOM_COSMETIC");
            }
        }

        // 6. Network Ping Check (Correlated Endpoint Test)
        try {
            await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
                method: "HEAD",
                mode: "no-cors",
                cache: "no-store"
            });
        } catch (err) {
            handleNetworkIncident("fetch_ping_fail");
        }
    }

    // ⚡ KERNEL OBSERVERS & FINGERPRINTING
    (function godModeKernel() {
        // Explicit Soul Engine Detection
        (function detectSoulEngine() {
            let soulTraits = 0;
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('soul')) soulTraits += 40;
            if (window.soul || window.__soul_ext__ || (window.external && 'Soul' in window.external)) {
                soulTraits += 60;
            }

            if (soulTraits >= 80) {
                registerSignal("soul_explicit_engine", 90, "BROWSER_ENGINE", true);
            }
        })();

        // Network Interceptor Correlation
        const xhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            this.addEventListener('error', () => {
                if (typeof url === 'string' && (url.includes('pagead2') || url.includes('googlesyndication'))) {
                    handleNetworkIncident("xhr_network_error");
                }
            });
            return xhrOpen.apply(this, arguments);
        };

        if (window.fetch) {
            const nativeFetch = window.fetch;
            window.fetch = function(...args) {
                const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                return nativeFetch.apply(this, args).catch((err) => {
                    if (url.includes('pagead2') || url.includes('googlesyndication')) {
                        handleNetworkIncident("fetch_network_error");
                    }
                    throw err;
                });
            };
        }

        // Smart Targeted Mutation Observer
        const domObserver = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === 1 && (node.classList?.contains('adsbygoogle') || node.tagName === 'INS')) {
                        registerSignal("ad_dom_removal", 80, "DOM_COSMETIC");
                    }
                });
            }
        });
        domObserver.observe(document.documentElement, { childList: true, subtree: true });
    })();

    // 💓 Scanner Cycle Init
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
