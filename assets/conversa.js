/**
 * AKVAPromo · protótipo Canal em forma de conversa
 * Transforma ofertas e cupons em mensagens do canal, na ordem em que foram
 * verificados ("há 12 min", "há 2 h"), com separador de dia e horário.
 */
(() => {
    'use strict';

    const K = window.AKVAKit;
    if (!K) return;
    const { DATA, $, $$, brl, escapeHTML, storeOf, atStore, discount, dealUrl } = K;

    const minutesAgo = (text) => {
        const match = String(text).match(/(\d+)\s*(min|h)/);
        if (!match) return 0;
        return match[2] === 'h' ? Number(match[1]) * 60 : Number(match[1]);
    };

    const now = new Date();
    const timeOf = (minutes) => new Date(now.getTime() - minutes * 60 * 1000);
    const hourMinute = (date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dayKey = (date) => date.toDateString();
    function dayLabel(date) {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (dayKey(date) === dayKey(now)) return 'Hoje';
        if (dayKey(date) === dayKey(yesterday)) return 'Ontem';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    }

    /* ---------- Mensagens ---------- */

    function couponMessage(coupon) {
        const store = storeOf(coupon.store);
        const code = escapeHTML(coupon.code);
        return `
            <p class="msg-text"><b>Cupom ${escapeHTML(atStore(store))}</b>: ${escapeHTML(coupon.value)} ${escapeHTML(coupon.condition)}.</p>
            <div class="code-row">
                <span class="code">${code}</span>
                <button class="btn btn--soft copy" type="button" data-code="${code}" aria-label="Copiar o código ${code}">
                    <span class="copy-idle">Copiar código</span><span class="copy-done" aria-hidden="true">Copiado</span>
                </button>
            </div>
            <p class="msg-note">Válido até ${escapeHTML(coupon.until)}. Testado ${escapeHTML(coupon.tested)}.</p>`;
    }

    function dealMessage(deal) {
        const store = storeOf(deal.store);
        return `
            <div class="msg-media" data-fit="${deal.fit}">
                <img src="${escapeHTML(deal.image)}" alt="" width="720" height="450" loading="lazy" decoding="async">
            </div>
            <p class="msg-text">${deal.featured ? '<b>Destaque do dia</b> · ' : ''}<b>${escapeHTML(deal.title)}</b> ${escapeHTML(atStore(store))}</p>
            ${deal.blurb ? `<p class="msg-note">${escapeHTML(deal.blurb)}</p>` : ''}
            <p class="msg-price">
                <strong>${brl.format(deal.price)}</strong>
                <s><span class="sr-only">antes: </span>${brl.format(deal.was)}</s>
                <span class="off">−${discount(deal)}%</span>
            </p>
            ${deal.coupon ? `<p class="msg-note">Com o cupom <span class="code">${escapeHTML(deal.coupon.code)}</span> sai por ${brl.format(deal.coupon.price)}.</p>` : ''}`;
    }

    // Do mais antigo para o mais novo, como numa conversa
    const items = [
        ...DATA.coupons.map((coupon) => ({ kind: 'coupon', data: coupon, minutes: minutesAgo(coupon.tested) })),
        ...DATA.deals.map((deal) => ({ kind: 'deal', data: deal, minutes: minutesAgo(deal.checked) })),
    ].sort((a, b) => b.minutes - a.minutes);

    let lastDay = '';
    const html = ['<li class="notice">Este é o canal da AKVAPromo. Todo cupom é testado antes de ser publicado aqui.</li>'];
    items.forEach(({ kind, data, minutes }) => {
        const time = timeOf(minutes);
        if (dayKey(time) !== lastDay) {
            lastDay = dayKey(time);
            html.push(`<li class="day">${dayLabel(time)}</li>`);
        }
        const store = storeOf(data.store);
        const action = kind === 'deal'
            ? `<a class="msg-action" href="${escapeHTML(dealUrl(data))}" target="_blank" rel="sponsored noopener">Ver ${escapeHTML(atStore(store))}</a>`
            : `<a class="msg-action" href="${escapeHTML(store.url)}" target="_blank" rel="sponsored noopener">Abrir ${store.article} ${escapeHTML(store.name)}</a>`;
        html.push(`
            <li class="msg" data-store="${data.store}">
                <article class="bubble">
                    ${kind === 'deal' ? dealMessage(data) : couponMessage(data)}
                    <p class="msg-meta"><time datetime="${time.toISOString()}">${hourMinute(time)}</time></p>
                    ${action}
                </article>
            </li>`);
    });

    const list = $('#messages');
    list.innerHTML = html.join('');

    /* ---------- Filtro ---------- */

    const chips = $('#chips');
    chips.innerHTML = K.storeButtons('chip');

    K.enableStoreFilter({
        buttons: $$('.chip', chips),
        items: () => $$('.msg', list),
        onChange: (store, shown) => {
            // Separadores de dia só ficam se o dia ainda tem mensagem visível
            $$('.day', list).forEach((day) => {
                let next = day.nextElementSibling;
                let visible = false;
                while (next && !next.classList.contains('day')) {
                    if (!next.hidden) visible = true;
                    next = next.nextElementSibling;
                }
                day.hidden = !visible;
            });
            $('#empty').hidden = shown.length > 0;
        },
    });

    K.enableCopy();

    // Abre na mensagem mais nova, como um aplicativo de conversa
    const latest = $$('.msg', list).pop();
    if (latest && !location.hash) {
        requestAnimationFrame(() => latest.scrollIntoView({ block: 'end', behavior: 'auto' }));
    }
})();
