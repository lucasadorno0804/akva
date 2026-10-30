/**
 * AKVAPromo · kit compartilhado dos protótipos (Black Friday, Conversa, HUD, Brutalista).
 * Formatação, cópia de código, anúncio para leitor de tela, filtro por loja e prazo dos cupons.
 * Depende de assets/akva-data.js (window.AKVA).
 */
window.AKVAKit = (() => {
    'use strict';

    const DATA = window.AKVA;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
    const storeOf = (id) => DATA.stores[id];
    const atStore = (store) => `n${store.article} ${store.name}`; // "na Amazon", "no Mercado Livre"
    const discount = (deal) => Math.round((1 - deal.price / deal.was) * 100);
    const dealUrl = (deal) => deal.url || storeOf(deal.store).url;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    // "3.719" e "07" separados, para preços com os centavos em destaque
    function priceParts(value) {
        const [whole, cents] = value.toFixed(2).split('.');
        return { whole: Number(whole).toLocaleString('pt-BR'), cents };
    }

    // Fim do dia de validade ("30/11" → 30/11 às 23:59:59), neste ano ou no próximo
    function couponDeadline(until) {
        const [day, month] = until.split('/').map(Number);
        const now = new Date();
        const end = new Date(now.getFullYear(), month - 1, day, 23, 59, 59);
        if (end < now) end.setFullYear(end.getFullYear() + 1);
        return end;
    }

    function announce(message) {
        const region = $('#announcer');
        if (!region) return;
        region.textContent = '';
        requestAnimationFrame(() => { region.textContent = message; });
    }

    async function writeClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Sem a API (arquivo local, navegador antigo): tenta o caminho clássico
        }
        const area = document.createElement('textarea');
        const focused = document.activeElement;
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.append(area);
        area.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch {
            ok = false;
        }
        area.remove();
        if (focused) focused.focus({ preventScroll: true });
        return ok;
    }

    // Botões .copy[data-code]: copiam, ganham .is-copied por 2 s e avisam o leitor de tela
    function enableCopy({ onCopied } = {}) {
        const timers = new WeakMap();
        document.addEventListener('click', async (event) => {
            const button = event.target.closest('.copy[data-code]');
            if (!button) return;
            const code = button.dataset.code;
            if (await writeClipboard(code)) {
                navigator.vibrate?.(10);
                button.classList.add('is-copied');
                announce(`Código ${code} copiado.`);
                if (onCopied) onCopied(button, code);
                clearTimeout(timers.get(button));
                timers.set(button, setTimeout(() => button.classList.remove('is-copied'), 2000));
            } else {
                announce(`Não deu para copiar sozinho. O código é ${code}.`);
            }
        });
    }

    // Botões [data-store] com aria-pressed escondem os itens [data-store] das outras lojas
    function enableStoreFilter({ buttons, items, onChange }) {
        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const store = button.dataset.store;
                buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.store === store)));
                const shown = [];
                items().forEach((el) => {
                    el.hidden = store !== 'all' && el.dataset.store !== store;
                    if (!el.hidden) shown.push(el);
                });
                if (onChange) onChange(store, shown);
            });
        });
    }

    // Botões de loja prontos: Todas + uma por loja
    function storeButtons(className) {
        return [['all', 'Todas'], ...Object.entries(DATA.stores).map(([id, store]) => [id, store.name])]
            .map(([id, name]) => `<button class="${className}" type="button" data-store="${id}" aria-pressed="${id === 'all'}">${escapeHTML(name)}</button>`)
            .join('');
    }

    return {
        DATA, $, $$, brl, escapeHTML, storeOf, atStore, discount, dealUrl, reducedMotion,
        priceParts, couponDeadline, announce, writeClipboard, enableCopy, enableStoreFilter, storeButtons,
    };
})();
