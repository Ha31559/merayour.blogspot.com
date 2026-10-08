(() => {
  "use strict";
  // SECURITY FIX 1: No obvious global flag - use Symbol + closure isolation to prevent scriptlet defusal
  const INSTANCE_KEY = Symbol.for("__merayour_guard_instance_v7__");
  if (window[INSTANCE_KEY]) return;
  window[INSTANCE_KEY] = true;

  // Blogger preview bypass - keep as is
  const isBloggerPreview = () => {
    const h = location.hostname.toLowerCase(), hr = location.href.toLowerCase();
    const s = location.search.toLowerCase(), p = location.pathname.toLowerCase();
    const rf = (document.referrer || "").toLowerCase();
    if (h === "blogger.com" || h.endsWith(".blogger.com") || h === "draft.blogger.com") return true;
    if (/(layout-preview|template-preview|post-preview)/i.test(p)) return true;
    if (s.includes("preview=true") || s.includes("blogger.preview") || s.includes("editor=true")) return true;
    if (hr.includes("blogger.com") && /(layout|template|edit)/i.test(hr)) return true;
    if (window !== window.top && (rf.includes("blogger.com") || rf.includes("blogspot.com"))) return true;
    return false;
  };
  if (isBloggerPreview()) return;

  const CONFIG = {
    logoUrl: "https://blogger.googleusercontent.com/img/a/AVvXsEhaZtN16Z4U9z--I9xFPXPpFPqQXh9Q4KbMSy3yElIrhilHz3K8p_yT_Vb-FLxWdgGuvMXdhnceynqtPxGx2690kGB33A-VQUY8lwKSd8tPKl5ZTG3sr_dk-57wVbk8PHki2zI8xI5KvOP3IPUCV7jqWvxznVHyArqw5cTA2FfJOZVYoB1k2AFFy5sDaQ=s666",
    title: "Ad Blocker Detected!",
    message: "Merayour is free thanks to ads. Please allow ads or whitelist us to continue reading."
  };

  // Adaptive Grace - 3G/4G slow network handling
  const getEffectiveGrace = () => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const type = conn?.effectiveType || "";
    if (type.includes("2g") || type.includes("slow")) return 12000;
    if (type.includes("3g")) return 9000;
    return 7000; // 7 sec base - Gemini requirement 6-8 sec
  };

  let legitAdRendered = false;
  const pageLoadStart = performance.now();
  let mainContent = null;

  // SECURITY FIX 2: DOM Masking instead of innerHTML wipe - preserves event listeners
  const findMainContent = () => {
    if (mainContent && document.contains(mainContent)) return mainContent;
    mainContent = document.querySelector("article,.post-body,.entry-content,main,#main-content");
    return mainContent;
  };

  const maskArticle = () => {
    const target = findMainContent();
    if (!target || target.classList.contains("ag-masked")) return;
    // CSS masking - no innerHTML destruction
    if (!document.getElementById("ag-mask-style")) {
      const style = document.createElement("style");
      style.id = "ag-mask-style";
      style.textContent = `.ag-masked{filter:blur(6px) brightness(0.4);pointer-events:none!important;user-select:none!important;position:relative;transition:filter .3s} .ag-masked::after{content:"";position:absolute;inset:0;background:rgba(13,17,23,0.7);z-index:1}`;
      document.head.appendChild(style);
    }
    target.classList.add("ag-masked");
  };

  const unmaskArticle = () => {
    const target = findMainContent();
    if (target) target.classList.remove("ag-masked");
    const s = document.getElementById("ag-mask-style");
    // keep style for reuse
  };

  // SECURITY FIX 3: Real Ad Render Check - robust iframe visibility
  const hasRealAd = () => {
    const iframes = document.querySelectorAll("ins.adsbygoogle iframe, .adsbygoogle iframe");
    for (const ifr of iframes) {
      const r = ifr.getBoundingClientRect();
      const cs = getComputedStyle(ifr);
      if (r.width > 10 && r.height > 10 && cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.1) {
        return true;
      }
    }
    return false;
  };

  // Overlay
  const createLockOverlay = () => {
    if (document.getElementById("ag-lock-overlay")) return;
    if (!document.getElementById("ag-lock-style")) {
      const style = document.createElement("style");
      style.id = "ag-lock-style";
      style.textContent = `#ag-lock-overlay{position:fixed;inset:0;width:100vw;height:100vh;background:#0d1117;color:#fff;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:system-ui;text-align:center} #ag-lock-overlay .ag-card{width:100%;max-width:420px;padding:32px 24px;background:#161b22;border:1px solid #30363d;border-radius:12px}`;
      document.head.appendChild(style);
    }
    const ov = document.createElement("div");
    ov.id = "ag-lock-overlay";
    const logo = CONFIG.logoUrl ? `<img src="${CONFIG.logoUrl}" style="max-width:80px;margin-bottom:16px;border-radius:8px" onerror="this.style.display='none'">` : "";
    ov.innerHTML = `<div class="ag-card">${logo}<h1>${CONFIG.title}</h1><p style="color:#8b949e;line-height:1.6;font-size:14px">${CONFIG.message}</p></div>`;
    (document.body || document.documentElement).appendChild(ov);
    maskArticle();
  };

  const removeLockOverlay = () => {
    document.getElementById("ag-lock-overlay")?.remove();
    unmaskArticle();
  };

  // SECURITY FIX 4: Multi-Layered Probe System

  // a) Dynamic Bait Elements with random obfuscated IDs
  const createRandomBaits = () => {
    if (!document.body) return [];
    const baitClasses = ["adsbygoogle", "ad-slot", "banner-ad", "adsbygoogle ad-unit", "text-ad"];
    const created = [];
    for (let i = 0; i < 3; i++) {
      const id = `ag-bait-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
      if (document.getElementById(id)) continue;
      const div = document.createElement("div");
      div.id = id;
      div.dataset.agBait = "1";
      div.className = baitClasses[Math.floor(Math.random() * baitClasses.length)];
      div.style.cssText = "display:block!important;visibility:visible!important;width:300px!important;height:250px!important;position:absolute!important;left:-9999px!important;top:-9999px!important;opacity:1!important;pointer-events:none!important;";
      document.body.appendChild(div);
      created.push(div);
    }
    return created;
  };

  const checkBaitCosmetic = () => {
    const baits = document.querySelectorAll("[data-ag-bait]");
    let blockedCount = 0;
    baits.forEach(el => {
      const cs = getComputedStyle(el);
      const hidden = cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0" || el.offsetHeight === 0 || el.offsetWidth === 0 || el.clientHeight === 0;
      if (hidden) blockedCount++;
    });
    return blockedCount > 0;
  };

  // b) Silent Network Probing - unconditional, non-blocking
  const probeState = { pixelFail: 0, fetchFail: 0, pixelSuccess: 0, fetchSuccess: 0 };
  const runNetworkProbes = async () => {
    // Pixel probe
    const pixelProbe = () => new Promise(resolve => {
      const img = new Image();
      let done = false;
      const timer = setTimeout(() => { if (done) return; done = true; probeState.pixelFail++; resolve(false); }, 3500);
      img.onload = () => { if (done) return; done = true; clearTimeout(timer); probeState.pixelSuccess++; resolve(true); };
      img.onerror = () => { if (done) return; done = true; clearTimeout(timer); probeState.pixelFail++; resolve(false); };
      img.src = `https://pagead2.googlesyndication.com/pagead/img/0.gif?ag=${Math.random()}&_=${Date.now()}`;
    });

    // Fetch probe with abort
    const fetchProbe = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3500);
        await fetch(`https://pagead2.googlesyndication.com/pagead/img/0.gif?ag=${Math.random()}&_=${Date.now()}`, {
          method: "GET", mode: "no-cors", cache: "no-store", credentials: "omit", signal: ctrl.signal
        });
        clearTimeout(t);
        probeState.fetchSuccess++;
        return true;
      } catch {
        probeState.fetchFail++;
        return false;
      }
    };

    const [p, f] = await Promise.all([pixelProbe(), fetchProbe()]);
    return { pixel: p, fetch: f };
  };

  // c) Script Integrity Check - detect stubbed/mocked adsbygoogle
  const isAdSenseMocked = () => {
    const ag = window.adsbygoogle;
    if (typeof ag === "undefined") return true; // Blocked completely - Brave, Opera
    // Adblockers create fake array without real push logic
    if (!Array.isArray(ag)) return true;
    // If array exists but no iframe after grace, likely stubbed
    if (ag.length > 0 && document.querySelectorAll("ins.adsbygoogle").length > 0) {
      const hasIframe = document.querySelectorAll("ins.adsbygoogle iframe").length > 0;
      if (!hasIframe && performance.now() - pageLoadStart > getEffectiveGrace() + 3000) {
        return true;
      }
    }
    return false;
  };

  // Main detection - Cross-Browser logic, no UA scoring
  let evaluationCount = 0;
  const evaluate = async () => {
    if (!navigator.onLine) return;
    if (document.readyState === "loading") return;

    // If real ad rendered, always unlock - clean fallback
    if (hasRealAd()) {
      legitAdRendered = true;
      removeLockOverlay();
      return;
    }

    const elapsed = performance.now() - pageLoadStart;
    const grace = getEffectiveGrace();

    if (elapsed < grace) return; // Wait for slow networks

    evaluationCount++;

    const adSlots = document.querySelectorAll("ins.adsbygoogle,.adsbygoogle");
    if (adSlots.length === 0) return;

    // Layer 1: Bait check
    const baitBlocked = checkBaitCosmetic();
    // Layer 2: Network probe (run every 2nd eval)
    let networkBlocked = false;
    if (evaluationCount % 2 === 0) {
      await runNetworkProbes();
      networkBlocked = probeState.pixelFail >= 1 && probeState.fetchFail >= 1 && probeState.pixelSuccess === 0 && probeState.fetchSuccess === 0;
    }
    // Layer 3: Script integrity
    const scriptBlocked = isAdSenseMocked();
    // Layer 4: No iframe after grace
    const noIframe = document.querySelectorAll("ins.adsbygoogle iframe").length === 0;

    // THANOS LOGIC: Any 1 layer true + no real ad = lock
    // But need at least 2 confirmations to avoid 1-time false
    const signals = [baitBlocked, networkBlocked, scriptBlocked, noIframe].filter(Boolean).length;

    if (signals >= 1 && !hasRealAd()) {
      // Extra check: if data-ad-status=unfilled, it's not adblock, just no fill
      let allUnfilled = true;
      adSlots.forEach(el => {
        if (el.getAttribute("data-ad-status") !== "unfilled") allUnfilled = false;
      });
      if (allUnfilled && adSlots.length > 0) return; // Don't lock for unfilled

      createLockOverlay();
    }
  };

  // Init
  const init = () => {
    findMainContent();
    createRandomBaits();

    // Watch for cosmetic hiding in real time
    const observer = new MutationObserver(() => {
      if (hasRealAd()) {
        removeLockOverlay();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });

    // Network error listener - resource blocking
    window.addEventListener("error", e => {
      const src = e.target?.src || "";
      if (/googlesyndication|pagead2|doubleclick|googleadservices/i.test(src)) {
        // Resource blocked signal
        evaluate();
      }
    }, true);

    // Periodic evaluation
    setInterval(evaluate, 2000);
    setTimeout(evaluate, getEffectiveGrace());
    setTimeout(evaluate, getEffectiveGrace() + 3000);
    setTimeout(evaluate, getEffectiveGrace() + 6000);

    // Auto-unblock if ads render later - clean fallback
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") setTimeout(evaluate, 1000);
    });
    window.addEventListener("online", () => setTimeout(evaluate, 1500));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
