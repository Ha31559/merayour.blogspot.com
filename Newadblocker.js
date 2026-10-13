(function () {
  "use strict";

  if (window.__MERAYOUR_GATING_V2__) return;
  window.__MERAYOUR_GATING_V2__ = true;

  // ==========================================================
  // MERAYOUR LIGHTNING-FAST ANTI-BYPASS GATING ENGINE V2
  // ==========================================================

  const CONFIG = {
    FALLBACK_HTML: `
      <div style="background: linear-gradient(135deg, #1e2230 0%, #111520 100%) !important; border: 1px solid rgba(255, 71, 87, 0.4) !important; padding: 35px 25px !important; border-radius: 16px !important; text-align: center !important; color: #fff !important; font-family: Arial, sans-serif !important; margin: 30px auto !important; max-width: 500px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;">
        <div style="font-size: 40px !important; margin-bottom: 15px !important;">🛡️</div>
        <h3 style="color: #ff626c !important; margin: 0 0 12px 0 !important; font-size: 22px !important; font-weight: 700 !important;">Ad Blocker Detected!</h3>
        <p style="color: #d2d5df !important; font-size: 15px !important; line-height: 1.6 !important; margin-bottom: 25px !important;">
          We rely on ads to keep providing you with free and quality content. To enjoy reading this story fully, please pause or disable your ad blocker for this site.
        </p>
        <button onclick="location.reload()" style="background: linear-gradient(135deg, #ff4757 0%, #ff334b 100%) !important; color: #fff !important; border: none !important; padding: 14px 28px !important; font-weight: bold !important; border-radius: 8px !important; cursor: pointer !important; font-size: 16px !important; box-shadow: 0 5px 15px rgba(255, 71, 87, 0.4) !important;">
          I've Disabled It — Reload 🔄
        </button>
        <p style="color: #8b92a5 !important; font-size: 12px !important; margin-top: 20px !important; margin-bottom: 0 !important;">
          Thank you for supporting our work! ❤️
        </p>
      </div>
    `,
    CHECK_INTERVAL: 100, // सुपर-फास्ट: हर 0.1 सेकंड में चेकिंग
    GRACE_PERIOD: 0      // शून्य ग्रेस पीरियड: कोई रियायत नहीं, पहले सेकंड से ताला
  };

  let contentSecured = false;
  let targetContainer = null;
  let originalContentHTML = "";
  let isLockedState = false;

  // 1. पेज मिलते ही बिना किसी देरी के कंटेंट को तुरंत कैप्चर करके छुपा लो
  function secureContentContainer() {
    if (contentSecured) return;
    const selectors = [".post-body", "article", ".entry-content"];
    for (let i = 0; i < selectors.length; i++) {
      const el = document.querySelector(selectors[i]);
      if (el && el.isConnected) {
        targetContainer = el;
        originalContentHTML = el.innerHTML;
        el.innerHTML = '<div style="padding: 40px; text-align: center; color: #888; font-family: Arial;">Verifying secure environment...</div>';
        contentSecured = true;
        break;
      }
    }
  }

  // 2. انتہائی سخت और तेज पर्यावरण जाँच (Environment Integrity Check)
  function verifyEnvironment() {
    try {
      const adsScriptMissing = !document.querySelector('script[src*="googlesyndication.com"]') && !window.adsbygoogle;
      const gaScriptMissing = !document.querySelector('script[src*="googletagmanager.com"]') && !window.gtag;

      // यदि मुख्य पिलर गायब हैं, तो तुरंत ब्लॉक माना जाएगा
      if (adsScriptMissing && gaScriptMissing) {
        return false;
      }
    } catch (_) {}
    return true;
  }

  // 3. मुख्य रेंडरिंग और एंटी-बाईपास कंट्रोलर
  function runGatingCheck() {
    if (!contentSecured) {
      secureContentContainer();
      return;
    }

    const isHealthy = verifyEnvironment();

    if (isHealthy) {
      // अगर सब ठीक है और अभी लॉक था, तो असली कंटेंट वापस लाओ
      if (isLockedState || (targetContainer && targetContainer.innerHTML !== originalContentHTML && targetContainer.innerHTML.indexOf("Ad Blocker Detected") === -1)) {
        if (targetContainer.innerHTML.indexOf("Verifying") !== -1 || isLockedState) {
          targetContainer.innerHTML = originalContentHTML;
          isLockedState = false;
        }
      }
    } else {
      // अगर एड-ब्लॉकर एक्टिव है, तो तुरंत फॉलबैक चिपका दो
      if (!isLockedState || (targetContainer && targetContainer.innerHTML !== CONFIG.FALLBACK_HTML)) {
        targetContainer.innerHTML = CONFIG.FALLBACK_HTML;
        isLockedState = true;
      }
    }
  }

  // तुरंत निष्पादन (Zero Delay Execution)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      secureContentContainer();
      setInterval(runGatingCheck, CONFIG.CHECK_INTERVAL);
    }, { once: true });
  } else {
    secureContentContainer();
    setInterval(runGatingCheck, CONFIG.CHECK_INTERVAL);
  }

  // 4. एंटी-बाईपास म्यूटेशन ऑब्ज़र्वर: यदि कोई यूजर कंसोल या स्क्रिप्ट से फॉलबैक हटाकर कंटेंट जबरन लाने की कोशिश करे
  const observer = new MutationObserver(function() {
    if (!contentSecured || !targetContainer) return;
    const isHealthy = verifyEnvironment();
    if (!isHealthy && targetContainer.innerHTML !== CONFIG.FALLBACK_HTML) {
      targetContainer.innerHTML = CONFIG.FALLBACK_HTML;
      isLockedState = true;
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener("DOMContentLoaded", function() {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  }

})();
