 <script>
(function () {
  "use strict";

  if (window.__MERAYOUR_ADGUARD_V2__) return;
  window.__MERAYOUR_ADGUARD_V2__ = true;

  const CONFIG = {
    GRACE_TIME: 5000,
    CHECK_INTERVAL: 1000,
    REQUIRED_CONFIRMATIONS: 3,

    TITLE: "Please Support Merayour",

    MESSAGE:
      "Merayour is a free website supported by advertising. " +
      "Please allow ads on this site to continue reading."
  };

  const state = {
    startedAt: Date.now(),
    scripts: new Set(),
    loadedScripts: new Set(),
    failedScripts: new Set(),
    confirmations: 0,
    locked: false,
    overlay: null,
    interval: null,
    observer: null
  };

  function isPreview() {
    const host = location.hostname.toLowerCase();
    const url = location.href.toLowerCase();

    return (
      host === "draft.blogger.com" ||
      host === "blogger.com" ||
      url.includes("/blog/post/edit/") ||
      url.includes("/blog/post/preview/")
    );
  }

  if (isPreview()) return;

  function isAdSenseScript(script) {
    if (!script || !script.src) return false;

    try {
      const url = new URL(script.src, location.href);

      return (
        url.hostname === "pagead2.googlesyndication.com" &&
        url.pathname.includes("/pagead/js/adsbygoogle.js")
      );
    } catch (e) {
      return false;
    }
  }

  /*
   * Register listeners on each AdSense script.
   * This detector must be placed before the AdSense tags.
   */
  function watchScript(script) {
    if (!isAdSenseScript(script)) return;
    if (state.scripts.has(script)) return;

    state.scripts.add(script);

    script.addEventListener("load", function () {
      state.loadedScripts.add(script);
      state.failedScripts.delete(script);
      state.confirmations = 0;
      check();
    });

    script.addEventListener("error", function () {
      if (!state.loadedScripts.has(script)) {
        state.failedScripts.add(script);
      }

      check();
    });
  }

  /*
   * Capture resource errors as early as possible.
   */
  window.addEventListener("error", function (event) {
    const target = event.target;

    if (!target || target.tagName !== "SCRIPT") return;
    if (!isAdSenseScript(target)) return;

    if (!state.loadedScripts.has(target)) {
      state.failedScripts.add(target);
    }
  }, true);

  /*
   * Discover scripts already present and scripts
   * inserted later by the page.
   */
  function scanScripts() {
    document.querySelectorAll("script[src]").forEach(watchScript);
  }

  scanScripts();

  state.observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;

        if (node.tagName === "SCRIPT") {
          watchScript(node);
        }

        if (node.querySelectorAll) {
          node.querySelectorAll("script[src]").forEach(watchScript);
        }
      });
    });
  });

  state.observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  /*
   * Look for genuine AdSense slots and rendered frames.
   */
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
    const slots = document.querySelectorAll("ins.adsbygoogle");

    for (const slot of slots) {
      const status = (
        slot.getAttribute("data-ad-status") || ""
      ).toLowerCase();

      if (status === "filled" && isVisible(slot)) {
        return true;
      }

      const frames = slot.querySelectorAll("iframe");

      for (const frame of frames) {
        if (isVisible(frame)) {
          return true;
        }
      }
    }

    return false;
  }

  function showLock() {
    if (state.locked || !document.body) return;

    state.locked = true;

    const overlay = document.createElement("div");

    overlay.id = "merayour-adguard-lock";

    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;" +
      "display:flex;align-items:center;justify-content:center;" +
      "padding:20px;box-sizing:border-box;" +
      "background:rgba(5,8,15,.97);color:#fff;" +
      "font-family:Arial,Helvetica,sans-serif;text-align:center;";

    const card = document.createElement("div");

    card.style.cssText =
      "max-width:440px;width:100%;padding:28px 22px;" +
      "box-sizing:border-box;background:#101827;" +
      "border:1px solid #30445d;border-radius:14px;";

    const title = document.createElement("h2");
    title.textContent = CONFIG.TITLE;
    title.style.cssText =
      "font-size:25px;line-height:1.3;margin:0 0 14px;";

    const message = document.createElement("p");
    message.textContent = CONFIG.MESSAGE;
    message.style.cssText =
      "font-size:16px;line-height:1.7;color:#d1d8e5;";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "I've Enabled Ads — Refresh";
    button.style.cssText =
      "width:100%;padding:14px;border:0;border-radius:8px;" +
      "background:#16b8d4;color:#06111c;font-weight:bold;" +
      "font-size:15px;cursor:pointer;";

    button.addEventListener("click", function () {
      location.reload();
    });

    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    overlay.appendChild(card);

    document.body.appendChild(overlay);
    state.overlay = overlay;
  }

  function removeLock() {
    state.locked = false;
    state.confirmations = 0;

    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
    }
  }

  function check() {
    if (!document.body) return;

    scanScripts();

    /*
     * Wait through the initial grace period.
     */
    if (Date.now() - state.startedAt < CONFIG.GRACE_TIME) {
      return;
    }

    /*
     * A rendered ad is a recovery signal.
     */
    if (hasRenderedAd()) {
      removeLock();
      return;
    }

    /*
     * If any AdSense script has loaded successfully,
     * a script-load failure alone cannot justify a lock.
     */
    if (state.loadedScripts.size > 0) {
      state.confirmations = 0;
      return;
    }

    /*
     * Only consider a script-based lock if an actual
     * AdSense script exists and failed to load.
     */
    const hasObservedScript = state.scripts.size > 0;
    const hasFailedScript = state.failedScripts.size > 0;

    if (hasObservedScript && hasFailedScript) {
      state.confirmations++;

      if (
        state.confirmations >= CONFIG.REQUIRED_CONFIRMATIONS
      ) {
        showLock();
      }
    } else {
      state.confirmations = 0;
    }
  }

  function start() {
    scanScripts();
    check();

    state.interval = window.setInterval(
      check,
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
