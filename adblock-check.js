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

    // 🛡️ GLOBAL SAFEGUARDS & SCORE SYSTEM
    let isLegitAdRendered = false; // Kill-switch for false positives
    let detectionScore = 0;
    const isInitWindowPassed = () => performance.now() > 2000;

    // 🌐 [VERSION 2] Global Error Interceptor (Catches network-level script blocks in Soul/Brave)
    window.addEventListener("error", function (e) {
        if (isLegitAdRendered) return;
        if (e && e.target && (e.target.src || "").match(/googlesyndication|googletagmanager|google-analytics/i)) {
            addSignalAndCheck(70); // Strong Signal: Explicit Ad script block
        }
    }, true);

    // 🔒 Full-page overlay injector (CSS + DOM with Broken Image Handler)
    function lockPage() {
        if (isLegitAdRendered || document.getElementById("ag-lock-overlay")) return;

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
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
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
                margin: 0;
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement("div");
        overlay.id = "ag-lock-overlay";
        
        const logoHTML = CONFIG.logoUrl 
            ? `<img src="${CONFIG.logoUrl}" alt="Logo" class="ag-logo" onerror="this.style.display='none'" />` 
            : "";

        overlay.innerHTML = `
            <div class="ag-card">
                ${logoHTML}
                <h1>${CONFIG.title}</h1>
                <p>${CONFIG.message}</p>
            </div>
        `;

        (document.body || document.documentElement).appendChild(overlay);
    }

    function addSignalAndCheck(weight) {
        if (isLegitAdRendered) return;
        detectionScore += weight;
        if (detectionScore >= 70 && isInitWindowPassed()) {
            lockPage();
        }
    }

    // 🪤 [VERSION 1 & 3] Invisible HoneyTrap & Cosmetic Filter Hiding Detector
    function createBaitTrap() {
        let bait = document.getElementById("adsbygoogle-bait");
        if (!bait) {
            bait = document.createElement("div");
            bait.id = "adsbygoogle-bait";
            bait.className = "adsbygoogle ad-banner ad-unit google-ad pub_300x250";
            bait.style.cssText = "width: 1px !important; height: 1px !important; position: absolute !important; left: -9999px !important; top: -9999px !important; opacity: 0.01 !important;";
            (document.body || document.documentElement).appendChild(bait);
        }
        return bait;
    }

    // 📦 [VERSION 1] Real AdSense IFRAME Size Inspector
    function isRealAdSenseBlocked() {
        const adContainers = document.querySelectorAll('.adsbygoogle');
        if (adContainers.length > 0) {
            let isAnyAdLoaded = false;
            let hasAnyIframe = false;
            adContainers.forEach(container => {
                const iframe = container.querySelector('iframe[id^="aswft_"]');
                if (iframe) {
                    hasAnyIframe = true;
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        isAnyAdLoaded = true;
                        isLegitAdRendered = true; // Safe Kill-Switch Activated!
                    }
                }
            });
            if (hasAnyIframe && !isAnyAdLoaded) return true;
        }
        return false;
    }

    // 🚀 [ALL VERSIONS COMBINED] Comprehensive Deep Check System
    async function runAllChecks() {
        if (isLegitAdRendered) return;

        // 🔥 SOUL BROWSER ANTI-STUB CHECK
        const isFakeGtag = typeof window.gtag === "function" && typeof window.google_tag_data === "undefined";
        const isAdsByGoogleStubbed = Array.isArray(window.adsbygoogle) && window.adsbygoogle.loaded !== true && window.adsbygoogle.length > 0;

        if (isFakeGtag || isAdsByGoogleStubbed) {
            addSignalAndCheck(70);
            return;
        }

        // 🎭 1. Opera Native Adblock Hiding Trap (Opera विशिष्ट CSS फ़िल्टर)
        const operaTrap = document.createElement("div");
        operaTrap.className = "ad-zone ad_box google_adsense";
        operaTrap.style.cssText = "width:10px!important;height:10px!important;position:absolute!important;left:-9999px!important;";
        (document.body || document.documentElement).appendChild(operaTrap);

        const isOperaBlocking = window.getComputedStyle(operaTrap).display === "none" || operaTrap.offsetHeight === 0;
        operaTrap.remove();

        if (isOperaBlocking) {
            addSignalAndCheck(70);
            return;
        }

        // 🕵️ 2. Real Image/Pixel Load Verification (Soul & Opera दोनों का नेटवर्क ब्लॉकर)
        const testPixel = new Image();
        testPixel.onerror = function () { 
            if (navigator.onLine && !isLegitAdRendered) {
                // Retry verification before locking
                setTimeout(() => {
                    const retryPixel = new Image();
                    retryPixel.onerror = () => addSignalAndCheck(70);
                    retryPixel.src = "https://pagead2.googlesyndication.com/pagead/img/0.gif?retry=" + Math.random();
                }, 500);
            }
        };
        testPixel.src = "https://pagead2.googlesyndication.com/pagead/img/0.gif?" + Math.random();

        // 📱 MOBILE VIEW FIX
        const mobileTrap = document.createElement("ins");
        mobileTrap.className = "adsbygoogle ad-unit";
        mobileTrap.style.cssText = "display:block !important; width:300px !important; height:250px !important; position:absolute !important; left:-9999px !important;";
        (document.body || document.documentElement).appendChild(mobileTrap);

        const isMobileBlocked = window.getComputedStyle(mobileTrap).display === "none" || mobileTrap.clientHeight === 0;
        mobileTrap.remove();

        if (isMobileBlocked) {
            addSignalAndCheck(70);
            return;
        }

        // 🛡️ 1. Dynamic AdSense Frame Render Check
        const activeAdIns = document.querySelector("ins.adsbygoogle[data-ad-status]");
        if (activeAdIns) {
            const hasIframe = activeAdIns.querySelector("iframe");
            const isUnfilled = activeAdIns.getAttribute("data-ad-status") === "unfilled";
            const style = window.getComputedStyle(activeAdIns);
            
            if (hasIframe) isLegitAdRendered = true;
            if (!hasIframe && style.display === "none" && !isUnfilled) {
                addSignalAndCheck(40);
            }
        }

        // 🛡️ 2. Shadow DOM & Script Element Interception
        if (window.google_ad_client === undefined && document.querySelector(".adsbygoogle") && document.readyState === "complete") {
            addSignalAndCheck(30);
        }

        // 🛡️ 3. Execution Delay Verification
        const startCheck = performance.now();
        for (let i = 0; i < 1000; i++) { Math.sqrt(i); }
        const endCheck = performance.now();
        if (endCheck - startCheck > 1500) { 
            addSignalAndCheck(30);
        }

        // 🎯 SOUL AD-CONTAINER ZERO-HEIGHT TRAP
        const adUnits = document.querySelectorAll('.adsbygoogle, [id^="div-gpt-ad"]');
        for (let i = 0; i < adUnits.length; i++) {
            const adStyle = window.getComputedStyle(adUnits[i]);
            const rect = adUnits[i].getBoundingClientRect();
            
            if (adStyle.display === "none" || adStyle.visibility === "hidden" || (rect.height === 0 && adUnits[i].childNodes.length > 0)) {
                addSignalAndCheck(50);
                break;
            }
        }

        // ⚡ GOD-MODE ENGINE: LEATHAL UNBREAKABLE ANTI-ADBLOCK KERNEL
        (function godModeKernel() {
            try {
                let realPush = window.adsbygoogle ? window.adsbygoogle.push : null;
                Object.defineProperty(window, 'adsbygoogle', {
                    configurable: true,
                    enumerable: true,
                    get: function() { return realPush; },
                    set: function(val) {
                        if (Array.isArray(val) && val.length === 0) {
                            setTimeout(() => {
                                if (!window.adsbygoogle || !window.adsbygoogle.loaded) addSignalAndCheck(40);
                            }, 1500);
                        } else {
                            realPush = val;
                        }
                    }
                });
            } catch(e){}

            // 🧬 SOUL BROWSER SPECIFIC FINGERPRINT & MULTI-SIGNAL DETECTOR
            (function detectSoulEngine() {
                let soulConfidenceScore = 0;

                const ua = navigator.userAgent.toLowerCase();
                const isSoulUA = ua.includes('soul') || (window.chrome && navigator.vendor.includes('Google') && !window.chrome.loadTimes && ua.includes('mobile'));
                if (isSoulUA) soulConfidenceScore += 30;

                if (window.soul || window.__soul_ext__ || (window.external && 'Soul' in window.external)) {
                    soulConfidenceScore += 50;
                }

                const testTrap = document.createElement('div');
                testTrap.className = 'adsbygoogle ad-slot-trap google-ad-sense';
                testTrap.style.cssText = 'position:fixed;top:-999px;left:-999px;width:1px;height:1px;';
                (document.body || document.documentElement).appendChild(testTrap);

                setTimeout(() => {
                    const style = window.getComputedStyle(testTrap);
                    const isCosmeticBlocked = style.display === 'none' || style.visibility === 'hidden' || testTrap.offsetHeight === 0;
                    
                    if (isCosmeticBlocked) soulConfidenceScore += 40;
                    testTrap.remove();

                    if (soulConfidenceScore >= 70) {
                        addSignalAndCheck(70);
                    }
                }, 600);
            })();

            const styleCheck = document.createElement('style');
            styleCheck.textContent = `.adsbygoogle { display: block !important; visibility: visible !important; opacity: 1 !important; }`;
            (document.head || document.documentElement).appendChild(styleCheck);

            const handleNetworkFailure = (url) => {
                if (navigator.onLine && !isLegitAdRendered && typeof url === 'string' && (url.includes('pagead2') || url.includes('doubleclick') || url.includes('googlesyndication'))) {
                    addSignalAndCheck(70);
                }
            };

            const xhrOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                this.addEventListener('error', () => handleNetworkFailure(url));
                return xhrOpen.apply(this, arguments);
            };

            if (window.fetch) {
                const nativeFetch = window.fetch;
                window.fetch = function(...args) {
                    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                    return nativeFetch.apply(this, args).catch((err) => {
                        handleNetworkFailure(url);
                        throw err;
                    });
                };
            }

            const domObserver = new MutationObserver((mutations) => {
                for (let mutation of mutations) {
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === 1 && (node.classList?.contains('adsbygoogle') || node.tagName === 'INS')) {
                            addSignalAndCheck(70);
                        }
                    });
                }
            });
            domObserver.observe(document.documentElement, { childList: true, subtree: true });

            setInterval(() => {
                if (isLegitAdRendered) return;
                const insElements = document.querySelectorAll('ins.adsbygoogle');
                insElements.forEach(ins => {
                    const rect = ins.getBoundingClientRect();
                    const style = window.getComputedStyle(ins);
                    
                    if (ins.attributes['data-ad-status'] && ins.attributes['data-ad-status'].value !== 'unfilled') {
                        if (rect.height === 0 || style.display === 'none' || style.visibility === 'hidden') {
                            addSignalAndCheck(50);
                        }
                    }
                });
            }, 1200);
        })();

        // 1. Check Bait & Cosmetic Hiding
        const bait = createBaitTrap();
        if (bait) {
            const style = window.getComputedStyle(bait);
            const rect = bait.getBoundingClientRect();
            if (
                style.display === "none" || 
                style.visibility === "hidden" || 
                style.opacity === "0" || 
                style.height === "0px" || 
                rect.height === 0
            ) {
                addSignalAndCheck(70);
                return;
            }
        }

        // 2. Check Real AdSense IFRAMEs
        if (isRealAdSenseBlocked()) {
            addSignalAndCheck(70);
            return;
        }

        // 3. Check Google Analytics & Global Objects
        if (document.readyState === "complete") {
            const isGtagAvailable = typeof window.gtag === "function";
            const isRealTagLoaded = typeof window.google_tag_data !== "undefined";
            const isAdblockLoaded = typeof window.adsbygoogle === "undefined" || (window.adsbygoogle && window.adsbygoogle.loaded === false);

            if (!isGtagAvailable && !isRealTagLoaded && isAdblockLoaded) {
                addSignalAndCheck(40);
            }
        }

        // 4. Network Ping Check
        try {
            await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
                method: "HEAD",
                mode: "no-cors",
                cache: "no-store"
            });
        } catch (err) {
            if (navigator.onLine && !isLegitAdRendered) {
                addSignalAndCheck(50);
            }
        }
    }

    // 💓 Continuous Heartbeat & Scanner
    function initSystem() {
        setTimeout(() => {
            runAllChecks();
            setInterval(runAllChecks, 2000); 
        }, 1500);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSystem);
    } else {
        initSystem();
    }
})();
