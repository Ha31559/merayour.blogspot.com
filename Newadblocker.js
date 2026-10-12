(function () {
  "use strict";

  if (window.__MERAYOUR_ADGUARD_V9__) return;
  window.__MERAYOUR_ADGUARD_V9__ = true;

  const CONFIG = {
    INITIAL_GRACE: 5000,
    AD_PENDING_GRACE: 12000,
    CONFIRMATION_TIME: 7000,
    CHECK_INTERVAL: 1000
  };

  const state = {
    analyticsDetected: false,
    analyticsFailed: false,
    adsenseDetected: false,
    adsenseFailed: false,
    adsenseLoaded: false,
    firstCheckComplete: false,
    lockStartedAt: 0,
    locked: false,
    overlay: null,
    pendingSince: 0
  };

  const startedAt = Date.now();

  function isBloggerPreview() {
    const url = location.href.toLowerCase();

    return (
      url.includes("blogger.com/blogger.g") ||
      url.includes("blogger.googleusercontent.com") ||
      url.includes("view=preview")
    );
  }

  if (isBloggerPreview()) return;

  function getScriptType(src) {
    if (!src) return "";

    const value = src.toLowerCase();

    if (
      value.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js") ||
      value.includes("googleads.g.doubleclick.net/pagead/ads") ||
      value.includes("googlesyndication.com/pagead/")
    ) {
      return "adsense";
    }

    if (
      value.includes("googletagmanager.com/gtag/js") ||
      value.includes("googletagmanager.com/gtm.js") ||
      value.includes("google-analytics.com/analytics.js") ||
      value.includes("google-analytics.com/ga.js") ||
      value.includes("google-analytics.com/g/collect") ||
      value.includes("analytics.google.com/g/collect")
    ) {
      return "analytics";
    }

    return "";
  }

  function inspectExistingScripts() {
    document.querySelectorAll("script[src]").forEach(function (script) {
      const type = getScriptType(script.src);

      if (type === "adsense") {
        state.adsenseDetected = true;
      }

      if (type === "analytics") {
        state.analyticsDetected = true;
      }
    });
  }

  /*
   * Capture resource-loading errors.
   * This listener must be installed before the monitored scripts load.
   */
  window.addEventListener("error", function (event) {
    const target = event.target;

    if (!target || !target.src) return;

    const type = getScriptType(target.src);

    if (type === "adsense") {
      state.adsenseDetected = true;
      state.adsenseFailed = true;
    }

    if (type === "analytics") {
      state.analyticsDetected = true;
      state.analyticsFailed = true;
    }
  }, true);

  /*
   * Track scripts inserted after this monitor starts.
   */
  function watchScript(script) {
    if (!script || !script.src) return;

    const type = getScriptType(script.src);

    if (type === "adsense") {
      state.adsenseDetected = true;

      script.addEventListener("load", function () {
        state.adsenseLoaded = true;
      }, { once: true });

      script.addEventListener("error", function () {
        state.adsenseFailed = true;
      }, { once: true });
    }

    if (type === "analytics") {
      state.analyticsDetected = true;

      script.addEventListener("error", function () {
        state.analyticsFailed = true;
      }, { once: true });
    }
  }

  function watchNewScripts() {
    if (!document.documentElement) return;

    const observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (!node || node.nodeType !== 1) return;

          if (node.tagName === "SCRIPT") {
            watchScript(node);
          }

          if (node.querySelectorAll) {
            node.querySelectorAll("script[src]").forEach(watchScript);
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function getAdSlots() {
    return Array.from(
      document.querySelectorAll("ins.adsbygoogle")
    );
  }

  function hasFilledAd() {
    const slots = getAdSlots();

    return slots.some(function (slot) {
      if (slot.getAttribute("data-ad-status") === "filled") {
        return true;
      }

      /*
       * A rendered iframe inside a real AdSense slot is
       * supporting evidence, not a fabricated test element.
       */
      const iframe = slot.querySelector("iframe");

      if (iframe) {
        const rect = iframe.getBoundingClientRect();

        return rect.width > 1 && rect.height > 1;
      }

      return false;
    });
  }

  function hasPendingAdSlot() {
    const slots = getAdSlots();

    return slots.some(function (slot) {
      const status = slot.getAttribute("data-ad-status");

      /*
       * An explicitly unfilled slot is not treated as
       * proof of ad blocking.
       */
      if (status === "unfilled") return false;

      if (status === "filled") return false;

      return true;
    });
  }

  function createOverlay() {
    if (state.overlay) return;

    const overlay = document.createElement("div");

    overlay.id = "merayour-adguard-notice";

    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "background:rgba(10,10,15,.97)",
      "color:#fff",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:24px",
      "box-sizing:border-box",
      "font-family:Arial,sans-serif",
      "text-align:center"
    ].join(";");

    overlay.innerHTML = `
      <div style="
        max-width:520px;
        width:100%;
        padding:28px 22px;
        border:1px solid #a52b35;
        border-radius:12px;
        background:#15151d;
        box-shadow:0 0 35px rgba(165,43,53,.18);
      ">
        <h2 style="
          color:#ff5964;
          font-size:25px;
          line-height:1.3;
          margin:0 0 16px;
        ">Please Check Your Ad Settings</h2>

        <p style="
          color:#e3e3e8;
          font-size:16px;
          line-height:1.7;
          margin:0 0 18px;
        ">
          Merayour relies on advertising to support its stories.
          Our checks could not confirm that the required services
          are working. If you use an ad blocker, please allow ads
          on this site and reload the page.
        </p>

        <button id="merayour-adguard-recheck" type="button" style="
          background:#b92f3b;
          color:#fff;
          border:0;
          border-radius:6px;
          padding:13px 20px;
          font-size:15px;
          font-weight:bold;
          cursor:pointer;
        ">I've Allowed Ads — Reload Page</button>

        <p style="
          color:#aaaab5;
          font-size:12px;
          line-height:1.5;
          margin:15px 0 0;
        ">
          If you do not use an ad blocker, try reloading the page.
          A network or browser privacy setting can sometimes affect
          these checks.
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    const button = overlay.querySelector(
      "#merayour-adguard-recheck"
    );

    button.addEventListener("click", function () {
      location.reload();
    });

    state.overlay = overlay;
    state.locked = true;
  }

  function removeOverlay() {
    if (state.overlay) {
      state.overlay.remove();
    }

    state.overlay = null;
    state.locked = false;
    state.lockStartedAt = 0;
  }

  function evaluateDetection() {
    const elapsed = Date.now() - startedAt;

    if (elapsed < CONFIG.INITIAL_GRACE) return;

    state.firstCheckComplete = true;

    /*
     * A real rendered ad is positive evidence that at least
     * one ad slot is working. Do not lock the page in this case.
     */
    if (hasFilledAd()) {
      removeOverlay();
      state.pendingSince = 0;
      return;
    }

    /*
     * Detection requires evidence from BOTH systems.
     * A missing Analytics setup is not counted as a failure.
     */
    const bothScriptsFailed =
      state.adsenseDetected &&
      state.adsenseFailed &&
      state.analyticsDetected &&
      state.analyticsFailed;

    /*
     * Secondary path: Analytics failed, AdSense JS loaded,
     * and a real AdSense slot remains pending beyond the grace.
     * An explicitly unfilled slot alone never triggers a lock.
     */
    const pendingAdPath =
      state.analyticsDetected &&
      state.analyticsFailed &&
      state.adsenseDetected &&
      state.adsenseLoaded &&
      hasPendingAdSlot() &&
      elapsed >= CONFIG.AD_PENDING_GRACE;

    const suspicious = bothScriptsFailed || pendingAdPath;

    if (!suspicious) {
      state.lockStartedAt = 0;
      return;
    }

    if (!state.lockStartedAt) {
      state.lockStartedAt = Date.now();
      return;
    }

    if (
      Date.now() - state.lockStartedAt >=
      CONFIG.CONFIRMATION_TIME
    ) {
      createOverlay();
    }
  }

  function start() {
    inspectExistingScripts();
    watchNewScripts();

    /*
     * Attach listeners to scripts already present.
     * For best error coverage, install this code in <head>
     * before the Analytics and AdSense scripts.
     */
    document.querySelectorAll("script[src]").forEach(watchScript);

    window.setInterval(
      evaluateDetection,
      CONFIG.CHECK_INTERVAL
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }
})();
