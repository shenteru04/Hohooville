(function () {
    'use strict';

    const FIELD_RULES = [
        { pattern: /(^|[-_])(phone|mobile|contact)([-_]|$)/i, sanitize: value => value.replace(/[^0-9]/g, ''), maxLength: 11 },
        { pattern: /(^|[-_])(zip|postal)([-_]|$)/i, sanitize: value => value.replace(/[^0-9]/g, ''), maxLength: 4 },
        { pattern: /(^|[-_])(first|middle|last|extension|maiden)[-_ ]?name$/i, sanitize: value => value.replace(/[^\p{L}\p{M}\s.'-]/gu, '').replace(/\s{2,}/g, ' ') },
        { pattern: /(^|[-_])(username|user[-_]?name)$/i, sanitize: value => value.replace(/[^A-Za-z0-9_]/g, '') },
        { pattern: /(^|[-_])(ctpr|nttc|birth[-_ ]?certificate|student|school|uli)[-_ ]?(no|number)?$/i, sanitize: value => value.replace(/[^A-Za-z0-9 ./-]/g, '') },
        { pattern: /(^|[-_])(email|e[-_]?mail)$/i, sanitize: value => value.replace(/[\s<>()[\]{}"']/g, '') }
    ];

    function isExcluded(input) {
        const type = String(input.type || '').toLowerCase();
        const id = String(input.id || '').toLowerCase();
        const name = String(input.name || '').toLowerCase();
        return type === 'hidden' || type === 'file' || type === 'password' || type === 'date' || type === 'time' || type === 'number' || type === 'checkbox' || type === 'radio' || type === 'search'
            || /description|note|comment|message|content|body|address|street|house|district|barangay|city|province|region|url|link|facebook|search/.test(`${id} ${name}`);
    }

    function getRule(input) {
        const key = [String(input.id || ''), String(input.name || '')]
            .join(' ')
            .toLowerCase()
            .replace(/[-_\s]/g, '');

        if (/(phone|mobile|contact)/.test(key)) return FIELD_RULES[0];
        if (/(zip|postal)/.test(key)) return FIELD_RULES[1];
        if (/(firstname|middlename|lastname|extensionname|maidenname)/.test(key)) return FIELD_RULES[2];
        if (/username/.test(key)) return FIELD_RULES[3];
        if (/(ctpr|nttc|birthcertificate|student|school|uli)/.test(key)) return FIELD_RULES[4];
        if (/email/.test(key)) return FIELD_RULES[5];
        return null;
    }

    function applySanitizer(input) {
        if (!input || isExcluded(input) || input.dataset.sanitizerBound === 'true') return;
        const rule = getRule(input);
        if (!rule) return;
        input.dataset.sanitizerBound = 'true';
        input.addEventListener('input', () => {
            const oldValue = input.value;
            let value = rule.sanitize(oldValue);
            if (rule.maxLength) value = value.slice(0, rule.maxLength);
            if (value !== oldValue) {
                input.value = value;
                input.dispatchEvent(new Event('sanitized', { bubbles: true }));
            }
        });
        input.dispatchEvent(new Event('input', { bubbles: false }));
    }

    function initialize(root = document) {
        root.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], textarea').forEach(applySanitizer);
    }

    window.HohooVilleInputSanitation = { initialize };
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) initialize(node);
        }));
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initialize());
    else initialize();
})();
