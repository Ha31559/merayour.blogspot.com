(function (global) {
  // --- 1. Multi-Signal Scoring Configuration ---
  let totalScore = 0;
  const THRESHOLD = 50; // 60 या उससे ज़्यादा स्कोर होने पर ही Adblocker माना जाएगा

  // --- 2. Multiple DOM Bait Probe ---
  function testDomElements() {
    return new Promise((resolve) => {
      let score = 0;
      const baitClasses = [
        'adsbygoogle', 'ad-banner', 'pub_300x250', 
        'sponsored-post', 'top-ad', 'sticky-ad-bottom'
      ];

      const container = document.createElement('div');
      container.style.cssText = 'position:absolute; left:-9999px; top:-9999px; width:1px; height:1px;';

      baitClasses.forEach(className => {
        const bait = document.createElement('div');
        bait.className = className;
        bait.style.cssText = 'width:10px; height:10px; visibility:visible; display:block;';
        container.appendChild(bait);
      });

      document.body.appendChild(container);

      setTimeout(() => {
        const children = container.children;
        let hiddenCount = 0;

        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          const styles = window.getComputedStyle(el);

          if (
            el.offsetHeight === 0 ||
            styles.getPropertyValue('display') === 'none' ||
            styles.getPropertyValue('visibility') === 'hidden'
          ) {
            hiddenCount++;
          }
        }

        if (hiddenCount >= 3) score += 50;
        else if (hiddenCount >= 1) score += 25;

        if (container.parentNode) {
          document.body.removeChild(container);
        }
        resolve(score);
      }, 200);
    });
  }

  // --- 3. Network Probe (Fetch Check) ---
  function testNetwork() {
    return new Promise((resolve) => {
      if (!navigator.onLine) {
        resolve(0);
        return;
      }

      const testUrls = [
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        'https://securepubads.g.doubleclick.net/tag/js/gpt.js'
      ];

      let failedRequests = 0;
      let completedRequests = 0;

      testUrls.forEach((url) => {
        fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
          .then(() => {
            completedRequests++;
            checkDone();
          })
          .catch(() => {
            failedRequests++;
            completedRequests++;
            checkDone();
          });
      });

      function checkDone() {
        if (completedRequests === testUrls.length) {
          if (failedRequests >= 2) resolve(40);
          else if (failedRequests === 1) resolve(20);
          else resolve(0);
        }
      }

      // Timeout Safety
      setTimeout(() => resolve(0), 2000);
    });
  }

  // --- 4. Render Warning Popup ---
  function showWarningPopup() {
    if (document.getElementById('adblock-warning-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'adblock-warning-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(10, 10, 12, 0.95) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      backdrop-filter: blur(8px);
    `;

    overlay.innerHTML = `
      <div style="background: #16161a; padding: 35px 25px; border-radius: 16px; border: 1px solid #2a2a32; text-align: center; max-width: 420px; width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
        <div style="font-size: 50px; margin-bottom: 15px;">🛡️</div>
        <h2 style="color: #ff3b30; margin: 0 0 12px 0; font-size: 22px; font-weight: 700;">AdBlocker Detected!</h2>
        <p style="font-size: 14px; color: #a0a0ab; line-height: 1.6; margin-bottom: 25px;">
          Our content is free for everyone. We rely on ads to keep this site running. Please disable your AdBlocker and refresh the page to support us.
        </p>
        <button onclick="window.location.reload()" style="background: #ff3b30; color: #ffffff; border: none; padding: 12px 28px; font-size: 15px; font-weight: 600; border-radius: 8px; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(255,59,48,0.3);">
          Reload Page
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.setProperty('overflow', 'hidden', 'important');
  }

  // --- 5. Main Execution Engine ---
  async function runDetector() {
    const domScore = await testDomElements();
    const networkScore = await testNetwork();

    totalScore = domScore + networkScore;

    if (totalScore >= THRESHOLD) {
      showWarningPopup();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDetector);
  } else {
    runDetector();
  }

})(window);
