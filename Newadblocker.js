(function () {
    "use strict";

    /* =========================================================
       MERAYOUR ADGUARD V4 — SMART-TUNED
       Focus: Conservative detection, content safety, recovery.
       ========================================================= */

    if (window.__MERAYOUR_ADGUARD_V4__) return;
    window.__MERAYOUR_ADGUARD_V4__ = true;

    const PREFIX = "[Merayour AdGuard V4]";

    /* ===================== CONFIGURATION ===================== */

    const CONFIG = {
        logoUrl: "",

        title: "Support Merayour",

        message:
            "Merayour is a free website supported by advertising. " +
            "If you use an ad blocker, please consider allowing ads " +
            "on this website to support our stories.",

        INITIAL_GRACE_MS: 5000,
        ADSENSE_GRACE_MS: 10000,

        CHECK_INTERVAL_MS: 2500,
        MAX_CHECKS: 24,

        RECOVERY_CONFIRMATIONS: 2,
        NOTICE_RECHECK_MS: 5000,

        ENABLE_NOTICE: true,

        /* Set false to observe detection without showing a notice. */
        DEBUG: false
    };

    const startedAt = Date.now();

    const state = {
        checks: 0,
        initialized: false,
        disposed: false,
        noticeVisible: false,
        lastReason: "",
        lastEvaluation: 0,
        scriptObserved: false,
        validSlotObserved: false,
        recoveryCount: 0,
        inconclusiveCount: 0,
        status: "INITIALIZING"
    };

    let checkTimer = null;
    let recoveryTimer = null;
    let observer = null;
    let notice = null;
    let styleElement = null;

    const listeners = [];

    /* ===================== LOGGING ===================== */

    function log() {
        if (!CONFIG.DEBUG || !window.console) return;

        try {
            console.log.apply(console, [PREFIX].concat(
                Array.from(arguments)
            ));
        } catch (_) {}
    }

    /* ===================== ENVIRONMENT CHECKS ===================== */

    function isBloggerPreview() {
        try {
            const host = location.hostname.toLowerCase();
            const href = location.href.toLowerCase();
            const search = location.search.toLowerCase();

            if (
                host === "blogger.com" ||
                host.endsWith(".blogger.com") ||
                host === "draft.blogger.com"
            ) {
                return true;
            }

            if (
                /[?&](preview|previewer)=true(?:&|$)/i.test(search) ||
                /[?&]preview=1(?:&|$)/i.test(search)
            ) {
                return true;
            }

            if (
                href.includes("/blogger.g?blogid=") ||
                href.includes("blogger.com/blog/post/")
            ) {
                return true;
            }

            return false;
        } catch (_) {
            return false;
        }
    }

    function isReaderMode() {
        try {
            const href = String(location.href || "").toLowerCase();

            if (
                href.startsWith("about:reader") ||
                href.includes("moz-reader")
            ) {
                return true;
            }

            const root = document.documentElement;
            const body = document.body;

            if (
                root &&
                root.classList.contains("moz-reader-mode")
            ) {
                return true;
            }

            if (
                body &&
                (
                    body.classList.contains("aboutReader") ||
                    body.querySelector(".moz-reader-content")
                )
            ) {
                return true;
            }
        } catch (_) {}

        return false;
    }

    function isExcludedEnvironment() {
        return isBloggerPreview() || isReaderMode();
    }

    /*
     * Do not treat browser identity as evidence of blocking.
     * It is retained for compatibility diagnostics only.
     */
    function getBrowserInfo() {
        const ua = String(navigator.userAgent || "").toLowerCase();

        return {
            brave: !!(
                navigator.brave &&
                typeof navigator.brave.isBrave === "function"
            ),

            firefox: ua.includes("firefox"),

            edge: ua.includes("edg/"),

            opera: ua.includes("opr/") || ua.includes("opera"),

            duckduckgo: ua.includes("duckduckgo"),

            soul: ua.includes("soul")
        };
    }

    /* ===================== MAIN CONTENT ===================== */

    function findMainContent() {
        return document.querySelector(
            "article, .post-body, .entry-content, main, #main-content"
        );
    }

    /*
     * V4 intentionally never replaces article.innerHTML.
     * This prevents loss of embedded media, event listeners,
     * interactive elements, and dynamically rendered content.
     */

    /* ===================== ADSENSE SCRIPT INSPECTION ===================== */

    function getAdSenseScripts() {
        return Array.from(document.scripts).filter(function (script) {
            const src = String(script.src || "").toLowerCase();

            return (
                src.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js") ||
                src.includes("googlesyndication.com/pagead/js/adsbygoogle.js")
            );
        });
    }

    function inspectAdSenseScript() {
        const scripts = getAdSenseScripts();

        const scriptInfo = {
            found: scripts.length > 0,
            loadedSignal: false,
            failedSignal: false
        };

        if (!scriptInfo.found) {
            return scriptInfo;
        }

        /*
         * The presence of window.adsbygoogle alone does not
         * prove the remote AdSense script loaded successfully.
         */

        if (
            window.adsbygoogle &&
            typeof window.adsbygoogle.push === "function"
        ) {
            scriptInfo.loadedSignal = true;
        }

        return scriptInfo;
    }

    /* ===================== REAL AD SLOT INSPECTION ===================== */

    function getRealAdSlots() {
        return Array.from(
            document.querySelectorAll("ins.adsbygoogle")
        ).filter(function (element) {
            return !element.closest("#merayour-adguard-notice");
        });
    }

    function inspectAdSlots() {
        const slots = getRealAdSlots();

        const result = {
            count: slots.length,
            statusObserved: false,
            renderedFrameObserved: false,
            visibleSlotObserved: false,
            slots: []
        };

        slots.forEach(function (slot) {
            const rect = slot.getBoundingClientRect();
            const css = window.getComputedStyle(slot);

            const visible =
                rect.width > 1 &&
                rect.height > 1 &&
                css.display !== "none" &&
                css.visibility !== "hidden" &&
                Number(css.opacity) !== 0;

            const adStatus = slot.getAttribute("data-ad-status");

            if (adStatus !== null) {
                result.statusObserved = true;
            }

            if (visible) {
                result.visibleSlotObserved = true;
            }

            /*
             * A frame is recorded as a rendering signal only.
             * Its presence alone is not proof that an ad was
             * successfully served or that blocking is absent.
             */
            const frames = Array.from(
                slot.querySelectorAll("iframe")
            );

            let frameObserved = false;

            frames.forEach(function (frame) {
                const frameRect = frame.getBoundingClientRect();

                if (
                    frameRect.width > 10 &&
                    frameRect.height > 10
                ) {
                    frameObserved = true;
                }
            });

            if (frameObserved) {
                result.renderedFrameObserved = true;
            }

            result.slots.push({
                visible: visible,
                status: adStatus,
                frameObserved: frameObserved
            });
        });

        return result;
    }

    /* ===================== EVIDENCE CLASSIFICATION ===================== */

    function evaluateEvidence() {
        const elapsed = Date.now() - startedAt;

        const result = {
            state: "INCONCLUSIVE",
            reason: "",
            confidence: "LOW"
        };

        if (isExcludedEnvironment()) {
            result.state = "EXCLUDED";
            result.reason = "Preview or reader mode";
            return result;
        }

        if (!navigator.onLine) {
            result.reason = "Browser reports offline";
            return result;
        }

        if (document.readyState === "loading") {
            result.reason = "Document still loading";
            return result;
        }

        if (elapsed < CONFIG.INITIAL_GRACE_MS) {
            result.state = "INITIALIZING";
            result.reason = "Initial page-load grace period";
            return result;
        }

        const scripts = inspectAdSenseScript();
        const slots = inspectAdSlots();

        state.scriptObserved = scripts.found;
        state.validSlotObserved = slots.count > 0;

        /*
         * No AdSense slot means there is no valid slot-based
         * evidence to evaluate on this page.
         */
        if (slots.count === 0) {
            result.reason = "No real AdSense slots found";
            return result;
        }

        /*
         * A visible frame is a useful signal, but is not treated
         * as a universal guarantee of a successful ad impression.
         */
        if (
            slots.renderedFrameObserved &&
            slots.visibleSlotObserved
        ) {
            result.state = "RECOVERY";
            result.reason = "Visible ad-frame signal observed";
            result.confidence = "MEDIUM";
            return result;
        }

        /*
         * A data-ad-status attribute indicates that AdSense has
         * processed a slot. Both filled and unfilled slots can
         * have status attributes, so neither status is by itself
         * proof of ad blocking.
         */
        if (slots.statusObserved) {
            result.reason = "AdSense slot status is available";
            return result;
        }

        /*
         * Missing scripts or slots without status remain
         * inconclusive. They may result from delayed loading,
         * consent choices, network errors, configuration issues,
         * or browser privacy protections.
         */
        if (elapsed < CONFIG.INITIAL_GRACE_MS + CONFIG.ADSENSE_GRACE_MS) {
            result.state = "INITIALIZING";
            result.reason = "Waiting for AdSense initialization";
            return result;
        }

        result.reason =
            "Insufficient independent evidence to confirm blocking";

        return result;
    }

    /* ===================== NOTICE STYLES ===================== */

    function installStyles() {
        if (document.getElementById("merayour-adguard-style")) {
            return;
        }

        styleElement = document.createElement("style");
        styleElement.id = "merayour-adguard-style";

        styleElement.textContent = `
            #merayour-adguard-notice {
                position: fixed;
                inset: 0;
                z-index: 2147483646;
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                padding: 20px;
                background: rgba(8, 12, 20, 0.96);
                color: #ffffff;
                font-family: Arial, Helvetica, sans-serif;
                overflow-y: auto;
            }

            #merayour-adguard-notice * {
                box-sizing: border-box;
            }

            #merayour-adguard-notice .ag-card {
                width: 100%;
                max-width: 440px;
                padding: 28px 22px;
                text-align: center;
                background: #151c29;
                border: 1px solid #34445d;
                border-radius: 14px;
                box-shadow: 0 12px 40px rgba(0,0,0,.45);
            }

            #merayour-adguard-notice .ag-logo {
                display: block;
                width: auto;
                max-width: 120px;
                max-height: 70px;
                margin: 0 auto 18px;
                object-fit: contain;
            }

            #merayour-adguard-notice h2 {
                margin: 0 0 14px;
                color: #ffffff;
                font-size: 23px;
                line-height: 1.3;
                font-weight: 700;
            }

            #merayour-adguard-notice p {
                margin: 0;
                color: #c4ccda;
                font-size: 15px;
                line-height: 1.7;
            }

            #merayour-adguard-notice .ag-actions {
                display: flex;
                justify-content: center;
                margin-top: 22px;
            }

            #merayour-adguard-notice .ag-refresh {
                min-height: 44px;
                padding: 11px 20px;
                border: 0;
                border-radius: 8px;
                background: #3b82f6;
                color: #ffffff;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
            }

            #merayour-adguard-notice .ag-refresh:focus-visible {
                outline: 3px solid #ffffff;
                outline-offset: 3px;
            }

            @media (max-width: 480px) {
                #merayour-adguard-notice .ag-card {
                    padding: 24px 18px;
                }

                #merayour-adguard-notice h2 {
                    font-size: 21px;
                }
            }
        `;

        (document.head || document.documentElement).appendChild(
            styleElement
        );
    }

    /* ===================== NOTICE CREATION ===================== */

    function showNotice(reason) {
        if (!CONFIG.ENABLE_NOTICE || state.disposed) {
            return;
        }

        if (state.noticeVisible || isExcludedEnvironment()) {
            return;
        }

        /*
         * Conservative policy:
         * current V4 evidence is not strong enough to establish
         * ad blocking reliably. Therefore, this function is only
         * called when the decision policy explicitly permits it.
         */

        installStyles();

        notice = document.createElement("div");
        notice.id = "merayour-adguard-notice";
        notice.setAttribute("role", "dialog");
        notice.setAttribute("aria-modal", "true");
        notice.setAttribute("aria-labelledby", "merayour-ag-title");

        const card = document.createElement("div");
        card.className = "ag-card";

        if (CONFIG.logoUrl) {
            const logo = document.createElement("img");

            logo.className = "ag-logo";
            logo.src = CONFIG.logoUrl;
            logo.alt = "Merayour";
            logo.loading = "eager";
            logo.referrerPolicy = "no-referrer";

            card.appendChild(logo);
        }

        const heading = document.createElement("h2");
        heading.id = "merayour-ag-title";
        heading.textContent = CONFIG.title;

        const message = document.createElement("p");
        message.textContent = CONFIG.message;

        const actions = document.createElement("div");
        actions.className = "ag-actions";

        const refreshButton = document.createElement("button");
        refreshButton.className = "ag-refresh";
        refreshButton.type = "button";
        refreshButton.textContent = "Refresh Page";

        refreshButton.addEventListener("click", function () {
            location.reload();
        });

        actions.appendChild(refreshButton);
        card.appendChild(heading);
        card.appendChild(message);
        card.appendChild(actions);
        notice.appendChild(card);

        (document.body || document.documentElement).appendChild(notice);

        state.noticeVisible = true;
        state.lastReason = reason || "";
        state.status = "NOTICE";

        log("Notice displayed:", reason);
    }

    /* ===================== NOTICE REMOVAL ===================== */

    function hideNotice() {
        if (notice && notice.parentNode) {
            notice.parentNode.removeChild(notice);
        }

        notice = null;
        state.noticeVisible = false;

        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
        }

        styleElement = null;

        log("Notice removed");
    }

    /* ===================== STATE MACHINE ===================== */

    function evaluate() {
        if (state.disposed || isExcludedEnvironment()) {
            hideNotice();
            state.status = "EXCLUDED";
            return;
        }

        if (document.visibilityState === "prerender") {
            return;
        }

        state.lastEvaluation = Date.now();
        state.checks++;

        const evidence = evaluateEvidence();

        log(
            "Evaluation:",
            evidence.state,
            evidence.reason
        );

        if (
            evidence.state === "INITIALIZING"
        ) {
            state.status = "INITIALIZING";
            return;
        }

        if (
            evidence.state === "RECOVERY"
        ) {
            state.recoveryCount++;
            state.inconclusiveCount = 0;

            if (
                state.recoveryCount >=
                CONFIG.RECOVERY_CONFIRMATIONS
            ) {
                hideNotice();
                state.status = "RECOVERED";
            }

            return;
        }

        state.recoveryCount = 0;
        state.inconclusiveCount++;

        if (evidence.state === "EXCLUDED") {
            hideNotice();
            state.status = "EXCLUDED";
            return;
        }

        /*
         * Important:
         * Inconclusive signals never trigger a lock.
         * The current browser APIs do not provide a universal,
         * reliable way to distinguish an ad blocker from every
         * other reason an ad might not load.
         */
        state.status = "INCONCLUSIVE";
    }

    /* ===================== OBSERVER ===================== */

    function startObserver() {
        if (observer || !document.documentElement) {
            return;
        }

        let queued = false;

        observer = new MutationObserver(function (mutations) {
            if (queued || state.disposed) {
                return;
            }

            let relevant = false;

            for (let i = 0; i < mutations.length; i++) {
                const mutation = mutations[i];

                if (mutation.type === "childList") {
                    const changedNodes = [
                        ...mutation.addedNodes,
                        ...mutation.removedNodes
                    ];

                    for (let j = 0; j < changedNodes.length; j++) {
                        const node = changedNodes[j];

                        if (node.nodeType !== 1) {
                            continue;
                        }

                        if (
                            node.matches?.("ins.adsbygoogle, iframe") ||
                            node.querySelector?.("ins.adsbygoogle, iframe")
                        ) {
                            relevant = true;
                            break;
                        }
                    }
                }

                if (
                    mutation.type === "attributes" &&
                    mutation.target.matches?.("ins.adsbygoogle")
                ) {
                    relevant = true;
                }

                if (relevant) break;
            }

            if (!relevant) {
                return;
            }

            queued = true;

            setTimeout(function () {
                queued = false;

                if (!state.disposed) {
                    evaluate();
                }
            }, 350);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                "data-ad-status",
                "style",
                "class"
            ]
        });
    }

    /* ===================== EVENT MANAGEMENT ===================== */

    function addManagedListener(target, eventName, handler, options) {
        target.addEventListener(eventName, handler, options);

        listeners.push({
            target: target,
            eventName: eventName,
            handler: handler,
            options: options
        });
    }

    function stop() {
        if (state.disposed) return;

        state.disposed = true;

        if (checkTimer) {
            clearInterval(checkTimer);
            checkTimer = null;
        }

        if (recoveryTimer) {
            clearTimeout(recoveryTimer);
            recoveryTimer = null;
        }

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        listeners.forEach(function (item) {
            try {
                item.target.removeEventListener(
                    item.eventName,
                    item.handler,
                    item.options
                );
            } catch (_) {}
        });

        listeners.length = 0;

        hideNotice();

        log("Stopped");
    }

    /* ===================== INITIALIZATION ===================== */

    function init() {
        if (state.initialized || state.disposed) {
            return;
        }

        if (isExcludedEnvironment()) {
            state.status = "EXCLUDED";
            return;
        }

        state.initialized = true;

        const browserInfo = getBrowserInfo();

        log("Initialized", browserInfo);

        startObserver();

        addManagedListener(
            window,
            "online",
            function () {
                state.recoveryCount = 0;
                evaluate();
            }
        );

        addManagedListener(
            window,
            "pageshow",
            function () {
                evaluate();
            }
        );

        addManagedListener(
            document,
            "visibilitychange",
            function () {
                if (document.visibilityState === "visible") {
                    evaluate();
                }
            }
        );

        addManagedListener(
            window,
            "pagehide",
            function () {
                if (checkTimer) {
                    clearInterval(checkTimer);
                    checkTimer = null;
                }

                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
            }
        );

        checkTimer = setInterval(function () {
            if (state.disposed) {
                return;
            }

            if (state.checks >= CONFIG.MAX_CHECKS) {
                clearInterval(checkTimer);
                checkTimer = null;
                return;
            }

            evaluate();
        }, CONFIG.CHECK_INTERVAL_MS);

        recoveryTimer = setTimeout(function () {
            recoveryTimer = null;

            if (!state.disposed) {
                evaluate();
            }
        }, CONFIG.INITIAL_GRACE_MS);

        evaluate();
    }

    /*
     * Optional diagnostics for testing.
     * Does not expose article content or alter ad requests.
     */
    window.MerayourAdGuardV4 = {
        inspect: function () {
            return {
                status: state.status,
                checks: state.checks,
                noticeVisible: state.noticeVisible,
                lastReason: state.lastReason,
                script: inspectAdSenseScript(),
                slots: inspectAdSlots(),
                browser: getBrowserInfo()
            };
        },

        stop: stop
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, {
            once: true
        });
    } else {
        init();
    }

})();
