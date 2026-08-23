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

    // 🛡️ CONFIDENCE CLASSIFICATION & WEIGHT ENGINE
    const CONFIDENCE_WEIGHTS = {
        CRITICAL: 90,
        STRONG: 60,
        WEAK: 20
    };

    let detectionScore = 0;
    let isLegitAdRendered = false;

    const incidentTimeline = new Map();
    const persistenceMap = new Map();
    const cooldownMap = new Map();

    const categoriesDetected = {
        NETWORK: false,
        DOM_COSMETIC: false,
        BROWSER_ENGINE: false
    };

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

    // 🔒 FULL-PAGE OVERLAY INJECTOR
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
                font-family: system-ui, -apple-system, BlinkMacSystemFont,
                    "Segoe UI", Roboto, sans-serif;
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

            /* ⚫⚪ BLACK & WHITE REFRESH BUTTON */
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
                transition:
                    background-color 0.15s ease,
                    color 0.15s ease,
                    transform 0.15s ease;
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
            ? `<img src="${CONFIG.logoUrl}" alt="Logo" class="ag-logo"
                onerror="this.style.display='none'">`
            : "";

        overlay.innerHTML = `
            <div class="ag-card">
                ${logoHTML}

                <h1>${CONFIG.title}</h1>

                <p>${CONFIG.message}</p>

                <button
                    type="button"
                    class="ag-refresh-btn"
                    id="ag-refresh-btn"
                    aria-label="Refresh page">
                    Refresh
                </button>
            </div>
        `;

        (document.body || document.documentElement).appendChild(overlay);

        // 🔄 REFRESH BUTTON
        const refreshButton = document.getElementById("ag-refresh-btn");

        if (refreshButton) {
            refreshButton.addEventListener("click", function () {
                refreshButton.disabled = true;
                refreshButton.textContent = "Refreshing...";

                window.location.reload();
            });
        }
    }

    // 🛑 FINAL SANITY CHECK
    function performSanityCheckAndLock() {
        if (!navigator.onLine) return;
        if (document.readyState === "loading") return;

        const categoryCount =
            Object.values(categoriesDetected).filter(Boolean).length;

        const isExplicitEngineMatch =
            categoriesDetected.BROWSER_ENGINE &&
            categoriesDetected.DOM_COSMETIC;

        if (
            (detectionScore >= getDynamicThreshold() && categoryCount >= 2) ||
            isExplicitEngineMatch
        ) {
            lockPage();
        }
    }

    // 🎯 INCIDENT DEDUPLICATION & CORRELATION ENGINE
    function registerIncident(
        incidentId,
        confidenceClass,
        category,
        isFastPath = false
    ) {
        const now = performance.now();

        if (
            cooldownMap.has(incidentId) &&
            now - cooldownMap.get(incidentId) < 4000
        ) {
            return;
        }

        cooldownMap.set(incidentId, now);

        const weight =
            CONFIDENCE_WEIGHTS[confidenceClass] || 20;

        detectionScore += weight;

        if (category) {
            categoriesDetected[category] = true;
        }

        incidentTimeline.set(category, now);

        // 🔗 TEMPORAL CORRELATION
        if (
            incidentTimeline.has("NETWORK") &&
            incidentTimeline.has("DOM_COSMETIC")
        ) {
            const diff = Math.abs(
                incidentTimeline.get("NETWORK") -
                incidentTimeline.get("DOM_COSMETIC")
            );

            if (diff <= 1500) {
                detectionScore += 40;
            }
        }

        // ⚡ FAST PATH
        if (isFastPath && isInitWindowPassed()) {
            performSanityCheckAndLock();
            return;
        }

        if (isInitWindowPassed()) {
            setTimeout(performSanityCheckAndLock, 300);
        }
    }

    // 📉 SCORE DECAY ENGINE
    setInterval(() => {
        const now = performance.now();

        cooldownMap.forEach((time, id) => {
            if (now - time > 10000) {
                cooldownMap.delete(id);
                detectionScore = Math.max(
                    0,
                    detectionScore - 15
                );
            }
        });
    }, 5000);

    // 🌐 NETWORK INCIDENT DEDUPLICATION
    function handleNetworkIncident(source) {
        if (!navigator.onLine) return;

        setTimeout(() => {
            if (navigator.onLine) {
                registerIncident(
                    "SINGLE_NETWORK_INCIDENT",
                    "STRONG",
                    "NETWORK"
                );
            }
        }, 500);
    }

    // Global Script Error Interceptor
    window.addEventListener(
        "error",
        function (e) {
            if (
                e &&
                e.target &&
                (e.target.src || "").match(
                    /googlesyndication|googletagmanager|google-analytics/i
                )
            ) {
                handleNetworkIncident("script_load_error");
            }
        },
        true
    );

    // 🪤 INVISIBLE HONEYTRAP
    function createBaitTrap() {
        let bait =
            document.getElementById("adsbygoogle-bait");

        if (!bait) {
            bait = document.createElement("div");

            bait.id = "adsbygoogle-bait";

            bait.className =
                "adsbygoogle ad-banner ad-unit google-ad pub_300x250";

            bait.style.cssText =
                "width:1px!important;" +
                "height:1px!important;" +
                "position:absolute!important;" +
                "left:-9999px!important;" +
                "top:-9999px!important;" +
                "opacity:0.01!important;";

            (document.body ||
                document.documentElement).appendChild(bait);
        }

        return bait;
    }

    // 📦 LEGITIMATE AD RENDER CHECK
    function checkRealAdSenseRender() {
        const adContainers =
            document.querySelectorAll(".adsbygoogle");

        if (adContainers.length > 0) {
            adContainers.forEach(container => {
                const iframe =
                    container.querySelector(
                        'iframe[id^="aswft_"]'
                    );

                if (iframe) {
                    const rect =
                        iframe.getBoundingClientRect();

                    if (
                        rect.width > 0 &&
                        rect.height > 0
                    ) {
                        isLegitAdRendered = true;
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

        if (
            isFakeGtag ||
            isAdsByGoogleStubbed
        ) {
            registerIncident(
                "anti_stub_trap",
                "CRITICAL",
                "BROWSER_ENGINE",
                true
            );
        }

        // 2. Opera Native Adblock Trap
        const operaTrap =
            document.createElement("div");

        operaTrap.className =
            "ad-zone ad_box google_adsense";

        operaTrap.style.cssText =
            "width:10px!important;" +
            "height:10px!important;" +
            "position:absolute!important;" +
            "left:-9999px!important;";

        (document.body ||
            document.documentElement).appendChild(
                operaTrap
            );

        const isOperaBlocking =
            window.getComputedStyle(
                operaTrap
            ).display === "none" ||
            operaTrap.offsetHeight === 0;

        operaTrap.remove();

        if (isOperaBlocking) {
            registerIncident(
                "opera_trap",
                "STRONG",
                "DOM_COSMETIC"
            );
        }

        // 3. Pixel Load Verification
        const testPixel = new Image();

        testPixel.onerror = () =>
            handleNetworkIncident("pixel_error");

        testPixel.src =
            "https://pagead2.googlesyndication.com/pagead/img/0.gif?" +
            Math.random();

        // 4. Persistent Cosmetic Hiding
        const bait = createBaitTrap();

        if (bait) {
            const style =
                window.getComputedStyle(bait);

            const isHidden =
                style.display === "none" ||
                style.visibility === "hidden" ||
                bait.offsetHeight === 0;

            if (isHidden) {

                const count =
                    (persistenceMap.get(
                        "bait_trap"
                    ) || 0) + 1;

                persistenceMap.set(
                    "bait_trap",
                    count
                );

                if (count >= 2) {
                    registerIncident(
                        "bait_trap_persistent",
                        "STRONG",
                        "DOM_COSMETIC"
                    );
                }

            } else {
                persistenceMap.set(
                    "bait_trap",
                    0
                );
            }
        }

        // 5. Unfilled Status Inspector
        const activeAdIns =
            document.querySelector(
                "ins.adsbygoogle[data-ad-status]"
            );

        if (activeAdIns) {

            const hasIframe =
                activeAdIns.querySelector("iframe");

            const isUnfilled =
                activeAdIns.getAttribute(
                    "data-ad-status"
                ) === "unfilled";

            const style =
                window.getComputedStyle(
                    activeAdIns
                );

            if (hasIframe) {
                isLegitAdRendered = true;
            }

            if (
                !hasIframe &&
                style.display === "none" &&
                !isUnfilled
            ) {
                registerIncident(
                    "ins_ad_hidden",
                    "WEAK",
                    "DOM_COSMETIC"
                );
            }
        }

        // 6. Network Ping Check
        try {

            await fetch(
                "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
                {
                    method: "HEAD",
                    mode: "no-cors",
                    cache: "no-store"
                }
            );

        } catch (err) {

            handleNetworkIncident(
                "fetch_ping_error"
            );
        }
    }

    // ⚡ KERNEL OBSERVERS & INTERCEPTORS
    (function godModeKernel() {

        // Explicit Soul Engine Detection
        (function detectSoulEngine() {

            let traits = 0;

            const ua =
                navigator.userAgent.toLowerCase();

            if (ua.includes("soul")) {
                traits += 40;
            }

            if (
                window.soul ||
                window.__soul_ext__ ||
                (
                    window.external &&
                    "Soul" in window.external
                )
            ) {
                traits += 60;
            }

            if (traits >= 80) {

                registerIncident(
                    "soul_engine_traits",
                    "CRITICAL",
                    "BROWSER_ENGINE",
                    true
                );
            }

        })();

        // Network Interceptors — XHR
        const xhrOpen =
            XMLHttpRequest.prototype.open;

        XMLHttpRequest.prototype.open =
            function (method, url) {

                this.addEventListener(
                    "error",
                    () => {

                        if (
                            typeof url === "string" &&
                            (
                                url.includes("pagead2") ||
                                url.includes("googlesyndication")
                            )
                        ) {
                            handleNetworkIncident(
                                "xhr_error"
                            );
                        }

                    }
                );

                return xhrOpen.apply(
                    this,
                    arguments
                );
            };

        // Network Interceptor — Fetch
        if (window.fetch) {

            const nativeFetch =
                window.fetch;

            window.fetch =
                function (...args) {

                    const url =
                        typeof args[0] === "string"
                            ? args[0]
                            : args[0]?.url || "";

                    return nativeFetch
                        .apply(this, args)
                        .catch(err => {

                            if (
                                url.includes("pagead2") ||
                                url.includes(
                                    "googlesyndication"
                                )
                            ) {
                                handleNetworkIncident(
                                    "fetch_error"
                                );
                            }

                            throw err;
                        });
                };
        }

        // Targeted Mutation Observer
        const domObserver =
            new MutationObserver(
                mutations => {

                    for (
                        let mutation of mutations
                    ) {

                        mutation.removedNodes
                            .forEach(node => {

                                if (
                                    node.nodeType === 1 &&
                                    (
                                        node.classList?.contains(
                                            "adsbygoogle"
                                        ) ||
                                        node.tagName === "INS"
                                    )
                                ) {

                                    registerIncident(
                                        "ad_dom_removal",
                                        "STRONG",
                                        "DOM_COSMETIC"
                                    );
                                }

                            });
                    }
                }
            );

        domObserver.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );

    })();

    // 💓 INIT SYSTEM
    function initSystem() {

        setTimeout(() => {

            runAllChecks();

            setInterval(
                runAllChecks,
                2500
            );

        }, 2000);
    }

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initSystem
        );

    } else {

        initSystem();
    }

})();
