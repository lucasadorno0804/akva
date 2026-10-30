/**
 * AKVAPromo · protótipo Black Friday
 * Contagem até a Black Friday (calculada: a sexta depois da quarta quinta-feira
 * de novembro), relógio em cada cupom até o fim da validade e ofertas ordenadas
 * pelo desconto. Dados de assets/akva-data.js, utilidades de assets/proto-kit.js.
 */
(() => {
    'use strict';

    const K = window.AKVAKit;
    if (!K) return;
    const { DATA, $, brl, escapeHTML, storeOf, atStore, discount, dealUrl } = K;

    const pad = (n) => String(n).padStart(2, '0');
    const dayMonth = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    /* ---------- Data da Black Friday ---------- */

    function blackFridayStart(year) {
        const first = new Date(year, 10, 1);
        const firstThursday = ((4 - first.getDay() + 7) % 7) + 1;
        return new Date(year, 10, firstThursday + 21 + 1, 0, 0, 0);
    }

    // Antes: conta até o começo. No dia: conta até o fim. Depois: a do ano que vem.
    function eventWindow(now) {
        let start = blackFridayStart(now.getFullYear());
        let end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        if (now >= end) {
            start = blackFridayStart(now.getFullYear() + 1);
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        }
        return { start, end, live: now >= start && now < end };
    }

    const units = {
        days: $('[data-unit="days"]'),
        hours: $('[data-unit="hours"]'),
        minutes: $('[data-unit="minutes"]'),
        seconds: $('[data-unit="seconds"]'),
    };
    const kicker = $('#hero-kicker');
    const heroSub = $('#hero-sub');
    let lastState = '';

    function updateHero(now) {
        const { start, end, live } = eventWindow(now);
        const target = live ? end : start;
        let rest = Math.max(0, Math.floor((target - now) / 1000));
        const days = Math.floor(rest / 86400);
        rest -= days * 86400;
        const hours = Math.floor(rest / 3600);
        rest -= hours * 3600;
        units.days.textContent = pad(days);
        units.hours.textContent = pad(hours);
        units.minutes.textContent = pad(Math.floor(rest / 60));
        units.seconds.textContent = pad(rest % 60);

        const state = `${live}-${start.getFullYear()}`;
        if (state === lastState) return;
        lastState = state;
        $('#event-year').textContent = start.getFullYear();
        kicker.textContent = live ? 'É hoje · acaba em' : 'Faltam';
        heroSub.textContent = live
            ? 'A Black Friday está valendo agora. Os cupons abaixo já foram testados.'
            : `para a Black Friday de ${dayMonth(start)}. As ofertas abaixo já estão valendo.`;
    }

    /* ---------- Fita ---------- */

    const tapeText = ['Black Friday', 'Esquenta AKVA', 'Cupons testados', 'Amazon', 'Mercado Livre', 'AliExpress'];
    const tapeItems = tapeText.map((text) => `<span>${escapeHTML(text)} ★</span>`).join('');
    $('#tape-track').innerHTML = tapeItems + tapeItems;

    /* ---------- Filtro ---------- */

    const filters = $('#filters');
    filters.innerHTML = K.storeButtons('chip');

    /* ---------- Cupons, do que acaba primeiro ---------- */

    const clockIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 4.75V8l2.25 1.5"/></svg>';
    const coupons = DATA.coupons
        .map((coupon) => ({ ...coupon, deadline: K.couponDeadline(coupon.until) }))
        .sort((a, b) => a.deadline - b.deadline);

    $('#coupons').innerHTML = coupons.map((coupon) => {
        const code = escapeHTML(coupon.code);
        return `
            <li class="coupon" data-store="${coupon.store}">
                <div class="coupon-top">
                    <span class="coupon-store">${escapeHTML(storeOf(coupon.store).name)}</span>
                    <span class="coupon-timer">${clockIcon}acaba em <time data-deadline="${coupon.deadline.toISOString()}" datetime="${coupon.deadline.toISOString()}"></time></span>
                </div>
                <p class="coupon-value">${escapeHTML(coupon.value)}</p>
                <p class="coupon-cond">${escapeHTML(coupon.condition)}</p>
                <div class="coupon-code-row">
                    <span class="coupon-code">${code}</span>
                    <button class="btn btn--light copy" type="button" data-code="${code}" aria-label="Copiar o código ${code}">
                        <span class="copy-idle">Copiar</span><span class="copy-done" aria-hidden="true">Copiado</span>
                    </button>
                </div>
                <p class="coupon-meta">Válido até ${escapeHTML(coupon.until)} · testado ${escapeHTML(coupon.tested)}</p>
            </li>`;
    }).join('');

    const timers = [...document.querySelectorAll('time[data-deadline]')].map((el) => ({
        el,
        deadline: new Date(el.dataset.deadline),
        badge: el.closest('.coupon-timer'),
    }));

    function updateTimers(now) {
        timers.forEach(({ el, deadline, badge }) => {
            let rest = Math.max(0, Math.floor((deadline - now) / 1000));
            const days = Math.floor(rest / 86400);
            rest -= days * 86400;
            const clock = `${pad(Math.floor(rest / 3600))}:${pad(Math.floor((rest % 3600) / 60))}:${pad(rest % 60)}`;
            el.textContent = days ? `${days}d ${clock}` : clock;
            badge.classList.toggle('is-urgent', deadline - now < 24 * 60 * 60 * 1000);
        });
    }

    /* ---------- Ofertas, do maior desconto ---------- */

    const deals = [...DATA.deals].sort((a, b) => discount(b) - discount(a));
    $('#deals').innerHTML = deals.map((deal) => {
        const store = storeOf(deal.store);
        return `
            <li class="deal" data-store="${deal.store}">
                <p class="deal-off">−${discount(deal)}%<span class="sr-only"> de desconto</span></p>
                <div class="deal-media" data-fit="${deal.fit}">
                    <img src="${escapeHTML(deal.image)}" alt="" width="720" height="720" loading="lazy" decoding="async">
                </div>
                <p class="deal-store">${escapeHTML(store.name)} · ${escapeHTML(deal.checked)}</p>
                <h3 class="deal-title">${escapeHTML(deal.title)}</h3>
                <p class="deal-price"><strong>${brl.format(deal.price)}</strong> <s><span class="sr-only">antes: </span>${brl.format(deal.was)}</s></p>
                ${deal.coupon ? `<p class="deal-coupon">Com o cupom ${escapeHTML(deal.coupon.code)}: ${brl.format(deal.coupon.price)}</p>` : ''}
                <a class="btn btn--red btn--block" href="${escapeHTML(dealUrl(deal))}" target="_blank" rel="sponsored noopener">Ver ${escapeHTML(atStore(store))}</a>
            </li>`;
    }).join('');

    K.enableStoreFilter({
        buttons: [...filters.querySelectorAll('.chip')],
        items: () => [...document.querySelectorAll('.coupon, .deal')],
    });
    K.enableCopy();

    /* ---------- Relógios ---------- */

    function tick() {
        const now = new Date();
        updateHero(now);
        updateTimers(now);
    }
    tick();
    setInterval(tick, 1000);
})();
