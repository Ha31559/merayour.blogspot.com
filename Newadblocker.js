(function () {
  "use strict";

  if (window.__MERAYOUR_ULTIMATE_V92__) return;
  window.__MERAYOUR_ULTIMATE_V92__ = true;

  // ==========================================================
  // MERAYOUR ADGUARD V9.2 - EDGE, OPERA & FIREFOX TARGETED EDITION
  // ==========================================================

  const CONFIG = {
    GA4_ID: "G-ML091DD9QZ",
    ADSENSE_ID: "ca-pub-1011806586686442",

    INITIAL_GRACE: 20000, // 20 सेकंड शुरुआती छूट
    SYSTEM_GRACE: 45000, // 45 सेकंड सिस्टम ग्रेस पीरियड
    CONFIRMATION_TIME: 1500, // 1.5 सेकंड पुष्टि का समय
    RECOVERY_CONFIRMATION_TIME: 5000,
    CHECK_INTERVAL: 500, // और तेज रफ्तार जांच

    DETECTION_THRESHOLD: 40, // थोड़ा और सख्त ताकि तुरंत पकड़ में आए

    OVERLAY_ID: "merayour-v92-lock",
    STYLE_ID: "merayour-v92-style",

    CONTENT_SELECTORS: [
      ".post-body",
      "article",
      ".post"
    ]
  };

  const startedAt = Date.now();

  const state = {
    gaScriptFound: false,
    gaScriptLoaded: false,
    gaScriptFailed: false,
    gaActivitySeen: false,

    adsenseScriptFound: false,
    adsenseScriptLoaded: false,
    adsenseScriptFailed: false,

    adSlotsFound: false,
    adFilled: false,
    adUnfilled: false,

    baitTriggered: false,
    networkBlocked: false, // नया पैच: नेटवर्क साइलेंट ब्लॉकिंग ट्रैक करने के लिए

    suspiciousSince: 0,
    healthySince: 0,
    locked: false,

    observer: null,
    gaObserver: null,
    lockObserver: null,
    timer: null,

    detachedContent: new Map(),
    savedPageStyles: null,
    lockInProgress: false,
    baitHost: null,
    shadowBait: null
  };

  // ==========================================================
  // 1. ADVANCED SHADOW DOM BAIT TRAP
  // ==========================================================
  function plantShadowBait() {
    if (document.getElementById("merayour-shadow-host")) return;
    
    try {
      const host = document.createElement("div");
      host.id = "merayour-shadow-host";
      host.style.cssText = "position:absolute !important; left:-9999px !important; top:-9999px !important; width:1px !important; height:1px !important; opacity:0.01 !important; pointer-events:none !important;";
      
      const shadow = host.attachShadow({ mode: 'open' });
      const fakeAd = document.createElement("div");
      fakeAd.id = "google_ads_iframe_net_trap";
      fakeAd.className = "adsbygoogle pub_300x250 text-ad";
      fakeAd.style.cssText = "width:300px !important; height:250px !important; display:block !important;";
      fakeAd.innerHTML = '<iframe src="about:blank" style="width:100%;height:100%;"></iframe>';
      
      shadow.appendChild(fakeAd);
      (document.body || document.documentElement).appendChild(host);
      
      state.baitHost = host;
      state.shadowBait = fakeAd;
    } catch (_) {}
  }

  function checkShadowBaitTrap() {
    if (!state.baitHost || !state.shadowBait) return false;
    try {
      const hostRect = state.baitHost.getBoundingClientRect();
      const style = window.getComputedStyle(state.baitHost);

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        hostRect.width === 0 ||
        !state.baitHost.isConnected
      ) {
        return true; 
      }
    } catch (_) {}
    return false;
  }

  // ==========================================================
  // 2. EDGE, OPERA & FIREFOX TARGETED NETWORK & API SNIFFER (NEW PATCH)
  // ये ब्राउज़र और एक्सटेंशन साइलेंटली रिक्वेस्ट ब्लॉक करते हैं, इन्हें यहाँ पकड़ेंगे
  // ==========================================================
  function watchNetworkBlocks() {
    try {
      // Fetch API को हुक करना ताकि अगर कोई एक्सटेंशन गूगल या एनालिटिक्स की कॉल रोके तो पता चले
      const originalFetch = window.fetch;
      if (originalFetch) {
        window.fetch = function (...args) {
          const url = (args[0] || "").toString().toLowerCase();
          if (url.includes("google-analytics.com") || url.includes("googlesyndication.com") || url.includes("googletagmanager.com")) {
            // अगर रिक्वेस्ट करने पर तुरंत फेम या ब्लॉक का रिस्पॉन्स आए या कैंसल हो
            return originalFetch.apply(this, args).catch(err => {
              state.networkBlocked = true;
              throw err;
            });
          }
          return originalFetch.apply(this, args);
        };
      }
    } catch (_) {}

    // ग्लोबल एडसेंस और विज्ञापन ऑब्जेक्ट्स की ताक-झांक (Edge/Firefox एक्सटेंशन इन्हें मॉडिफाई कर देते हैं)
    try {
      if (window.adsbygoogle && typeof window.adsbygoogle.loaded === "undefined" && navigator.userAgent.indexOf("Firefox") !== -1) {
        state.networkBlocked = true;
      }
    } catch (_) {}
  }

  // ==========================================================
  // 3. ENVIRONMENT & CORE SCRIPT MONITORING (पुराना लॉजिक सुरक्षित)
  // ==========================================================
  function isBloggerPreview() {
    const host = (location.hostname || "").toLowerCase();
    const search = (location.search || "").toLowerCase();
    return (
      host === "blogger.com" ||
      host.endsWith(".blogger.com") ||
      /(?:^|[?&])preview=(?:true|1)(?:&|$)/.test(search)
    );
  }

  if (isBloggerPreview()) return;

  function classifyScript(src) {
    if (!src) return "";
    const url = src.toLowerCase();
    if (url.includes("googletagmanager.com/gtag/js") && url.includes(CONFIG.GA4_ID.toLowerCase())) {
      return "GA4";
    }
    if (url.includes("googlesyndication.com/pagead/js/adsbygoogle.js") && url.includes(CONFIG.ADSENSE_ID.toLowerCase())) {
      return "ADSENSE";
    }
    return "";
  }

  function attachScriptListeners(script) {
    if (!script || !script.src) return;
    const type = classifyScript(script.src);
    if (!type) return;
    if (script.dataset.merayourWatched === "1") return;
    script.dataset.merayourWatched = "1";

    if (type === "GA4") state.gaScriptFound = true;
    else state.adsenseScriptFound = true;

    script.addEventListener("load", function () {
      if (type === "GA4") {
        state.gaScriptLoaded = true;
        state.gaScriptFailed = false;
      } else {
        state.adsenseScriptLoaded = true;
        state.adsenseScriptFailed = false;
      }
    }, { once: true });

    script.addEventListener("error", function () {
      if (type === "GA4") state.gaScriptFailed = true;
      else state.adsenseScriptFailed = true;
    }, { once: true });
  }

  window.addEventListener("error", function (event) {
    const target = event.target;
    if (!target || target.tagName !== "SCRIPT") return;
    const type = classifyScript(target.src || "");
    if (type === "GA4") {
      state.gaScriptFound = true;
      state.gaScriptFailed = true;
    } else if (type === "ADSENSE") {
      state.adsenseScriptFound = true;
      state.adsenseScriptFailed = true;
    }
  }, true);

  function watchScripts() {
    document.querySelectorAll("script[src]").forEach(attachScriptListeners);
    if (!document.documentElement) return;

    state.observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.tagName === "SCRIPT") attachScriptListeners(node);
          if (node.querySelectorAll) {
            node.querySelectorAll("script[src]").forEach(attachScriptListeners);
          }
        });
      });
    });

    state.observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ==========================================================
  // 4. CORE EVIDENCE & CONTENT DETACHMENT ENGINE
  // ==========================================================
  function calculateEvidence() {
    const elapsed = Date.now() - startedAt;
    let gaScore = 0;
    let adScore = 0;

    // शैडो हनीपॉट या नेटवर्क साइलेंट ब्लॉकिंग (Edge/Firefox/Opera के लिए) पकड़े जाने पर
    if (checkShadowBaitTrap() || state.networkBlocked) {
      state.baitTriggered = true;
      gaScore = 100; 
    }

    if (state.gaScriptFailed) gaScore = Math.max(gaScore, CONFIG.GA_SCRIPT_FAILURE || 50);
    if (state.adsenseScriptFailed) adScore = Math.max(adScore, CONFIG.ADSENSE_SCRIPT_FAILURE || 50);

    const totalScore = Math.max(gaScore, adScore);
    return {
      total: totalScore,
      suspicious: totalScore >= CONFIG.DETECTION_THRESHOLD && elapsed >= CONFIG.INITIAL_GRACE
    };
  }

  function getContentCandidates() {
    for (let i = 0; i < CONFIG.CONTENT_SELECTORS.length; i++) {
      const selector = CONFIG.CONTENT_SELECTORS[i];
      let matches = [];
      try {
        matches = Array.from(document.querySelectorAll(selector));
      } catch (_) {
        continue;
      }

      matches = matches.filter(function (el) {
        if (!el.isConnected) return false;
        if (el.id === CONFIG.OVERLAY_ID || el.closest("#" + CONFIG.OVERLAY_ID)) return false;
        if (el === document.body || el === document.documentElement || el.tagName === "SCRIPT" || el.tagName === "STYLE") return false;
        return !state.detachedContent.has(el);
      });

      if (matches.length > 0) {
        return matches.filter(function (el) {
          return !matches.some(function (other) {
            return other !== el && other.contains(el);
          });
        });
      }
    }
    return [];
  }

  function detachContent() {
    if (state.lockInProgress) return;
    state.lockInProgress = true;
    try {
      getContentCandidates().forEach(function (el) {
        if (!el.parentNode || !el.isConnected) return;
        const parent = el.parentNode;
        const nextSibling = el.nextSibling;
        const placeholder = document.createComment("Merayour content temporarily locked");
        const record = { placeholder: placeholder, parent: parent, nextSibling: nextSibling };
        try {
          parent.replaceChild(placeholder, el);
          state.detachedContent.set(el, record);
        } catch (_) {}
      });

      if (!state.savedPageStyles) {
        state.savedPageStyles = {
          htmlOverflow: document.documentElement.style.getPropertyValue("overflow"),
          bodyOverflow: document.body ? document.body.style.getPropertyValue("overflow") : ""
        };
      }

      document.documentElement.style.setProperty("overflow", "hidden", "important");
      if (document.body) {
        document.body.style.setProperty("overflow", "hidden", "important");
      }
    } finally {
      state.lockInProgress = false;
    }
  }

  function restoreContent() {
    state.detachedContent.forEach(function (record, el) {
      try {
        if (record.placeholder && record.placeholder.parentNode) {
          record.placeholder.parentNode.replaceChild(el, record.placeholder);
          return;
        }
        if (record.parent && record.parent.isConnected) {
          const reference = record.nextSibling && record.nextSibling.parentNode === record.parent ? record.nextSibling : null;
          record.parent.insertBefore(el, reference);
        }
      } catch (_) {}
    });
    state.detachedContent.clear();

    if (state.savedPageStyles) {
      if (state.savedPageStyles.htmlOverflow) {
        document.documentElement.style.setProperty("overflow", state.savedPageStyles.htmlOverflow);
      } else {
        document.documentElement.style.removeProperty("overflow");
      }
      if (document.body && state.savedPageStyles.bodyOverflow) {
        document.body.style.setProperty("overflow", state.savedPageStyles.bodyOverflow);
      } else if (document.body) {
        document.body.style.removeProperty("overflow");
      }
      state.savedPageStyles = null;
    }
  }

  // ==========================================================
  // 5. OVERLAY STYLES & FORCE LOCK
  // ==========================================================
  function installStyles() {
    if (document.getElementById(CONFIG.STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = CONFIG.STYLE_ID;
    style.textContent = `
      #${CONFIG.OVERLAY_ID} {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        box-sizing: border-box !important;
        background: rgba(5, 7, 12, 0.995) !important;
        color: #fff !important;
        font-family: Arial, sans-serif !important;
        overflow: hidden !important;
        backdrop-filter: blur(8px) !important;
      }
      #${CONFIG.OVERLAY_ID} .ag-v92-card {
        width: 100% !important;
        max-width: 450px !important;
        padding: 30px 24px !important;
        box-sizing: border-box !important;
        text-align: center !important;
        background: #151923 !important;
        border: 2px solid #ff4757 !important;
        border-radius: 14px !important;
        box-shadow: 0 15px 50px rgba(0, 0, 0, 0.9) !important;
      }
      #${CONFIG.OVERLAY_ID} h2 {
        margin: 0 0 15px !important;
        color: #ff626c !important;
        font-size: 24px !important;
        font-weight: 700 !important;
      }
      #${CONFIG.OVERLAY_ID} p {
        color: #d2d5df !important;
        font-size: 15px !important;
        line-height: 1.6 !important;
        margin-bottom: 20px !important;
      }
      #${CONFIG.OVERLAY_ID} button {
        width: 100% !important;
        padding: 14px 20px !important;
        border: 0 !important;
        border-radius: 8px !important;
        background: #ff4757 !important;
        color: #fff !important;
        font-weight: bold !important;
        font-size: 16px !important;
        cursor: pointer !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function createLock() {
    if (!document.body) return;
    installStyles();

    let overlay = document.getElementById(CONFIG.OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = CONFIG.OVERLAY_ID;

      const card = document.createElement("div");
      card.className = "ag-v92-card";

      const heading = document.createElement("h2");
      heading.textContent = "Ad Blocker Detected!";

      const message = document.createElement("p");
      message.textContent = "Merayour is supported by advertising and analytics. Please disable your ad blocker or filter lists to continue reading.";

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "I've Allowed Ads — Reload";
      button.addEventListener("click", function () {
        location.reload();
      });

      card.appendChild(heading);
      card.appendChild(message);
      card.appendChild(button);
      overlay.appendChild(card);
    }

    if (!overlay.isConnected || getComputedStyle(overlay).display === "none") {
      document.body.appendChild(overlay);
    }

    state.locked = true;
    detachContent();

    if (!state.lockObserver && document.documentElement) {
      state.lockObserver = new MutationObserver(function () {
        if (!state.locked) return;
        let currentOverlay = document.getElementById(CONFIG.OVERLAY_ID);
        if (!currentOverlay || !currentOverlay.isConnected) {
          if (document.body) document.body.appendChild(overlay);
        }
        detachContent();
      });

      state.lockObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }
  }

  function removeLock() {
    state.locked = false;
    if (state.lockObserver) {
      state.lockObserver.disconnect();
      state.lockObserver = null;
    }
    const overlay = document.getElementById(CONFIG.OVERLAY_ID);
    if (overlay) overlay.remove();
    restoreContent();
    state.suspiciousSince = 0;
    state.healthySince = 0;
  }

  // ==========================================================
  // 6. MAIN EVALUATION LOOP
  // ==========================================================
  function evaluate() {
    const evidence = calculateEvidence();

    if (evidence.suspicious || state.baitTriggered) {
      state.healthySince = 0;
      if (!state.suspiciousSince) {
        state.suspiciousSince = Date.now();
      }

      if (Date.now() - state.suspiciousSince >= CONFIG.CONFIRMATION_TIME) {
        createLock();
      }
      return;
    }

    state.suspiciousSince = 0;
    if (state.locked && !state.baitTriggered) {
      if (!state.healthySince) {
        state.healthySince = Date.now();
      }
      if (Date.now() - state.healthySince >= CONFIG.RECOVERY_CONFIRMATION_TIME) {
        removeLock();
      }
    }
  }

  function init() {
    plantShadowBait();
    watchNetworkBlocks(); // नया पैच एक्टिव किया गया
    watchScripts();
    state.timer = window.setInterval(evaluate, CONFIG.CHECK_INTERVAL);
    evaluate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
