(function () {
    "use strict";

    // ==========================================================
    // MERAYOUR ADGUARD v2.4 - COMPLETE DECISION ENGINE
    //
    // - All Original Detection Layers Restored
    // - Active Network Interception Fail-Safe Guard
    // - Full Reversible Article Restore Engine
    // - Zero False Positive Engine
    // ==========================================================

    if (window.__MERAYOUR_ADGUARD_ACTIVE__) return;
    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;

    // ==========================================================
    // 1. BLOGGER PREVIEW / EDITOR BYPASS
    // ==========================================================
    function isBloggerPreview() {
        const host = (location.hostname || "").toLowerCase();
        const href = (location.href || "").toLowerCase();
        const search = (location.search || "").toLowerCase();
        const path = (location.pathname || "").toLowerCase();
        const ref = (document.referrer || "").toLowerCase();

        if (host === "blogger.com" || host.endsWith(".blogger.com") || host === "draft.blogger.com") return true;
        if (/(^|[\/_-])layout-preview([\/_-]|$)/i.test(path) || /(^|[\/_-])template-preview([\/_-]|$)/i.test(path) \vert{}\vert{} /(^\vert{}[\/_-])post-preview([\/_-]\vert{}$)/i.test(path)) return true;
        if (search.includes("preview=true") || search.includes("preview=1") || search.includes("blogger.preview") || search.includes("editor=true")) return true;
        if (href.includes("blogger.com") && (href.includes("/layout") || href.includes("/template") || href.includes("/edit"))) return true;
        if (window !== window.top && (ref.includes("blogger.com") || ref.includes("blogspot.com"))) return true;

        return false;
    }

    if (isBloggerPreview()) return;

    // ==========================================================
    // 2. CONFIGURATION & CORE STATE
    // ==========================================================
    const CONFIG = {
        logoUrl: "https://blogger.googleusercontent.com/img/a/AVvXsEhaZtN16Z4U9z--I9xFPXPpFPqQXh9Q4KbMSy3yElIrhilHz3K8p_yT_Vb-FLxWdgGuvMXdhnceynqtPxGx2690kGB33A-VQUY8lwKSd8tPKl5ZTG3sr_dk-57wVbk8PHki2zI8xI5KvOP3IPUCV7jqWvxznVHyArqw5cTA2FfJOZVYoB1k2AFFy5sDaQ=s666",
        title: "Ad Blocker Detected!",
        message: "It looks like an ad or content blocker is preventing this page from loading properly. Merayour is a free website supported by readers and advertising. Please disable your ad blocker to continue reading normally."
    };

    let legitAdRendered = false;
    let pageLocked = false;
    let blockerState = "UNKNOWN";
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

    // Article Lock & Restore Mechanics
    let mainContent = null;
    let originalArticleHTML = null;
    let originalArticleCaptured = false;
    let articleCurrentlyReplaced = false;

    function findMainContent() {
        if (mainContent && document.documentElement.contains(mainContent)) return mainContent;
        mainContent = document.querySelector("article, .post-body, .entry-content, main, #main-content");
        return mainContent;
    }

    function captureOriginalArticle() {
        const target = findMainContent();
        if (!target) return false;
        if (!originalArticleCaptured) {
            originalArticleHTML = target.innerHTML;
            originalArticleCaptured = true;
        }
        return true;
    }

    function blockArticleIfNeeded() {
        if (articleCurrentlyReplaced) return;
        const target = findMainContent();
        if (!target || !captureOriginalArticle()) return;

        target.innerHTML = `
            <div class="ag-render-block" style="padding:40px 20px; text-align:center; color:#fff; background:#161b22; border-radius:12px; margin:20px 0;">
                <h3 style="margin:0 0 10px; font-size:20px;">Content Temporarily Unavailable</h3>
                <p style="margin:0; color:#8b949e; line-height:1.6; font-size:14px;">This page is supported by advertising. Please allow ads for Merayour to continue reading.</p>
            </div>
        `;
        articleCurrentlyReplaced = true;
    }

    function restoreArticleIfNeeded() {
        if (!articleCurrentlyReplaced || !originalArticleCaptured) return;
        const target = findMainContent();
        if (!target) return;

        target.innerHTML = originalArticleHTML;
        articleCurrentlyReplaced = false;
    }

    function unlockPage() {
        const overlay = document.getElementById("ag-lock-overlay");
        if (overlay) overlay.remove();
        const lockStyle = document.getElementById("ag-lock-style");
        if (lockStyle) lockStyle.remove();

        pageLocked = false;

        if (document.documentElement) {
            document.documentElement.style.removeProperty("overflow");
            document.documentElement.style.removeProperty("user-select");
        }
        if (document.body) {
            document.body.style.removeProperty("overflow");
            document.body.style.removeProperty("user-select");
        }
    }

    function createLockOverlay() {
        if (document.getElementById("ag-lock-overlay")) return;

        let style = document.getElementById("ag-lock-style");
        if (!style) {
            style = document.createElement("style");
            style.id = "ag-lock-style";
            style.textContent = `
                html, body { overflow: hidden !important; user-select: none !important; }
                #ag-lock-overlay {
                    position: fixed; inset: 0; width: 100vw; height: 100vh;
                    background: #0d1117; color: #fff; z-index: 2147483647;
                    display: flex; align-items: center; justify-content: center;
                    padding: 20px; box-sizing: border-box; font-family: system-ui, sans-serif; text-align: center;
                }
                .ag-card { width: 100%; max-width: 400px; padding: 32px 24px; background: #161b22; border: 1px solid #30363d; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,.5); }
                .ag-logo { max-width: 80px; margin-bottom: 16px; border-radius: 8px; }
            `;
            document.head.appendChild(style);
        }

        const overlay = document.createElement("div");
        overlay.id = "ag-lock-overlay";
        overlay.innerHTML = `
            <div class="ag-card">
                <img src="${CONFIG.logoUrl}" class="ag-logo" onerror="this.style.display='none'">
                <h1 style="margin:0 0 12px; font-size:22px; color:#f0f6fc;">${CONFIG.title}</h1>
                <p style="margin:0; font-size:14px; color:#8b949e; line-height:1.6;">${CONFIG.message}</p>
            </div>
        `;
        (document.body || document.documentElement).appendChild(overlay);
        pageLocked = true;
    }

    // ==========================================================
    // 3. DETECTION LAYERS & MONITORS
    // ==========================================================

    // Incident Register
    function registerIncident(id, category, source) {
        if (!category) return;
        categoryState[category] = true;
        if (evidenceMap[category]) {
            evidenceMap[category].add(source || id);
        }
    }

    // A. Ad-Bait & Cosmetic Inspector
    function checkCosmetic() {
        if (!document.body) return;

        const baitConfigs = [
            { id: "ag-ad-bait-1", classes: "adsbygoogle ad-banner ad-unit google-ad" },
            { id: "ag-ad-bait-2", classes: "advertisement ad adsbox text-ad" }
        ];

        baitConfigs.forEach((config) => {
            let bait = document.getElementById(config.id);
            if (!bait) {
                bait = document.createElement("div");
                bait.id = config.id;
                bait.className = config.classes;
                bait.style.cssText = "display:block!important;visibility:visible!important;width:1px!important;height:1px!important;position:absolute!important;left:-9999px!important;";
                document.body.appendChild(bait);
            }

            const style = window.getComputedStyle(bait);
            if (style.display === "none" || style.visibility === "hidden") {
                registerIncident("bait:" + config.id, "DOM_COSMETIC", config.id);
            }
        });
    }

    // B. Real Ad Render Checking (HIGHEST PRIORITY OVERRIDE)
    function checkRealAdRender() {
        const ads = document.querySelectorAll("ins.adsbygoogle, .adsbygoogle");
        let rendered = false;

        ads.forEach((ad) => {
            const iframe = ad.querySelector("iframe");
            if (!iframe) return;

            const rect = iframe.getBoundingClientRect();
            const style = window.getComputedStyle(iframe);

            if (rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden") {
                rendered = true;
            }
        });

        if (rendered) {
            legitAdRendered = true;
            restoreArticleIfNeeded();
            unlockPage();
        }

        return rendered;
    }

    // C. Resource & XHR / Fetch Error Listeners
    window.addEventListener("error", function (event) {
        const target = event?.target;
        const src = target?.src || target?.href || "";
        if (/googlesyndication|pagead2|doubleclick|googleadservices|google-analytics/i.test(src)) {
            registerIncident("resource:error:" + src, "RESOURCE", "resource_error");
        }
    }, true);

    (function installXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url) {
            this.__ag_url = typeof url === "string" ? url : "";
            return originalOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function () {
            this.addEventListener("error", () => {
                if (/pagead2|googlesyndication|doubleclick|googleadservices|google-analytics/i.test(this.__ag_url)) {
                    registerIncident("xhr:error:" + this.__ag_url, "RESOURCE", "xhr_error");
                }
            });
            return originalSend.apply(this, arguments);
        };
    })();

    // D. DOM Observer for Removed Ad Nodes
    (function installDOMObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === 1 && (node.classList?.contains("adsbygoogle") || node.matches?.("ins.adsbygoogle"))) {
                        registerIncident("removed:ad-node", "REMOVAL", "ad_removal");
                    }
                });
            });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    })();

    // ==========================================================
    // 4. ACTIVE NETWORK HARDWARE PROBE (FAIL-SAFE GUARD)
    // ==========================================================
    async function checkNetworkEndpoint(url) {
        try {
            await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
            return true; // Request resolved -> Network Clear
        } catch (err) {
            return false; // Blocked at network level
        }
    }

    // ==========================================================
    // 5. MASTER DECISION ENGINE (CORRELATION & VERIFICATION)
    // ==========================================================
    async function evaluateEngine() {
        if (!navigator.onLine) return;
        if (checkRealAdRender()) return; // Real Ad wins instantly

        checkCosmetic();

        // 1. Live Active Network Probing
        const adsenseUrl = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
        const analyticsUrl = "https://www.google-analytics.com/analytics.js";

        const [adsenseOK, analyticsOK] = await Promise.all([
            checkNetworkEndpoint(adsenseUrl),
            checkNetworkEndpoint(analyticsUrl)
        ]);

        const networkBlocked = !adsenseOK || !analyticsOK;

        // 2. Category Correlation Check
        const detectedCategories = Object.values(categoryState).filter(Boolean).length;
        const cosmeticBlocked = evidenceMap.DOM_COSMETIC.size > 0;

        // HARD RULE: Network Request MUST Fail AND (DOM Cosmetic Block OR 2+ Evidence Categories)
        if (networkBlocked && (cosmeticBlocked || detectedCategories >= 2)) {
            // Confirmation Pass (1.5 seconds delay to prevent False Positive during network lag)
            setTimeout(async () => {
                const recheckAdsense = await checkNetworkEndpoint(adsenseUrl);
                if (!recheckAdsense && !checkRealAdRender()) {
                    blockArticleIfNeeded();
                    createLockOverlay();
                    blockerState = "CONFIRMED";
                }
            }, 1500);
        } else {
            if (blockerState === "CONFIRMED" && (adsenseOK || checkRealAdRender())) {
                restoreArticleIfNeeded();
                unlockPage();
                blockerState = "CLEAN";
            }
        }
    }

    // ==========================================================
    // 6. EVENT RECOVERIES & INITIALIZATION
    // ==========================================================
    window.addEventListener("online", () => setTimeout(evaluateEngine, 1000));
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") setTimeout(evaluateEngine, 500);
    });

    function init() {
        captureOriginalArticle();
        // Grace period for normal assets to settle down
        setTimeout(() => {
            evaluateEngine();
            setInterval(evaluateEngine, 8000);
        }, 5000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
