/**
 * AKVAPromo · protótipo Neo-brutalista
 * Monta ofertas e cupons a partir de assets/akva-data.js, com filtro por loja.
 */
(() => {
    'use strict';

    const K = window.AKVAKit;
    if (!K) return;
    const { DATA, $, $$, brl, escapeHTML, storeOf, atStore, discount, dealUrl } = K;

    $('#deals').innerHTML = DATA.deals.map((deal) => {
        const store = storeOf(deal.store);
        return `
            <li class="deal box" data-store="${deal.store}">
                <p class="deal-store">${escapeHTML(store.name)} · ${escapeHTML(deal.checked)}</p>
                <div class="deal-media" data-fit="${deal.fit}">
                    <img src="${escapeHTML(deal.image)}" alt="" width="720" height="540" loading="lazy" decoding="async">
                </div>
                <span class="deal-off" aria-hidden="true">−${discount(deal)}%</span>
                <div class="deal-body">
                    <h3 class="deal-title">${escapeHTML(deal.title)}</h3>
                    <p class="deal-price">
                        <strong>${brl.format(deal.price)}</strong>
                        <s><span class="sr-only">antes: </span>${brl.format(deal.was)}</s>
                        <span class="sr-only">, ${discount(deal)}% de desconto</span>
                    </p>
                    ${deal.coupon ? `<p class="deal-coupon">Com o cupom <code>${escapeHTML(deal.coupon.code)}</code>: ${brl.format(deal.coupon.price)}</p>` : ''}
                    <a class="btn btn--red btn--block" href="${escapeHTML(dealUrl(deal))}" target="_blank" rel="sponsored noopener">Ver ${escapeHTML(atStore(store))} →</a>
                </div>
            </li>`;
    }).join('');

    $('#coupons').innerHTML = DATA.coupons.map((coupon) => {
        const code = escapeHTML(coupon.code);
        return `
            <li class="coupon box" data-store="${coupon.store}">
                <p class="coupon-store">${escapeHTML(storeOf(coupon.store).name)}</p>
                <p class="coupon-value">${escapeHTML(coupon.value)}</p>
                <p>${escapeHTML(coupon.condition)}</p>
                <div class="coupon-row">
                    <span class="coupon-code">${code}</span>
                    <button class="btn btn--plain copy" type="button" data-code="${code}" aria-label="Copiar o código ${code}">
                        <span class="copy-idle">Copiar</span><span class="copy-done" aria-hidden="true">Copiado!</span>
                    </button>
                </div>
                <p class="coupon-meta">Válido até ${escapeHTML(coupon.until)} · testado ${escapeHTML(coupon.tested)}</p>
            </li>`;
    }).join('');

    const filters = $('#filters');
    filters.innerHTML = K.storeButtons('pill');
    K.enableStoreFilter({
        buttons: $$('.pill', filters),
        items: () => $$('.deal, .coupon'),
    });
    K.enableCopy();
})();
