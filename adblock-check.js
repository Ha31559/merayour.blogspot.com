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

    // 1. Full-page overlay injector (CSS + DOM)
    function lockPage() {
        if (document.getElementById("ag-lock-overlay")) return;

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
            ? `<img src="${CONFIG.logoUrl}" alt="Logo" class="ag-logo" />` 
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

    // 2. Real Network Ping + Ad-Blocker Dual Check
    async function checkAnalytics() {
        // Signal A: Google Analytics basic check
        const isGtagAvailable = typeof window.gtag === "function";
        const isRealTagLoaded = typeof window.google_tag_data !== "undefined";

        // Signal B: AdSense / Ads script block check (Defeats uBlock/Ghostery EasyList)
        const isAdblockLoaded = typeof window.adsbygoogle === "undefined" || (window.adsbygoogle && window.adsbygoogle.loaded === false);

        if (!isGtagAvailable || !isRealTagLoaded || isAdblockLoaded) {
            lockPage();
            return;
        }

        // Signal C: Network Ping Catching
        try {
            await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
                method: "HEAD",
                mode: "no-cors",
                cache: "no-store"
            });
        } catch (err) {
            lockPage();
        }
    }

    // 3. JavaScript Heartbeat
    function startHeartbeat() {
        checkAnalytics();
        setInterval(checkAnalytics, 1500);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startHeartbeat);
    } else {
        startHeartbeat();
    }
})();
