(function () {
    "use strict";

    // ==========================================================
    // MERAYOUR ADGUARD V10 — HEARTBEAT CORE
    // Analytics + AdSense monitoring
    // Failure confirmation + recovery + diagnostics
    // ==========================================================

    if (window.__MERAYOUR_ADGUARD_ACTIVE__) return;
    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;

    const CONFIG = {
        GA4_ID: "G-ML091DD9QZ",
        ADSENSE_ID: "ca-pub-1011806586686442",

        INITIAL_GRACE: 5000,
        SYSTEM_GRACE: 10000,

        CHECK_INTERVAL: 80,
        FAILURE_CONFIRMATION: 3000,
        RECOVERY_CONFIRMATION: 5000,

        FAILURE_CONFIRMATIONS: 3,

        // false = any one confirmed service failure can trigger.
        // true = require both services to fail.
        REQUIRE_BOTH_SERVICES: false,

        DIAGNOSTICS: true,

        OVERLAY_ID: "merayour-v92-lock",
        STYLE_ID: "merayour-v92-style"
    };

    const now = () => Date.now();

    const state = {
        startedAt: now(),

        ga: createServiceState(),
        ads: createServiceState(),

        suspiciousSince: 0,
        healthySince: 0,

        locked: false,
        overlay: null,

        timer: null,
        observer: null,

        lastDecision: ""
    };

    function createServiceState() {
        return {
            scriptFound: false,
            scriptLoaded: false,
            scriptFailed: false,

            activitySeen: false,
            lastActivity: 0,

            slotsFound: false,
            filled: false,
            unfilled: false,

            failures: 0,
            reason: "",

            healthy: false,
            healthySince: 0
        };
    }

    // ----------------------------------------------------------
    // DIAGNOSTICS
    // ----------------------------------------------------------

    function log(message, data) {
        if (!CONFIG.DIAGNOSTICS) return;

        try {
            console.info(
                "[Merayour AdGuard]",
                message,
                data || ""
            );
        } catch (_) {}
    }

    // ----------------------------------------------------------
    // BLOGGER PREVIEW BYPASS
    // ----------------------------------------------------------

    function isBloggerPreview() {
        const host = location.hostname.toLowerCase();

        return (
            host === "blogger.com" ||
            host.endsWith(".blogger.com") ||
            /(?:^|[?&])preview=(?:true|1)(?:&|$)/i.test(
                location.search
            ) ||
            /\/blog\/post\/edit(?:\/|$)/i.test(
                location.pathname
            )
        );
    }

    if (isBloggerPreview()) {
        window.__MERAYOUR_ADGUARD_ACTIVE__ = false;
        return;
    }

    // ----------------------------------------------------------
    // SCRIPT IDENTIFICATION
    // ----------------------------------------------------------

    function classifyScript(script) {
        if (!script || !script.src) return null;

        let url;

        try {
            url = new URL(script.src, location.href);
        } catch (_) {
            return null;
        }

        const host = url.hostname.toLowerCase();
        const path = url.pathname.toLowerCase();

        if (
            host === "www.googletagmanager.com" &&
            path === "/gtag/js" &&
            url.searchParams.get("id") === CONFIG.GA4_ID
        ) {
            return "ga";
        }

        if (
            host === "pagead2.googlesyndication.com" &&
            path.includes("/pagead/js/adsbygoogle.js")
        ) {
            return "ads";
        }

        return null;
    }

    function inspectScripts() {
        document.querySelectorAll("script[src]").forEach(
            function (script) {
                const type = classifyScript(script);

                if (!type) return;

                const service =
                    type === "ga" ? state.ga : state.ads;

                service.scriptFound = true;

                if (
                    script.dataset.merayourV10Listeners === "1"
                ) {
                    return;
                }

                script.dataset.merayourV10Listeners = "1";

                script.addEventListener("load", function () {
                    service.scriptLoaded = true;
                    service.scriptFailed = false;
                    service.reason = "";

                    log(type + " script loaded");
                });

                script.addEventListener("error", function () {
                    service.scriptFailed = true;
                    service.scriptLoaded = false;
                    service.reason = "explicit-script-error";

                    log(type + " script error");
                });
            }
        );
    }

    // ----------------------------------------------------------
    // ANALYTICS HEARTBEAT
    // ----------------------------------------------------------

    function inspectAnalytics() {
        if (
            !window.performance ||
            typeof performance.getEntriesByType !== "function"
        ) {
            return;
        }

        let entries;

        try {
            entries = performance.getEntriesByType("resource");
        } catch (_) {
            return;
        }

        for (const entry of entries) {
            let url;

            try {
                url = new URL(entry.name);
            } catch (_) {
                continue;
            }

            const host = url.hostname.toLowerCase();
            const path = url.pathname.toLowerCase();

            const isAnalyticsEndpoint =
                (
                    host === "www.google-analytics.com" ||
                    host === "google-analytics.com" ||
                    host === "analytics.google.com" ||
                    host === "region1.google-analytics.com"
                ) &&
                (
                    path === "/g/collect" ||
                    path === "/collect"
                );

            if (isAnalyticsEndpoint) {
                state.ga.activitySeen = true;
                state.ga.lastActivity = now();

                break;
            }
        }
    }

    // ----------------------------------------------------------
    // ADSENSE HEARTBEAT
    // ----------------------------------------------------------

    function inspectAdsense() {
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
    }

    // ----------------------------------------------------------
    // SERVICE HEALTH EVALUATION
    // ----------------------------------------------------------

    function evaluateService(service, type) {
        const elapsed = now() - state.startedAt;

        let failureReason = "";

        if (service.scriptFailed) {
            failureReason = "explicit-script-error";
        } else if (elapsed >= CONFIG.SYSTEM_GRACE) {
            if (type === "ga") {
                if (
                    !service.scriptFound &&
                    typeof window.gtag !== "function"
                ) {
                    failureReason = "analytics-script-missing";
                } else if (
                    service.scriptFound &&
                    !service.scriptLoaded &&
                    typeof window.gtag !== "function"
                ) {
                    failureReason = "analytics-not-loaded";
                }
            } else {
                if (
                    !service.scriptFound &&
                    typeof window.adsbygoogle === "undefined"
                ) {
                    failureReason = "adsense-script-missing";
                } else if (
                    service.scriptFound &&
                    !service.scriptLoaded &&
                    typeof window.adsbygoogle === "undefined"
                ) {
                    failureReason = "adsense-not-loaded";
                }
            }
        }

        if (failureReason) {
            service.failures++;
            service.reason = failureReason;
            service.healthy = false;
            service.healthySince = 0;
        } else {
            service.failures = 0;
            service.reason = "";
            service.healthy = true;

            if (!service.healthySince) {
                service.healthySince = now();
            }
        }

        return service.healthy;
    }

    // ----------------------------------------------------------
    // FAILURE POLICY
    // ----------------------------------------------------------

    function getFailureStatus() {
        const gaFailed =
            state.ga.failures >= CONFIG.FAILURE_CONFIRMATIONS;

        const adsFailed =
            state.ads.failures >= CONFIG.FAILURE_CONFIRMATIONS;

        const failed = CONFIG.REQUIRE_BOTH_SERVICES
            ? gaFailed && adsFailed
            : gaFailed || adsFailed;

        return {
            gaFailed,
            adsFailed,
            failed
        };
    }

    // ----------------------------------------------------------
    // POPUP STYLES
    // ----------------------------------------------------------

    function addStyles() {
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
                padding: 22px;
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
            }

            #${CONFIG.OVERLAY_ID} p {
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

        (document.head || document.documentElement)
            .appendChild(style);
    }

    // ----------------------------------------------------------
    // LOCK CONTROLLER
    // ----------------------------------------------------------

    function createLock() {
        if (state.locked || !document.body) return;

        addStyles();

        const overlay = document.createElement("div");
        overlay.id = CONFIG.OVERLAY_ID;

        overlay.innerHTML = `
            <div class="my-health-card"
                 role="alertdialog"
                 aria-modal="true">
                <h2>Support Merayour</h2>

                <p>
                    Our advertising scripts may not be loading.
                    Please check your ad blocker or browser
                    content-blocking settings, then check again.
                </p>

                <button type="button" id="my-health-recheck">
                    Check Again
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector("#my-health-recheck")
            .addEventListener("click", function () {
                state.ga.failures = 0;
                state.ads.failures = 0;

                state.suspiciousSince = 0;
                state.healthySince = 0;

                inspectScripts();
                inspectAnalytics();
                inspectAdsense();

                evaluate();
            });

        state.overlay = overlay;
        state.locked = true;

        log("Popup displayed", {
            analytics: state.ga.reason,
            adsense: state.ads.reason
        });
    }

    function removeLock() {
        if (state.overlay) {
            state.overlay.remove();
        }

        const existing =
            document.getElementById(CONFIG.OVERLAY_ID);

        if (existing) existing.remove();

        state.overlay = null;
        state.locked = false;

        log("Popup removed after confirmed recovery");
    }

    // ----------------------------------------------------------
    // HEARTBEAT CONTROLLER
    // ----------------------------------------------------------

    function evaluate() {
        if (!document.body) return;

        inspectScripts();
        inspectAnalytics();
        inspectAdsense();

        const elapsed = now() - state.startedAt;

        if (elapsed < CONFIG.INITIAL_GRACE) {
            return;
        }

        evaluateService(state.ga, "ga");
        evaluateService(state.ads, "ads");

        const result = getFailureStatus();

        if (result.failed) {
            state.healthySince = 0;

            if (!state.suspiciousSince) {
                state.suspiciousSince = now();
            }

            if (
                now() - state.suspiciousSince >=
                CONFIG.FAILURE_CONFIRMATION
            ) {
                state.lastDecision = "confirmed-failure";
                createLock();
            }

            return;
        }

        state.suspiciousSince = 0;

        if (state.ga.healthy && state.ads.healthy) {
            state.healthySince =
                state.healthySince || now();

            if (
                state.locked &&
                now() - state.healthySince >=
                CONFIG.RECOVERY_CONFIRMATION
            ) {
                removeLock();
            }
        } else {
            state.healthySince = 0;
        }
    }

    // ----------------------------------------------------------
    // DYNAMIC SCRIPT OBSERVER
    // ----------------------------------------------------------

    function startObserver() {
        if (!window.MutationObserver) return;

        state.observer = new MutationObserver(function () {
            inspectScripts();
            inspectAdsense();
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
        inspectAnalytics();
        inspectAdsense();

        startObserver();

        state.timer = window.setInterval(
            evaluate,
            CONFIG.CHECK_INTERVAL
        );

        evaluate();

        // Optional inspection from browser DevTools:
        // window.__MERAYOUR_ADGUARD_DIAGNOSTICS__()
        window.__MERAYOUR_ADGUARD_DIAGNOSTICS__ = function () {
            return {
                locked: state.locked,
                elapsed: now() - state.startedAt,
                analytics: {
                    scriptFound: state.ga.scriptFound,
                    scriptLoaded: state.ga.scriptLoaded,
                    scriptFailed: state.ga.scriptFailed,
                    activitySeen: state.ga.activitySeen,
                    failures: state.ga.failures,
                    reason: state.ga.reason
                },
                adsense: {
                    scriptFound: state.ads.scriptFound,
                    scriptLoaded: state.ads.scriptLoaded,
                    scriptFailed: state.ads.scriptFailed,
                    slotsFound: state.ads.slotsFound,
                    filled: state.ads.filled,
                    unfilled: state.ads.unfilled,
                    failures: state.ads.failures,
                    reason: state.ads.reason
                },
                lastDecision: state.lastDecision
            };
        };

        log("V10 Heartbeat Core initialized");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, {
            once: true
        });
    } else {
        init();
    }

})();
