<script>
(function () {
  "use strict";

  /* =====================================================
     MERAYOUR ADGUARD V1
     5-second grace + 3 confirmation checks
     Non-destructive content lock
  ===================================================== */

  if (window.__MERAYOUR_ADGUARD_V1__) return;
  window.__MERAYOUR_ADGUARD_V1__ = true;

  const CONFIG = {
    GRACE_PERIOD: 5000,
    CHECK_INTERVAL: 1000,
    REQUIRED_CONFIRMATIONS: 3,

    SITE_NAME: "Merayour",

    LOGO_URL: "",

    TITLE: "Please Support Merayour",

    MESSAGE:
      "Merayour is a free website supported by advertising. " +
      "Please allow ads on this site to continue reading.",

    SCRIPT_PATTERN:
      /(^|\.)googlesyndication\.com$|(^|\.)googleadservices\.com$|(^|\.)doubleclick\.net$/i
  };

  const state = {
    startedAt: Date.now(),
    confirmationCount: 0,

    scriptSeen: false,
    scriptLoaded: false,
    scriptFailed: false,

    adResourceFailed: false,
    adRendered: false,

    locked: false,
    notice: null,

    intervalId: null,
    observer: null,

    checkedSlots: new WeakSet()
  };

  /* -----------------------------
     1. EXEMPT BLOGGER PREVIEW
  ----------------------------- */

  function isBloggerPreview() {
    const host = location.hostname.toLowerCase();
    const url = location.href.toLowerCase();

    return (
      host === "draft.blogger.com" ||
      host === "blogger.com" ||
      url.includes("blogger.com/blog/post/edit/") ||
      url.includes("blogger.com/blog/post/preview/") ||
      url.includes("blogger.com/u/") ||
      document.body?.classList.contains("item-view") === false &&
      url.includes("blogger.com")
    );
  }

  if (isBloggerPreview()) return;

  /* -----------------------------
     2. FIND REAL ADSENSE SCRIPTS
  ----------------------------- */

  function isAdSenseScript(script) {
    if (!script || !script.src) return false;

    try {
      const url = new URL(script.src, location.href);

      return (
        /(^|\.)googlesyndication\.com$/i.test(url.hostname) &&
        /adsbygoogle\.js/i.test(url.pathname)
      );
    } catch (e) {
      return false;
    }
  }

  function findAdSlots() {
    return Array.from(
      document.querySelectorAll("ins.adsbygoogle")
    );
  }

  function findAdScripts() {
    return Array.from(document.scripts).filter(isAdSenseScript);
  }

  function initializeScriptChecks() {
    const scripts = findAdScripts();

    if (scripts.length > 0) {
      state.scriptSeen = true;
    }

    scripts.forEach(function (script) {
      if (state.checkedSlots.has(script)) return;

      state.checkedSlots.add(script);

      script.addEventListener("load", function () {
        state.scriptLoaded = true;
        state.scriptFailed = false;
      });

      script.addEventListener("error", function () {
        state.scriptFailed = true;
      });
    });

    /*
      This global can exist before the AdSense script
      finishes loading. Therefore it is not treated as
      proof that an advertisement rendered successfully.
    */
  }

  /* -----------------------------
     3. DETECT AD RESOURCE ERRORS
  ----------------------------- */

  window.addEventListener("error", function (event) {
    const target = event.target;

    if (!target || target === window) return;

    const url =
      target.src ||
      target.href ||
      "";

    if (!url) return;

    try {
      const parsed = new URL(url, location.href);

      if (CONFIG.SCRIPT_PATTERN.test(parsed.hostname)) {
        state.adResourceFailed = true;

        if (/adsbygoogle\.js/i.test(parsed.pathname)) {
          state.scriptFailed = true;
        }
      }
    } catch (e) {
      /* Ignore invalid resource URLs. */
    }
  }, true);

  /* -----------------------------
     4. CHECK REAL AD RENDERING
  ----------------------------- */

  function isVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
      rect.width > 20 &&
      rect.height > 20 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) > 0
    );
  }

  function hasRenderedAd() {
    const slots = findAdSlots();

    for (const slot of slots) {
      const status = (
        slot.getAttribute("data-ad-status") || ""
      ).toLowerCase();

      /*
        "filled" is a strong signal.
        "unfilled" is NOT considered an AdBlock signal
        by itself.
      */

      if (status === "filled" && isVisible(slot)) {
        return true;
      }

      const frames = Array.from(
        slot.querySelectorAll("iframe")
      );

      for (const frame of frames) {
        if (isVisible(frame)) {
          return true;
        }
      }
    }

    return false;
  }

  /* -----------------------------
     5. CREATE NON-DESTRUCTIVE LOCK
  ----------------------------- */

  function createNotice() {
    if (state.notice) return state.notice;

    const overlay = document.createElement("div");

    overlay.id = "merayour-adguard-notice";

    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:20px",
      "box-sizing:border-box",
      "background:rgba(5,8,15,.97)",
      "color:#f5f7ff",
      "font-family:Arial,Helvetica,sans-serif",
      "text-align:center",
      "overflow:auto"
    ].join(";");

    const card = document.createElement("div");

    card.style.cssText = [
      "width:100%",
      "max-width:440px",
      "padding:30px 24px",
      "box-sizing:border-box",
      "background:#101827",
      "border:1px solid #30445d",
      "border-radius:14px",
      "box-shadow:0 15px 60px rgba(0,0,0,.5)"
    ].join(";");

    if (CONFIG.LOGO_URL) {
      const logo = document.createElement("img");

      logo.src = CONFIG.LOGO_URL;
      logo.alt = CONFIG.SITE_NAME;
      logo.style.cssText =
        "max-width:150px;max-height:70px;object-fit:contain;margin-bottom:18px";

      card.appendChild(logo);
    }

    const heading = document.createElement("h2");

    heading.textContent = CONFIG.TITLE;

    heading.style.cssText = [
      "margin:0 0 14px",
      "font-size:25px",
      "line-height:1.3",
      "color:#ffffff"
    ].join(";");

    const message = document.createElement("p");

    message.textContent = CONFIG.MESSAGE;

    message.style.cssText = [
      "margin:0 0 24px",
      "font-size:16px",
      "line-height:1.7",
      "color:#d1d8e5"
    ].join(";");

    const button = document.createElement("button");

    button.type = "button";
    button.textContent = "I've Enabled Ads — Refresh";

    button.style.cssText = [
      "display:block",
      "width:100%",
      "padding:14px 16px",
      "border:0",
      "border-radius:8px",
      "background:#16b8d4",
      "color:#06111c",
      "font-size:15px",
      "font-weight:700",
      "cursor:pointer"
    ].join(";");

    button.addEventListener("click", function () {
      button.disabled = true;
      button.textContent = "Refreshing…";
      location.reload();
    });

    const note = document.createElement("p");

    note.textContent =
      "If you've already allowed ads, refresh the page to check again.";

    note.style.cssText = [
      "margin:16px 0 0",
      "font-size:12px",
      "line-height:1.6",
      "color:#aab6c8"
    ].join(";");

    card.appendChild(heading);
    card.appendChild(message);
    card.appendChild(button);
    card.appendChild(note);

    overlay.appendChild(card);

    state.notice = overlay;

    return overlay;
  }

  function lockPage() {
    if (state.locked) return;

    state.locked = true;

    const notice = createNotice();

    if (!notice.isConnected) {
      document.body.appendChild(notice);
    }
  }

  function unlockPage() {
    state.locked = false;
    state.confirmationCount = 0;

    if (state.notice && state.notice.isConnected) {
      state.notice.remove();
    }
  }

  /* -----------------------------
     6. DETECTION DECISION
  ----------------------------- */

  function evaluate() {
    if (!document.body) return;

    initializeScriptChecks();

    const slots = findAdSlots();

    /*
      Do not lock a page that has no AdSense slots.
    */
    if (slots.length === 0) return;

    /*
      A rendered ad is the strongest recovery signal.
    */
    if (hasRenderedAd()) {
      state.adRendered = true;
      unlockPage();
      return;
    }

    /*
      Give the page time to initialize AdSense.
    */
    if (Date.now() - state.startedAt < CONFIG.GRACE_PERIOD) {
      return;
    }

    /*
      If all slots are explicitly unfilled, do not label
      that situation as AdBlock automatically.
    */
    const statuses = slots.map(function (slot) {
      return (
        slot.getAttribute("data-ad-status") || ""
      ).toLowerCase();
    });

    const allUnfilled = statuses.every(function (status) {
      return status === "unfilled";
    });

    if (allUnfilled) {
      state.confirmationCount = 0;
      return;
    }

    /*
      Evidence:
      A. The AdSense script failed to load.
      B. An AdSense/advertising resource failed.
      C. The script was observed, but did not load and
         the ad slots remain unfilled/pending.
    */

    const scriptMissingAfterGrace =
      state.scriptSeen && !state.scriptLoaded;

    const suspicious =
      state.scriptFailed ||
      state.adResourceFailed ||
      scriptMissingAfterGrace;

    if (suspicious) {
      state.confirmationCount++;
    } else {
      state.confirmationCount = 0;
    }

    if (
      state.confirmationCount >=
      CONFIG.REQUIRED_CONFIRMATIONS
    ) {
      lockPage();
    }
  }

  /* -----------------------------
     7. WATCH FOR AD SLOT CHANGES
  ----------------------------- */

  function startObserver() {
    if (state.observer || !document.body) return;

    state.observer = new MutationObserver(function () {
      if (hasRenderedAd()) {
        state.adRendered = true;
        unlockPage();
      }
    });

    state.observer.observe(document.body, {
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

  /* -----------------------------
     8. START
  ----------------------------- */

  function start() {
    initializeScriptChecks();
    startObserver();

    evaluate();

    state.intervalId = window.setInterval(
      evaluate,
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
</script>
