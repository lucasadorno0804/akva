/**
 * AKVAPromo · HUD Gamer (Loot Board)
 * Foco em Games, Hardware e Periféricos.
 * Raridade por desconto, filtros por categoria/loja, busca tática e cupons como drops.
 * Inclui Radar Tático Dinâmico da Amazon (comissão ativa com tag de afiliado).
 */
(() => {
    'use strict';

    const K = window.AKVAKit;
    if (!K) return;
    const { DATA, $, $$, brl, escapeHTML, storeOf, atStore, discount, dealUrl, reducedMotion } = K;

    const AMAZON_TAG = DATA.stores?.amazon?.affiliateTag || 'abacatefrito7-20';
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

    /* ---------- Itens da vitrine ---------- */

    const deals = [...DATA.deals].sort((a, b) => discount(b) - discount(a));
    const itemsList = $('#items');
    itemsList.innerHTML = deals.map((deal) => {
        const store = storeOf(deal.store);
        const off = discount(deal);
        const tier = tierOf(off);
        const cat = DATA.categories?.[deal.category] || { name: 'Outros', icon: '📦' };
        const catShort = cat.name.split('&')[0].trim();

        return `
            <li class="item frame" data-store="${deal.store}" data-category="${deal.category || 'outros'}" data-tier="${tier}">
                <div class="frame-inner item-inner">
                    <div class="item-head">
                        <span class="rarity" data-tier="${tier}">${tierName[tier]}</span>
                        <div class="item-tags">
                            <span class="item-cat">${escapeHTML(cat.icon || '')} ${escapeHTML(catShort)}</span>
                            <span class="item-store">${escapeHTML(store.name)}</span>
                        </div>
                    </div>
                    <div class="item-media" data-fit="${deal.fit || 'contain'}">
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

    /* ---------- Card Radar Tático da Amazon (Dinâmico) ---------- */

    const radarCard = document.createElement('li');
    radarCard.className = 'item item--radar frame';
    radarCard.id = 'dynamic-radar-card';
    radarCard.dataset.store = 'amazon';
    radarCard.dataset.tier = '4';
    radarCard.innerHTML = `
        <div class="frame-inner item-inner radar-card-inner">
            <div class="item-head">
                <span class="rarity" data-tier="4">Radar Amazon</span>
                <div class="item-tags">
                    <span class="item-cat">⚡ Busca Direta</span>
                    <span class="item-store">Comissão Ativa</span>
                </div>
            </div>
            <div class="radar-visual" aria-hidden="true">
                <div class="radar-circle-outer">
                    <div class="radar-sweep"></div>
                </div>
            </div>
            <h3 class="item-title radar-title">Buscar "<span class="radar-term">Ofertas do Dia</span>" na Amazon</h3>
            <p class="radar-desc">
                Não encontrou na vitrine? Acesse o catálogo completo da Amazon com rastreador de ofertas e cupons ativado.
            </p>
            <a class="btn btn--red btn--block radar-cta" id="dynamic-radar-link" href="https://www.amazon.com.br/s?k=games+hardware&tag=${AMAZON_TAG}" target="_blank" rel="sponsored noopener">
                Ver Resultados na Amazon &gt;&gt;
            </a>
        </div>
    `;
    itemsList.append(radarCard);

    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'hud-empty frame';
    emptyMsg.innerHTML = '<strong>// NENHUM ITEM CATALOGADO NA VITRINE LOCAL</strong><p>Use o Radar Tático acima para pesquisar diretamente na Amazon com seu rastreador de ofertas ativo.</p>';
    emptyMsg.hidden = true;
    itemsList.after(emptyMsg);

    /* ---------- Drops de Cupons ---------- */

    const dropList = $('#drop-list');
    dropList.innerHTML = DATA.coupons.map((coupon) => {
        const code = escapeHTML(coupon.code);

        return `
            <li class="drop frame" data-store="${coupon.store}" data-category="${coupon.category || 'outros'}">
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

    // Abrir o drop com animação
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

    /* ---------- Filtros Combinados & Busca Dinâmica ---------- */

    const catTabs = $('#category-tabs');
    if (catTabs && DATA.categories) {
        catTabs.innerHTML = Object.entries(DATA.categories).map(([key, cat]) => `
            <button class="tab category-tab" type="button" data-category="${key}" aria-pressed="${key === 'all'}">
                ${cat.icon ? `${cat.icon} ` : ''}${escapeHTML(cat.name)}
            </button>
        `).join('');
    }

    const storeTabs = $('#tabs');
    if (storeTabs) {
        storeTabs.innerHTML = K.storeButtons('tab');
    }

    let activeCategory = 'all';
    let activeStore = 'all';
    let searchQuery = '';

    function updateFilters() {
        const q = searchQuery.trim();
        const qLower = q.toLowerCase();
        const regularItems = $$('#items .item:not(#dynamic-radar-card)');
        const drops = $$('#drop-list .drop');
        let visibleItems = 0;
        let visibleDrops = 0;

        regularItems.forEach((item) => {
            const store = item.dataset.store;
            const cat = item.dataset.category;
            const text = item.textContent.toLowerCase();

            const matchCat = activeCategory === 'all' || cat === activeCategory;
            const matchStore = activeStore === 'all' || store === activeStore;
            const matchQuery = !qLower || text.includes(qLower);

            const show = matchCat && matchStore && matchQuery;
            item.hidden = !show;
            if (show) visibleItems++;
        });

        drops.forEach((drop) => {
            const store = drop.dataset.store;
            const cat = drop.dataset.category;
            const text = drop.textContent.toLowerCase();

            const matchCat = activeCategory === 'all' || cat === activeCategory;
            const matchStore = activeStore === 'all' || store === activeStore;
            const matchQuery = !qLower || text.includes(qLower);

            const show = matchCat && matchStore && matchQuery;
            drop.hidden = !show;
            if (show) visibleDrops++;
        });

        // Atualização Dinâmica do Card Radar Amazon
        const radarTerm = $('.radar-term', radarCard);
        const radarLink = $('#dynamic-radar-link', radarCard);
        const radarTitle = $('.radar-title', radarCard);

        if (q) {
            radarCard.hidden = false;
            if (radarTerm) radarTerm.textContent = q;
            const amazonSearchUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(q)}&tag=${AMAZON_TAG}`;
            if (radarLink) {
                radarLink.href = amazonSearchUrl;
                radarLink.textContent = `Ver "${q}" na Amazon >>`;
            }
            if (radarTitle) {
                radarTitle.innerHTML = `Buscar "<span class="radar-term">${escapeHTML(q)}</span>" na Amazon`;
            }
        } else {
            // Sem busca: radar mostra ofertas gerais da categoria selecionada
            const defaultTerms = {
                all: 'Games e Hardware',
                games: 'PlayStation, Xbox e Nintendo',
                hardware: 'Placas de Vídeo e Processadores',
                outros: 'Periféricos Gamer'
            };
            const currentTerm = defaultTerms[activeCategory] || 'Ofertas do Dia';
            if (radarTerm) radarTerm.textContent = currentTerm;
            if (radarLink) {
                radarLink.href = `https://www.amazon.com.br/s?k=${encodeURIComponent(currentTerm)}&tag=${AMAZON_TAG}`;
                radarLink.textContent = `Ver ${currentTerm} na Amazon >>`;
            }
            if (radarTitle) {
                radarTitle.innerHTML = `Buscar "<span class="radar-term">${escapeHTML(currentTerm)}</span>" na Amazon`;
            }
            // Ocultar se o filtro de loja estiver em outra que não seja amazon ou all
            radarCard.hidden = !(activeStore === 'all' || activeStore === 'amazon');
        }

        emptyMsg.hidden = visibleItems > 0 || !radarCard.hidden;
        K.announce(`${visibleItems} itens e ${visibleDrops} drops encontrados.`);
    }

    if (catTabs) {
        catTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.category-tab');
            if (!btn) return;
            activeCategory = btn.dataset.category;
            $$('.category-tab', catTabs).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
            updateFilters();
        });
    }

    if (storeTabs) {
        storeTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab');
            if (!btn) return;
            activeStore = btn.dataset.store;
            $$('.tab', storeTabs).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
            updateFilters();
        });
    }

    const searchInput = $('#hud-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            updateFilters();
        });
    }

    const searchForm = $('#hud-search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            const val = searchInput?.value.trim();
            if (!val) {
                e.preventDefault();
                searchInput?.focus();
            }
        });
    }

    K.enableCopy();
})();
