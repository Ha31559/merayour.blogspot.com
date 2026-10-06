(function () {
    "use strict";

    // ==========================================================
    // ⚙️ CONFIGURATION
    // ==========================================================
    const CONFIG = {
        logoUrl:
            "https://blogger.googleusercontent.com/img/a/AVvXsEhaZtN16Z4U9z--I9xFPXPpFPqQXh9Q4KbMSy3yElIrhilHz3K8p_yT_Vb-FLxWdgGuvMXdhnceynqtPxGx2690kGB33A-VQUY8lwKSd8tPKl5ZTG3sr_dk-57wVbk8PHki2zI8xI5KvOP3IPUCV7jqWvxznVHyArqw5cTA2FfJOZVYoB1k2AFFy5sDaQ=s666",

        title: "Ad Blocker Detected!",

        message:
            "It looks like an ad or content blocker is preventing this page from loading properly." +
            "Merayour is a free website supported by readers and advertising, which helps us keep our stories available without a subscription." +
            "If you enjoy our stories, please consider Whitelisting or allowing ads on Merayour. " +
    "Once your blocker is disabled for this site, you can Refresh and continue reading normally"
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
    let detectionScore = 0;

    let legitAdRendered = false;

    let pageLocked = false;

    let blockerState = "UNKNOWN";

    let lastAdRenderTime = 0;

    let missingAdChecks = 0;

    const incidentMap = new Map();

    const evidenceMap = {
        NETWORK: new Set(),
        DOM_COSMETIC: new Set(),
        BROWSER_ENGINE: new Set(),
        RESOURCE: new Set(),
        REMOVAL: new Set()
    };

    const categoryState = {
        NETWORK: false,
        DOM_COSMETIC: false,
        BROWSER_ENGINE: false,
        RESOURCE: false,
        REMOVAL: false
    };

    // ==========================================================
    // ⏱️ TIMING
    // ==========================================================
    const INITIAL_GRACE = 800;

    const INCIDENT_TTL = 2500;

    const INCIDENT_COOLDOWN = 1200;

    const LOCAL_WATCH_INTERVAL = 500;

    const NETWORK_WATCH_INTERVAL = 3000;

    const AD_MISSING_CONFIRMATIONS = 4;

    const delayedChecks = [
        800,
        1500,
        3000,
        5000
    ];

    const nowReady = () =>
        performance.now() >= INITIAL_GRACE;

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
    // 🎚️ INTELLIGENT THRESHOLD
    // ==========================================================
    function getThreshold() {

        /*
         * Before a legitimate ad has rendered:
         *
         * Standard browser = 85
         * Other browser     = 90
         *
         * After a real ad has rendered, the detector
         * becomes much more conservative.
         */
        let threshold =
            knownStandardBrowser
                ? 85
                : 90;

        if (legitAdRendered) {
            threshold = 160;
        }

        return threshold;
    }

    // ==========================================================
    // 🧹 EVIDENCE DECAY
    // ==========================================================
    setInterval(() => {

        const now =
            performance.now();

        incidentMap.forEach(
            (timestamp, id) => {

                if (
                    now - timestamp >
                    INCIDENT_TTL
                ) {
                    incidentMap.delete(id);
                }
            }
        );

        if (detectionScore > 0) {

            detectionScore =
                Math.max(
                    0,
                    detectionScore - 5
                );
        }

    }, 1000);

    // ==========================================================
    // 🧹 CLEAR SUSPICION
    // ==========================================================
    function clearDetectionEvidence() {

        detectionScore = 0;

        incidentMap.clear();

        Object.keys(categoryState)
            .forEach(key => {
                categoryState[key] = false;
            });

        Object.keys(evidenceMap)
            .forEach(key => {
                evidenceMap[key].clear();
            });
    }

    // ==========================================================
    // ⭐ REAL ADSENSE RENDER
    // ==========================================================
    function checkRealAdRender() {

        const ads =
            document.querySelectorAll(
                "ins.adsbygoogle, .adsbygoogle"
            );

        let rendered = false;

        ads.forEach(ad => {

            const iframe =
                ad.querySelector(
                    "iframe"
                );

            if (!iframe) {
                return;
            }

            const rect =
                iframe.getBoundingClientRect();

            if (
                rect.width > 0 &&
                rect.height > 0
            ) {
                rendered = true;
            }
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

        /*
         * IMPORTANT:
         *
         * Remove the actual lock stylesheet.
         * Otherwise overflow:hidden !important
         * can continue blocking page scrolling.
         */
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
                .removeProperty(
                    "overflow"
                );

            document.documentElement.style
                .removeProperty(
                    "height"
                );

            document.documentElement.style
                .removeProperty(
                    "user-select"
                );
        }

        if (document.body) {

            document.body.style
                .removeProperty(
                    "overflow"
                );

            document.body.style
                .removeProperty(
                    "height"
                );

            document.body.style
                .removeProperty(
                    "user-select"
                );
        }
    }

    // ==========================================================
    // 🔒 LOCK PAGE
    // ==========================================================
    function lockPage() {

        if (pageLocked) {
            return;
        }

        if (legitAdRendered) {
            return;
        }

        pageLocked = true;

        blockerState =
            "CONFIRMED";

        const mainContent =
            document.querySelector(
                "article, .post-body, .entry-content, main, #main-content"
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

        // ------------------------------------------------------
        // LOCK STYLE
        // ------------------------------------------------------
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
                    overflow: hidden !important;

                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
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

                    font-family:
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        Roboto,
                        sans-serif;

                    text-align: center;
                }

                .ag-card {
                    width: 100%;
                    max-width: 400px;

                    padding: 32px 24px;

                    background: #161b22;

                    border:
                        1px solid #30363d;

                    border-radius: 12px;

                    box-shadow:
                        0 10px 25px
                        rgba(0,0,0,.5);

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

        // ------------------------------------------------------
        // OVERLAY
        // ------------------------------------------------------
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
    // 🧠 FINAL DECISION ENGINE
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

        /*
         * Real advertisement always wins.
         */
        if (
            checkRealAdRender()
        ) {
            return;
        }

        if (!nowReady()) {
            return;
        }

        const categories =
            Object.values(
                categoryState
            ).filter(Boolean).length;

        const network =
            evidenceMap.NETWORK.size;

        const cosmetic =
            evidenceMap.DOM_COSMETIC.size;

        const browserEvidence =
            evidenceMap.BROWSER_ENGINE.size;

        const resource =
            evidenceMap.RESOURCE.size;

        const removal =
            evidenceMap.REMOVAL.size;

        /*
         * PRIMARY CORRELATION
         */
        const networkDom =
            network > 0 &&
            cosmetic > 0;

        /*
         * NETWORK + REMOVAL
         */
        const removalNetwork =
            network > 0 &&
            removal > 0;

        /*
         * RESOURCE + DOM
         */
        const resourceDom =
            resource > 0 &&
            cosmetic > 0;

        /*
         * STRONG MULTI-SIGNAL
         */
        const multiSignal =
            network > 0 &&
            cosmetic > 0 &&
            (
                resource > 0 ||
                removal > 0 ||
                browserEvidence > 0
            );

        /*
         * Final lock requires:
         *
         * 1. High score
         * 2. At least two independent categories
         * 3. A meaningful correlation
         */
        if (
            detectionScore >=
                getThreshold() &&

            categories >= 2 &&

            (
                networkDom ||
                removalNetwork ||
                resourceDom ||
                multiSignal
            )
        ) {

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

        const now =
            performance.now();

        /*
         * Deduplicate repeated signals.
         */
        if (
            incidentMap.has(id) &&
            now -
                incidentMap.get(id) <
                INCIDENT_COOLDOWN
        ) {
            return;
        }

        incidentMap.set(
            id,
            now
        );

        const weight =
            WEIGHTS[confidence] ||
            WEIGHTS.WEAK;

        detectionScore +=
            weight;

        categoryState[
            category
        ] = true;

        if (
            evidenceMap[category]
        ) {

            evidenceMap[
                category
            ].add(
                source || id
            );
        }

        /*
         * NETWORK + DOM
         */
        if (
            evidenceMap.NETWORK.size > 0 &&
            evidenceMap.DOM_COSMETIC.size > 0
        ) {

            detectionScore += 25;
        }

        /*
         * NETWORK + REMOVAL
         */
        if (
            evidenceMap.NETWORK.size > 0 &&
            evidenceMap.REMOVAL.size > 0
        ) {

            detectionScore += 25;
        }

        /*
         * RESOURCE + DOM
         */
        if (
            evidenceMap.RESOURCE.size > 0 &&
            evidenceMap.DOM_COSMETIC.size > 0
        ) {

            detectionScore += 20;
        }

        /*
         * Full four-signal correlation.
         */
        if (
            evidenceMap.NETWORK.size > 0 &&
            evidenceMap.DOM_COSMETIC.size > 0 &&
            evidenceMap.RESOURCE.size > 0 &&
            evidenceMap.REMOVAL.size > 0
        ) {

            detectionScore += 30;
        }

        setTimeout(
            evaluate,
            300
        );
    }

    // ==========================================================
    // 🌐 NETWORK INCIDENT
    // ==========================================================
    function networkIncident(
        source
    ) {

        if (!navigator.onLine) {
            return;
        }

        registerIncident(
            "network:" + source,
            "MEDIUM",
            "NETWORK",
            source
        );
    }

    // ==========================================================
    // 🪤 MULTI BAIT SYSTEM
    // ==========================================================
    function createBaits() {

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
                    "width:1px!important;" +
                    "height:1px!important;" +
                    "position:absolute!important;" +
                    "left:-9999px!important;" +
                    "top:-9999px!important;" +
                    "opacity:0.01!important;" +
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
    // 🎨 ADVANCED COSMETIC DETECTION
    // ==========================================================
    function checkCosmetic() {

        createBaits();

        const targets =
            document.querySelectorAll(
                "[data-ag-bait], " +
                "ins.adsbygoogle, " +
                ".adsbygoogle"
            );

        targets.forEach(
            element => {

                /*
                 * ----------------------------------------------
                 * BAIT CHECK
                 * ----------------------------------------------
                 */
                if (
                    element.dataset.agBait ===
                    "true"
                ) {

                    const style =
                        window.getComputedStyle(
                            element
                        );

                    const suspicious =
                        style.display ===
                            "none" ||
                        style.visibility ===
                            "hidden" ||
                        style.opacity ===
                            "0" ||
                        element.offsetHeight ===
                            0;

                    if (
                        suspicious
                    ) {

                        const hits =
                            parseInt(
                                element.dataset.hits ||
                                    "0",
                                10
                            ) + 1;

                        element.dataset.hits =
                            String(hits);

                        if (
                            hits >= 2
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

                /*
                 * ----------------------------------------------
                 * REAL AD SLOT CHECK
                 * ----------------------------------------------
                 */
                if (
                    element.matches(
                        "ins.adsbygoogle, .adsbygoogle"
                    )
                ) {

                    const iframe =
                        element.querySelector(
                            "iframe"
                        );

                    if (iframe) {

                        const rect =
                            iframe.getBoundingClientRect();

                        if (
                            rect.width > 0 &&
                            rect.height > 0
                        ) {
                            return;
                        }
                    }

                    /*
                     * Unfilled is neutral.
                     */
                    if (
                        element.getAttribute(
                            "data-ad-status"
                        ) === "unfilled"
                    ) {
                        return;
                    }

                    const style =
                        window.getComputedStyle(
                            element
                        );

                    const hidden =
                        style.display ===
                            "none" ||
                        style.visibility ===
                            "hidden" ||
                        element.offsetHeight ===
                            0;

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
                            hits >= 3
                        ) {

                            registerIncident(
                                "cosmetic:ad:" +
                                    element.id,
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

        let score = 0;

        /*
         * Soul
         */
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

        /*
         * Brave remains supporting evidence.
         */
        if (
            browser.brave
        ) {
            score += 10;
        }

        /*
         * Opera remains supporting evidence.
         */
        if (
            browser.opera
        ) {
            score += 5;
        }

        /*
         * Browser evidence NEVER locks by itself.
         */
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
                "ins.adsbygoogle, .adsbygoogle"
            );

        let visibleAds = 0;

        let usableAdSlot = false;

        ads.forEach(
            ad => {

                const iframe =
                    ad.querySelector(
                        "iframe"
                    );

                if (iframe) {

                    const rect =
                        iframe.getBoundingClientRect();

                    if (
                        rect.width > 0 &&
                        rect.height > 0
                    ) {

                        visibleAds++;

                        usableAdSlot = true;

                        legitAdRendered =
                            true;

                        lastAdRenderTime =
                            performance.now();

                        missingAdChecks = 0;
                    }
                }

                if (
                    ad.getAttribute(
                        "data-ad-status"
                    ) !== "unfilled"
                ) {
                    usableAdSlot = true;
                }
            }
        );

        /*
         * A currently visible real ad is
         * always positive evidence.
         */
        if (
            visibleAds > 0
        ) {

            detectionScore = 0;

            unlockPage();

            return;
        }

        /*
         * ------------------------------------------------------
         * RE-BLOCK VERIFICATION
         * ------------------------------------------------------
         *
         * Do NOT immediately reset legitAdRendered just
         * because an ad is temporarily missing.
         *
         * Require several consecutive checks.
         */
        if (
            legitAdRendered &&
            usableAdSlot
        ) {

            missingAdChecks++;

            if (
                missingAdChecks >=
                AD_MISSING_CONFIRMATIONS
            ) {

                /*
                 * Only now allow the detection engine
                 * to become active again.
                 */
                legitAdRendered = false;

                missingAdChecks = 0;

                blockerState =
                    "MONITORING";

                clearDetectionEvidence();
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
                    "resource"
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
                    typeof url ===
                        "string"
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
                                "xhr"
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
                    typeof args[0] ===
                        "string"
                        ? args[0]
                        : args[0]?.url ||
                          "";

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
                                    "fetch-status"
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
                                    "fetch"
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
                    "pixel"
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
                "fetch-test"
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
            node.nodeType !== 1
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

                            /*
                             * Removed nodes
                             */
                            mutation
                                .removedNodes
                                .forEach(
                                    inspectRemovedNode
                                );

                            /*
                             * Added suspicious nodes
                             */
                            mutation
                                .addedNodes
                                .forEach(
                                    node => {

                                        if (
                                            node.nodeType !==
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
                    () => {

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

        /*
         * Real ad has priority.
         */
        if (
            checkRealAdRender()
        ) {
            return;
        }

        inspectAdState();

        if (
            legitAdRendered
        ) {
            return;
        }

        /*
         * Continue even when page is locked.
         */
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
    // 💓 INITIALIZATION
    // ==========================================================
    function init() {

        setTimeout(
            () => {

                runAllChecks();

                scheduleDelayedVerification();

                /*
                 * LOCAL MONITOR
                 */
                setInterval(
                    runLocalWatch,
                    LOCAL_WATCH_INTERVAL
                );

                /*
                 * NETWORK MONITOR
                 */
                setInterval(
                    runNetworkWatch,
                    NETWORK_WATCH_INTERVAL
                );

            },
            50
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
