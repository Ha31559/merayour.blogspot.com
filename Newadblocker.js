(function () {
    "use strict";

    // ==========================================================
    // MERAYOUR ADGUARD v2.5 - ADAPTIVE GRACE ENGINE
    // ==========================================================

    if (window.__MERAYOUR_ADGUARD_ACTIVE__) return;
    window.__MERAYOUR_ADGUARD_ACTIVE__ = true;

    // 1. BLOGGER PREVIEW BYPASS
    function isBloggerPreview() {
        const host = (location.hostname || "").toLowerCase();
        const href = (location.href || "").toLowerCase();
        const path = (location.pathname || "").toLowerCase();
        const ref = (document.referrer || "").toLowerCase();

        if (host === "blogger.com" || host.endsWith(".blogger.com") || host === "draft.blogger.com") return true;
        if (/(^|[\/_-])layout-preview([\/_-]|$)/i.test(path) || /(^|[\/_-])template-preview([\/_-]|$)/i.test(path) \vert{}\vert{} /(^\vert{}[\/_-])post-preview([\/_-]\vert{}$)/i.test(path)) return true;
        if (href.includes("preview=true") || href.includes("preview=1") || href.includes("blogger.preview") || href.includes("editor=true")) return true;
        if (window !== window.top && (ref.includes("blogger.com") || ref.includes("blogspot.com"))) return true;

        return false;
    }

    if (isBloggerPreview()) return;

    // ==========================================================
    // 2. CONFIGURATION & THRESHOLDS
    // ==========================================================
    const CONFIG = {
        logoUrl: "https://blogger.googleusercontent.com/img/a/AVvXsEhaZtN16Z4U9z--I9xFPXPpFPqQXh9Q4KbMSy3yElIrhilHz3K8p_yT_Vb-FLxWdgGuvMXdhnceynqtPxGx2690kGB33A-VQUY8lwKSd8tPKl5ZTG3sr_dk-57wVbk8PHki2zI8xI5KvOP3IPUCV7jqWvxznVHyArqw5cTA2FfJOZVYoB1k2AFFy5sDaQ=s666",
        title: "Ad Blocker Detected!",
        message: "It looks like an ad or content blocker is preventing this page from loading properly. Merayour is supported by advertising. Please consider disabling your ad blocker to continue reading."
    };

    // GRACE ENGINE TIMINGS (Milliseconds)
    const ENGINE_GRACE_PERIOD = 10000; // 10 सेकंड का ग्रेस टाइम (धीमे नेटवर्क को हैंडल करने के लिए)
    const SCORE_TRIGGER_THRESHOLD = 180; // इस लिमिट से ऊपर जाने पर ही संदिग्ध माना जाएगा
    const MAX_CONFIRMATION_PASSES = 3;   // लगातार 3 बार पास होने पर ही पॉपअप आएगा

    let suspicionScore = 0;
    let confirmationPasses = 0;
    let legitAdRendered = false;
    let pageLocked = false;
    const pageLoadStart = performance.now();

    // ARTICLE RENDER STATE
    let mainContent = null;
    let originalArticleHTML = null;
    let articleCurrentlyReplaced = false;

    function findMainContent() {
        if (mainContent && document.documentElement.contains(mainContent)) return mainContent;
        mainContent = document.querySelector("article, .post-body, .entry-content, main, #main-content");
        return mainContent;
    }

    function captureOriginalArticle() {
        const target = findMainContent();
        if (!target) return false;
        if (!originalArticleHTML) {
            originalArticleHTML = target.innerHTML;
        }
        return true;
    }

    function blockArticleIfNeeded() {
        if (articleCurrentlyReplaced) return;
        const target = findMainContent();
        if (!target || !captureOriginalArticle()) return;

        target.innerHTML = `
            <div style="padding:40px 20px; text-align:center; color:#fff; background:#161b22; border-radius:12px; margin:20px 0;">
                <h3 style="margin:0 0 10px; font-size:20px;">Content Temporarily Locked</h3>
                <p style="margin:0; color:#8b949e; line-height:1.6; font-size:14px;">Please disable your ad blocker to continue reading this post.</p>
            </div>
        `;
        articleCurrentlyReplaced = true;
    }

    function restoreArticleIfNeeded() {
        if (!articleCurrentlyReplaced) return;
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
        if (document.documentElement) document.documentElement.style.removeProperty("overflow");
        if (document.body) document.body.style.removeProperty("overflow");
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
                .ag-card { width: 100%; max-width: 400px; padding: 32px 24px; background: #161b22; border: 1px solid #30363d; border-radius: 12px; }
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
    // 3. PASSIVE MONITORING LAYERS
    // ==========================================================

    // REAL AD RENDER OVERRIDE (HIGHEST PRIORITY RESET)
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
            suspicionScore = 0;
            confirmationPasses = 0;
            restoreArticleIfNeeded();
            unlockPage();
        }

        return rendered;
    }

    // NETWORK ENDPOINT ACTIVE TEST
    async function testNetworkEndpoint(url) {
        try {
            await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
            return true; // Resolved -> Network Open
        } catch (e) {
            return false; // Blocked -> Network Filtering Active
        }
    }

    // COSMETIC BAIT CHECK
    function testCosmeticSuppression() {
        const bait = document.createElement("div");
        bait.className = "adsbygoogle ad-banner ad-unit advertisement";
        bait.style.cssText = "width:1px!important;height:1px!important;position:absolute!important;left:-9999px!important;display:block!important;";
        document.body.appendChild(bait);

        const style = window.getComputedStyle(bait);
        const isSuppressed = style.display === "none" || style.visibility === "hidden";
        bait.remove();

        return isSuppressed;
    }

    // ==========================================================
    // 4. GRACE DECISION ENGINE
    // ==========================================================
    async function monitorActivity() {
        if (!navigator.onLine) return;

        // Rule 1: Real Ad always resets the engine
        if (checkRealAdRender()) return;

        // Rule 2: Grace Period Check (ग्रेस टाइम पूरा होने से पहले कोई एक्शन नहीं लिया जाएगा)
        const elapsedTime = performance.now() - pageLoadStart;
        if (elapsedTime < ENGINE_GRACE_PERIOD) {
            return; // Data Gathering Phase
        }

        // Rule 3: Network & Cosmetic Signal Evaluation
        const adsenseUrl = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
        const isAdsenseScriptLoaded = typeof window.adsbygoogle !== "undefined";
        const isNetworkPass = await testNetworkEndpoint(adsenseUrl);
        const isCosmeticBlocked = testCosmeticSuppression();

        // Accumulative Score Calculation
        let currentPassScore = 0;

        if (!isAdsenseScriptLoaded && !isNetworkPass) {
            currentPassScore += 100; // Network Failure Evidence
        }
        if (isCosmeticBlocked) {
            currentPassScore += 90;  // DOM Cosmetic Suppression Evidence
        }

        suspicionScore = currentPassScore;

        // Rule 4: Threshold & Confirmation Window
        if (suspicionScore >= SCORE_TRIGGER_THRESHOLD) {
            confirmationPasses++;

            // लगातार 3 बार लिमिट क्रॉस होने पर ही लॉक ट्रिगर होगा
            if (confirmationPasses >= MAX_CONFIRMATION_PASSES) {
                if (!checkRealAdRender()) {
                    blockArticleIfNeeded();
                    createLockOverlay();
                }
            }
        } else {
            // अगर स्थिति सामान्य होती है, तो कंफर्मेशन काउंट घटाएं
            confirmationPasses = Math.max(0, confirmationPasses - 1);
            if (confirmationPasses === 0 && pageLocked) {
                restoreArticleIfNeeded();
                unlockPage();
            }
        }
    }

    // ==========================================================
    // 5. ENGINE STARTUP & EVENT LISTENERS
    // ==========================================================
    function init() {
        captureOriginalArticle();

        // बैकग्राउंड में हर 3 सेकंड पर साइलेंट मॉनिटरिंग चलेगी
        setInterval(monitorActivity, 3000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
