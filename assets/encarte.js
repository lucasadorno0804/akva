/**
 * AKVAPromo · protótipo Encarte
 * Monta o folheto a partir dos dados de exemplo (assets/akva-data.js):
 * oferta da capa, grade de ofertas, cupons para recortar e a faixa de cupons.
 */
(() => {
    'use strict';

    const DATA = window.AKVA;
    if (!DATA) return;

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
    const storeOf = (id) => DATA.stores[id];
    const atStore = (store) => `n${store.article} ${store.name}`; // "na Amazon", "no Mercado Livre"
    const discount = (deal) => Math.round((1 - deal.price / deal.was) * 100);

    const scissors = '<svg class="coupon-scissors" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>';

    // Preço de encarte: "R$" pequeno, inteiro grande e centavos no alto
    function priceHTML(value) {
        const [whole, cents] = value.toFixed(2).split('.');
        return `<span class="price-cur">R$</span><span class="price-int">${Number(whole).toLocaleString('pt-BR')}</span><span class="price-cents">,${cents}</span>`;
    }

    const announcer = $('#announcer');
    function announce(message) {
        announcer.textContent = '';
        requestAnimationFrame(() => { announcer.textContent = message; });
    }

    /* ---------- Edição: hoje até daqui a seis dias ---------- */

    const dayMonth = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const today = new Date();
    const lastDay = new Date(today);
    lastDay.setDate(today.getDate() + 6);
    const edition = $('#edition-range');
    edition.textContent = `${dayMonth(today)} a ${dayMonth(lastDay)}`;
    edition.dateTime = today.toISOString().slice(0, 10);

    /* ---------- Faixa de cupons ---------- */

    const tickerTrack = $('#ticker-track');
    const tickerItems = (duplicate) => DATA.coupons.map((coupon) => `
        <li${duplicate ? ' aria-hidden="true"' : ''}>
            <b>${escapeHTML(storeOf(coupon.store).name)}</b> ${escapeHTML(coupon.value)}
            <span class="ticker-code">${escapeHTML(coupon.code)}</span>
        </li>`).join('');
    // A lista aparece duas vezes para a volta ser contínua; a cópia fica fora do leitor de tela
    tickerTrack.innerHTML = tickerItems(false) + tickerItems(true);

    // Mesma velocidade qualquer que seja o tamanho da lista (~45 px/s)
    const setTickerSpeed = () => {
        tickerTrack.style.setProperty('--ticker-duration', `${Math.max(20, Math.round(tickerTrack.scrollWidth / 2 / 45))}s`);
    };
    setTickerSpeed();
    if (document.fonts) document.fonts.ready.then(setTickerSpeed);

    /* ---------- Capa ---------- */

    const cover = DATA.deals.find((deal) => deal.featured) || DATA.deals[0];
    const coverStore = storeOf(cover.store);
    $('#cover').innerHTML = `
        <div class="container cover-grid">
            <div class="cover-copy">
                <p class="cover-kicker">Oferta da capa</p>
                <h2 class="cover-title display" id="cover-title">${escapeHTML(cover.title)}</h2>
                ${cover.blurb ? `<p class="cover-blurb">${escapeHTML(cover.blurb)}</p>` : ''}
                <div class="cover-price">
                    <p class="was">De <s>${brl.format(cover.was)}</s> por<span class="sr-only">, ${discount(cover)}% de desconto</span></p>
                    <p class="tag tag--xl">${priceHTML(cover.price)}</p>
                    <p class="cover-meta">Oferta ${escapeHTML(atStore(coverStore))} · verificada ${escapeHTML(cover.checked)}</p>
                </div>
                <a class="btn btn--ink btn--xl" href="${escapeHTML(cover.url || coverStore.url)}" target="_blank" rel="sponsored noopener">Ver ${escapeHTML(atStore(coverStore))}</a>
            </div>
            <div class="cover-media">
                <img src="${escapeHTML(cover.image)}" alt="" width="720" height="720" decoding="async">
                <span class="burst burst--xl" aria-hidden="true">−${discount(cover)}%</span>
            </div>
        </div>`;

    /* ---------- Grade de ofertas ---------- */

    const flyer = $('#flyer');
    flyer.innerHTML = DATA.deals.filter((deal) => deal !== cover).map((deal) => {
        const store = storeOf(deal.store);
        return `
            <li class="cell" data-store="${deal.store}">
                <span class="burst" aria-hidden="true">−${discount(deal)}%</span>
                <div class="cell-media" data-fit="${deal.fit}">
                    <img src="${escapeHTML(deal.image)}" alt="" width="720" height="720" loading="lazy" decoding="async">
                </div>
                <p class="cell-store">${escapeHTML(store.name)}</p>
                <h3 class="cell-title">${escapeHTML(deal.title)}</h3>
                <p class="cell-was">De <s>${brl.format(deal.was)}</s> por<span class="sr-only">, ${discount(deal)}% de desconto</span></p>
                <p class="tag">${priceHTML(deal.price)}</p>
                ${deal.coupon ? `<p class="cell-coupon">Com o cupom <b>${escapeHTML(deal.coupon.code)}</b>: ${brl.format(deal.coupon.price)}</p>` : ''}
                <a class="cell-link" href="${escapeHTML(deal.url || store.url)}" target="_blank" rel="sponsored noopener">Ver ${escapeHTML(atStore(store))}</a>
            </li>`;
    }).join('');

    /* ---------- Cupons para recortar ---------- */

    const couponList = $('#coupons');
    couponList.innerHTML = DATA.coupons.map((coupon) => {
        const code = escapeHTML(coupon.code);
        return `
            <li class="coupon" data-store="${coupon.store}">
                ${scissors}
                <p class="coupon-store">${escapeHTML(storeOf(coupon.store).name)}</p>
                <p class="coupon-value display">${escapeHTML(coupon.value)}</p>
                <p class="coupon-cond">${escapeHTML(coupon.condition)}</p>
                <div class="coupon-code-row">
                    <span class="coupon-code">${code}</span>
                    <button class="btn btn--ink btn--sm copy" type="button" data-code="${code}" aria-label="Copiar o código ${code}">
                        <span class="copy-idle">Copiar</span>
                        <span class="copy-done" aria-hidden="true">Copiado!</span>
                    </button>
                </div>
                <p class="coupon-meta">Válido até ${escapeHTML(coupon.until)} · testado ${escapeHTML(coupon.tested)}</p>
                <span class="stamp" aria-hidden="true">Copiado</span>
            </li>`;
    }).join('');

    /* ---------- Filtro por loja ---------- */

    const aisles = $$('.aisle');
    const offersCount = $('#offers-count');

    function updateCount() {
        const visible = [...flyer.children].filter((el) => !el.hidden).length;
        offersCount.textContent = `${visible} ${visible === 1 ? 'oferta' : 'ofertas'} nesta edição`;
    }

    function filterBy(store) {
        aisles.forEach((aisle) => aisle.setAttribute('aria-pressed', String(aisle.dataset.store === store)));
        let order = 0;
        for (const el of [...flyer.children, ...couponList.children]) {
            const show = store === 'all' || el.dataset.store === store;
            el.hidden = !show;
            el.classList.remove('is-entering');
            if (!show) continue;
            void el.offsetWidth; // reinicia a entrada
            el.style.setProperty('--d', `${Math.min(order, 8) * 30}ms`);
            el.classList.add('is-entering');
            order += 1;
        }
        updateCount();
    }

    aisles.forEach((aisle) => aisle.addEventListener('click', () => filterBy(aisle.dataset.store)));
    updateCount();

    /* ---------- Copiar código ---------- */

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

    const copyTimers = new WeakMap();

    document.addEventListener('click', async (event) => {
        const button = event.target.closest('.copy');
        if (!button) return;
        const coupon = button.closest('.coupon');
        const code = button.dataset.code;

        if (await writeClipboard(code)) {
            // Carimbo, rótulo, vibração e anúncio no mesmo quadro
            navigator.vibrate?.(10);
            button.classList.add('is-copied');
            coupon.classList.remove('is-copied');
            void coupon.offsetWidth; // carimba de novo a cada cópia
            coupon.classList.add('is-copied');
            announce(`Código ${code} copiado.`);
            clearTimeout(copyTimers.get(button));
            copyTimers.set(button, setTimeout(() => button.classList.remove('is-copied'), 2000));
            return;
        }

        const range = document.createRange();
        range.selectNodeContents($('.coupon-code', coupon));
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        announce(`Não deu para copiar sozinho. O código ${code} está selecionado.`);
    });
})();
