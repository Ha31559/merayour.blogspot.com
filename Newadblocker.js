(function () {
    "use strict";

    // 1. Runtime Anti-Collision & Obfuscated Global Key
    const _rk = "_" + Math.random().toString(36).substr(2, 9) + "_";
    if (window[_rk]) return;
    window[_rk] = true;

    // 2. Anti-Bypass: Protect window.adsbygoogle from being mocked/wiped
    try {
        let _agQueue = window.adsbygoogle || [];
        Object.defineProperty(window, "adsbygoogle", {
            get: function () { return _agQueue; },
            set: function (v) { _agQueue = v; },
            configurable: false
        });
    } catch (e) {}

    // 3. Blogger & Preview Safety Check
    function isBloggerPreview() {
        try {
            const h = (location.hostname || "").toLowerCase();
            const hr = (location.href || "").toLowerCase();
            const s = (location.search || "").toLowerCase();
            const p = (location.pathname || "").toLowerCase();
            const rf = (document.referrer || "").toLowerCase();
            if (h === "blogger.com" || h.endsWith(".blogger.com") || h === "draft.blogger.com") return true;
            if (/(^|[\/_-])layout-preview([\/_-]|$)/i.test(p) \vert{}\vert{} /(^\vert{}[\/_-])template-preview([\/_-]\vert{}$)/i.test(p)) return true;
            if (s.includes("preview=true") || s.includes("preview=1") || s.includes("blogger.preview")) return true;
            if (hr.includes("blogger.com") && (hr.includes("/layout") || hr.includes("/template") || hr.includes("/edit"))) return true;
            if (window !== window.top && (rf.includes("blogger.com") || rf.includes("blogspot.com"))) return true;
        } catch (e) {}
        return false;
    }
    if (isBloggerPreview()) return;

    // 4. Advanced Reader Mode Detection
    function isReaderMode() {
        try {
            const href = (location.href || "").toLowerCase();
            if (href.startsWith("about:reader") || href.includes("moz-reader") || location.protocol === "about:") return true;
            if (document.documentElement.classList.contains("moz-reader-mode") || document.body.classList.contains("aboutReader") || document.querySelector(".moz-reader-content")) return true;
            if (window.screen && window.innerWidth < 400 && document.body && document.body.innerText && document.body.innerText.length > 500 && document.querySelectorAll("ins.adsbygoogle").length === 0) {
                if (document.querySelectorAll("header, footer, nav").length === 0) return true;
            }
        } catch (e) {}
        return false;
    }

    const CONFIG = {
        title: "Ad Blocker Detected!",
        message: "It looks like an ad or content blocker is active. This website relies on ads to stay free for everyone. Please whitelist this site or disable your ad blocker to view the content."
    };

    let legitAdRendered = false;
    let cleanStateConfirmations = 0;
    let blockStateConfirmations = 0;
    const pageLoadStart = performance.now();

    let mainContent = null;
    let originalArticleHTML = null;
    let originalArticleCaptured = false;
    let articleCurrentlyReplaced = false;

    function findMainContent() {
        if (mainContent && document.documentElement.contains(mainContent)) return mainContent;
        mainContent = document.querySelector("article, .post-body, .entry-content, main, #main-content");
        return mainContent;
    }

    // Secure Data Encoding/Decoding
    function encData(s) {
        try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return btoa(s); }
    }
    function decData(s) {
        try { return decodeURIComponent(escape(atob(s))); } catch (e) { try { return atob(s); } catch (_) { return s; } }
    }

    function captureOriginalArticle() {
        const t = findMainContent();
        if (!t) return false;
        if (!originalArticleCaptured) {
            try {
                originalArticleHTML = encData(t.innerHTML);
            } catch (e) {
                originalArticleHTML = t.innerHTML;
            }
            originalArticleCaptured = true;
            t.setAttribute("data-ent-enc", "1");
        }
        return true;
    }

    function isGracePeriod() {
        return (performance.now() - pageLoadStart) < 4000;
    }

    // 5. Robust Ad Verification Logic
    function checkRealAdRender() {
        if (isReaderMode()) return false;
        const ads = document.querySelectorAll("ins.adsbygoogle, .adsbygoogle");
        let rendered = false;
        ads.forEach(ad => {
            const ifr = ad.querySelector("iframe");
            if (!ifr) return;
            const r = ifr.getBoundingClientRect();
            const st = getComputedStyle(ifr);
            if (r.width < 10 || r.height < 10 || st.display === "none" || st.visibility === "hidden") return;
            try {
                const doc = ifr.contentDocument || ifr.contentWindow?.document;
                if (!doc) return;
                if ((doc.body?.innerHTML || "").length > 40) rendered = true;
            } catch (e) {
                if (ifr.src && ifr.src !== "about:blank") rendered = true;
            }
        });

        if (rendered) {
            legitAdRendered = true;
            cleanStateConfirmations++;
            if (cleanStateConfirmations >= 2) {
                blockStateConfirmations = 0;
                restoreArticleIfNeeded();
                unlockPage();
            }
        } else {
            cleanStateConfirmations = 0;
        }
        return rendered;
    }

    // 6. Dynamically Generated Randomized UI Overlays (Bypasses Static Adblock Selectors)
    const uiId = "ent-lock-" + Math.random().toString(36).substr(2, 7);
    const styleId = "ent-style-" + Math.random().toString(36).substr(2, 7);
    const baitId = "ent-bait-" + Math.random().toString(36).substr(2, 7);

    function createLockOverlay() {
        if (document.getElementById(uiId)) return;
        let st = document.getElementById(styleId);
        if (!st) {
            st = document.createElement("style");
            st.id = styleId;
            st.textContent = `
                html.ent-locked, body.ent-locked { overflow: hidden !important; height: 100% !important; }
                #${uiId} {
                    position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
                    background: rgba(13, 17, 23, 0.96) !important; backdrop-filter: blur(10px) !important;
                    color: #fff !important; z-index: 2147483647 !important;
                    display: flex !important; align-items: center !important; justify-content: center !important;
                    padding: 20px !important; box-sizing: border-box !important;
                }
                #${uiId} .ent-card {
                    max-width: 440px !important; width: 100% !important;
                    padding: 32px 24px !important; background: #161b22 !important;
                    border: 1px solid #30363d !important; border-radius: 12px !important;
                    text-align: center !important; box-shadow: 0 20px 50px rgba(0,0,0,0.8) !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                }
                #${uiId} .ent-card h2 { font-size: 20px !important; margin: 0 0 12px 0 !important; color: #ffffff !important; }
                #${uiId} .ent-card p { font-size: 14px !important; color: #8b949e !important; line-height: 1.6 !important; margin: 0 !important; }
            `;
            document.head.appendChild(st);
        }

        const ov = document.createElement("div");
        ov.id = uiId;
        ov.innerHTML = `<div class="ent-card"><h2>${CONFIG.title}</h2><p>${CONFIG.message}</p></div>`;
        (document.body || document.documentElement).appendChild(ov);
        document.documentElement.classList.add("ent-locked");
        if (document.body) document.body.classList.add("ent-locked");
    }

    function unlockPage() {
        const o = document.getElementById(uiId);
        if (o) o.remove();
        const st = document.getElementById(styleId);
        if (st) st.remove();
        document.documentElement.classList.remove("ent-locked");
        if (document.body) document.body.classList.remove("ent-locked");
    }

    function blockArticleIfNeeded() {
        const t = findMainContent();
        if (!t || !captureOriginalArticle()) return;
        if (articleCurrentlyReplaced) return;
        
        try {
            t.innerHTML = `<div style="padding:50px 20px;text-align:center;background:#0d1117;color:#fff;min-height:50vh;display:flex;flex-direction:column;align-items:center;justify-content:center"><h2 style="color:#fff;margin-bottom:10px;">Content Protected</h2><p style="color:#8b949e">Please disable your ad blocker to read this article.</p></div>`;
            t.style.setProperty("display", "block", "important");
            articleCurrentlyReplaced = true;
        } catch (e) {}
    }

    function restoreArticleIfNeeded() {
        const t = findMainContent();
        if (!t || !originalArticleCaptured) return;
        if (!articleCurrentlyReplaced && !t.hasAttribute("data-ent-enc")) return;

        try {
            if (originalArticleHTML && originalArticleHTML.length > 20) {
                const dec = decData(originalArticleHTML);
                if (dec && dec.length > 20) t.innerHTML = dec;
            }
            t.removeAttribute("data-ent-enc");
            articleCurrentlyReplaced = false;
        } catch (e) {}
    }

    // 7. Dynamic Bait Box for Cosmetic Hiding Traps
    function createBaits() {
        if (!document.body || document.getElementById(baitId)) return;
        const b = document.createElement("div");
        b.id = baitId;
        b.className = "adsbygoogle";
        b.style.cssText = "display:block!important;width:1px;height:1px;position:absolute!important;left:-9999px!important;top:-9999px!important;opacity:0!important;pointer-events:none!important;";
        document.body.appendChild(b);
    }

    function checkCosmeticHiding() {
        createBaits();
        const b = document.getElementById(baitId);
        if (!b) return false;
        const st = getComputedStyle(b);
        if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0" && st.getPropertyValue("left").includes("-")) {
            const rect = b.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return true;
        }
        return false;
    }

    // 8. Main Heuristic Block Detection
    function detectBlockState() {
        if (isReaderMode()) return true;
        if (isGracePeriod()) return false;
        if (checkRealAdRender()) return false;

        const adsbygoogleBlocked = (typeof window.adsbygoogle === "undefined" || (Array.isArray(window.adsbygoogle) && window.adsbygoogle.length === 0 && !window.adsbygoogle.loaded));
        const cosmeticBlocked = checkCosmeticHiding();

        const adElements = document.querySelectorAll("ins.adsbygoogle");
        let hollowCount = 0;
        adElements.forEach(el => {
            if (el.getAttribute("data-ad-status") === "unfilled" || (el.innerHTML.trim() === "" && !legitAdRendered)) {
                hollowCount++;
            }
        });

        if (adsbygoogleBlocked || cosmeticBlocked || (adElements.length > 0 && hollowCount >= adElements.length && !legitAdRendered)) {
            return true;
        }

        return false;
    }

    // 9. Background Monitoring Loop
    function evaluateProtection() {
        if (isBloggerPreview()) return;

        if (isReaderMode()) {
            blockArticleIfNeeded();
            createLockOverlay();
            return;
        }

        if (detectBlockState()) {
            blockStateConfirmations++;
            if (blockStateConfirmations >= 2) {
                blockArticleIfNeeded();
                createLockOverlay();
            }
        } else {
            blockStateConfirmations = 0;
            if (legitAdRendered || !detectBlockState()) {
                restoreArticleIfNeeded();
                unlockPage();
            }
        }
    }

    // Initialization
    function initSystem() {
        captureOriginalArticle();
        setTimeout(() => {
            evaluateProtection();
            setInterval(evaluateProtection, 400);
            setInterval(checkRealAdRender, 600);
        }, 500);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSystem, { once: true });
    } else {
        initSystem();
    }
})();
