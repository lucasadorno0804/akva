/**
 * AKVAPromo · protótipo Apple
 *
 * Todo movimento ligado ao toque usa molas com os dois parâmetros da Apple
 * (response + damping, como no SwiftUI). Uma mola sempre parte do valor que
 * está na tela e herda a velocidade do gesto, então qualquer animação pode
 * ser agarrada e invertida no meio do caminho.
 */
(() => {
    'use strict';

    const DATA = window.AKVA;
    if (!DATA) return;

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const wide = matchMedia('(min-width: 768px)');
    const coarse = matchMedia('(pointer: coarse)');

    const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
    const normalize = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

    /* ======================================================================
       Molas
       ====================================================================== */

    const Spring = (() => {
        const active = new Set();
        let frame = 0;
        let last = 0;

        function tick(now) {
            const dt = clamp((now - last) / 1000, 0, 1 / 30);
            last = now;
            const updates = new Set();
            const settled = [];
            for (const spring of active) {
                if (spring.step(dt)) settled.push(spring);
                if (spring.onUpdate) updates.add(spring.onUpdate);
            }
            for (const spring of settled) active.delete(spring);
            // Um único render por elemento por quadro, depois que todas as molas andaram
            updates.forEach((render) => render());
            for (const spring of settled) spring.finish();
            frame = active.size ? requestAnimationFrame(tick) : 0;
        }

        function schedule(spring) {
            active.add(spring);
            if (!frame) {
                last = performance.now();
                frame = requestAnimationFrame(tick);
            }
        }

        return class Spring {
            constructor(value, { response = 0.35, damping = 1, precision = 0.01, onUpdate = null } = {}) {
                this.value = value;
                this.target = value;
                this.velocity = 0;
                this.precision = precision;
                this.onUpdate = onUpdate;
                this.done = null;
                this.configure(response, damping);
            }

            // response = quanto tempo leva para chegar (s); damping 1 = sem quique
            configure(response, damping) {
                this.response = response;
                this.damping = damping;
                this.stiffness = (2 * Math.PI / response) ** 2;
                this.friction = (4 * Math.PI * damping) / response;
            }

            to(target, { response = this.response, damping = this.damping, velocity, onRest } = {}) {
                if (response !== this.response || damping !== this.damping) this.configure(response, damping);
                if (velocity !== undefined) this.velocity = velocity;
                this.target = target;
                this.done = onRest || null;
                schedule(this);
                return this;
            }

            // Pula direto para um valor (arrasto 1:1, movimento reduzido)
            set(value) {
                active.delete(this);
                this.value = value;
                this.target = value;
                this.velocity = 0;
                this.done = null;
                if (this.onUpdate) this.onUpdate();
            }

            stop() {
                active.delete(this);
                this.done = null;
            }

            get animating() {
                return active.has(this);
            }

            step(dt) {
                const h = 1 / 240;
                for (let t = dt; t > 0; t -= h) {
                    const dtStep = Math.min(h, t);
                    const accel = -this.stiffness * (this.value - this.target) - this.friction * this.velocity;
                    this.velocity += accel * dtStep;
                    this.value += this.velocity * dtStep;
                }
                if (Math.abs(this.value - this.target) < this.precision && Math.abs(this.velocity) < this.precision * 20) {
                    this.value = this.target;
                    this.velocity = 0;
                    return true;
                }
                return false;
            }

            finish() {
                const done = this.done;
                this.done = null;
                if (done) done();
            }
        };
    })();

    // Para onde o gesto está indo, com a desaceleração de rolagem da Apple
    const project = (velocity, rate = 0.998) => (velocity / 1000) * rate / (1 - rate);

    // Resistência que cresce quanto mais se passa da borda
    const rubberband = (overshoot, dimension, c = 0.55) =>
        (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));

    class VelocityTracker {
        constructor() {
            this.samples = [];
        }

        reset() {
            this.samples.length = 0;
        }

        add(value, time) {
            this.samples.push({ value, time });
            while (this.samples.length > 2 && time - this.samples[0].time > 100) this.samples.shift();
        }

        // px/s; zero se o dedo parou antes de soltar
        velocity(now) {
            const samples = this.samples;
            if (samples.length < 2) return 0;
            const first = samples[0];
            const last = samples[samples.length - 1];
            if (now - last.time > 80) return 0;
            const dt = last.time - first.time;
            return dt > 0 ? clamp(((last.value - first.value) / dt) * 1000, -8000, 8000) : 0;
        }
    }

    /* ======================================================================
       Conteúdo
       ====================================================================== */

    const storeOf = (id) => DATA.stores[id];
    const atStore = (store) => `n${store.article} ${store.name}`; // "na Amazon", "no Mercado Livre"
    const couponById = new Map(DATA.coupons.map((coupon) => [coupon.id, coupon]));

    const icons = {
        check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7"/></svg>',
        chevron: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg>',
    };

    function passContent(coupon, { stubInert = false } = {}) {
        const store = storeOf(coupon.store);
        const code = escapeHTML(coupon.code);
        return `
            <div class="pass-top">
                <div class="pass-head">
                    <span class="pass-store">${escapeHTML(store.name)}</span>
                    <span class="pass-valid">até ${escapeHTML(coupon.until)}</span>
                </div>
                <p class="pass-value">${escapeHTML(coupon.value)}</p>
                <p class="pass-cond">${escapeHTML(coupon.condition)}</p>
            </div>
            <div class="pass-stub"${stubInert ? ' inert' : ''}>
                <span class="pass-code">${code}</span>
                <button class="copy" type="button" data-code="${code}" aria-label="Copiar o código ${code}">
                    <span class="copy-label copy-label--idle">Copiar</span>
                    <span class="copy-label copy-label--done" aria-hidden="true">${icons.check}Copiado</span>
                </button>
            </div>`;
    }

    function passShell(coupon, { tone = 'graphite', index, stubInert = false } = {}) {
        const store = storeOf(coupon.store);
        const shell = document.createElement('div');
        shell.className = 'pass-shell';
        shell.dataset.store = coupon.store;
        shell.dataset.search = normalize(`${store.name} ${coupon.value} ${coupon.condition} ${coupon.code}`);
        if (index !== undefined) shell.style.setProperty('--i', index);
        const label = `${coupon.value} ${coupon.condition}, ${atStore(store)}. Ver regras`;
        shell.innerHTML = `
            <article class="pass" data-id="${coupon.id}" data-tone="${tone}">
                <button class="pass-open" type="button" aria-label="${escapeHTML(label)}"></button>
                ${passContent(coupon, { stubInert })}
            </article>`;
        return shell;
    }

    function dealCard(deal) {
        const store = storeOf(deal.store);
        const off = Math.round((1 - deal.price / deal.was) * 100);
        const card = document.createElement('article');
        card.className = deal.featured ? 'deal deal--feature' : 'deal';
        card.dataset.store = deal.store;
        card.dataset.search = normalize(`${store.name} ${deal.title} ${deal.coupon ? deal.coupon.code : ''}`);
        card.innerHTML = `
            <div class="deal-media" data-fit="${deal.fit}">
                <img src="${escapeHTML(deal.image)}" alt="" width="720" height="720" loading="lazy" decoding="async">
            </div>
            <div class="deal-body">
                <p class="deal-store">${deal.featured ? '<span class="deal-label">Destaque do dia</span> · ' : ''}${escapeHTML(store.name)}</p>
                <h3 class="deal-title">${escapeHTML(deal.title)}</h3>
                ${deal.blurb ? `<p class="deal-blurb">${escapeHTML(deal.blurb)}</p>` : ''}
                <p class="deal-price">
                    <strong>${brl.format(deal.price)}</strong>
                    <s><span class="sr-only">antes: </span>${brl.format(deal.was)}</s>
                    <span class="deal-off">−${off}%</span>
                </p>
                ${deal.coupon ? `<p class="deal-coupon">Com o cupom <b>${escapeHTML(deal.coupon.code)}</b>: ${brl.format(deal.coupon.price)}</p>` : ''}
                <p class="deal-meta">Verificado ${escapeHTML(deal.checked)}</p>
                <a class="deal-link" href="${escapeHTML(deal.url || store.url)}" target="_blank" rel="sponsored noopener">Ver ${escapeHTML(atStore(store))}${icons.chevron}</a>
            </div>`;
        return card;
    }

    const stack = $('#stack');
    const rail = $('#rail');
    const railTrack = $('#rail-track');
    const dealsGrid = $('#deals');

    DATA.heroCoupons.forEach((id, i, list) => {
        const front = i === list.length - 1;
        // Só o passe da frente mostra o canhoto; os de trás ficam fora do foco
        stack.append(passShell(couponById.get(id), { tone: front ? 'red' : 'graphite', index: i, stubInert: !front }));
    });
    DATA.coupons.forEach((coupon) => railTrack.append(passShell(coupon)));
    DATA.deals.forEach((deal) => dealsGrid.append(dealCard(deal)));

    const itemsOf = (parent) => [...parent.children].filter((el) => !el.classList.contains('ghost'));

    // Botões reagem no toque também no iOS
    document.addEventListener('touchstart', () => {}, { passive: true });

    const announcer = $('#announcer');
    function announce(message) {
        announcer.textContent = '';
        requestAnimationFrame(() => { announcer.textContent = message; });
    }

    /* ======================================================================
       Reorganização animada (FLIP com molas)
       ====================================================================== */

    const layoutMotion = new WeakMap();

    function motionFor(el) {
        let motion = layoutMotion.get(el);
        if (motion) return motion;
        const render = () => {
            const x = motion.x.value;
            const y = motion.y.value;
            const s = motion.s.value;
            const o = motion.o.value;
            el.style.transform = (x || y || s !== 1) ? `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${s.toFixed(4)})` : '';
            el.style.opacity = o < 1 ? o.toFixed(3) : '';
        };
        motion = {
            x: new Spring(0, { response: 0.45, precision: 0.1, onUpdate: render }),
            y: new Spring(0, { response: 0.45, precision: 0.1, onUpdate: render }),
            s: new Spring(1, { response: 0.4, precision: 0.001, onUpdate: render }),
            o: new Spring(1, { response: 0.3, precision: 0.005, onUpdate: render }),
            render,
            rest() {
                this.x.set(0);
                this.y.set(0);
                this.s.set(1);
                this.o.set(1);
            },
        };
        layoutMotion.set(el, motion);
        return motion;
    }

    // Quem sai some com um fantasma no lugar onde estava, sem segurar o layout
    function ghost(el, rect) {
        const parent = el.parentElement;
        const box = parent.getBoundingClientRect();
        const copy = el.cloneNode(true);
        copy.hidden = false;
        copy.inert = true;
        copy.classList.add('ghost');
        copy.setAttribute('aria-hidden', 'true');
        Object.assign(copy.style, {
            position: 'absolute',
            left: `${rect.left - box.left}px`,
            top: `${rect.top - box.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            margin: '0',
            gridArea: 'auto',
            pointerEvents: 'none',
            transform: '',
            opacity: '',
        });
        parent.append(copy);
        const fade = copy.animate(
            [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.96)' }],
            { duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
        );
        fade.finished.then(() => copy.remove(), () => copy.remove());
    }

    function flip(elements, mutate) {
        const reduce = reducedMotion.matches;
        const onScreen = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;

        // Antes: posição que está na tela agora, com qualquer animação em curso
        const before = new Map();
        for (const el of elements) if (!el.hidden) before.set(el, el.getBoundingClientRect());

        mutate();

        // Depois: posição final de layout, sem os deslocamentos
        for (const el of elements) el.style.transform = '';
        const after = new Map();
        for (const el of elements) if (!el.hidden) after.set(el, el.getBoundingClientRect());

        for (const el of elements) {
            const motion = motionFor(el);
            const from = before.get(el);
            const to = after.get(el);

            if (!to) {
                motion.rest();
                if (from && onScreen(from) && !reduce) ghost(el, from);
                continue;
            }
            if (!onScreen(to) && !(from && onScreen(from))) {
                motion.rest();
                continue;
            }
            if (from) {
                if (reduce) {
                    motion.rest();
                    continue;
                }
                // Parte de onde está, mantendo a velocidade se já estava em movimento
                motion.x.value = from.left - to.left;
                motion.y.value = from.top - to.top;
                motion.x.to(0);
                motion.y.to(0);
            } else {
                motion.x.set(0);
                motion.y.set(0);
                motion.s.value = reduce ? 1 : 0.96;
                motion.o.value = 0;
                motion.s.to(1);
                motion.o.to(1);
            }
            motion.render();
        }
    }

    /* ======================================================================
       Controle segmentado
       ====================================================================== */

    function setupSegmented(fieldset, onChange) {
        const thumb = $('.segmented-thumb', fieldset);
        const segments = $$('.segment', fieldset);
        const inputs = segments.map((segment) => $('input', segment));
        let viaKeyboard = false;

        const render = () => {
            thumb.style.clipPath = `inset(3px ${right.value.toFixed(2)}px 3px ${left.value.toFixed(2)}px round 7px)`;
        };
        const left = new Spring(0, { response: 0.32, precision: 0.1, onUpdate: render });
        const right = new Spring(0, { response: 0.32, precision: 0.1, onUpdate: render });

        function place(animate) {
            const segment = segments[inputs.findIndex((input) => input.checked)];
            const l = segment.offsetLeft;
            const r = thumb.offsetWidth - segment.offsetLeft - segment.offsetWidth;
            if (!animate || reducedMotion.matches) {
                left.set(l);
                right.set(r);
                return;
            }
            // A borda da frente chega antes: o indicador se estica na direção do toque
            const goingRight = l > left.value;
            (goingRight ? right : left).to(goingRight ? r : l, { response: 0.26 });
            (goingRight ? left : right).to(goingRight ? l : r, { response: 0.38 });
        }

        fieldset.addEventListener('keydown', () => { viaKeyboard = true; });
        fieldset.addEventListener('pointerdown', () => { viaKeyboard = false; });
        fieldset.addEventListener('change', (event) => {
            // Ações de teclado não animam: são repetidas e precisam ser instantâneas
            place(!viaKeyboard);
            onChange(event.target.value, { viaKeyboard });
        });
        new ResizeObserver(() => place(false)).observe(fieldset);
        place(false);

        return {
            reset() {
                inputs[0].checked = true;
                place(true);
            },
        };
    }

    /* ======================================================================
       Trilho de cupons: arrasto com mouse, momento e borda elástica
       (no toque e no trackpad a rolagem é a nativa, que já tem essa física)
       ====================================================================== */

    function setupRail(scroller, track, paddles) {
        const tracker = new VelocityTracker();
        let drag = null;
        let suppressClick = false;
        let pending = false;

        const scroll = new Spring(0, {
            response: 0.5,
            precision: 0.5,
            onUpdate: () => { scroller.scrollLeft = scroll.value; },
        });
        const stretch = new Spring(0, {
            response: 0.4,
            precision: 0.1,
            onUpdate: () => {
                track.style.transform = stretch.value ? `translate3d(${stretch.value.toFixed(2)}px, 0, 0)` : '';
            },
        });

        const maxScroll = () => Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        const visibleItems = () => itemsOf(track).filter((el) => !el.hidden);

        function snapPoints() {
            const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
            const max = maxScroll();
            const points = visibleItems().map((el) => Math.round(clamp(el.offsetLeft - pad, 0, max)));
            return [...new Set(points)].sort((a, b) => a - b);
        }

        const nearest = (x, points = snapPoints()) =>
            points.reduce((best, p) => (Math.abs(p - x) < Math.abs(best - x) ? p : best), points[0] || 0);

        function stop() {
            if (!scroll.animating) return;
            scroll.stop();
            scroller.classList.remove('is-animating');
        }

        function animateTo(x, velocity) {
            if (reducedMotion.matches) {
                scroller.scrollLeft = x;
                return;
            }
            if (!scroll.animating) {
                // Parte da posição real, sem herdar velocidade de uma animação interrompida
                scroll.value = scroller.scrollLeft;
                scroll.velocity = velocity || 0;
            } else if (velocity !== undefined) {
                scroll.velocity = velocity;
            }
            scroller.classList.add('is-animating');
            scroll.to(x, { onRest: () => scroller.classList.remove('is-animating') });
        }

        // Posição "virtual" que pode passar das bordas; o excesso vira resistência
        function position(v) {
            const max = maxScroll();
            const width = scroller.clientWidth;
            if (v < 0) {
                scroller.scrollLeft = 0;
                stretch.set(rubberband(-v, width));
            } else if (v > max) {
                scroller.scrollLeft = max;
                stretch.set(-rubberband(v - max, width));
            } else {
                scroller.scrollLeft = v;
                stretch.set(0);
            }
        }

        scroller.addEventListener('wheel', stop, { passive: true });
        scroller.addEventListener('touchstart', stop, { passive: true });

        scroller.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'mouse' || event.button !== 0) return;
            if (event.target.closest('.copy')) return;
            // Agarrar no meio de uma animação: parte de onde está na tela
            stop();
            stretch.stop();
            drag = { id: event.pointerId, x: event.clientX, origin: scroller.scrollLeft - stretch.value, moved: false };
            tracker.reset();
            tracker.add(event.clientX, event.timeStamp);
        });

        scroller.addEventListener('pointermove', (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            if (!drag.moved) {
                if (Math.abs(event.clientX - drag.x) < 6) return;
                drag.moved = true;
                drag.x += Math.sign(event.clientX - drag.x) * 6; // desconta só a folga, sem engolir o movimento
                scroller.setPointerCapture(event.pointerId);
                scroller.classList.add('is-dragging');
            }
            tracker.add(event.clientX, event.timeStamp);
            position(drag.origin - (event.clientX - drag.x));
        });

        function release(event) {
            if (!drag || event.pointerId !== drag.id) return;
            const { moved } = drag;
            drag = null;
            if (!moved) return;
            scroller.classList.remove('is-dragging');
            suppressClick = true;
            requestAnimationFrame(() => { suppressClick = false; });

            const velocity = -tracker.velocity(event.timeStamp);
            const here = scroller.scrollLeft - stretch.value;
            const max = maxScroll();
            // Escolhe o cartão perto de onde o arremesso ia parar, não de onde soltou
            const target = nearest(clamp(here + project(velocity), 0, max));
            if (stretch.value) stretch.to(0);
            animateTo(target, here < 0 || here > max ? 0 : velocity);
        }

        scroller.addEventListener('pointerup', release);
        scroller.addEventListener('pointercancel', release);
        scroller.addEventListener('click', (event) => {
            if (!suppressClick) return;
            event.preventDefault();
            event.stopPropagation();
        }, true);

        function update() {
            const max = maxScroll();
            paddles[0].setAttribute('aria-disabled', String(scroller.scrollLeft <= 2));
            paddles[1].setAttribute('aria-disabled', String(scroller.scrollLeft >= max - 2));
        }

        function page(dir) {
            const points = snapPoints();
            if (points.length < 2) return;
            const items = visibleItems();
            const step = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : scroller.clientWidth;
            const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
            const perPage = Math.max(1, Math.floor((scroller.clientWidth - pad * 2 + 20) / step));
            const from = scroll.animating ? scroll.target : scroller.scrollLeft;
            const index = points.indexOf(nearest(from, points));
            animateTo(points[clamp(index + dir * perPage, 0, points.length - 1)]);
        }

        paddles.forEach((paddle) => {
            paddle.addEventListener('click', () => {
                if (paddle.getAttribute('aria-disabled') === 'true') return;
                page(Number(paddle.dataset.dir));
            });
        });

        scroller.addEventListener('scroll', () => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                update();
            });
        }, { passive: true });
        addEventListener('resize', update);
        update();

        return {
            reset() {
                stop();
                stretch.set(0);
                scroller.scrollLeft = 0;
                update();
            },
        };
    }

    /* ======================================================================
       Filtros (loja + busca)
       ====================================================================== */

    const state = { store: 'all', words: [] };
    const statusEl = $('#status');
    const couponsEmpty = $('#coupons-empty');
    const dealsEmpty = $('#deals-empty');
    const paddlesEl = $('.paddles');
    const railCtl = setupRail(rail, railTrack, $$('.paddle', paddlesEl));

    const matches = (el) =>
        (state.store === 'all' || el.dataset.store === state.store)
        && state.words.every((word) => el.dataset.search.includes(word));

    function applyFilters({ animate = false } = {}) {
        const coupons = itemsOf(railTrack);
        const deals = itemsOf(dealsGrid);

        const mutate = () => {
            let couponCount = 0;
            let dealCount = 0;
            for (const el of coupons) {
                el.hidden = !matches(el);
                if (!el.hidden) couponCount += 1;
            }
            for (const el of deals) {
                el.hidden = !matches(el);
                if (!el.hidden) dealCount += 1;
            }
            couponsEmpty.hidden = couponCount > 0;
            dealsEmpty.hidden = dealCount > 0;
            paddlesEl.hidden = couponCount === 0;
            rail.hidden = couponCount === 0;
            statusEl.textContent = `${plural(couponCount, 'cupom', 'cupons')} · ${plural(dealCount, 'oferta', 'ofertas')}`;
            railCtl.reset();
        };

        if (animate) {
            flip([...coupons, ...deals], mutate);
        } else {
            for (const el of [...coupons, ...deals]) motionFor(el).rest();
            mutate();
        }
    }

    const segmented = setupSegmented($('#store-filter'), (store, { viaKeyboard }) => {
        state.store = store;
        applyFilters({ animate: !viaKeyboard });
    });

    const searchForm = $('#search');
    const searchInput = $('#q');
    const searchClear = $('.search-clear', searchForm);
    const queryChip = $('#query-chip');

    function setQuery(raw, { animate = false } = {}) {
        const text = raw.trim();
        state.words = normalize(text).split(/\s+/).filter(Boolean);
        searchClear.hidden = !raw;
        queryChip.hidden = !text;
        $('.query-chip-text', queryChip).textContent = `“${text}”`;
        queryChip.setAttribute('aria-label', `Limpar a busca por ${text}`);
        applyFilters({ animate });
    }

    // Digitar filtra na hora, sem animação: acontece a cada tecla
    searchInput.addEventListener('input', () => setQuery(searchInput.value));

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        setQuery('');
        searchInput.focus();
    });

    queryChip.addEventListener('click', () => {
        searchInput.value = '';
        setQuery('', { animate: true });
    });

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const hasDeals = itemsOf(dealsGrid).some((el) => !el.hidden);
        if (coarse.matches) searchInput.blur();
        $(hasDeals ? '#ofertas' : '#cupons').scrollIntoView({
            behavior: reducedMotion.matches ? 'auto' : 'smooth',
            block: 'start',
        });
    });

    function clearFilters() {
        segmented.reset();
        state.store = 'all';
        searchInput.value = '';
        setQuery('', { animate: true });
    }

    applyFilters();

    /* ======================================================================
       Copiar código
       ====================================================================== */

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

    async function copyCode(button) {
        const code = button.dataset.code;
        if (await writeClipboard(code)) {
            // Visual, vibração e anúncio no mesmo quadro
            navigator.vibrate?.(10);
            button.classList.add('is-copied');
            announce(`Código ${code} copiado.`);
            clearTimeout(copyTimers.get(button));
            copyTimers.set(button, setTimeout(() => button.classList.remove('is-copied'), 2000));
            return;
        }
        const codeEl = $('.pass-code', button.closest('.pass-stub'));
        const range = document.createRange();
        range.selectNodeContents(codeEl);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        announce(`Não deu para copiar sozinho. O código ${code} está selecionado.`);
    }

    /* ======================================================================
       Detalhe do cupom
       No computador o passe se expande a partir de onde está e volta para lá.
       No celular vira uma folha que acompanha o dedo e pode ser jogada para baixo.
       ====================================================================== */

    function setupSheet() {
        const root = $('#sheet-root');
        const frame = $('#sheet-frame');
        const sheet = $('#sheet');
        const sheetPass = $('#sheet-pass');
        const body = $('#sheet-body');
        const scrim = $('.sheet-scrim', root);
        const closeButton = $('.sheet-x', root);
        const page = $('#page');
        const tracker = new VelocityTracker();

        let mode = 'morph';
        let isOpen = false;
        let current = null;
        let source = null;
        let from = null;
        let to = null;
        let returnFocus = null;
        let drag = null;
        let suppressClick = false;

        const progress = new Spring(0, { precision: 0.0005, onUpdate: render });

        const visibleRect = (el) => {
            if (!el || !el.isConnected) return null;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight ? rect : null;
        };

        function fill(coupon, tone) {
            const store = storeOf(coupon.store);
            const name = escapeHTML(store.name);
            sheetPass.dataset.tone = tone;
            sheetPass.innerHTML = passContent(coupon);
            $('.pass-top', sheetPass).id = 'sheet-title';
            body.innerHTML = `
                <p class="sheet-verified">${icons.check}Testado ${escapeHTML(coupon.tested)}</p>
                <dl class="rules">
                    <div class="rule"><dt>Validade</dt><dd>até ${escapeHTML(coupon.untilFull)}</dd></div>
                    <div class="rule"><dt>Pedido mínimo</dt><dd>${escapeHTML(coupon.minimum)}</dd></div>
                    <div class="rule"><dt>Vale para</dt><dd>${escapeHTML(coupon.scope)}</dd></div>
                    <div class="rule"><dt>Limite</dt><dd>${escapeHTML(coupon.limit)}</dd></div>
                </dl>
                <h3 class="sheet-subtitle">Como usar</h3>
                <ol class="howto">
                    <li>Copie o código acima.</li>
                    <li>Abra ${store.article} ${name} e monte o carrinho.</li>
                    <li>Cole o código no campo de cupom antes de pagar.</li>
                </ol>
                <div class="sheet-actions">
                    <a class="button button--primary button--block" href="${escapeHTML(store.url)}" target="_blank" rel="sponsored noopener">Abrir ${store.article} ${name}</a>
                    <button class="button button--secondary button--block sheet-dismiss" type="button" data-sheet-close>Fechar</button>
                </div>`;
            body.scrollTop = 0;
        }

        function measure() {
            root.dataset.mode = mode === 'sheet' ? 'sheet' : 'center';
            frame.style.transform = '';
            frame.style.opacity = '';
            frame.style.filter = '';
            sheet.style.clipPath = '';
            to = frame.getBoundingClientRect();
            sheet.style.setProperty('--notch-y', `${$('.pass-top', sheetPass).offsetHeight}px`);
        }

        function render() {
            const p = progress.value;
            const k = clamp(p, 0, 1);
            scrim.style.opacity = k.toFixed(3);

            if (mode === 'sheet') {
                frame.style.transform = `translate3d(0, ${((1 - p) * (to.height + 16)).toFixed(2)}px, 0)`;
                // A página recua enquanto a folha sobe, e volta junto quando ela é arrastada
                page.style.transform = k > 0.001 ? `scale(${(1 - 0.04 * k).toFixed(4)})` : '';
                return;
            }

            if (mode === 'morph') {
                const s0 = from.width / to.width;
                const s = s0 + (1 - s0) * p;
                const tx = (from.left - to.left) * (1 - p);
                const ty = (from.top - to.top) * (1 - p);
                const shown = from.height / s0 + (to.height - from.height / s0) * p;
                frame.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
                frame.style.filter = `drop-shadow(0 24px 48px rgba(0, 0, 0, ${(0.5 * k).toFixed(3)}))`;
                sheet.style.clipPath = `inset(0 0 ${Math.max(0, to.height - shown).toFixed(2)}px 0 round var(--r-lg))`;
                closeButton.style.opacity = clamp((p - 0.6) / 0.4, 0, 1).toFixed(3);
                return;
            }

            // Movimento reduzido ou sem origem visível: só esmaece
            frame.style.opacity = k.toFixed(3);
            closeButton.style.opacity = '';
        }

        function lockPage(locked) {
            document.documentElement.classList.toggle('is-locked', locked);
            page.inert = locked;
        }

        function finish() {
            progress.set(0);
            root.hidden = true;
            root.classList.remove('is-closing');
            frame.style.transform = '';
            frame.style.opacity = '';
            frame.style.filter = '';
            sheet.style.clipPath = '';
            scrim.style.opacity = '';
            closeButton.style.opacity = '';
            page.style.transform = '';
            page.style.transformOrigin = '';
            if (source) source.style.opacity = '';
            source = null;
            current = null;
        }

        function open(coupon, sourcePass) {
            // Tocar de novo no mesmo passe enquanto ele volta: inverte no meio do caminho
            if (!isOpen && progress.animating && current === coupon.id) {
                isOpen = true;
                root.classList.remove('is-closing');
                lockPage(true);
                progress.to(1, { response: 0.42, damping: 1 });
                frame.focus({ preventScroll: true });
                return;
            }
            if (isOpen) return;
            if (!root.hidden) finish();

            isOpen = true;
            current = coupon.id;
            source = sourcePass;
            returnFocus = document.activeElement;
            mode = reducedMotion.matches ? 'fade' : wide.matches ? 'morph' : 'sheet';

            fill(coupon, sourcePass.dataset.tone || 'graphite');
            root.classList.remove('is-closing');
            root.hidden = false;
            lockPage(true);
            if (mode === 'sheet') page.style.transformOrigin = `50% ${Math.round(scrollY + innerHeight / 2)}px`;
            measure();

            if (mode === 'morph') {
                from = visibleRect(source);
                if (from) source.style.opacity = '0'; // continua focável para devolver o foco ao fechar
                else mode = 'fade';
            }

            progress.set(0);
            progress.to(1, mode === 'sheet' ? { response: 0.38, damping: 1 } : { response: 0.42, damping: 1 });
            frame.focus({ preventScroll: true });
        }

        function close({ velocity } = {}) {
            if (!isOpen) return;
            isOpen = false;
            root.classList.add('is-closing');
            lockPage(false);

            if (mode === 'morph') {
                // Volta para onde o passe está agora; se ele sumiu da tela, só esmaece
                const rect = visibleRect(source);
                if (rect) {
                    from = rect;
                } else {
                    mode = 'fade';
                    frame.style.transform = '';
                    sheet.style.clipPath = '';
                    source.style.opacity = '';
                }
            }

            progress.to(0, { response: mode === 'sheet' ? 0.34 : 0.36, damping: 1, velocity, onRest: finish });
            if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
        }

        // Arrastar a folha (celular): 1:1 com o dedo, elástico para cima, velocidade decide
        frame.addEventListener('pointerdown', (event) => {
            if (mode !== 'sheet' || !isOpen || !event.isPrimary) return;
            if (!event.target.closest('.sheet-grabber, .sheet-pass')) return;
            drag = { id: event.pointerId, y: event.clientY, from: progress.value, moved: false };
            tracker.reset();
            tracker.add(event.clientY, event.timeStamp);
        });

        frame.addEventListener('pointermove', (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            if (!drag.moved) {
                if (Math.abs(event.clientY - drag.y) < 8) return;
                drag.moved = true;
                drag.y += Math.sign(event.clientY - drag.y) * 8;
                progress.stop();
                drag.from = progress.value;
                frame.setPointerCapture(event.pointerId);
            }
            tracker.add(event.clientY, event.timeStamp);
            const height = to.height;
            const offset = (1 - drag.from) * height + (event.clientY - drag.y);
            progress.set(offset < 0 ? 1 + rubberband(-offset, height) / height : 1 - offset / height);
        });

        function endDrag(event) {
            if (!drag || event.pointerId !== drag.id) return;
            const { moved } = drag;
            drag = null;
            if (!moved) return;
            suppressClick = true;
            requestAnimationFrame(() => { suppressClick = false; });

            const height = to.height;
            const velocity = tracker.velocity(event.timeStamp); // px/s, positivo = para baixo
            const offset = (1 - progress.value) * height;
            if (offset + project(velocity) > height * 0.5) {
                close({ velocity: -velocity / height });
            } else {
                // Só quica se o gesto trouxe impulso
                progress.to(1, { response: 0.32, damping: Math.abs(velocity) > 300 ? 0.82 : 1, velocity: -velocity / height });
            }
        }

        frame.addEventListener('pointerup', endDrag);
        frame.addEventListener('pointercancel', endDrag);
        frame.addEventListener('click', (event) => {
            if (!suppressClick) return;
            event.preventDefault();
            event.stopPropagation();
        }, true);

        document.addEventListener('keydown', (event) => {
            if (!isOpen) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                close();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = $$('a[href], button', frame).filter((el) => el.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === frame)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        return { open, close };
    }

    const couponSheet = setupSheet();

    /* ======================================================================
       Cliques (delegados)
       ====================================================================== */

    document.addEventListener('click', (event) => {
        const target = event.target;
        const copyButton = target.closest('.copy');
        if (copyButton) {
            copyCode(copyButton);
            return;
        }
        const opener = target.closest('.pass-open');
        if (opener) {
            const pass = opener.closest('.pass');
            couponSheet.open(couponById.get(pass.dataset.id), pass);
            return;
        }
        if (target.closest('[data-sheet-close]')) {
            couponSheet.close();
            return;
        }
        if (target.closest('[data-clear-filters]')) clearFilters();
    });

    /* ======================================================================
       Barra de lojas e menu
       ====================================================================== */

    const storebar = $('#storebar');
    new IntersectionObserver(([entry]) => {
        storebar.classList.toggle('is-stuck', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }).observe($('#storebar-sentinel'));

    (function setupMenu() {
        const button = $('.menu-button');
        const menu = $('#menu');
        const bar = $('.globalnav-inner');
        let isOpen = false;
        let timer = 0;

        function set(next, { focusButton = false } = {}) {
            if (next === isOpen) return;
            isOpen = next;
            button.setAttribute('aria-expanded', String(next));
            button.setAttribute('aria-label', next ? 'Fechar menu' : 'Abrir menu');
            document.documentElement.classList.toggle('is-locked', next);
            clearTimeout(timer);
            if (next) {
                menu.style.top = `${Math.max(0, bar.getBoundingClientRect().bottom)}px`;
                menu.hidden = false;
                void menu.offsetWidth;
                menu.classList.add('is-open');
            } else {
                menu.classList.remove('is-open');
                timer = setTimeout(() => { menu.hidden = true; }, reducedMotion.matches ? 0 : 200);
                if (focusButton) button.focus();
            }
        }

        button.addEventListener('click', () => set(!isOpen));
        menu.addEventListener('click', (event) => {
            if (event.target.closest('a')) set(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && isOpen) set(false, { focusButton: true });
        });
        wide.addEventListener('change', (event) => {
            if (event.matches) set(false);
        });
    })();
})();
