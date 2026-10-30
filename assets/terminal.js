/**
 * AKVAPromo · protótipo Terminal de preços
 * Tabela ordenável, índices por loja (que também filtram), gráfico de 90 dias
 * da oferta selecionada e tabela de cupons, a partir de assets/akva-data.js.
 * O histórico de preços é ilustrativo: gerado de forma determinística a partir
 * do id de cada oferta, até existir um histórico real.
 */
(() => {
    'use strict';

    const DATA = window.AKVA;
    if (!DATA) return;

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const brlWhole = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
    const normalize = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const storeOf = (id) => DATA.stores[id];
    const atStore = (store) => `n${store.article} ${store.name}`;
    const percent = (fraction) => `${Math.round(fraction * 100)}%`;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    const DAYS = 90;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const dateAt = (index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (DAYS - 1 - index));
        return date;
    };
    const dayMonth = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const dayLabel = (index) => (index === DAYS - 1 ? 'hoje' : dayMonth(dateAt(index)));
    const onDay = (index) => (index === DAYS - 1 ? 'hoje' : `em ${dayMonth(dateAt(index))}`);

    const announcer = $('#announcer');
    function announce(message) {
        announcer.textContent = '';
        requestAnimationFrame(() => { announcer.textContent = message; });
    }

    /* ---------- Histórico ilustrativo ---------- */

    // Gerador pseudoaleatório com semente (FNV-1a + mulberry32): o mesmo id gera sempre o mesmo histórico
    function seeded(text) {
        let state = 2166136261;
        for (const char of text) {
            state ^= char.charCodeAt(0);
            state = Math.imul(state, 16777619);
        }
        return () => {
            state = (state + 0x6D2B79F5) | 0;
            let t = Math.imul(state ^ (state >>> 15), 1 | state);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Oscila em torno do preço de referência, tem uma promoção no meio do período
    // e cai até o preço de hoje nos últimos dias
    function buildHistory(deal) {
        const random = seeded(deal.id);
        const reference = deal.was;
        const discount = 1 - deal.price / deal.was;
        const dipStart = 25 + Math.floor(random() * 35);
        const dipLength = 3 + Math.floor(random() * 5);
        const dipDepth = discount * (0.55 + random() * 0.6);
        const fallDays = 2 + Math.floor(random() * 3);

        const values = [];
        let level = reference * (0.97 + random() * 0.05);
        for (let i = 0; i < DAYS; i += 1) {
            level += (reference - level) * 0.1 + (random() - 0.5) * reference * 0.014;
            const inDip = i >= dipStart && i < dipStart + dipLength;
            values.push(inDip ? reference * (1 - dipDepth) * (1 + (random() - 0.5) * 0.01) : level);
        }

        const fallFrom = DAYS - 1 - fallDays;
        for (let k = 1; k <= fallDays; k += 1) {
            values[fallFrom + k] = values[fallFrom] + (deal.price - values[fallFrom]) * (k / fallDays);
        }
        return values.map((value) => Math.round(value * 100) / 100);
    }

    const deals = DATA.deals.map((deal) => {
        const history = buildHistory(deal);
        let minIndex = 0;
        let maxIndex = 0;
        let sum = 0;
        history.forEach((value, i) => {
            if (value < history[minIndex]) minIndex = i;
            if (value > history[maxIndex]) maxIndex = i;
            sum += value;
        });
        // Empate com o preço de hoje conta como hoje
        if (history[DAYS - 1] <= history[minIndex] + 0.005) minIndex = DAYS - 1;
        const store = storeOf(deal.store);
        return {
            ...deal,
            history,
            minIndex,
            maxIndex,
            average: sum / DAYS,
            off: 1 - deal.price / deal.was,
            aboveMin: deal.price - history[minIndex],
            search: normalize(`${store.name} ${deal.title} ${deal.coupon ? deal.coupon.code : ''}`),
        };
    });
    const dealById = new Map(deals.map((deal) => [deal.id, deal]));

    /* ---------- Estado ---------- */

    const state = {
        store: 'all',
        words: [],
        sort: { key: 'off', direction: 'desc' },
        selected: null,
    };

    const matches = (item) =>
        (state.store === 'all' || item.store === state.store)
        && state.words.every((word) => item.search.includes(word));

    const sorters = {
        title: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
        price: (a, b) => a.price - b.price,
        off: (a, b) => a.off - b.off,
        low: (a, b) => a.aboveMin / a.price - b.aboveMin / b.price,
    };
    const defaultDirection = { title: 'asc', price: 'asc', off: 'desc', low: 'asc' };

    function visibleDeals() {
        const list = deals.filter(matches);
        const compare = sorters[state.sort.key];
        list.sort((a, b) => (state.sort.direction === 'asc' ? compare(a, b) : compare(b, a)));
        return list;
    }

    /* ---------- Índices por loja ---------- */

    const indices = $('#indices');

    function renderIndices() {
        const ids = ['all', ...Object.keys(DATA.stores)];
        indices.innerHTML = ids.map((id) => {
            const list = id === 'all' ? deals : deals.filter((deal) => deal.store === id);
            const coupons = id === 'all' ? DATA.coupons : DATA.coupons.filter((coupon) => coupon.store === id);
            const average = list.reduce((sum, deal) => sum + deal.off, 0) / (list.length || 1);
            const name = id === 'all' ? 'Todas as lojas' : storeOf(id).name;
            return `
                <button class="index" type="button" data-store="${id}" aria-pressed="${id === state.store}">
                    <span class="index-name">${escapeHTML(name)}</span>
                    <span class="index-nums">
                        <span><b>${list.length}</b> ofertas · <b>${coupons.length}</b> cupons</span>
                        <span>desc. médio <b class="down">−${percent(average)}</b></span>
                    </span>
                </button>`;
        }).join('');
    }

    indices.addEventListener('click', (event) => {
        const button = event.target.closest('.index');
        if (!button) return;
        state.store = button.dataset.store;
        $$('.index', indices).forEach((el) => el.setAttribute('aria-pressed', String(el === button)));
        renderTables();
    });

    /* ---------- Minigráfico ---------- */

    function sparkSVG(deal) {
        const width = 100;
        const height = 28;
        const pad = 3;
        const values = deal.history;
        const low = Math.min(...values);
        const high = Math.max(...values);
        const x = (i) => pad + (i / (values.length - 1)) * (width - pad * 2);
        const y = (value) => pad + (1 - (value - low) / (high - low || 1)) * (height - pad * 2);
        const points = values.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
        const last = values.length - 1;
        return `<svg class="spark" viewBox="0 0 ${width} ${height}" aria-hidden="true">
            <polyline class="s-line" points="${points}"/>
            <circle class="s-dot" cx="${x(last).toFixed(1)}" cy="${y(values[last]).toFixed(1)}" r="2.75"/>
        </svg>`;
    }

    /* ---------- Tabela de ofertas ---------- */

    const dealsBody = $('#deals-body');
    const dealsEmpty = $('#deals-empty');
    const dealsMeta = $('#deals-meta');

    function rowHTML(deal) {
        const store = storeOf(deal.store);
        const atLow = deal.minIndex === DAYS - 1;
        const selected = deal.id === state.selected;
        return `
            <tr data-id="${deal.id}"${selected ? ' data-selected' : ''}>
                <td>
                    <button class="row-pick" type="button"${selected ? ' aria-current="true"' : ''}>
                        <span class="row-title">${escapeHTML(deal.title)}</span>
                        <span class="row-store">${escapeHTML(store.name)} · ${escapeHTML(deal.checked)}</span>
                    </button>
                </td>
                <td class="num">${brl.format(deal.price)}</td>
                <td class="num down">−${percent(deal.off)}<span class="sr-only"> de desconto</span></td>
                <td class="num col-low">${atLow
                    ? '<span class="low-tag">Mínimo</span>'
                    : `<span class="muted">+${brlWhole.format(deal.aboveMin)}</span>`}</td>
                <td class="col-spark">${sparkSVG(deal)}</td>
            </tr>`;
    }

    function renderDeals() {
        const list = visibleDeals();
        if (list.length && !list.some((deal) => deal.id === state.selected)) state.selected = list[0].id;
        dealsBody.innerHTML = list.map(rowHTML).join('');
        dealsEmpty.hidden = list.length > 0;
        dealsMeta.textContent = `${list.length} de ${deals.length}`;
        if (list.length) renderDetail(dealById.get(state.selected));
    }

    function select(id, { focus = false, reveal = false } = {}) {
        if (!dealById.has(id)) return;
        state.selected = id;
        $$('tr[data-id]', dealsBody).forEach((row) => {
            const isSelected = row.dataset.id === id;
            row.toggleAttribute('data-selected', isSelected);
            const pick = $('.row-pick', row);
            if (isSelected) pick.setAttribute('aria-current', 'true');
            else pick.removeAttribute('aria-current');
            if (isSelected && focus) pick.focus();
        });
        renderDetail(dealById.get(id));
        // Em telas estreitas o painel fica acima da tabela: leva até ele
        if (reveal && matchMedia('(max-width: 1099px)').matches) {
            $('.detail').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
        }
    }

    dealsBody.addEventListener('click', (event) => {
        const row = event.target.closest('tr[data-id]');
        if (row) select(row.dataset.id, { reveal: true });
    });

    // Setas para cima e para baixo trocam de oferta, como num terminal
    dealsBody.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        const rows = $$('tr[data-id]', dealsBody);
        const current = rows.findIndex((row) => row.dataset.id === state.selected);
        const next = rows[clamp(current + (event.key === 'ArrowDown' ? 1 : -1), 0, rows.length - 1)];
        if (!next) return;
        event.preventDefault();
        select(next.dataset.id, { focus: true });
    });

    // Ordenação pelos cabeçalhos
    $$('.deals-grid th[data-key] button').forEach((button) => {
        button.addEventListener('click', () => {
            const key = button.parentElement.dataset.key;
            const direction = state.sort.key === key
                ? (state.sort.direction === 'asc' ? 'desc' : 'asc')
                : defaultDirection[key];
            state.sort = { key, direction };
            $$('.deals-grid th[data-key]').forEach((th) => {
                th.setAttribute('aria-sort', th.dataset.key === key ? (direction === 'asc' ? 'ascending' : 'descending') : 'none');
            });
            renderDeals();
        });
    });

    /* ---------- Detalhe e gráfico ---------- */

    const detail = $('#detail');
    let chart = null;

    function niceTicks(low, high, count) {
        const span = high - low || high * 0.1;
        const raw = span / (count - 1);
        const magnitude = 10 ** Math.floor(Math.log10(raw));
        const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
        const start = Math.floor(low / step) * step;
        const end = Math.ceil(high / step) * step;
        const ticks = [];
        for (let t = start; t <= end + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
        return ticks;
    }

    function renderDetail(deal) {
        const store = storeOf(deal.store);
        const min = deal.history[deal.minIndex];
        const max = deal.history[deal.maxIndex];
        const atLow = deal.minIndex === DAYS - 1;
        const verdict = atLow
            ? '<p class="verdict is-low">Menor preço dos últimos 90 dias</p>'
            : `<p class="verdict">Já esteve ${brl.format(deal.aboveMin)} mais barato, em ${dayMonth(dateAt(deal.minIndex))}</p>`;

        detail.innerHTML = `
            <header class="detail-head">
                <div class="detail-thumb" data-fit="${deal.fit}"><img src="${escapeHTML(deal.image)}" alt="" width="144" height="144" decoding="async"></div>
                <div>
                    <p class="detail-store">${escapeHTML(store.name)} · verificado ${escapeHTML(deal.checked)}</p>
                    <h2 class="detail-title" id="detail-title">${escapeHTML(deal.title)}</h2>
                </div>
            </header>
            <div class="quote">
                <p class="quote-price">${brl.format(deal.price)}</p>
                <p class="quote-change"><span class="down">▼ ${percent(deal.off)}</span> vs. ${brl.format(deal.was)} de referência</p>
            </div>
            ${verdict}
            <figure class="chart">
                <figcaption class="chart-title">Preço nos últimos 90 dias</figcaption>
                <div class="chart-box" id="chart-box" tabindex="0" role="group"
                    aria-label="Gráfico do preço nos últimos 90 dias. Use as setas para percorrer os dias."
                    aria-describedby="chart-summary">
                    <svg id="chart-svg" aria-hidden="true"></svg>
                    <div class="chart-tip" id="chart-tip" aria-live="polite" hidden><strong></strong><span></span></div>
                </div>
                <p class="sr-only" id="chart-summary">Mínimo de ${brl.format(min)} ${onDay(deal.minIndex)}, máximo de ${brl.format(max)} ${onDay(deal.maxIndex)} e média de ${brl.format(deal.average)}.</p>
            </figure>
            <dl class="stats">
                <div><dt>Mín. 90d</dt><dd>${brl.format(min)}<small>${dayLabel(deal.minIndex)}</small></dd></div>
                <div><dt>Máx. 90d</dt><dd>${brl.format(max)}<small>${dayLabel(deal.maxIndex)}</small></dd></div>
                <div><dt>Média 90d</dt><dd>${brl.format(deal.average)}<small>&nbsp;</small></dd></div>
            </dl>
            ${deal.coupon ? `
                <div class="combo">
                    <p>Com o cupom <span class="code">${escapeHTML(deal.coupon.code)}</span>: <strong>${brl.format(deal.coupon.price)}</strong></p>
                    <button class="btn btn--ghost copy" type="button" data-code="${escapeHTML(deal.coupon.code)}" aria-label="Copiar o código ${escapeHTML(deal.coupon.code)}">
                        <span class="copy-idle">Copiar</span><span class="copy-done" aria-hidden="true">Copiado</span>
                    </button>
                </div>` : ''}
            <a class="btn btn--red btn--block" href="${escapeHTML(deal.url || store.url)}" target="_blank" rel="sponsored noopener">Ver ${escapeHTML(atStore(store))}</a>
            <details class="chart-data">
                <summary>Ver os dados do gráfico</summary>
                <div class="chart-data-scroll">
                    <table>
                        <thead><tr><th scope="col">Dia</th><th scope="col">Preço</th></tr></thead>
                        <tbody>${deal.history.map((value, i) => ({ value, i })).reverse()
                            .map(({ value, i }) => `<tr><td>${dayLabel(i)}</td><td>${brl.format(value)}</td></tr>`).join('')}</tbody>
                    </table>
                </div>
            </details>`;

        chart = { deal, index: DAYS - 1 };
        drawChart();
        bindChart();
    }

    function drawChart() {
        if (!chart) return;
        const box = $('#chart-box');
        const svg = $('#chart-svg');
        const width = box.clientWidth;
        const height = box.clientHeight;
        if (!width || !height) return;

        const pad = { left: 56, right: 12, top: 18, bottom: 24 };
        const values = chart.deal.history;
        const last = values.length - 1;
        const ticks = niceTicks(Math.min(...values), Math.max(...values), 4);
        const bottomValue = ticks[0];
        const topValue = ticks[ticks.length - 1];
        const x = (i) => pad.left + (i / last) * (width - pad.left - pad.right);
        const y = (value) => pad.top + (1 - (value - bottomValue) / (topValue - bottomValue)) * (height - pad.top - pad.bottom);
        const baseline = height - pad.bottom;

        const line = values.map((value, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(value).toFixed(1)}`).join('');
        const area = `${line}L${x(last).toFixed(1)},${baseline}L${x(0).toFixed(1)},${baseline}Z`;

        const grid = ticks.map((tick) => `
            <line class="c-grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}"/>
            <text class="c-label" x="${pad.left - 8}" y="${y(tick).toFixed(1)}" text-anchor="end" dominant-baseline="middle">${brlWhole.format(tick)}</text>`).join('');

        const xLabels = [
            { i: 0, anchor: 'start' },
            { i: Math.round(last / 2), anchor: 'middle' },
            { i: last, anchor: 'end' },
        ].map(({ i, anchor }) => `<text class="c-label" x="${x(i).toFixed(1)}" y="${height - 6}" text-anchor="${anchor}">${dayLabel(i)}</text>`).join('');

        // Rótulo seletivo: só o mínimo do período, quando ele não é hoje
        const { minIndex } = chart.deal;
        let minMark = '';
        if (minIndex !== last) {
            const mx = x(minIndex);
            const my = y(values[minIndex]);
            const labelX = clamp(mx, pad.left + 40, width - pad.right - 40);
            minMark = `
                <circle class="c-dot" cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="4"/>
                <text class="c-note" x="${labelX.toFixed(1)}" y="${(my + 18).toFixed(1)}" text-anchor="middle">mín. ${brlWhole.format(values[minIndex])}</text>`;
        }

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.innerHTML = `
            ${grid}
            <path class="c-area" d="${area}"/>
            <path class="c-line" d="${line}"/>
            ${minMark}
            <circle class="c-dot" cx="${x(last).toFixed(1)}" cy="${y(values[last]).toFixed(1)}" r="4.5"/>
            ${xLabels}
            <g class="c-hover">
                <line class="c-cross" id="c-cross" y1="${pad.top}" y2="${baseline}"/>
                <circle class="c-dot" id="c-cross-dot" r="4.5"/>
            </g>`;

        chart.x = x;
        chart.y = y;
        chart.pad = pad;
        chart.width = width;
        if (box.classList.contains('is-active')) showPoint(chart.index);
    }

    function showPoint(index) {
        const box = $('#chart-box');
        const tip = $('#chart-tip');
        const values = chart.deal.history;
        const i = clamp(index, 0, values.length - 1);
        chart.index = i;
        const cx = chart.x(i);
        const cy = chart.y(values[i]);
        const cross = $('#c-cross');
        cross.setAttribute('x1', cx.toFixed(1));
        cross.setAttribute('x2', cx.toFixed(1));
        const dot = $('#c-cross-dot');
        dot.setAttribute('cx', cx.toFixed(1));
        dot.setAttribute('cy', cy.toFixed(1));
        $('strong', tip).textContent = brl.format(values[i]);
        $('span', tip).textContent = dayLabel(i);
        tip.hidden = false;
        tip.style.left = `${clamp(cx, 52, chart.width - 52)}px`;
        box.classList.add('is-active');
    }

    function hidePoint() {
        $('#chart-box')?.classList.remove('is-active');
        const tip = $('#chart-tip');
        if (tip) tip.hidden = true;
    }

    function bindChart() {
        const box = $('#chart-box');
        // A cruz encontra o dia mais próximo do ponteiro: ninguém precisa mirar na linha
        box.addEventListener('pointermove', (event) => {
            const rect = box.getBoundingClientRect();
            const { left, right } = chart.pad;
            const ratio = (event.clientX - rect.left - left) / (rect.width - left - right);
            showPoint(Math.round(ratio * (DAYS - 1)));
        });
        box.addEventListener('pointerleave', () => {
            if (document.activeElement !== box) hidePoint();
        });
        box.addEventListener('focus', () => showPoint(chart.index));
        box.addEventListener('blur', hidePoint);
        box.addEventListener('keydown', (event) => {
            const steps = { ArrowLeft: -1, ArrowRight: 1, PageUp: -7, PageDown: 7 };
            if (event.key in steps) {
                event.preventDefault();
                showPoint(chart.index + steps[event.key]);
            } else if (event.key === 'Home' || event.key === 'End') {
                event.preventDefault();
                showPoint(event.key === 'Home' ? 0 : DAYS - 1);
            }
        });
    }

    new ResizeObserver(() => drawChart()).observe(detail);

    /* ---------- Tabela de cupons ---------- */

    const couponsBody = $('#coupons-body');
    const couponsEmpty = $('#coupons-empty');
    const couponsMeta = $('#coupons-meta');
    const coupons = DATA.coupons.map((coupon) => ({
        ...coupon,
        search: normalize(`${storeOf(coupon.store).name} ${coupon.value} ${coupon.condition} ${coupon.code}`),
    }));

    function renderCoupons() {
        const list = coupons.filter(matches);
        couponsBody.innerHTML = list.map((coupon) => {
            const code = escapeHTML(coupon.code);
            return `
                <tr>
                    <td><span class="code">${code}</span><span class="cell-sub">${escapeHTML(storeOf(coupon.store).name)}</span></td>
                    <td><strong>${escapeHTML(coupon.value)}</strong><span class="cell-sub">${escapeHTML(coupon.condition)}</span></td>
                    <td class="num col-valid">${escapeHTML(coupon.until)}</td>
                    <td class="col-tested muted">${escapeHTML(coupon.tested)}</td>
                    <td class="col-action">
                        <button class="btn btn--ghost copy" type="button" data-code="${code}" aria-label="Copiar o código ${code}">
                            <span class="copy-idle">Copiar</span><span class="copy-done" aria-hidden="true">Copiado</span>
                        </button>
                    </td>
                </tr>`;
        }).join('');
        couponsEmpty.hidden = list.length > 0;
        couponsMeta.textContent = `${list.length} de ${coupons.length}`;
    }

    function renderTables() {
        renderDeals();
        renderCoupons();
    }

    /* ---------- Busca ---------- */

    const searchForm = $('#search');
    const searchInput = $('#q');

    searchInput.addEventListener('input', () => {
        state.words = normalize(searchInput.value).split(/\s+/).filter(Boolean);
        renderTables();
    });

    searchInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !searchInput.value) return;
        searchInput.value = '';
        state.words = [];
        renderTables();
    });

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        $('#ofertas').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });

    // "/" leva para a busca de qualquer lugar da página
    document.addEventListener('keydown', (event) => {
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
        event.preventDefault();
        searchInput.focus();
    });

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
        const code = button.dataset.code;
        if (await writeClipboard(code)) {
            navigator.vibrate?.(10);
            button.classList.add('is-copied');
            announce(`Código ${code} copiado.`);
            clearTimeout(copyTimers.get(button));
            copyTimers.set(button, setTimeout(() => button.classList.remove('is-copied'), 2000));
        } else {
            announce(`Não deu para copiar sozinho. O código é ${code}.`);
        }
    });

    /* ---------- Relógio ---------- */

    const clock = $('#clock');
    function tick() {
        const now = new Date();
        clock.textContent = `${dayMonth(now)} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        clock.dateTime = now.toISOString();
    }
    tick();
    setInterval(tick, 30000);

    /* ---------- Início ---------- */

    renderIndices();
    renderTables();
})();
