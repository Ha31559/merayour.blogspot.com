(function () {
    "use strict";

    // ==========================================================
    // MERAYOUR ADGUARD v2.2 - DECISION ENGINE ARCHITECTURE
    // Production Build
    //
    // KEY UPGRADES v2.2:
    // - Coordinated Google Ecosystem Engine (AdSense + Analytics + Consent)
    // - Multi-signal Correlation Engine (No single weak signal triggers popup)
    // - Repeated Confirmation Loop before Article Block + Popup
    // - Instant Suspicion Clear on Real Ad Render
    // - Blogger Preview & Duplicate Guards preserved
    // ==========================================================

    // ==========================================================
    // 🛑 DUPLICATE GUARD
    // ==========================================================
    if (window.__MERAYOUR_ADGUARD_ACTIVE__) {
        return;
    }
    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;

    // ==========================================================
    // 🛑 BLOGGER PREVIEW / EDITOR BYPASS
    // ==========================================================
    function isBloggerPreview() {
        const host = (location.hostname || "").toLowerCase();
        const href = (location.href || "").toLowerCase();
        const search = (location.search || "").toLowerCase();
        const path = (location.pathname || "").toLowerCase();
        const ref = (document.referrer || "").toLowerCase();

        if (
            host === "blogger.com" ||
            host.endsWith(".blogger.com") ||
            host === "draft.blogger.com"
        ) {
            return true;
        }

        if (
            /(^|[\/_-])layout-preview([\/_-]|$)/i.test(path) ||
            /(^|[\/_-])template-preview([\/_-]|$)/i.test(path) ||
            /(^|[\/_-])post-preview([\/_-]|$)/i.test(path)
        ) {
            return true;
        }

        if (
            search.includes("preview=true") ||
            search.includes("preview=1") ||
            search.includes("blogger.preview") ||
            search.includes("editor=true")
        ) {
            return true;
        }

        if (
            href.includes("blogger.com") &&
            (href.includes("/layout") || href.includes("/template") || href.includes("/edit"))
        ) {
            return true;
        }

        if (
            window !== window.top &&
            (ref.includes("blogger.com") || ref.includes("blogspot.com"))
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
        title: "Ad Blocker Detected!",
        message:
            "It looks like an ad or content blocker is preventing this page from loading properly. " +
            "Merayour is a free website supported by readers and advertising, which helps us keep our stories available without a subscription. " +
            "If you enjoy our stories, please consider allowing ads or whitelisting Merayour. " +
            "Once your blocker is disabled for this site, you can continue reading normally."
    };

    // ==========================================================
    // ⚖️ DETECTION WEIGHTS
    // ==========================================================
    const WEIGHTS = {
        CRITICAL: 70,
        STRONG: 40,
        MEDIUM: 30,
        WEAK: 10
    };

    // ==========================================================
    // 🌐 GOOGLE ECOSYSTEM TRACKER (v2.2 ENGINE)
    // ==========================================================
    const googleEcosystem = {
        adsenseBlocked: false,
        analyticsBlocked: false,
        consentBlocked: false,
        resourceErrors: 0
    };

    // ==========================================================
    // 🧠 CORE STATE
    // ==========================================================
    let detectionScore = 0;
    let legitAdRendered = false;
    let pageLocked = false;
    let blockerState = "UNKNOWN";
    let lastAdRenderTime = 0;
    let missingAdChecks = 0;
    const pageLoadStart = performance.now();

    const incidentMap = new Map();

    const evidenceMap = {
        NETWORK: new Set(),
        DOM_COSMETIC: new Set(),
        BROWSER_ENGINE: new Set(),
        RESOURCE: new Set(),
        REMOVAL: new Set(),
        GOOGLE_ECOSYSTEM: new Set()
    };

    const categoryState = {
        NETWORK: false,
        DOM_COSMETIC: false,
        BROWSER_ENGINE: false,
        RESOURCE: false,
        REMOVAL: false,
        GOOGLE_ECOSYSTEM: false
    };

    // ==========================================================
    // ⏱️ TIMING & CONFIRMATIONS
    // ==========================================================
    const INITIAL_GRACE = 2500;
    const ADSENSE_LOAD_GRACE = 8000;
    const INCIDENT_TTL = 4000;
    const INCIDENT_COOLDOWN = 1500;
    const LOCAL_WATCH_INTERVAL = 1000;
    const NETWORK_WATCH_INTERVAL = 10000;
    const AD_MISSING_CONFIRMATIONS = 6;
    const REBLOCK_GRACE = 5000;
    const CLEAN_CONFIRMATIONS_REQUIRED = 2;
    const delayedChecks = [2500, 4000, 6500, 9000];

    // ==========================================================
    // 🧠 ARTICLE RENDER STATE
    // ==========================================================
    let mainContent = null;
    let originalArticleHTML = null;
    let originalArticleCaptured = false;
    let articleCurrentlyReplaced = false;
    let contentState = "NORMAL";
    let cleanStateConfirmations = 0;
    let blockStateConfirmations = 0;
    let articleRestoreInProgress = false;
    let articleBlockInProgress = false;

    // ==========================================================
    // 🧠 FIND ARTICLE CONTAINER
    // ==========================================================
    function findMainContent() {
        if (mainContent && document.documentElement.contains(mainContent)) {
            return mainContent;
        }
        mainContent = document.querySelector(
            "article, .post-body, .entry-content, main, #main-content"
        );
        return mainContent;
    }

    // ==========================================================
    // 💾 CAPTURE ORIGINAL ARTICLE HTML
    // ==========================================================
    function captureOriginalArticle() {
        const target = findMainContent();
        if (!target) return false;

        if (!originalArticleCaptured) {
            originalArticleHTML = target.innerHTML;
            originalArticleCaptured = true;
        }
        return true;
    }

    // ==========================================================
    // 🕒 READY CHECK
    // ==========================================================
    function nowReady() {
        const elapsed = performance.now() - pageLoadStart;
        return elapsed >= INITIAL_GRACE && elapsed >= ADSENSE_LOAD_GRACE;
    }

    // ==========================================================
    // 🌐 BROWSER INFORMATION
    // ==========================================================
    const ua = (navigator.userAgent || "").toLowerCase();
    const vendor = (navigator.vendor || "").toLowerCase();

    const browser = {
        soul: ua.includes("soul") || !!window.soul || !!window.__soul_ext__,
        brave: !!(navigator.brave && typeof navigator.brave.isBrave === "function"),
        opera: ua.includes("opera") || ua.includes("opr/"),
        chrome: !!window.chrome && vendor.includes("google"),
        edge: ua.includes("edg/"),
        firefox: ua.includes("firefox"),
        safari: /safari/.test(ua) && !/chrome|crios|android/.test(ua)
    };

    const knownStandardBrowser =
        browser.chrome || browser.edge || browser.firefox || browser.safari;

    // ==========================================================
    // 🎯 THRESHOLD
    // ==========================================================
    function getThreshold() {
        let threshold = knownStandardBrowser ? 125 : 110;
        if (legitAdRendered) {
            threshold = 160;
        }
        return threshold;
    }

    // ==========================================================
    // 🧹 INCIDENT DECAY
    // ==========================================================
    setInterval(() => {
        const now = performance.now();
        incidentMap.forEach((timestamp, id) => {
            if (now - timestamp > INCIDENT_TTL) {
                incidentMap.delete(id);
            }
        });

        if (detectionScore > 0) {
            detectionScore = Math.max(0, detectionScore - 5);
        }
    }, 1000);

    // ==========================================================
    // 🧹 CLEAR DETECTION EVIDENCE
    // ==========================================================
    function clearDetectionEvidence() {
        detectionScore = 0;
        incidentMap.clear();

        Object.keys(categoryState).forEach((key) => {
            categoryState[key] = false;
        });

        Object.keys(evidenceMap).forEach((key) => {
            evidenceMap[key].clear();
        });
    }

    // ==========================================================
    // 🟢 REAL AD RENDER DETECTION (INSTANT OVERRIDE)
    // ==========================================================
    function checkRealAdRender() {
        const ads = document.querySelectorAll("ins.adsbygoogle, .adsbygoogle");
        let rendered = false;

        ads.forEach((ad) => {
            const iframe = ad.querySelector("iframe");
            if (!iframe) return;

            const rect = iframe.getBoundingClientRect();
            const style = window.getComputedStyle(iframe);

            const visible =
                rect.width > 0 &&
                rect.height > 0 &&
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                style.opacity !== "0";

            if (visible) {
                rendered = true;
            }
        });

        if (rendered) {
            legitAdRendered = true;
            lastAdRenderTime = performance.now();
            missingAdChecks = 0;

            clearDetectionEvidence();
            blockerState = "AD_RENDERED";
            cleanStateConfirmations = 0;
            blockStateConfirmations = 0;

            stopIntelligentProbing();
            restoreArticleIfNeeded();
            unlockPage();
        }

        return rendered;
    }

    // ==========================================================
    // 🔓 UNLOCK PAGE
    // ==========================================================
    function unlockPage() {
        const overlay = document.getElementById("ag-lock-overlay");
        if (overlay) overlay.remove();

        const lockStyle = document.getElementById("ag-lock-style");
        if (lockStyle) lockStyle.remove();

        pageLocked = false;

        if (document.documentElement) {
            document.documentElement.style.removeProperty("overflow");
            document.documentElement.style.removeProperty("height");
            document.documentElement.style.removeProperty("user-select");
        }

        if (document.body) {
            document.body.style.removeProperty("overflow");
            document.body.style.removeProperty("height");
            document.body.style.removeProperty("user-select");
        }
    }

    // ==========================================================
    // 🔒 CREATE BLOCK OVERLAY
    // ==========================================================
    function createLockOverlay() {
        if (document.getElementById("ag-lock-overlay")) return;

        let style = document.getElementById("ag-lock-style");
        if (!style) {
            style = document.createElement("style");
            style.id = "ag-lock-style";
            style.textContent = `
                html, body {
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
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    text-align: center;
                }
                #ag-lock-overlay .ag-card {
                    width: 100%;
                    max-width: 400px;
                    padding: 32px 24px;
                    background: #161b22;
                    border: 1px solid #30363d;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,.5);
                    box-sizing: border-box;
                }
                #ag-lock-overlay .ag-logo {
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
            document.head.appendChild(style);
        }

        const overlay = document.createElement("div");
        overlay.id = "ag-lock-overlay";

        const logo = CONFIG.logoUrl
            ? `<img src="${CONFIG.logoUrl}" alt="Merayour" class="ag-logo" onerror="this.style.display='none'">`
            : "";

        overlay.innerHTML = `
            <div class="ag-card">
                ${logo}
                <h1>${CONFIG.title}</h1>
                <p>${CONFIG.message}</p>
            </div>
        `;

        (document.body || document.documentElement).appendChild(overlay);
    }

    // ==========================================================
    // 🔒 SMART ARTICLE BLOCK
    // ==========================================================
    function blockArticleIfNeeded() {
        if (articleBlockInProgress || articleCurrentlyReplaced) return;

        const target = findMainContent();
        if (!target || !captureOriginalArticle()) return;

        articleBlockInProgress = true;
        try {
            target.innerHTML = `
                <div class="ag-render-block" style="padding:30px; text-align:center; color:#fff; box-sizing:border-box;">
                    <h3 style="margin:0 0 12px; font-size:20px;">Content Temporarily Unavailable</h3>
                    <p style="margin:0; color:#b8c0cc; line-height:1.6; font-size:14px;">
                        This page is supported by advertising. Please allow ads for Merayour to continue reading.
                    </p>
                </div>
            `;
            articleCurrentlyReplaced = true;
            contentState = "BLOCKED";
        } finally {
            articleBlockInProgress = false;
        }
    }

    // ==========================================================
    // 🔓 SMART ARTICLE RESTORE
    // ==========================================================
    function restoreArticleIfNeeded() {
        if (articleRestoreInProgress || !articleCurrentlyReplaced || !originalArticleCaptured) return;

        const target = findMainContent();
        if (!target) return;

        articleRestoreInProgress = true;
        try {
            target.innerHTML = originalArticleHTML;
            articleCurrentlyReplaced = false;
            contentState = "NORMAL";
        } finally {
            articleRestoreInProgress = false;
        }
    }

    // ==========================================================
    // 🔒 PAGE LOCK
    // ==========================================================
    function lockPage() {
        if (legitAdRendered) return;
        if (performance.now() - pageLoadStart < ADSENSE_LOAD_GRACE) return;
        if (checkRealAdRender()) return;

        if (contentState !== "BLOCKED") {
            blockArticleIfNeeded();
        }

        createLockOverlay();
        pageLocked = true;
        blockerState = "CONFIRMED";
    }

    // ==========================================================
    // 🧠 INTELLIGENT PROBE CONFIG
    // ==========================================================
    const PROBE_CONFIG = {
        MAX_CYCLES: 3,
        MIN_INTERVAL: 6500,
        START_AFTER: 8500,
        MAX_TOTAL_REQUESTS: 6,
        FAILURE_CONFIRMATIONS: 2,
        TIMEOUT: 4500,
        MAX_LIFETIME: 40000
    };

    const probeState = {
        cycles: 0,
        pixelAttempts: 0,
        pixelSuccesses: 0,
        pixelFailures: 0,
        fetchAttempts: 0,
        fetchSuccesses: 0,
        fetchFailures: 0,
        consecutivePixelFailures: 0,
        consecutiveFetchFailures: 0,
        consecutiveDualFailures: 0,
        lastProbeTime: 0,
        stopped: false,
        networkSuspicion: 0
    };

    function probeAllowed() {
        if (probeState.stopped || legitAdRendered || !navigator.onLine) return false;
        if (document.visibilityState === "hidden") return false;

        const elapsed = performance.now() - pageLoadStart;
        if (elapsed < PROBE_CONFIG.START_AFTER || elapsed > PROBE_CONFIG.MAX_LIFETIME) return false;
        if (probeState.cycles >= PROBE_CONFIG.MAX_CYCLES) return false;
        if (probeState.pixelAttempts + probeState.fetchAttempts >= PROBE_CONFIG.MAX_TOTAL_REQUESTS) return false;
        if (performance.now() - probeState.lastProbeTime < PROBE_CONFIG.MIN_INTERVAL) return false;

        return true;
    }

    function updateProbeSuspicion() {
        let suspicion = 0;
        if (probeState.consecutivePixelFailures >= PROBE_CONFIG.FAILURE_CONFIRMATIONS) suspicion += 1;
        if (probeState.consecutiveFetchFailures >= PROBE_CONFIG.FAILURE_CONFIRMATIONS) suspicion += 1;
        if (probeState.consecutiveDualFailures >= 1) suspicion += 1;
        if (probeState.pixelFailures >= 2 && probeState.fetchFailures >= 2) suspicion += 1;

        const successes = probeState.pixelSuccesses + probeState.fetchSuccesses;
        if (successes >= 2) suspicion = Math.max(0, suspicion - 1);

        probeState.networkSuspicion = Math.min(4, suspicion);

        if (probeState.networkSuspicion >= 2) {
            categoryState.NETWORK = true;
            evidenceMap.NETWORK.add("intelligent_probe");
            detectionScore += Math.min(15, probeState.networkSuspicion * 4);
        }
    }

    function runPixelProbe() {
        return new Promise((resolve) => {
            if (!navigator.onLine || probeState.pixelAttempts >= PROBE_CONFIG.MAX_CYCLES) {
                resolve(false);
                return;
            }
            probeState.pixelAttempts++;
            const pixel = new Image();
            let settled = false;

            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                probeState.pixelFailures++;
                probeState.consecutivePixelFailures++;
                pixel.src = "";
                resolve(false);
            }, PROBE_CONFIG.TIMEOUT);

            pixel.onload = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                probeState.pixelSuccesses++;
                probeState.consecutivePixelFailures = 0;
                resolve(true);
            };

            pixel.onerror = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                probeState.pixelFailures++;
                probeState.consecutivePixelFailures++;
                resolve(false);
            };

            const token = "ag22-" + probeState.pixelAttempts;
            pixel.src = "https://pagead2.googlesyndication.com/pagead/img/0.gif?ag=" + encodeURIComponent(token);
        });
    }

    async function runFetchProbe() {
        if (!navigator.onLine || !window.fetch || probeState.fetchAttempts >= PROBE_CONFIG.MAX_CYCLES) {
            return false;
        }
        probeState.fetchAttempts++;

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        let timeoutId = null;

        if (controller) {
            timeoutId = setTimeout(() => {
                try { controller.abort(); } catch (_) {}
            }, PROBE_CONFIG.TIMEOUT);
        }

        try {
            const token = "ag22-" + probeState.fetchAttempts;
            const url = "https://pagead2.googlesyndication.com/pagead/img/0.gif?ag=" + encodeURIComponent(token);
            await window.fetch(url, {
                method: "GET",
                mode: "no-cors",
                cache: "no-store",
                credentials: "omit",
                signal: controller ? controller.signal : undefined
            });

            if (timeoutId) clearTimeout(timeoutId);
            probeState.fetchSuccesses++;
            probeState.consecutiveFetchFailures = 0;
            return true;
        } catch (error) {
            if (timeoutId) clearTimeout(timeoutId);
            probeState.fetchFailures++;
            probeState.consecutiveFetchFailures++;
            return false;
        }
    }

    async function runIntelligentProbeCycle() {
        if (!probeAllowed()) return;

        probeState.lastProbeTime = performance.now();
        probeState.cycles++;

        const results = await Promise.all([runPixelProbe(), runFetchProbe()]);
        const pixelOK = results[0];
        const fetchOK = results[1];

        if (!pixelOK && !fetchOK) {
            probeState.consecutiveDualFailures++;
        } else {
            probeState.consecutiveDualFailures = 0;
        }

        updateProbeSuspicion();

        if (pixelOK || fetchOK) {
            probeState.networkSuspicion = Math.max(0, probeState.networkSuspicion - 1);
        }

        evaluate();
    }

    function stopIntelligentProbing() {
        probeState.stopped = true;
    }

    // ==========================================================
    // 🌐 GOOGLE ECOSYSTEM CORRELATION ENGINE (v2.2 CORE)
    // ==========================================================
    function checkGoogleEcosystem() {
        if (performance.now() - pageLoadStart < ADSENSE_LOAD_GRACE) return;

        // 1. Check AdSense Script Readiness
        const adsenseScriptMissing = typeof window.adsbygoogle === "undefined";
        googleEcosystem.adsenseBlocked = adsenseScriptMissing;

        // 2. Check Google Analytics / Measurement
        const gaMissing = typeof window.gtag === "undefined" && typeof window.ga === "undefined" && typeof window.dataLayer === "undefined";
        googleEcosystem.analyticsBlocked = gaMissing;

        // 3. Check Google Consent / Funding Choices Frame
        const consentFrameMissing = !document.querySelector("iframe[src*='google'], iframe[id*='google'], .fc-consent-root");
        googleEcosystem.consentBlocked = consentFrameMissing;

        // Correlated Evidence Logic: High weight ONLY when multiple ecosystem elements are suppressed together
        if (googleEcosystem.adsenseBlocked && (googleEcosystem.analyticsBlocked || googleEcosystem.consentBlocked)) {
            registerIncident(
                "google:ecosystem:correlated_block",
                "CRITICAL",
                "GOOGLE_ECOSYSTEM",
                "google_coordinated_blocking"
            );
        }
    }

    // ==========================================================
    // 📌 INCIDENT REGISTRATION
    // ==========================================================
    function registerIncident(id, confidence, category, source) {
        if (!category) return;

        const now = performance.now();
        if (incidentMap.has(id) && now - incidentMap.get(id) < INCIDENT_COOLDOWN) {
            return;
        }

        incidentMap.set(id, now);
        const weight = WEIGHTS[confidence] || WEIGHTS.WEAK;
        detectionScore += weight;

        categoryState[category] = true;

        if (evidenceMap[category]) {
            evidenceMap[category].add(source || id);
        }

        // Additional correlated weight multipliers
        if (evidenceMap.NETWORK.size > 0 && evidenceMap.DOM_COSMETIC.size > 0) {
            detectionScore += 25;
        }
        if (evidenceMap.GOOGLE_ECOSYSTEM.size > 0 && evidenceMap.DOM_COSMETIC.size > 0) {
            detectionScore += 30;
        }

        setTimeout(evaluate, 300);
    }

    function networkIncident(source) {
        if (!navigator.onLine) return;
        if (performance.now() - pageLoadStart < ADSENSE_LOAD_GRACE) return;

        registerIncident("network:" + source, "MEDIUM", "NETWORK", source);
    }

    // ==========================================================
    // 🎯 CREATE AD BAITS
    // ==========================================================
    function createBaits() {
        if (!document.body) return;

        const baitConfigs = [
            { id: "ag-ad-bait-1", classes: "adsbygoogle ad-banner ad-unit google-ad" },
            { id: "ag-ad-bait-2", classes: "advertisement ad adsbox text-ad" },
            { id: "ag-ad-bait-3", classes: "ad-container ad-placement ad-slot" }
        ];

        baitConfigs.forEach((config) => {
            if (document.getElementById(config.id)) return;

            const bait = document.createElement("div");
            bait.id = config.id;
            bait.dataset.agBait = "true";
            bait.className = config.classes;
            bait.style.cssText =
                "display:block!important;visibility:visible!important;width:1px!important;height:1px!important;position:absolute!important;left:-9999px!important;top:-9999px!important;opacity:1!important;pointer-events:none!important;";

            (document.body || document.documentElement).appendChild(bait);
        });
    }

    // ==========================================================
    // 🎨 COSMETIC DETECTION
    // ==========================================================
    function checkCosmetic() {
        createBaits();

        const isAdScriptLoading = typeof window.adsbygoogle === "undefined";
        if (isAdScriptLoading && performance.now() - pageLoadStart < ADSENSE_LOAD_GRACE) {
            return;
        }

        const targets = document.querySelectorAll("[data-ag-bait], ins.adsbygoogle, .adsbygoogle");

        targets.forEach((element) => {
            if (element.dataset.agBait === "true") {
                const style = window.getComputedStyle(element);
                const suspicious = style.display === "none" || style.visibility === "hidden";

                if (suspicious) {
                    const hits = parseInt(element.dataset.hits || "0", 10) + 1;
                    element.dataset.hits = String(hits);

                    if (hits >= 3) {
                        registerIncident("bait:" + element.id, "STRONG", "DOM_COSMETIC", element.id);
                    }
                } else {
                    element.dataset.hits = "0";
                }
                return;
            }

            if (element.matches("ins.adsbygoogle, .adsbygoogle")) {
                const iframe = element.querySelector("iframe");
                if (iframe) {
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) return;
                }

                if (element.getAttribute("data-ad-status") === "unfilled" || element.innerHTML.trim() === "") {
                    return;
                }

                const style = window.getComputedStyle(element);
                const hidden = style.display === "none" || style.visibility === "hidden";

                if (hidden) {
                    const hits = parseInt(element.dataset.hits || "0", 10) + 1;
                    element.dataset.hits = String(hits);

                    if (hits >= 4) {
                        registerIncident("cosmetic:ad:" + (element.id || "anonymous"), "STRONG", "DOM_COSMETIC", "hidden_ad");
                    }
                } else {
                    element.dataset.hits = "0";
                }
            }
        });
    }

    // ==========================================================
    // 🧠 BROWSER SIGNALS
    // ==========================================================
    function checkBrowserSignals() {
        let score = 0;
        if (browser.soul) score += 30;
        if (window.soul || window.__soul_ext__ || (window.external && "Soul" in window.external)) score += 40;
        if (browser.brave) score += 10;
        if (browser.opera) score += 5;

        if (score >= 60) {
            registerIncident("browser:strong", "STRONG", "BROWSER_ENGINE", "browser_strong");
        } else if (score >= 30) {
            registerIncident("browser:weak", "WEAK", "BROWSER_ENGINE", "browser_weak");
        }
    }

    // ==========================================================
    // 🔍 AD STATE INSPECTION
    // ==========================================================
    function inspectAdState() {
        const ads = document.querySelectorAll("ins.adsbygoogle, .adsbygoogle");
        let visibleAds = 0;
        let usableAdSlot = false;

        ads.forEach((ad) => {
            const iframe = ad.querySelector("iframe");
            if (iframe) {
                const rect = iframe.getBoundingClientRect();
                const style = window.getComputedStyle(iframe);

                if (
                    rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== "none" &&
                    style.visibility !== "hidden" &&
                    style.opacity !== "0"
                ) {
                    visibleAds++;
                    usableAdSlot = true;
                    legitAdRendered = true;
                    lastAdRenderTime = performance.now();
                    missingAdChecks = 0;
                }
            }

            if (ad.getAttribute("data-ad-status") !== "unfilled") {
                usableAdSlot = true;
            }
        });

        if (visibleAds > 0) {
            clearDetectionEvidence();
            cleanStateConfirmations = CLEAN_CONFIRMATIONS_REQUIRED;
            blockStateConfirmations = 0;
            restoreArticleIfNeeded();
            unlockPage();
            stopIntelligentProbing();
            return;
        }

        if (legitAdRendered && usableAdSlot) {
            missingAdChecks++;
            if (missingAdChecks >= AD_MISSING_CONFIRMATIONS) {
                legitAdRendered = false;
                missingAdChecks = 0;
                blockerState = "MONITORING";
                clearDetectionEvidence();
                probeState.stopped = false;
            }
        }
    }

    // ==========================================================
    // 🚨 RESOURCE ERROR & NETWORK MONITORS
    // ==========================================================
    window.addEventListener(
        "error",
        function (event) {
            if (!event) return;
            const target = event.target;
            const src = target?.src || target?.href || "";

            if (/googlesyndication|pagead2|doubleclick|googleadservices|google-analytics/i.test(src)) {
                googleEcosystem.resourceErrors++;
                registerIncident("resource:error:" + src, "STRONG", "RESOURCE", "resource_error");
                networkIncident("resource");
            }
        },
        true
    );

    (function installXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this.__ag_url = typeof url === "string" ? url : "";
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function () {
            this.addEventListener("error", () => {
                const url = this.__ag_url || "";
                if (/pagead2|googlesyndication|doubleclick|googleadservices|google-analytics/i.test(url)) {
                    networkIncident("xhr");
                    registerIncident("xhr:error:" + url, "STRONG", "RESOURCE", "xhr_error");
                }
            });
            return originalSend.apply(this, arguments);
        };
    })();

    (function installFetchInterceptor() {
        if (!window.fetch) return;
        const originalFetch = window.fetch;

        window.fetch = function (...args) {
            const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

            return originalFetch.apply(this, args)
                .then((response) => {
                    if (!response.ok && response.type !== "opaque" && /pagead2|googlesyndication|doubleclick|googleadservices/i.test(url)) {
                        networkIncident("fetch-status");
                    }
                    return response;
                })
                .catch((error) => {
                    if (/pagead2|googlesyndication|doubleclick|googleadservices|google-analytics/i.test(url)) {
                        networkIncident("fetch");
                        registerIncident("fetch:error:" + url, "STRONG", "RESOURCE", "fetch_error");
                    }
                    throw error;
                });
        };
    })();

    // ==========================================================
    // 🗑️ REMOVED AD NODE DETECTION
    // ==========================================================
    function inspectRemovedNode(node) {
        if (node.nodeType !== 1) return;

        const isAd =
            node.classList?.contains("adsbygoogle") ||
            node.matches?.("ins.adsbygoogle") ||
            node.querySelector?.(".adsbygoogle, ins.adsbygoogle");

        if (isAd) {
            registerIncident("removed:" + (node.id || node.className || "ad-node"), "STRONG", "REMOVAL", "ad_removal");
        }
    }

    (function installDOMObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach(inspectRemovedNode);
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    const suspicious =
                        node.matches?.(".adsbygoogle, ins.adsbygoogle, iframe") ||
                        node.querySelector?.(".adsbygoogle, ins.adsbygoogle");

                    if (suspicious) {
                        setTimeout(() => {
                            checkRealAdRender();
                            inspectAdState();
                            checkCosmetic();
                            evaluate();
                        }, 150);
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style", "class", "hidden", "src"]
        });
    })();

    // ==========================================================
    // 🧠 DECISION STATE CONFIRMATIONS (v2.2 DECISION ENGINE)
    // ==========================================================
    function detectCleanState() {
        if (checkRealAdRender()) {
            cleanStateConfirmations = CLEAN_CONFIRMATIONS_REQUIRED;
            return true;
        }

        const probeSuccesses = probeState.pixelSuccesses + probeState.fetchSuccesses;
        if (probeSuccesses >= 2 && probeState.networkSuspicion === 0) {
            cleanStateConfirmations++;
        } else {
            cleanStateConfirmations = Math.max(0, cleanStateConfirmations - 1);
        }

        return cleanStateConfirmations >= CLEAN_CONFIRMATIONS_REQUIRED;
    }

    function detectBlockState() {
        const categories = Object.values(categoryState).filter(Boolean).length;

        const network = evidenceMap.NETWORK.size;
        const cosmetic = evidenceMap.DOM_COSMETIC.size;
        const resource = evidenceMap.RESOURCE.size;
        const googleEco = evidenceMap.GOOGLE_ECOSYSTEM.size;

        // Requiring coordinated ecosystem or cross-category validation before confirming block
        const multiSignalValidation =
            (googleEco > 0 && cosmetic > 0) ||
            (network > 0 && cosmetic > 0) ||
            (resource > 0 && cosmetic > 0 && categories >= 2);

        if (detectionScore >= getThreshold() && categories >= 2 && multiSignalValidation) {
            blockStateConfirmations++;
        } else {
            blockStateConfirmations = Math.max(0, blockStateConfirmations - 1);
        }

        // Must pass confirmation checks (no single weak signal)
        return blockStateConfirmations >= 2;
    }

    // ==========================================================
    // 🧠 MASTER DECISION EVALUATION
    // ==========================================================
    function evaluate() {
        if (!navigator.onLine || document.readyState === "loading") return;

        // Real Ad Render ALWAYS HAS HIGHEST PRIORITY
        if (checkRealAdRender()) return;

        if (!nowReady()) return;

        checkGoogleEcosystem();

        if (articleCurrentlyReplaced || contentState === "BLOCKED") {
            if (detectCleanState()) {
                blockerState = "CLEAN";
                cleanStateConfirmations = 0;
                blockStateConfirmations = 0;

                restoreArticleIfNeeded();
                unlockPage();
                probeState.stopped = false;

                clearDetectionEvidence();
                return;
            }

            createLockOverlay();
            pageLocked = true;
            blockerState = "CONFIRMED";
            return;
        }

        if (detectBlockState()) {
            if (checkRealAdRender()) return;

            blockerState = "CONFIRMED";
            blockStateConfirmations = 0;
            cleanStateConfirmations = 0;

            blockArticleIfNeeded();
            createLockOverlay();
            pageLocked = true;
            return;
        }

        blockerState = "MONITORING";
    }

    // ==========================================================
    // ⏱️ SCHEDULERS & WATCHERS
    // ==========================================================
    function scheduleDelayedVerification() {
        delayedChecks.forEach((delay) => {
            setTimeout(() => {
                if (!navigator.onLine) return;
                checkRealAdRender();
                inspectAdState();
                checkCosmetic();
                checkBrowserSignals();
                evaluate();
            }, delay);
        });
    }

    function runLocalWatch() {
        if (!navigator.onLine || checkRealAdRender()) return;
        inspectAdState();

        if (legitAdRendered && performance.now() - lastAdRenderTime < REBLOCK_GRACE) {
            return;
        }

        checkCosmetic();
        checkBrowserSignals();
        evaluate();
    }

    async function runNetworkWatch() {
        if (!navigator.onLine || checkRealAdRender()) return;

        if (legitAdRendered && performance.now() - lastAdRenderTime < REBLOCK_GRACE) {
            return;
        }

        await runIntelligentProbeCycle();
        evaluate();
    }

    // ==========================================================
    // 🔄 EVENT RECOVERIES
    // ==========================================================
    window.addEventListener("online", () => {
        blockerState = "MONITORING";
        probeState.stopped = false;
        setTimeout(() => {
            checkRealAdRender();
            inspectAdState();
            checkCosmetic();
            evaluate();
        }, 1200);
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            setTimeout(() => {
                checkRealAdRender();
                inspectAdState();
                checkCosmetic();
                evaluate();
            }, 700);
        }
    });

    // ==========================================================
    // 🚀 INITIALIZATION
    // ==========================================================
    function init() {
        captureOriginalArticle();

        setTimeout(() => {
            runLocalWatch();
            scheduleDelayedVerification();

            setInterval(runLocalWatch, LOCAL_WATCH_INTERVAL);
            setInterval(runNetworkWatch, NETWORK_WATCH_INTERVAL);
        }, 1000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
