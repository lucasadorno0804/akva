/**
 * AKVAPromo · protótipo HUD gamer
 * Raridade pelo desconto (comum, raro, épico, lendário), barra de desconto e
 * cupons como drops que revelam o código. Dados de assets/akva-data.js.
 */
(() => {
    'use strict';

    const K = window.AKVAKit;
    if (!K) return;
    const { DATA, $, $$, brl, escapeHTML, storeOf, atStore, discount, dealUrl, reducedMotion } = K;

    const tierOf = (off) => (off >= 50 ? 4 : off >= 35 ? 3 : off >= 20 ? 2 : 1);
    const tierName = ['', 'Comum', 'Raro', 'Épico', 'Lendário'];

    /* ---------- Placar ---------- */

    const offs = DATA.deals.map(discount);
    const legendary = offs.filter((off) => tierOf(off) === 4).length;
    $('#stats').innerHTML = `
        <div><dt>Itens</dt><dd>${DATA.deals.length}</dd></div>
        <div><dt>Drops</dt><dd>${DATA.coupons.length}</dd></div>
        <div><dt>Maior desconto</dt><dd>−${Math.max(...offs)}%</dd></div>
        <div><dt>Lendários</dt><dd>${legendary}</dd></div>`;

    /* ---------- Itens, do mais raro ---------- */

    const deals = [...DATA.deals].sort((a, b) => discount(b) - discount(a));
    $('#items').innerHTML = deals.map((deal) => {
        const store = storeOf(deal.store);
        const off = discount(deal);
        const tier = tierOf(off);
        return `
            <li class="item frame" data-store="${deal.store}" data-tier="${tier}">
                <div class="frame-inner item-inner">
                    <div class="item-head">
                        <span class="rarity" data-tier="${tier}">${tierName[tier]}</span>
                        <span class="item-store">${escapeHTML(store.name)}</span>
                    </div>
                    <div class="item-media" data-fit="${deal.fit}">
                        <img src="${escapeHTML(deal.image)}" alt="" width="720" height="450" loading="lazy" decoding="async">
                    </div>
                    <h3 class="item-title">${escapeHTML(deal.title)}</h3>
                    <div class="dmg" aria-hidden="true">
                        <span>Desconto</span>
                        <span class="dmg-bar"><span style="--v: ${off}%"></span></span>
                        <span class="dmg-val">−${off}%</span>
                    </div>
                    <p class="item-price">
                        <strong>${brl.format(deal.price)}</strong>
                        <s><span class="sr-only">antes: </span>${brl.format(deal.was)}</s>
                        <span class="sr-only">, ${off}% de desconto</span>
                    </p>
                    ${deal.coupon ? `<p class="item-coupon">Com o cupom ${escapeHTML(deal.coupon.code)}: ${brl.format(deal.coupon.price)}</p>` : ''}
                    <a class="btn btn--red btn--block" href="${escapeHTML(dealUrl(deal))}" target="_blank" rel="sponsored noopener"
                        aria-label="Pegar oferta ${escapeHTML(atStore(store))}">Pegar oferta</a>
                </div>
            </li>`;
    }).join('');

    /* ---------- Drops ---------- */

    $('#drop-list').innerHTML = DATA.coupons.map((coupon) => {
        const code = escapeHTML(coupon.code);
        return `
            <li class="drop frame" data-store="${coupon.store}">
                <div class="frame-inner drop-inner">
                    <div class="drop-head">
                        <span>${escapeHTML(storeOf(coupon.store).name)}</span>
                        <span>até ${escapeHTML(coupon.until)}</span>
                    </div>
                    <p class="drop-value">${escapeHTML(coupon.value)}</p>
                    <p class="drop-cond">${escapeHTML(coupon.condition)}</p>
                    <div class="drop-code">
                        <span class="drop-mask" aria-hidden="true">••••••</span>
                        <span class="drop-reveal" hidden>${code}</span>
                    </div>
                    <div class="drop-actions">
                        <button class="btn btn--red open-drop" type="button">Abrir drop</button>
                        <button class="btn btn--ghost copy" type="button" data-code="${code}" aria-label="Copiar o código ${code}" hidden>
                            <span class="copy-idle">Copiar</span><span class="copy-done" aria-hidden="true">Copiado</span>
                        </button>
                    </div>
                    <p class="drop-meta">Testado ${escapeHTML(coupon.tested)}</p>
                </div>
            </li>`;
    }).join('');

    // Abrir o drop: o código aparece numa varredura da esquerda para a direita
    document.addEventListener('click', (event) => {
        const opener = event.target.closest('.open-drop');
        if (!opener) return;
        const drop = opener.closest('.drop');
        const reveal = $('.drop-reveal', drop);
        $('.drop-mask', drop).hidden = true;
        reveal.hidden = false;
        drop.classList.add('is-open');
        if (!reducedMotion.matches) {
            reveal.animate(
                [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
                { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
            );
        }
        const copy = $('.copy', drop);
        opener.hidden = true;
        copy.hidden = false;
        copy.focus();
        K.announce(`Código revelado: ${reveal.textContent}.`);
    });

    /* ---------- Filtro e cópia ---------- */

    const tabs = $('#tabs');
    tabs.innerHTML = K.storeButtons('tab');
    K.enableStoreFilter({
        buttons: $$('.tab', tabs),
        items: () => $$('.item, .drop'),
    });
    K.enableCopy();
})();
