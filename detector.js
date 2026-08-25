/* =========================================================
 BSD Layer V2.2 — Conservative Human Verification Upgrade
 Platform: Blogger + GitHub
 Mode: Fail-Open / Low False Positive / Human Verification
 ========================================================= */
(function () {
    'use strict';

    const BSD_CONFIG = {
        github: {
            url: 'https://raw.githubusercontent.com/Ha31559/merayour.blogspot.com/main/filters.json'
            timeout: 2000
        },
        cache: {
            key: '_bsd_v22_cache_',
            ttl: 12 * 60 * 60 * 1000,
            schemaVersion: 3
        },
        limits: {
            maxPayloadSizeBytes: 100000,
            maxPatternsPerList: 200,
            maxPatternLength: 100
        },
        thresholds: {
            mediumRisk: 40,
            highRisk: 70,
            minHighRiskCategories: 2
        },
        weights: {
            knownScraper: 40,
            knownBot: 40,
            suspiciousUA: 15,
            automationEngine: 40,
            automationWindow: 35,
            weakBrowserAnomaly: 5,
            behaviorAnomaly: 15
        },
        categoryCaps: {
            Signature: 45,
            Automation: 50,
            Behavior: 25,
            'Browser Anomaly': 15
        },
        behavior: {
            rapidClickThreshold: 8,
            windowMs: 1000,
            behaviorCanTriggerAlone: false
        },
        allowlist: {
            mode: 'protective',
            discountPoints: 25
        },
        challenge: {
            enabled: true,
            sessionKey: '_bsd_v22_verified_',
            sessionTTL: 12 * 60 * 60 * 1000,
            title: 'Are you a robot?',
            text: 'Please confirm that you are a real visitor to continue.',
            button: 'No, I’m not a robot'
        },
        debug: false,
        dom: {
            prefix: 'bsd-v22-'
        }
    };

    let isInitialized = false;
    let challengeShown = false;
    const MemoryStorage = new Map();

    function debugLog() {
        if (!BSD_CONFIG.debug) return;
        try { console.log.apply(console, arguments); } catch (e) {}
    }

    function sanitizePattern(str) {
        if (typeof str !== 'string') return '';
        const clean = str.trim().toLowerCase();
        if (clean.length === 0 || clean.length > BSD_CONFIG.limits.maxPatternLength) return '';
        return clean;
    }

    function validateAndProcessList(rawList) {
        if (!Array.isArray(rawList)) return [];
        const processed = [];
        const seen = new Set();
        for (let i = 0; i < rawList.length; i++) {
            if (processed.length >= BSD_CONFIG.limits.maxPatternsPerList) break;
            const clean = sanitizePattern(rawList[i]);
            if (clean && !seen.has(clean)) {
                seen.add(clean);
                processed.push(clean);
            }
        }
        return processed;
    }

    function validateSchema(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
        if (typeof data.version !== 'number' || data.version !== 2) return null;
        return {
            version: 2,
            allowlist: validateAndProcessList(data.allowlist),
            knownBots: validateAndProcessList(data.knownBots),
            knownScrapers: validateAndProcessList(data.knownScrapers),
            suspiciousPatterns: validateAndProcessList(data.suspiciousPatterns)
        };
    }

    const CacheController = {
        get: function (key) {
            const fullKey = BSD_CONFIG.cache.key + key;
            const now = Date.now();
            try {
                if (window.localStorage) {
                    const raw = localStorage.getItem(fullKey);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed.schemaVersion === BSD_CONFIG.cache.schemaVersion && parsed.data && typeof parsed.expiresAt === 'number') {
                            const validated = validateSchema(parsed.data);
                            if (validated) {
                                if (now < parsed.expiresAt) return { data: validated, status: 'FRESH' };
                                return { data: validated, status: 'EXPIRED_VALID' };
                            }
                            try { localStorage.removeItem(fullKey); } catch (e) {}
                        }
                    }
                }
            } catch (e) {}

            try {
                const memItem = MemoryStorage.get(fullKey);
                if (memItem && memItem.schemaVersion === BSD_CONFIG.cache.schemaVersion && memItem.data && typeof memItem.expiresAt === 'number') {
                    const validated = validateSchema(memItem.data);
                    if (validated) {
                        if (now < memItem.expiresAt) return { data: validated, status: 'FRESH' };
                        return { data: validated, status: 'EXPIRED_VALID' };
                    }
                    MemoryStorage.delete(fullKey);
                }
            } catch (e) {}

            return { data: null, status: 'MISSING' };
        },
        set: function (key, data, ttl) {
            const validated = validateSchema(data);
            if (!validated) return false;
            const fullKey = BSD_CONFIG.cache.key + key;
            const now = Date.now();
            const payload = {
                data: validated,
                storedAt: now,
                expiresAt: now + ttl,
                schemaVersion: BSD_CONFIG.cache.schemaVersion
            };
            try {
                if (window.localStorage) {
                    localStorage.setItem(fullKey, JSON.stringify(payload));
                }
            } catch (e) {}
            MemoryStorage.set(fullKey, payload);
            return true;
        },
        clear: function (key) {
            const fullKey = BSD_CONFIG.cache.key + key;
            try {
                if (window.localStorage) {
                    localStorage.removeItem(fullKey);
                }
            } catch (e) {}
            MemoryStorage.delete(fullKey);
        }
    };

    const HumanVerification = {
        isVerified: function () {
            const key = BSD_CONFIG.challenge.sessionKey;
            try {
                if (window.sessionStorage) {
                    const raw = sessionStorage.getItem(key);
                    if (!raw) return false;
                    const data = JSON.parse(raw);
                    if (data && data.verified === true && typeof data.expiresAt === 'number') {
                        if (Date.now() < data.expiresAt) return true;
                        sessionStorage.removeItem(key);
                    }
                }
            } catch (e) {}
            return false;
        },
        markVerified: function () {
            const key = BSD_CONFIG.challenge.sessionKey;
            const payload = {
                verified: true,
                verifiedAt: Date.now(),
                expiresAt: Date.now() + BSD_CONFIG.challenge.sessionTTL
            };
            try {
                if (window.sessionStorage) {
                    sessionStorage.setItem(key, JSON.stringify(payload));
                }
            } catch (e) {}
        }
    };

    async function fetchFilterSet() {
        const cacheResult = CacheController.get('ruleset');
        if (cacheResult.status === 'FRESH' && cacheResult.data) {
            return { data: cacheResult.data, source: 'FRESH_CACHE' };
        }

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = setTimeout(function () {
            if (controller) {
                try { controller.abort(); } catch (e) {}
            }
        }, BSD_CONFIG.github.timeout);

        try {
            const response = await fetch(BSD_CONFIG.github.url, {
                signal: controller ? controller.signal : undefined,
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('HTTP ' + response.status);

            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength, 10) > BSD_CONFIG.limits.maxPayloadSizeBytes) {
                throw new Error('Payload too large');
            }

            const rawText = await response.text();
            if (rawText.length > BSD_CONFIG.limits.maxPayloadSizeBytes) {
                throw new Error('Payload size limit');
            }

            const parsed = JSON.parse(rawText);
            const validated = validateSchema(parsed);
            if (!validated) throw new Error('Invalid filter schema');

            CacheController.set('ruleset', validated, BSD_CONFIG.cache.ttl);
            return { data: validated, source: 'NETWORK_FRESH' };
        } catch (e) {
            clearTimeout(timeoutId);
            debugLog('[BSD] GitHub fetch failed:', e && e.message ? e.message : e);
        }

        if (cacheResult.status === 'EXPIRED_VALID' && cacheResult.data) {
            return { data: cacheResult.data, source: 'EXPIRED_CACHE_FALLBACK' };
        }

        return {
            data: { version: 2, allowlist: [], knownBots: [], knownScrapers: [], suspiciousPatterns: [] },
            source: 'FAIL_OPEN_EMPTY'
        };
    }

    function collectAutomationSignals() {
        const signals = [];
        const nav = navigator;
        const win = window;

        try {
            if ('webdriver' in nav && nav.webdriver === true) {
                signals.push({ category: 'Automation', name: 'navigator.webdriver active', score: BSD_CONFIG.weights.automationEngine });
            }
        } catch (e) {}

        try {
            if ('domAutomation' in win || 'domAutomationController' in win) {
                signals.push({ category: 'Automation', name: 'DOM automation token', score: BSD_CONFIG.weights.automationWindow });
            }
        } catch (e) {}

        try {
            if ('callPhantom' in win || '_phantom' in win || '__nightwatch' in win) {
                signals.push({ category: 'Automation', name: 'Automation framework token', score: BSD_CONFIG.weights.automationWindow });
            }
        } catch (e) {}

        try {
            const ua = nav.userAgent || '';
            const chromeDesktop = /Chrome/i.test(ua) && !/Mobile/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua);
            if (chromeDesktop && nav.plugins && nav.plugins.length === 0) {
                signals.push({ category: 'Browser Anomaly', name: 'Chrome desktop empty plugins', score: BSD_CONFIG.weights.weakBrowserAnomaly });
            }
        } catch (e) {}

        try {
            if ('languages' in nav && Array.isArray(nav.languages) && nav.languages.length === 0) {
                signals.push({ category: 'Browser Anomaly', name: 'Empty navigator.languages', score: BSD_CONFIG.weights.weakBrowserAnomaly });
            }
        } catch (e) {}

        return signals;
    }

    function initBehaviorTracking(onAnomalyDetected) {
        let clickCount = 0;
        let windowStart = Date.now();

        const handleClick = function () {
            if (HumanVerification.isVerified()) return;
            const now = Date.now();
            if (now - windowStart < BSD_CONFIG.behavior.windowMs) {
                clickCount++;
                if (clickCount >= BSD_CONFIG.behavior.rapidClickThreshold) {
                    onAnomalyDetected({ category: 'Behavior', name: 'Rapid click interaction', score: BSD_CONFIG.weights.behaviorAnomaly });
                    clickCount = 0;
                    windowStart = now;
                }
            } else {
                clickCount = 1;
                windowStart = now;
            }
        };

        window.addEventListener('click', handleClick, { passive: true });
    }

    function showHumanVerification(summary) {
        if (!BSD_CONFIG.challenge.enabled || HumanVerification.isVerified() || challengeShown) return;

        challengeShown = true;
        const overlay = document.createElement('div');
        overlay.id = BSD_CONFIG.dom.prefix + 'gate';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.68);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font-family:Arial,sans-serif;padding:20px;box-sizing:border-box;';

        const card = document.createElement('div');
        card.style.cssText = 'width:min(420px,100%);background:#fff;color:#111;border-radius:14px;padding:28px 24px;box-sizing:border-box;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35);';

        const icon = document.createElement('div');
        icon.textContent = '✓';
        icon.style.cssText = 'width:54px;height:54px;line-height:54px;margin:0 auto 16px;border-radius:50%;background:#f1f3f5;font-size:28px;font-weight:bold;';

        const title = document.createElement('h2');
        title.textContent = BSD_CONFIG.challenge.title;
        title.style.cssText = 'margin:0 0 10px;font-size:24px;line-height:1.3;font-weight:700;';

        const text = document.createElement('p');
        text.textContent = BSD_CONFIG.challenge.text;
        text.style.cssText = 'margin:0 0 22px;font-size:15px;line-height:1.6;color:#555;';

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = BSD_CONFIG.challenge.button;
        button.style.cssText = 'width:100%;border:0;border-radius:9px;padding:13px 18px;background:#111;color:#fff;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .2s ease;';

        button.addEventListener('mouseenter', function () { button.style.opacity = '0.85'; });
        button.addEventListener('mouseleave', function () { button.style.opacity = '1'; });
        button.addEventListener('click', function () {
            HumanVerification.markVerified();
            overlay.remove();
            challengeShown = false;
            debugLog('[BSD] Human verification completed');
        });

        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(text);
        card.appendChild(button);
        overlay.appendChild(card);

        if (document.body) {
            document.body.appendChild(overlay);
        }
    }

    function evaluateDecisionMatrix(rawSignals, isAllowed, dataSource) {
        const categoryScores = {};
        const breakdown = [];

        rawSignals.forEach(function (sig) {
            if (!sig || typeof sig.category !== 'string' || typeof sig.score !== 'number') return;
            if (!categoryScores[sig.category]) categoryScores[sig.category] = 0;
            categoryScores[sig.category] += sig.score;
            breakdown.push(sig.category + ': ' + sig.name + ' (+' + sig.score + ')');
        });

        let totalScore = 0;
        const activeCategories = [];

        for (const cat in categoryScores) {
            if (!Object.prototype.hasOwnProperty.call(categoryScores, cat)) continue;
            const cap = BSD_CONFIG.categoryCaps[cat] !== undefined ? BSD_CONFIG.categoryCaps[cat] : 100;
            const capped = Math.min(categoryScores[cat], cap);
            if (capped > 0) {
                totalScore += capped;
                activeCategories.push(cat);
            }
        }

        if (isAllowed && BSD_CONFIG.allowlist.mode === 'protective') {
            totalScore = Math.max(0, totalScore - BSD_CONFIG.allowlist.discountPoints);
            breakdown.push('Protective allowlist discount applied');
        }

        const hasAutomation = activeCategories.indexOf('Automation') !== -1;
        const hasSignature = activeCategories.indexOf('Signature') !== -1;
        const independentStrongCategories = (hasAutomation ? 1 : 0) + (hasSignature ? 1 : 0);

        const highConfidence = totalScore >= BSD_CONFIG.thresholds.highRisk && independentStrongCategories >= BSD_CONFIG.thresholds.minHighRiskCategories;

        const summary = {
            totalScore: totalScore,
            categoryCount: activeCategories.length,
            activeCategories: activeCategories,
            strongCategories: independentStrongCategories,
            dataSource: dataSource,
            isAllowedUA: isAllowed,
            breakdown: breakdown
        };

        if (HumanVerification.isVerified()) return;

        if (highConfidence) {
            debugLog('[BSD] High confidence risk:', summary);
            showHumanVerification(summary);
            return;
        }

        if (totalScore >= BSD_CONFIG.thresholds.mediumRisk) {
            debugLog('[BSD] Medium risk:', summary);
            return;
        }

        debugLog('[BSD] Visitor passed:', summary);
    }

    async function runDetectionPipeline() {
        if (isInitialized) return;
        isInitialized = true;

        if (HumanVerification.isVerified()) {
            debugLog('[BSD] Existing human verification found');
            return;
        }

        try {
            const fetchResult = await fetchFilterSet();
            const ruleset = fetchResult.data;
            const ua = (navigator.userAgent || '').toLowerCase();
            const rawSignals = [];

            let isAllowed = false;
            if (ruleset.allowlist && ruleset.allowlist.length) {
                isAllowed = ruleset.allowlist.some(function (pattern) {
                    return pattern && ua.includes(pattern);
                });
            }

            for (const pattern of ruleset.knownScrapers) {
                if (pattern && ua.includes(pattern)) {
                    rawSignals.push({ category: 'Signature', name: 'Known scraper: ' + pattern, score: BSD_CONFIG.weights.knownScraper });
                    break;
                }
            }

            for (const pattern of ruleset.knownBots) {
                if (pattern && ua.includes(pattern)) {
                    rawSignals.push({ category: 'Signature', name: 'Known bot: ' + pattern, score: BSD_CONFIG.weights.knownBot });
                    break;
                }
            }

            for (const pattern of ruleset.suspiciousPatterns) {
                if (pattern && ua.includes(pattern)) {
                    rawSignals.push({ category: 'Signature', name: 'Suspicious UA: ' + pattern, score: BSD_CONFIG.weights.suspiciousUA });
                    break;
                }
            }

            const automationSignals = collectAutomationSignals();
            automationSignals.forEach(function (signal) { rawSignals.push(signal); });

            evaluateDecisionMatrix(rawSignals, isAllowed, fetchResult.source);

            initBehaviorTracking(function (dynamicSignal) {
                if (rawSignals.length >= 20) return;
                rawSignals.push(dynamicSignal);
                evaluateDecisionMatrix(rawSignals, isAllowed, fetchResult.source);
            });

        } catch (e) {
            debugLog('[BSD] Fail-open:', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runDetectionPipeline, { once: true });
    } else {
        runDetectionPipeline();
    }
})();
