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

    // 🛡️ CONFIDENCE CLASSIFICATION & WEIGHT ENGINE (PRESERVED)
    const CONFIDENCE_WEIGHTS = {
        CRITICAL: 90,
        STRONG: 60,
        WEAK: 20
    };

    // Signal Time-To-Live Definitions (in ms)
    const TTL = {
        NETWORK: 6000,
        DOM_COSMETIC: 6000,
        BROWSER_ENGINE: 10000,
        COOLDOWN: 4000
    };

    let detectionScore = 0;
    let isLegitAdRendered = false;
    let lastLegitAdTimestamp = 0;

    // Advanced Event & Timestamp Tracking
    const incidentTimeline = new Map();
    const persistenceMap = new Map();
    const cooldownMap = new Map();
    const categoryTimestamps = new Map();

    const isInitWindowPassed = () => performance.now() > 2500;

    // 🔰 STANDARD BROWSER BASELINE
    const ua = navigator.userAgent.toLowerCase();
    const isStandardChrome =
        (window.chrome || window.navigator.vendor.includes("Google")) &&
        !ua.includes("soul") &&
        !ua.includes("opera") &&
        !ua.includes("opr") &&
        !window.soul &&
        !window.__soul_ext__;

    function getDynamicThreshold() {
        let base = isStandardChrome ? 90 : 70;
        return isLegitAdRendered ? base + 40 : base;
    }

    // 🔒 FULL-PAGE OVERLAY INJECTOR WITH REFRESH BUTTON
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
                top: 0; left: 0;
                width: 100vw; height: 100vh;
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
                box-sizing: border-box;
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
                margin: 0 0 22px 0;
            }
            .ag-refresh-btn {
                appearance: none;
                -webkit-appearance: none;
                border: 1px solid #ffffff;
                background: #ffffff;
                color: #000000;
                padding: 11px 24px;
                border-radius: 7px;
                font-size: 14px;
                font-weight: 600;
                font-family: inherit;
                cursor: pointer;
                min-width: 120px;
                transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
            }
            .ag-refresh-btn:hover {
                background: #000000;
                color: #ffffff;
            }
            .ag-refresh-btn:active {
                transform: scale(0.97);
            }
            .ag-refresh-btn:focus-visible {
                outline: 2px solid #ffffff;
                outline-offset: 3px;
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement("div");
        overlay.id = "ag-lock-overlay";

        const logoHTML = CONFIG.logoUrl
            ? `<img src="${CONFIG.logoUrl}" alt="Logo" class="ag-logo" onerror="this.style.display='none'">`
            : "";

        overlay.innerHTML = `
            <div class="ag-card">
                ${logoHTML}
                <h1>${CONFIG.title}</h1>
                <p>${CONFIG.message}</p>
                <button type="button" class="ag-refresh-btn" id="ag-refresh-btn" aria-label="Refresh page">Refresh</button>
            </div>
        `;

        (document.body || document.documentElement).appendChild(overlay);

        const refreshButton = document.getElementById("ag-refresh-btn");
        if (refreshButton) {
            refreshButton.addEventListener("click", function () {
                refreshButton.disabled = true;
                refreshButton.textContent = "Refreshing...";
                window.location.reload();
            });
        }
    }

    // 🧹 FRESH CATEGORY EVALUATOR (EXPIRES STALE SIGNALS)
    function getActiveCategories() {
        const now = performance.now();
        const active = { NETWORK: false, DOM_COSMETIC: false, BROWSER_ENGINE: false };

        categoryTimestamps.forEach((time, cat) => {
            const timeLimit = TTL[cat] || 6000;
            if (now - time <= timeLimit) {
                active[cat] = true;
            }
        });
        return active;
    }

    // 🛑 MULTI-SIGNAL SANITY CHECK & VERDICT ENGINE
    function performSanityCheckAndLock() {
        if (!navigator.onLine) return;
        if (document.readyState === "loading") return;

        const now = performance.now();

        // Safe window check following recent positive ad rendering (5 sec Grace Window)
        if (isLegitAdRendered && (now - lastLegitAdTimestamp < 5000)) {
            return;
        }

        const activeCategories = getActiveCategories();
        const categoryCount = Object.values(activeCategories).filter(Boolean).length;

        // Requires Multi-Category Consensus (Network + DOM, DOM + Engine, etc.)
        const hasCorroboratedConsensus = categoryCount >= 2;

        if (detectionScore >= getDynamicThreshold() && hasCorroboratedConsensus) {
            lockPage();
        }
    }

    // 🎯 INCIDENT DEDUPLICATION & CORRELATION ENGINE
    function registerIncident(incidentId, confidenceClass, category, isFastPath = false) {
        const now = performance.now();

        // Cooldown Rule: Prevent duplicate score inflation
        if (cooldownMap.has(incidentId) && (now - cooldownMap.get(incidentId) < TTL.COOLDOWN)) {
            return;
        }
        cooldownMap.set(incidentId, now);

        const weight = CONFIDENCE_WEIGHTS[confidenceClass] || 20;
        detectionScore += weight;

        if (category) {
            categoryTimestamps.set(category, now);
        }
        incidentTimeline.set(category, now);

        // 🔗 FRESH TEMPORAL CORRELATION (Both signals must be within 1.5 seconds)
        const netTime = incidentTimeline.get("NETWORK");
        const domTime = incidentTimeline.get("DOM_COSMETIC");
        if (netTime && domTime && (now - netTime <= 1500) && (now - domTime <= 1500)) {
            if (Math.abs(netTime - domTime) <= 1500) {
                detectionScore += 40; // Temporal correlation boost
            }
        }

        if (isInitWindowPassed()) {
            setTimeout(performSanityCheckAndLock, 300);
        }
    }

    // 📉 SCORE DECAY ENGINE & STALE SIGNAL EXPIRATION
    setInterval(() => {
        const now = performance.now();

        // Expire old cooldown entries and decay stale score
        cooldownMap.forEach((time, id) => {
            if (now - time > 8000) {
                cooldownMap.delete(id);
                detectionScore = Math.max(0, detectionScore - 15);
            }
        });

        // Prune expired category timestamps
        categoryTimestamps.forEach((time, cat) => {
            const timeLimit = TTL[cat] || 6000;
            if (now - time > timeLimit) {
                categoryTimestamps.delete(cat);
            }
        });
    }, 4000);

    // 🌐 CONSOLIDATED NETWORK INCIDENT DEDUPLICATION
    function handleNetworkIncident(source) {
        if (!navigator.onLine) return;

        setTimeout(() => {
            if (navigator.onLine) {
                registerIncident("SINGLE_NETWORK_INCIDENT", "STRONG", "NETWORK");
            }
        }, 500);
    }

    // Global Script Error Interceptor
    window.addEventListener("error", function (e) {
        if (
            e &&
            e.target &&
            (e.target.src || "").match(/googlesyndication|googletagmanager|google-analytics/i)
        ) {
            handleNetworkIncident("script_load_error");
        }
    }, true);

    // 🪤 INVISIBLE HONEYTRAP
    function createBaitTrap() {
        let bait = document.getElementById("adsbygoogle-bait");
        if (!bait) {
            bait = document.createElement("div");
            bait.id = "adsbygoogle-bait";
            bait.className = "adsbygoogle ad-banner ad-unit google-ad pub_300x250";
            bait.style.cssText =
                "width:1px!important;" +
                "height:1px!important;" +
                "position:absolute!important;" +
                "left:-9999px!important;" +
                "top:-9999px!important;" +
                "opacity:0.01!important;";
            (document.body || document.documentElement).appendChild(bait);
        }
        return bait;
    }

    // 📦 LEGITIMATE AD RENDER & NEGATIVE EVIDENCE RESET
    function checkRealAdSenseRender() {
        const adContainers = document.querySelectorAll(".adsbygoogle");

        if (adContainers.length > 0) {
            adContainers.forEach(container => {
                const iframe = container.querySelector('iframe[id^="aswft_"]');
                if (iframe) {
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        isLegitAdRendered = true;
                        lastLegitAdTimestamp = performance.now();

                        // Soft reset stale network/cosmetic suspicion on successful rendering
                        if (detectionScore > 0) {
                            detectionScore = Math.max(0, detectionScore - 30);
                        }
                    }
                }
            });
        }
    }

    // 🚀 FULL-POWER DETECTION CYCLE
    async function runAllChecks() {
        checkRealAdSenseRender();

        // 1. Soul Browser Anti-Stub Check
        const isFakeGtag =
            typeof window.gtag === "function" &&
            typeof window.google_tag_data === "undefined";

        const isAdsByGoogleStubbed =
            Array.isArray(window.adsbygoogle) &&
            window.adsbygoogle.loaded !== true &&
            window.adsbygoogle.length > 0;

        if (isFakeGtag || isAdsByGoogleStubbed) {
            registerIncident("anti_stub_trap", "CRITICAL", "BROWSER_ENGINE", true);
        }

        // 2. Opera Native Adblock Trap
        const operaTrap = document.createElement("div");
        operaTrap.className = "ad-zone ad_box google_adsense";
        operaTrap.style.cssText =
            "width:10px!important;height:10px!important;position:absolute!important;left:-9999px!important;";
        (document.body || document.documentElement).appendChild(operaTrap);

        const isOperaBlocking =
            window.getComputedStyle(operaTrap).display === "none" ||
            operaTrap.offsetHeight === 0;

        operaTrap.remove();

        if (isOperaBlocking) {
            registerIncident("opera_trap", "STRONG", "DOM_COSMETIC");
        }

        // 3. Pixel Load Verification
        const testPixel = new Image();
        testPixel.onerror = () => handleNetworkIncident("pixel_error");
        testPixel.src = "https://pagead2.googlesyndication.com/pagead/img/0.gif?" + Math.random();

        // 4. Persistent Cosmetic Hiding
        const bait = createBaitTrap();
        if (bait) {
            const style = window.getComputedStyle(bait);
            const isHidden =
                style.display === "none" ||
                style.visibility === "hidden" ||
                bait.offsetHeight === 0;

            if (isHidden) {
                const count = (persistenceMap.get("bait_trap") || 0) + 1;
                persistenceMap.set("bait_trap", count);

                if (count >= 2) {
                    registerIncident("bait_trap_persistent", "STRONG", "DOM_COSMETIC");
                }
            } else {
                persistenceMap.set("bait_trap", 0);
            }
        }

        // 5. Unfilled Status Inspector
        const activeAdIns = document.querySelector("ins.adsbygoogle[data-ad-status]");
        if (activeAdIns) {
            const hasIframe = activeAdIns.querySelector("iframe");
            const isUnfilled = activeAdIns.getAttribute("data-ad-status") === "unfilled";
            const style = window.getComputedStyle(activeAdIns);

            if (hasIframe) {
                isLegitAdRendered = true;
                lastLegitAdTimestamp = performance.now();
            }

            if (!hasIframe && style.display === "none" && !isUnfilled) {
                registerIncident("ins_ad_hidden", "WEAK", "DOM_COSMETIC");
            }
        }

        // 6. Correlated Network Ping Check
        try {
            await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
                method: "HEAD",
                mode: "no-cors",
                cache: "no-store"
            });

            // Successful ping acts as trustworthy negative evidence
            if (categoryTimestamps.has("NETWORK")) {
                categoryTimestamps.delete("NETWORK");
            }
        } catch (err) {
            handleNetworkIncident("fetch_ping_error");
        }
    }

    // ⚡ KERNEL OBSERVERS & INTERCEPTORS
    (function godModeKernel() {
        // Explicit Soul Engine Fingerprint
        (function detectSoulEngine() {
            let traits = 0;
            const ua = navigator.userAgent.toLowerCase();

            if (ua.includes("soul")) traits += 40;
            if (window.soul || window.__soul_ext__ || (window.external && "Soul" in window.external)) {
                traits += 60;
            }

            if (traits >= 80) {
                registerIncident("soul_engine_traits", "CRITICAL", "BROWSER_ENGINE", true);
            }
        })();

        // Network Interceptors — XHR
        const xhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url) {
            this.addEventListener("error", () => {
                if (typeof url === "string" && (url.includes("pagead2") || url.includes("googlesyndication"))) {
                    handleNetworkIncident("xhr_error");
                }
            });
            return xhrOpen.apply(this, arguments);
        };

        // Network Interceptor — Fetch
        if (window.fetch) {
            const nativeFetch = window.fetch;
            window.fetch = function (...args) {
                const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

                return nativeFetch.apply(this, args).catch(err => {
                    if (url.includes("pagead2") || url.includes("googlesyndication")) {
                        handleNetworkIncident("fetch_error");
                    }
                    throw err;
                });
            };
        }

        // Targeted Mutation Observer
        const domObserver = new MutationObserver(mutations => {
            for (let mutation of mutations) {
                mutation.removedNodes.forEach(node => {
                    if (
                        node.nodeType === 1 &&
                        (node.classList?.contains("adsbygoogle") || node.tagName === "INS")
                    ) {
                        registerIncident("ad_dom_removal", "STRONG", "DOM_COSMETIC");
                    }
                });
            }
        });

        domObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    })();

    // 💓 INIT SYSTEM
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
