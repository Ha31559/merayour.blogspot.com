(function () {
    "use strict";

    // ==========================================================
    // 🛑 DUPLICATE SCRIPT GUARD
    // ==========================================================
    if (window.__MERAYOUR_ADGUARD_ACTIVE__) {
        return;
    }

    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;

    // ==========================================================
    // 🛑 BLOGGER PREVIEW BYPASS - REPAIRED
    // ==========================================================
    function isBloggerPreview() {

        const host =
            (window.location.hostname || "").toLowerCase();

        const href =
            (window.location.href || "").toLowerCase();

        const search =
            (window.location.search || "").toLowerCase();

        const path =
            (window.location.pathname || "").toLowerCase();

        const ref =
            (document.referrer || "").toLowerCase();

        if (
            host.includes("blogger.com") ||
            host.includes("draft.blogger.com") ||
            host === "www.blogger.com" ||
            host.endsWith(".blogger.com")
        ) {
            return true;
        }

        if (
            path.includes("/b/post-preview") ||
            path.includes("/blog/post/edit/preview/") ||
            href.includes("bpreview") ||
            href.includes("preview=true") ||
            href.includes("ispreview") ||
            search.includes("bpreview") ||
            search.includes("preview")
        ) {
            return true;
        }

        // Blogger preview always in iframe
        if (
            window!== window.top &&
            ref.includes("blogger.com")
        ) {
            return true;
        }

        return false;
    }

    if (isBloggerPreview()) {
        return;
    }

    // ==========================================================
    // ⚙️ CONFIGURATION
    // ==========================================================
    const CONFIG = {

        logoUrl:
            "https://blogger.googleusercontent.com/img/a/AVvXsEhaZtN16Z4U9z--I9xFPXPpFPqQXh9Q4KbMSy3yElIrhilHz3K8p_yT_Vb-FLxWdgGuvMXdhnceynqtPxGx2690kGB33A-VQUY8lwKSd8tPKl5ZTG3sr_dk-57wVbk8PHki2zI8xI5KvOP3IPUCV7jqWvxznVHyArqw5cTA2FfJOZVYoB1k2AFFy5sDaQ=s666",

        title:
            "Ad Blocker Detected!",

        message:
            "It looks like an ad or content blocker is preventing this page from loading properly. " +
            "Merayour is a free website supported by readers and advertising, which helps us keep our stories available without a subscription. " +
            "If you enjoy our stories, please consider Whitelisting or allowing ads on Merayour. " +
            "Once your blocker is disabled for this site, you can Refresh and continue reading normally."
    };

    // ==========================================================
    // 🧠 DETECTION WEIGHTS
    // ==========================================================
    const WEIGHTS = {

        CRITICAL: 70,

        STRONG: 40,

        MEDIUM: 30,

        WEAK: 10
    };

    // ==========================================================
    // 🎯 ENGINE STATE
    // ==========================================================
    let legitAdRendered = false;

    let pageLocked = false;

    let blockerState = "UNKNOWN";

    let lastAdRenderTime = 0;

    let missingAdChecks = 0;

    let lastBrowserCheck = 0;

    const pageLoadStart =
        performance.now();

    // ----------------------------------------------------------
    // Active incidents
    // ----------------------------------------------------------
    const incidentMap = new Map();

    // ----------------------------------------------------------
    // Evidence is timestamped
    // ----------------------------------------------------------
    const evidenceMap = {

        NETWORK: new Map(),

        DOM_COSMETIC: new Map(),

        BROWSER_ENGINE: new Map(),

        RESOURCE: new Map(),

        REMOVAL: new Map()
    };

    // ==========================================================
    // ⏱️ TIMING - REPAIRED
    // ==========================================================
    const INITIAL_GRACE = 2500;

    const ADSENSE_LOAD_GRACE = 8000;

    const INCIDENT_TTL = 4000;

    const EVIDENCE_TTL = 4000;

    const INCIDENT_COOLDOWN = 1500;

    const LOCAL_WATCH_INTERVAL = 1000;

    const NETWORK_WATCH_INTERVAL = 10000;

    const AD_MISSING_CONFIRMATIONS = 6;

    const REBLOCK_GRACE = 5000;

    const delayedChecks = [

        2500,

        4000,

        6500,

        9000
    ];

    const nowReady = () =>
        performance.now() >= INITIAL_GRACE &&
        performance.now() - pageLoadStart >= ADSENSE_LOAD_GRACE;

    // ==========================================================
    // 🌐 BROWSER CLASSIFICATION
    // ==========================================================
    const ua =
        (navigator.userAgent || "").toLowerCase();

    const vendor =
        (navigator.vendor || "").toLowerCase();

    const browser = {

        soul:
            ua.includes("soul") ||
           !!window.soul ||
           !!window.__soul_ext__,

        brave:
           !!(
                navigator.brave &&
                typeof navigator.brave.isBrave ===
                    "function"
            ),

        opera:
            ua.includes("opera") ||
            ua.includes("opr/"),

        chrome:
           !!window.chrome &&
            vendor.includes("google"),

        edge:
            ua.includes("edg/"),

        firefox:
            ua.includes("firefox"),

        safari:
            /safari/.test(ua) &&
           !/chrome|crios|android/.test(ua)
    };

    const knownStandardBrowser =
        browser.chrome ||
        browser.edge ||
        browser.firefox ||
        browser.safari;

    // ==========================================================
    // 🎚️ INTELLIGENT THRESHOLD - REPAIRED
    // ==========================================================
    function getThreshold() {

        if (
            legitAdRendered
        ) {

            return (
                performance.now() -
                lastAdRenderTime <
                REBLOCK_GRACE
            )
               ? 135
                : 110;
        }

        return knownStandardBrowser
           ? 125
            : 110;
    }

    // ==========================================================
    // 🧹 PRUNE OLD EVIDENCE
    // ==========================================================
    function pruneEvidence() {

        const now =
            performance.now();

        incidentMap.forEach(
            (entry, id) => {

                if (
                    now - entry.timestamp >
                    INCIDENT_TTL
                ) {

                    incidentMap.delete(id);
                }
            }
        );

        Object.keys(evidenceMap)
           .forEach(category => {

                const map =
                    evidenceMap[category];

                map.forEach(
                    (timestamp, source) => {

                        if (
                            now - timestamp >
                            EVIDENCE_TTL
                        ) {

                            map.delete(source);
                        }
                    }
                );
            });
    }

    // ==========================================================
    // 🧮 ACTIVE SCORE
    // ==========================================================
    function calculateScore() {

        pruneEvidence();

        let score = 0;

        incidentMap.forEach(
            entry => {

                if (
                    performance.now() -
                        entry.timestamp <=
                    INCIDENT_TTL
                ) {

                    score += entry.weight;
                }
            }
        );

        const network =
            evidenceMap.NETWORK.size > 0;

        const cosmetic =
            evidenceMap.DOM_COSMETIC.size > 0;

        const resource =
            evidenceMap.RESOURCE.size > 0;

        const removal =
            evidenceMap.REMOVAL.size > 0;

        // ------------------------------------------------------
        // Correlation bonuses
        // ------------------------------------------------------

        if (
            network &&
            cosmetic
        ) {

            score += 25;
        }

        if (
            network &&
            removal
        ) {

            score += 25;
        }

        if (
            resource &&
            cosmetic
        ) {

            score += 20;
        }

        if (
            network &&
            cosmetic &&
            resource &&
            removal
        ) {

            score += 30;
        }

        return score;
    }

    // ==========================================================
    // 🧹 CLEAR SUSPICION
    // ==========================================================
    function clearDetectionEvidence() {

        incidentMap.clear();

        Object.keys(evidenceMap)
           .forEach(category => {

                evidenceMap[category].clear();
            });
    }

    // ==========================================================
    // ⭐ STRONG REAL ADSENSE RENDER DETECTION
    // ==========================================================
    function checkRealAdRender() {

        const ads =
            document.querySelectorAll(
                "ins.adsbygoogle,.adsbygoogle"
            );

        let rendered = false;

        ads.forEach(ad => {

            if (rendered) {
                return;
            }

            const frames =
                ad.querySelectorAll("iframe");

            frames.forEach(iframe => {

                if (rendered) {
                    return;
                }

                const rect =
                    iframe.getBoundingClientRect();

                const style =
                    window.getComputedStyle(
                        iframe
                    );

                const visible =
                    rect.width > 0 &&
                    rect.height > 0 &&
                    style.display!== "none" &&
                    style.visibility!== "hidden" &&
                    style.opacity!== "0";

                if (visible) {

                    rendered = true;
                }
            });

        });

        if (rendered) {

            legitAdRendered = true;

            lastAdRenderTime =
                performance.now();

            missingAdChecks = 0;

            clearDetectionEvidence();

            blockerState =
                "AD_RENDERED";

            unlockPage();
        }

        return rendered;
    }

    // ==========================================================
    // 🔓 UNLOCK PAGE
    // ==========================================================
    function unlockPage() {

        const overlay =
            document.getElementById(
                "ag-lock-overlay"
            );

        if (overlay) {
            overlay.remove();
        }

        const lockStyle =
            document.getElementById(
                "ag-lock-style"
            );

        if (lockStyle) {
            lockStyle.remove();
        }

        pageLocked = false;

        if (document.documentElement) {

            document.documentElement.style
               .removeProperty("overflow");

            document.documentElement.style
               .removeProperty("height");

            document.documentElement.style
               .removeProperty("user-select");
        }

        if (document.body) {

            document.body.style
               .removeProperty("overflow");

            document.body.style
               .removeProperty("height");

            document.body.style
               .removeProperty("user-select");
        }
    }

    // ==========================================================
    // 🔒 LOCK PAGE - REPAIRED
    // ==========================================================
    function lockPage() {

        if (
            checkRealAdRender()
        ) {
            return;
        }

        if (pageLocked) {
            return;
        }

        if (legitAdRendered) {
            return;
        }

        if (
            performance.now() - pageLoadStart <
            ADSENSE_LOAD_GRACE
        ) {
            return;
        }

        pageLocked = true;

        blockerState =
            "CONFIRMED";

        const mainContent =
            document.querySelector(
                "article,.post-body,.entry-content, main, #main-content"
            );

        if (mainContent) {

            mainContent.innerHTML = `
                <div style="
                    padding:30px;
                    text-align:center;
                    color:#fff;
                ">
                    <h3>
                        Content Temporarily Unavailable
                    </h3>

                    <p>
                        This page is supported by advertising.
                        Please allow ads for Merayour to continue reading.
                    </p>
                </div>
            `;
        }

        if (
            document.getElementById(
                "ag-lock-overlay"
            )
        ) {
            return;
        }

        let style =
            document.getElementById(
                "ag-lock-style"
            );

        if (!style) {

            style =
                document.createElement(
                    "style"
                );

            style.id =
                "ag-lock-style";

            style.textContent = `
                html,
                body {
                    overflow: hidden!important;
                    -webkit-user-select: none!important;
                    -moz-user-select: none!important;
                    -ms-user-select: none!important;
                    user-select: none!important;
                }
                #ag-lock-overlay {
                    position: fixed;
                    inset: 0;
                    width: 100vw;
                    height: 100vh;
                    background: #0d1117;
                    color: #fff;
                    z-index: 2147483647;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    box-sizing: border-box;
                    font-family: system-ui, sans-serif;
                    text-align: center;
                }
               .ag-card {
                    width: 100%;
                    max-width: 400px;
                    padding: 32px 24px;
                    background: #161b22;
                    border: 1px solid #30363d;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,.5);
                }
               .ag-logo {
                    max-width: 80px;
                    max-height: 80px;
                    margin-bottom: 16px;
                    border-radius: 8px;
                    object-fit: contain;
                }
                #ag-lock-overlay h1 {
                    margin: 0 0 12px;
                    font-size: 22px;
                    color: #f0f6fc;
                    font-weight: 600;
                }
                #ag-lock-overlay p {
                    margin: 0;
                    font-size: 14px;
                    color: #8b949e;
                    line-height: 1.6;
                }
            `;

            document.head.appendChild(
                style
            );
        }

        const overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "ag-lock-overlay";

        const logo =
            CONFIG.logoUrl
               ? `
                    <img
                        src="${CONFIG.logoUrl}"
                        alt="Merayour"
                        class="ag-logo"
                        onerror="this.style.display='none'"
                    >
                  `
                : "";

        overlay.innerHTML = `
            <div class="ag-card">
                ${logo}
                <h1>
                    ${CONFIG.title}
                </h1>
                <p>
                    ${CONFIG.message}
                </p>
            </div>
        `;

        (
            document.body ||
            document.documentElement
        ).appendChild(
            overlay
        );
    }

    // ==========================================================
    // 🧠 FINAL DECISION ENGINE - REPAIRED
    // ==========================================================
    function evaluate() {

        if (!navigator.onLine) {
            return;
        }

        if (
            document.readyState ===
            "loading"
        ) {
            return;
        }

        if (
            checkRealAdRender()
        ) {
            return;
        }

        if (!nowReady()) {
            return;
        }

        pruneEvidence();

        const detectionScore =
            calculateScore();

        const network =
            evidenceMap.NETWORK.size > 0;

        const cosmetic =
            evidenceMap.DOM_COSMETIC.size > 0;

        const browserEvidence =
            evidenceMap.BROWSER_ENGINE.size > 0;

        const resource =
            evidenceMap.RESOURCE.size > 0;

        const removal =
            evidenceMap.REMOVAL.size > 0;

        const concreteCategories =
            [
                cosmetic,
                resource,
                removal
            ].filter(Boolean).length;

        const networkDom =
            network &&
            cosmetic;

        const networkResource =
            network &&
            resource;

        const networkRemoval =
            network &&
            removal;

        const resourceDom =
            resource &&
            cosmetic;

        const removalDom =
            removal &&
            cosmetic;

        const multiSignal =
            network &&
            cosmetic &&
            (
                resource ||
                removal ||
                browserEvidence
            );

        // REPAIRED: Sirf cosmetic >=2 se lock nahi hoga, network compulsory
        const strongCombination =
            (networkDom ||
            networkResource ||
            networkRemoval ||
            resourceDom ||
            removalDom ||
            multiSignal) &&
            network &&
            cosmetic;

        if (
            detectionScore >=
                getThreshold() &&

            concreteCategories >= 1 &&

            strongCombination
        ) {

            if (
                checkRealAdRender()
            ) {
                return;
            }

            blockerState =
                "CONFIRMED";

            lockPage();
        }
    }

    // ==========================================================
    // 🎯 INCIDENT REGISTRATION
    // ==========================================================
    function registerIncident(
        id,
        confidence,
        category,
        source
    ) {

        if (!category) {
            return;
        }

        if (
            legitAdRendered
        ) {

            const protectedWindow =
                performance.now() -
                lastAdRenderTime <
                REBLOCK_GRACE;

            if (
                protectedWindow ||
                category === "NETWORK" ||
                category === "BROWSER_ENGINE"
            ) {

                return;
            }

            if (
                category === "DOM_COSMETIC" ||
                category === "RESOURCE" ||
                category === "REMOVAL"
            ) {

                legitAdRendered = false;

                missingAdChecks = 0;

                blockerState =
                    "MONITORING";

                clearDetectionEvidence();
            }
        }

        const now =
            performance.now();

        const previous =
            incidentMap.get(id);

        if (
            previous &&
            now - previous.timestamp <
            INCIDENT_COOLDOWN
        ) {

            return;
        }

        const weight =
            WEIGHTS[confidence] ||
            WEIGHTS.WEAK;

        incidentMap.set(
            id,
            {
                timestamp: now,
                weight: weight
            }
        );

        if (
            evidenceMap[category]
        ) {

            evidenceMap[
                category
            ].set(
                source || id,
                now
            );
        }

        setTimeout(
            evaluate,
            300
        );
    }

    // ==========================================================
    // 🌐 NETWORK INCIDENT - REPAIRED
    // ==========================================================
    function networkIncident(
        source,
        confidence = "MEDIUM"
    ) {

        if (!navigator.onLine) {
            return;
        }

        if (
            performance.now() - pageLoadStart <
            ADSENSE_LOAD_GRACE
        ) {
            return;
        }

        registerIncident(
            "network:" + source,
            confidence,
            "NETWORK",
            source
        );
    }

    // ==========================================================
    // 🪤 MULTI BAIT SYSTEM - REPAIRED
    // ==========================================================
    function createBaits() {

        if (!document.body) {
            return;
        }

        const baitConfigs = [

            {
                id:
                    "ag-ad-bait-1",

                classes:
                    "adsbygoogle ad-banner ad-unit google-ad"
            },

            {
                id:
                    "ag-ad-bait-2",

                classes:
                    "advertisement ad adsbox text-ad"
            },

            {
                id:
                    "ag-ad-bait-3",

                classes:
                    "ad-container ad-placement ad-slot"
            }
        ];

        baitConfigs.forEach(
            config => {

                if (
                    document.getElementById(
                        config.id
                    )
                ) {
                    return;
                }

                const bait =
                    document.createElement(
                        "div"
                    );

                bait.id =
                    config.id;

                bait.dataset.agBait =
                    "true";

                bait.className =
                    config.classes;

                bait.style.cssText =
                    "display:block!important;" +
                    "visibility:visible!important;" +
                    "width:1px!important;" +
                    "height:1px!important;" +
                    "position:absolute!important;" +
                    "left:-9999px!important;" +
                    "top:-9999px!important;" +
                    "opacity:1!important;" +
                    "pointer-events:none!important;";

                (
                    document.body ||
                    document.documentElement
                ).appendChild(
                    bait
                );
            }
        );
    }

    // ==========================================================
    // 🎨 ADVANCED COSMETIC DETECTION - REPAIRED
    // ==========================================================
    function checkCosmetic() {

        createBaits();

        // REPAIRED: AdSense script load hone tak check skip
        const isAdScriptLoading =
            typeof window.adsbygoogle === 'undefined';

        if (
            isAdScriptLoading &&
            performance.now() - pageLoadStart <
            ADSENSE_LOAD_GRACE
        ) {
            return;
        }

        const targets =
            document.querySelectorAll(
                "[data-ag-bait], " +
                "ins.adsbygoogle, " +
                ".adsbygoogle"
            );

        targets.forEach(
            element => {

                if (
                    element.dataset.agBait ===
                    "true"
                ) {

                    const style =
                        window.getComputedStyle(
                            element
                        );

                    // REPAIRED: offsetHeight === 0 hatao, sirf display:none
                    const suspicious =
                        style.display === "none" ||
                        style.visibility === "hidden";

                    if (suspicious) {

                        const hits =
                            parseInt(
                                element.dataset.hits ||
                                    "0",
                                10
                            ) + 1;

                        element.dataset.hits =
                            String(hits);

                        if (
                            hits >= 3
                        ) {

                            registerIncident(
                                "bait:" +
                                    element.id,
                                "STRONG",
                                "DOM_COSMETIC",
                                element.id
                            );
                        }

                    } else {

                        element.dataset.hits =
                            "0";
                    }

                    return;
                }

                if (
                    element.matches(
                        "ins.adsbygoogle,.adsbygoogle"
                    )
                ) {

                    if (
                        element.querySelector(
                            "iframe"
                        )
                    ) {

                        const frames =
                            element.querySelectorAll(
                                "iframe"
                            );

                        for (
                            const iframe
                            of frames
                        ) {

                            const rect =
                                iframe.getBoundingClientRect();

                            if (
                                rect.width > 0 &&
                                rect.height > 0
                            ) {

                                return;
                            }
                        }
                    }

                    if (
                        element.getAttribute(
                            "data-ad-status"
                        ) === "unfilled"
                    ) {
                        return;
                    }

                    // REPAIRED: Empty slot neutral
                    if (
                        element.innerHTML.trim() === ""
                    ) {
                        return;
                    }

                    const style =
                        window.getComputedStyle(
                            element
                        );

                    // REPAIRED: offsetHeight check hatao
                    const hidden =
                        style.display === "none" ||
                        style.visibility === "hidden";

                    if (hidden) {

                        const hits =
                            parseInt(
                                element.dataset.hits ||
                                    "0",
                                10
                            ) + 1;

                        element.dataset.hits =
                            String(hits);

                        if (
                            hits >= 4
                        ) {

                            registerIncident(
                                "cosmetic:ad:" +
                                    (
                                        element.id ||
                                        "slot"
                                    ),
                                "STRONG",
                                "DOM_COSMETIC",
                                "hidden_ad"
                            );
                        }

                    } else {

                        element.dataset.hits =
                            "0";
                    }
                }
            }
        );
    }

    // ==========================================================
    // 🧬 BROWSER SIGNALS
    // ==========================================================
    function checkBrowserSignals() {

        const now =
            performance.now();

        if (
            now - lastBrowserCheck <
            3000
        ) {
            return;
        }

        lastBrowserCheck =
            now;

        let score = 0;

        if (
            browser.soul
        ) {
            score += 30;
        }

        if (
            window.soul ||
            window.__soul_ext__ ||
            (
                window.external &&
                "Soul" in
                    window.external
            )
        ) {
            score += 40;
        }

        if (
            browser.brave
        ) {
            score += 10;
        }

        if (
            browser.opera
        ) {
            score += 5;
        }

        if (
            score >= 60
        ) {

            registerIncident(
                "browser:strong",
                "STRONG",
                "BROWSER_ENGINE",
                "browser_strong"
            );

        } else if (
            score >= 30
        ) {

            registerIncident(
                "browser:weak",
                "WEAK",
                "BROWSER_ENGINE",
                "browser_weak"
            );
        }
    }

    // ==========================================================
    // 📦 AD STATE INSPECTION
    // ==========================================================
    function inspectAdState() {

        const ads =
            document.querySelectorAll(
                "ins.adsbygoogle,.adsbygoogle"
            );

        let visibleAds = 0;
        let usableAdSlot = false;

        ads.forEach(
            ad => {

                const frames =
                    ad.querySelectorAll(
                        "iframe"
                    );

                frames.forEach(
                    iframe => {

                        const rect =
                            iframe.getBoundingClientRect();

                        const style =
                            window.getComputedStyle(
                                iframe
                            );

                        if (
                            rect.width > 0 &&
                            rect.height > 0 &&
                            style.display!== "none" &&
                            style.visibility!== "hidden" &&
                            style.opacity!== "0"
                        ) {

                            visibleAds++;
                            usableAdSlot = true;
                            legitAdRendered = true;
                            lastAdRenderTime = performance.now();
                            missingAdChecks = 0;
                        }
                    }
                );

                if (
                    ad.getAttribute(
                        "data-ad-status"
                    )!== "unfilled"
                ) {

                    usableAdSlot = true;
                }
            }
        );

        if (
            visibleAds > 0
        ) {

            clearDetectionEvidence();
            unlockPage();
            return;
        }

        if (
            legitAdRendered &&
            usableAdSlot
        ) {

            missingAdChecks++;

            if (
                missingAdChecks >=
                AD_MISSING_CONFIRMATIONS
            ) {

                missingAdChecks = 0;
                blockerState = "MONITORING";
            }
        }
    }

    // ==========================================================
    // 🚨 RESOURCE ERROR MONITOR
    // ==========================================================
    window.addEventListener(
        "error",
        function (event) {

            if (!event) {
                return;
            }

            const target =
                event.target;

            const src =
                target?.src ||
                target?.href ||
                "";

            if (
                /googlesyndication|pagead2|doubleclick|googleadservices/i
                   .test(src)
            ) {

                registerIncident(
                    "resource:error:" + src,
                    "STRONG",
                    "RESOURCE",
                    "resource_error"
                );

                networkIncident(
                    "resource",
                    "MEDIUM"
                );
            }

        },
        true
    );

    // ==========================================================
    // ⚡ XHR INTERCEPTOR
    // ==========================================================
    (function installXHR() {

        const originalOpen =
            XMLHttpRequest.prototype.open;

        const originalSend =
            XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open =
            function (
                method,
                url
            ) {

                this.__ag_url =
                    typeof url === "string"
                       ? url
                        : "";

                return originalOpen.apply(
                    this,
                    arguments
                );
            };

        XMLHttpRequest.prototype.send =
            function () {

                this.addEventListener(
                    "error",
                    () => {

                        const url =
                            this.__ag_url ||
                            "";

                        if (
                            /pagead2|googlesyndication|doubleclick|googleadservices/i
                               .test(url)
                        ) {

                            networkIncident(
                                "xhr",
                                "MEDIUM"
                            );

                            registerIncident(
                                "xhr:error:" + url,
                                "STRONG",
                                "RESOURCE",
                                "xhr_error"
                            );
                        }
                    }
                );

                return originalSend.apply(
                    this,
                    arguments
                );
            };

    })();

    // ==========================================================
    // ⚡ FETCH INTERCEPTOR
    // ==========================================================
    (function installFetchInterceptor() {

        if (
           !window.fetch
        ) {
            return;
        }

        const originalFetch =
            window.fetch;

        window.fetch =
            function (...args) {

                const url =
                    typeof args[0] === "string"
                       ? args[0]
                        : args[0]?.url || "";

                return originalFetch
                   .apply(
                        this,
                        args
                    )
                   .then(
                        response => {

                            if (
                               !response.ok &&
                                /pagead2|googlesyndication|doubleclick|googleadservices/i
                                   .test(url)
                            ) {

                                networkIncident(
                                    "fetch-status",
                                    "MEDIUM"
                                );
                            }

                            return response;
                        }
                    )
                   .catch(
                        error => {

                            if (
                                /pagead2|googlesyndication|doubleclick|googleadservices/i
                                   .test(url)
                            ) {

                                networkIncident(
                                    "fetch",
                                    "MEDIUM"
                                );

                                registerIncident(
                                    "fetch:error:" + url,
                                    "STRONG",
                                    "RESOURCE",
                                    "fetch_error"
                                );
                            }

                            throw error;
                        }
                    );
            };

    })();

    // ==========================================================
    // 🌐 NETWORK PIXEL TEST
    // ==========================================================
    function runPixelTest() {

        const pixel =
            new Image();

        pixel.onload =
            () => {};

        pixel.onerror =
            () => {

                networkIncident(
                    "pixel",
                    "WEAK"
                );
            };

        pixel.src =
            "https://pagead2.googlesyndication.com/pagead/img/0.gif?" +
            Date.now();
    }

    // ==========================================================
    // 🌐 NETWORK FETCH TEST
    // ==========================================================
    async function runFetchTest() {

        try {

            await fetch(
                "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
                {
                    method: "HEAD",
                    mode: "no-cors",
                    cache: "no-store"
                }
            );

        } catch (
            error
        ) {

            networkIncident(
                "fetch-test",
                "WEAK"
            );
        }
    }

    // ==========================================================
    // 🗑️ REMOVAL TRACKING
    // ==========================================================
    function inspectRemovedNode(
        node
    ) {

        if (
            node.nodeType!== 1
        ) {
            return;
        }

        const isAd =
            node.classList?.contains(
                "adsbygoogle"
            ) ||
            node.matches?.(
                "ins.adsbygoogle"
            ) ||
            node.querySelector?.(
                ".adsbygoogle, ins.adsbygoogle"
            );

        if (
            isAd
        ) {

            registerIncident(
                "removed:" +
                    (
                        node.id ||
                        node.className ||
                        "ad-node"
                    ),
                "STRONG",
                "REMOVAL",
                "ad_removal"
            );
        }
    }

    // ==========================================================
    // 👀 ADVANCED DOM OBSERVER
    // ==========================================================
    (function installDOMObserver() {

        const observer =
            new MutationObserver(
                mutations => {

                    mutations.forEach(
                        mutation => {

                            mutation
                               .removedNodes
                               .forEach(
                                    inspectRemovedNode
                                );

                            mutation
                               .addedNodes
                               .forEach(
                                    node => {

                                        if (
                                            node.nodeType!==
                                            1
                                        ) {
                                            return;
                                        }

                                        const suspicious =
                                            node.matches?.(
                                                ".adsbygoogle, ins.adsbygoogle, iframe"
                                            ) ||
                                            node.querySelector?.(
                                                ".adsbygoogle, ins.adsbygoogle"
                                            );

                                        if (
                                            suspicious
                                        ) {

                                            setTimeout(
                                                () => {

                                                    checkRealAdRender();
                                                    inspectAdState();
                                                    checkCosmetic();
                                                    evaluate();

                                                },
                                                150
                                            );
                                        }
                                    }
                                );

                            if (
                                mutation.type ===
                                "attributes"
                            ) {

                                const target =
                                    mutation.target;

                                if (
                                    target?.matches?.(
                                        ".adsbygoogle, ins.adsbygoogle, iframe"
                                    ) ||
                                    target?.closest?.(
                                        ".adsbygoogle, ins.adsbygoogle"
                                    )
                                ) {

                                    setTimeout(
                                        () => {

                                            checkRealAdRender();
                                            inspectAdState();
                                            checkCosmetic();
                                            evaluate();

                                        },
                                        100
                                    );
                                }
                            }
                        }
                    );
                }
            );

        observer.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "style",
                    "class",
                    "hidden",
                    "src"
                ]
            }
        );

    })();

    // ==========================================================
    // 🔍 MULTI-PASS VERIFICATION
    // ==========================================================
    function scheduleDelayedVerification() {

        delayedChecks.forEach(
            delay => {

                setTimeout(
                    async () => {

                        if (
                           !navigator.onLine
                        ) {
                            return;
                        }

                        checkRealAdRender();
                        inspectAdState();
                        checkCosmetic();
                        checkBrowserSignals();
                        evaluate();

                    },
                    delay
                );
            }
        );
    }

    // ==========================================================
    // 🛡️ FAST LOCAL WATCHDOG
    // ==========================================================
    function runLocalWatch() {

        if (
           !navigator.onLine
        ) {
            return;
        }

        if (
            checkRealAdRender()
        ) {
            return;
        }

        inspectAdState();

        if (
            legitAdRendered &&
            performance.now() -
                lastAdRenderTime <
            REBLOCK_GRACE
        ) {
            return;
        }

        checkCosmetic();
        checkBrowserSignals();
        evaluate();
    }

    // ==========================================================
    // 🌐 NETWORK WATCHDOG
    // ==========================================================
    async function runNetworkWatch() {

        if (
           !navigator.onLine
        ) {
            return;
        }

        if (
            checkRealAdRender()
        ) {
            return;
        }

        if (
            legitAdRendered &&
            performance.now() -
                lastAdRenderTime <
            REBLOCK_GRACE
        ) {
            return;
        }

        runPixelTest();
        await runFetchTest();
        evaluate();
    }

    // ==========================================================
    // 🔄 MAIN CHECK
    // ==========================================================
    function runAllChecks() {

        runLocalWatch();
    }

    // ==========================================================
    // 💓 INITIALIZATION - REPAIRED
    // ==========================================================
    function init() {

        setTimeout(
            () => {

                runAllChecks();
                scheduleDelayedVerification();

                setInterval(
                    runLocalWatch,
                    LOCAL_WATCH_INTERVAL
                );

                setInterval(
                    runNetworkWatch,
                    NETWORK_WATCH_INTERVAL
                );

            },
            1000
        );
    }

    // ==========================================================
    // 🚀 START
    // ==========================================================
    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }

})();
