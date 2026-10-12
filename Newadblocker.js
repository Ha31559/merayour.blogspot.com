(function () {
    "use strict";

    // ==========================================================
    // MERAYOUR ADGUARD — V9.2 HEARTBEAT EDITION
    // Separate Analytics + AdSense health monitoring
    // ==========================================================

    if (window.__MERAYOUR_ADGUARD_ACTIVE__) return;
    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;

    const CONFIG = {
        GA4_ID: "G-ML091DD9QZ",
        ADSENSE_ID: "ca-pub-1011806586686442",

        INITIAL_GRACE: 100,
        SYSTEM_GRACE: 100,

        CHECK_INTERVAL: 10,
        CONFIRMATION_TIME: 400,
        RECOVERY_CONFIRMATION_TIME: 500,

        FAILURE_CONFIRMATIONS: 3,

        OVERLAY_ID: "merayour-v92-lock",
        STYLE_ID: "merayour-v92-style",

        CONTENT_SELECTORS: [
            ".post-body",
            "article",
            ".post"
        ]
    };

    const now = () => Date.now();

    const state = {
        startedAt: now(),

        ga: {
            scriptFound: false,
            scriptLoaded: false,
            scriptFailed: false,
            activitySeen: false,
            lastActivity: 0,
            consecutiveFailures: 0,
            healthySince: 0,
            lastReason: ""
        },

        ads: {
            scriptFound: false,
            scriptLoaded: false,
            scriptFailed: false,
            slotsFound: false,
            filled: false,
            unfilled: false,
            consecutiveFailures: 0,
            healthySince: 0,
            lastReason: ""
        },

        locked: false,
        lockStartedAt: 0,
        suspiciousSince: 0,
        healthySince: 0,

        observer: null,
        timer: null,
        overlay: null
    };

    // ----------------------------------------------------------
    // ENVIRONMENT CHECKS
    // ----------------------------------------------------------

    function isBloggerPreview() {
        const host = (location.hostname || "").toLowerCase();
        const href = location.href || "";

        return (
            host.includes("blogger.com") ||
            /(?:^|[?&])preview=(?:true|1)(?:&|$)/i.test(
                location.search
            ) ||
            /blogger\.com\/blog\/post\/edit/i.test(href)
        );
    }

    if (isBloggerPreview()) {
        window.__MERAYOUR_ADGUARD_ACTIVE__ = false;
        return;
    }

    // ----------------------------------------------------------
    // SERVICE SCRIPT IDENTIFICATION
    // ----------------------------------------------------------

    function classifyScript(script) {
        if (!script || !script.src) return null;

        const src = script.src.toLowerCase();

        if (
            src.includes("googletagmanager.com/gtag/js") &&
            src.includes(CONFIG.GA4_ID.toLowerCase())
        ) {
            return "ga";
        }

        if (
            src.includes("google-analytics.com/analytics.js")
        ) {
            return "ga";
        }

        if (
            src.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js")
        ) {
            return "ads";
        }

        return null;
    }

    function inspectScripts() {
        document.querySelectorAll("script[src]").forEach(function (script) {
            const type = classifyScript(script);

            if (!type) return;

            const service = type === "ga" ? state.ga : state.ads;

            service.scriptFound = true;

            if (script.dataset.merayourHealthListeners === "1") {
                return;
            }

            script.dataset.merayourHealthListeners = "1";

            script.addEventListener("load", function () {
                service.scriptLoaded = true;
                service.scriptFailed = false;
                service.lastReason = "";
                service.healthySince = now();
            }, { once: true });

            script.addEventListener("error", function () {
                service.scriptFailed = true;
                service.scriptLoaded = false;
                service.lastReason = "script-error";
            }, { once: true });

            // A script already present may have finished loading
            // before the detector attached its event listeners.
            if (type === "ga" && typeof window.gtag === "function") {
                service.scriptLoaded = true;
            }

            if (
                type === "ads" &&
                typeof window.adsbygoogle !== "undefined"
            ) {
                service.scriptLoaded = true;
            }
        });
    }

    // ----------------------------------------------------------
    // ANALYTICS HEARTBEAT
    // Uses actual browser resource observations.
    // Does not send fake requests.
    // ----------------------------------------------------------

    function inspectAnalyticsActivity() {
        if (!window.performance ||
            typeof performance.getEntriesByType !== "function") {
            return;
        }

        let entries = [];

        try {
            entries = performance.getEntriesByType("resource");
        } catch (_) {
            return;
        }

        for (const entry of entries) {
            const url = (entry.name || "").toLowerCase();

            const isGAActivity =
                url.includes("google-analytics.com/g/collect") ||
                url.includes("analytics.google.com/g/collect") ||
                url.includes("region1.google-analytics.com/g/collect") ||
                url.includes("google-analytics.com/collect");

            if (
                isGAActivity &&
                (
                    url.includes(CONFIG.GA4_ID.toLowerCase()) ||
                    url.includes("google-analytics.com")
                )
            ) {
                state.ga.activitySeen = true;
                state.ga.lastActivity = now();
                state.ga.healthySince =
                    state.ga.healthySince || now();
                state.ga.lastReason = "";
                break;
            }
        }
    }

    // ----------------------------------------------------------
    // ADSENSE HEARTBEAT
    // An empty slot alone is not proof of an ad blocker.
    // ----------------------------------------------------------

    function inspectAdSlots() {
        const selector =
            'ins.adsbygoogle[data-ad-client="' +
            CONFIG.ADSENSE_ID +
            '"]';

        const slots = document.querySelectorAll(selector);

        state.ads.slotsFound = slots.length > 0;
        state.ads.filled = false;
        state.ads.unfilled = false;

        slots.forEach(function (slot) {
            const status = (
                slot.getAttribute("data-ad-status") || ""
            ).toLowerCase();

            if (status === "filled") {
                state.ads.filled = true;
            }

            if (status === "unfilled") {
                state.ads.unfilled = true;
            }
        });

        // A filled ad is positive evidence that the ad system
        // worked. "Unfilled" is not treated as an error.
        if (state.ads.filled) {
            state.ads.scriptFailed = false;
            state.ads.lastReason = "";
            state.ads.healthySince =
                state.ads.healthySince || now();
        }
    }

    // ----------------------------------------------------------
    // HEALTH EVALUATION
    // ----------------------------------------------------------

    function getServiceFailure(service, type) {
        if (service.scriptFailed) {
            return "explicit-script-error";
        }

        const elapsed = now() - state.startedAt;

        if (elapsed < CONFIG.SYSTEM_GRACE) {
            return "";
        }

        if (type === "ga") {
            // Missing Analytics library is a failure signal.
            if (
                !service.scriptFound &&
                typeof window.gtag !== "function"
            ) {
                return "analytics-library-missing";
            }

            // Do not call Analytics blocked merely because no
            // collection request has appeared yet.
            if (
                service.scriptFound &&
                !service.scriptLoaded &&
                typeof window.gtag !== "function"
            ) {
                return "analytics-not-loaded";
            }

            return "";
        }

        // AdSense library/script checks.
        if (
            !service.scriptFound &&
            typeof window.adsbygoogle === "undefined"
        ) {
            return "adsense-library-missing";
        }

        if (
            service.scriptFound &&
            !service.scriptLoaded &&
            typeof window.adsbygoogle === "undefined"
        ) {
            return "adsense-not-loaded";
        }

        // IMPORTANT:
        // No filled ad, an unfilled slot, or no ad slot does not
        // independently count as a failure.
        return "";
    }

    function evaluateService(service, type) {
        const reason = getServiceFailure(service, type);

        if (reason) {
            service.lastReason = reason;
            service.healthySince = 0;
            service.consecutiveFailures++;
            return false;
        }

        service.consecutiveFailures = 0;
        service.lastReason = "";
        service.healthySince = service.healthySince || now();

        return true;
    }

    function getConfirmedFailures() {
        const gaBad =
            state.ga.consecutiveFailures >=
            CONFIG.FAILURE_CONFIRMATIONS;

        const adsBad =
            state.ads.consecutiveFailures >=
            CONFIG.FAILURE_CONFIRMATIONS;

        return {
            gaBad: gaBad,
            adsBad: adsBad,
            anyBad: gaBad || adsBad
        };
    }

    // ----------------------------------------------------------
    // LOCK / RECOVERY UI
    // ----------------------------------------------------------

    function createStyles() {
        if (document.getElementById(CONFIG.STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = CONFIG.STYLE_ID;

        style.textContent = `
            #${CONFIG.OVERLAY_ID} {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
                box-sizing: border-box;
                background: rgba(5, 7, 15, .97);
                color: #f4f6ff;
                font-family: Arial, sans-serif;
                text-align: center;
            }

            #${CONFIG.OVERLAY_ID} .my-health-card {
                width: min(100%, 440px);
                padding: 30px 24px;
                box-sizing: border-box;
                border: 1px solid #9b263d;
                border-radius: 14px;
                background: #101421;
                box-shadow: 0 0 35px rgba(190, 25, 60, .22);
            }

            #${CONFIG.OVERLAY_ID} h2 {
                margin: 0 0 14px;
                color: #ff526f;
                font-size: 25px;
                line-height: 1.3;
            }

            #${CONFIG.OVERLAY_ID} p {
                margin: 0 0 20px;
                color: #d4d9e7;
                font-size: 16px;
                line-height: 1.65;
            }

            #${CONFIG.OVERLAY_ID} button {
                padding: 12px 20px;
                border: 0;
                border-radius: 7px;
                background: #d72d4d;
                color: white;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
            }
        `;

        (document.head || document.documentElement).appendChild(style);
    }

    function createLock() {
        if (state.locked || !document.body) return;

        createStyles();

        const overlay = document.createElement("div");
        overlay.id = CONFIG.OVERLAY_ID;

        overlay.innerHTML = `
            <div class="my-health-card" role="alertdialog"
                 aria-modal="true"
                 aria-labelledby="my-health-title">
                <h2 id="my-health-title">
                    Please Support Merayour
                </h2>
                <p>
                    Our website relies on advertising to help keep
                    its stories available. Please check whether your
                    ad blocker is preventing our advertising scripts
                    from working, then try again.
                </p>
                <button type="button" id="my-health-recheck">
                    Check Again
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector("#my-health-recheck")
            .addEventListener("click", function () {
                state.ga.consecutiveFailures = 0;
                state.ads.consecutiveFailures = 0;
                state.suspiciousSince = 0;
                state.healthySince = 0;

                inspectScripts();
                inspectAnalyticsActivity();
                inspectAdSlots();

                evaluate();
            });

        state.overlay = overlay;
        state.locked = true;
        state.lockStartedAt = now();
    }

    function removeLock() {
        if (state.overlay) {
            state.overlay.remove();
            state.overlay = null;
        }

        const existing = document.getElementById(CONFIG.OVERLAY_ID);

        if (existing) {
            existing.remove();
        }

        state.locked = false;
        state.lockStartedAt = 0;
    }

    // ----------------------------------------------------------
    // HEARTBEAT ENGINE
    // ----------------------------------------------------------

    function evaluate() {
        if (!document.body) return;

        inspectScripts();
        inspectAnalyticsActivity();
        inspectAdSlots();

        if (now() - state.startedAt < CONFIG.INITIAL_GRACE) {
            return;
        }

        const gaHealthy = evaluateService(state.ga, "ga");
        const adsHealthy = evaluateService(state.ads, "ads");

        const failures = getConfirmedFailures();

        if (failures.anyBad) {
            state.healthySince = 0;
            state.suspiciousSince =
                state.suspiciousSince || now();

            const confirmedFor =
                now() - state.suspiciousSince;

            if (
                confirmedFor >= CONFIG.CONFIRMATION_TIME
            ) {
                createLock();
            }

            return;
        }

        // Recovery is based on the actual service checks.
        // AdSense does not need to have a filled ad to be healthy.
        if (gaHealthy && adsHealthy) {
            state.suspiciousSince = 0;
            state.healthySince =
                state.healthySince || now();

            if (
                state.locked &&
                now() - state.healthySince >=
                    CONFIG.RECOVERY_CONFIRMATION_TIME
            ) {
                removeLock();
            }
        }
    }

    // ----------------------------------------------------------
    // OBSERVERS
    // ----------------------------------------------------------

    function startObservers() {
        if (!("MutationObserver" in window)) return;

        state.observer = new MutationObserver(function (mutations) {
            let needsInspection = false;

            for (const mutation of mutations) {
                if (mutation.type !== "childList") continue;

                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;

                    if (
                        node.tagName === "SCRIPT" ||
                        node.querySelector("script[src]") ||
                        node.matches("ins.adsbygoogle") ||
                        node.querySelector("ins.adsbygoogle")
                    ) {
                        needsInspection = true;
                        break;
                    }
                }

                if (needsInspection) break;
            }

            if (needsInspection) {
                inspectScripts();
                inspectAdSlots();
            }
        });

        state.observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // ----------------------------------------------------------
    // INITIALIZATION
    // ----------------------------------------------------------

    function init() {
        inspectScripts();
        inspectAnalyticsActivity();
        inspectAdSlots();

        startObservers();

        state.timer = window.setInterval(
            evaluate,
            CONFIG.CHECK_INTERVAL
        );

        evaluate();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, {
            once: true
        });
    } else {
        init();
    }

})();
