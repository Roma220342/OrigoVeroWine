// OrigoVero passport — behaviour: section tabs that follow the scroll, journey map and step viewer, language sheet, report form states.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Section tabs ---------- */
  const tabsScroll = $('#tabs-scroll');
  const tabs = $$('.tab');
  const sectionIds = tabs.map((a) => a.dataset.target);

  // Current section = the last one whose top has passed just under the sticky header.
  const LINE = 112 + 8;
  const currentSection = () => {
    let current = 'top';
    // At the very bottom the last section can never reach the top line, so it counts as current.
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) return sectionIds[sectionIds.length - 1];
    for (const id of sectionIds) {
      if (id === 'top') continue;
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= LINE) current = id;
    }
    return current;
  };

  let shown = null;
  const markCurrent = (forced) => {
    const now = forced || currentSection();
    if (now === shown) return;
    shown = now;
    tabs.forEach((a) => {
      const on = a.dataset.target === now;
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    // Keep the active tab in view inside the sideways-scrolling strip.
    const active = tabs.find((a) => a.dataset.target === now);
    if (active) {
      const left = Math.max(0, active.offsetLeft - 24);
      tabsScroll.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  };
  let ticking = false;
  // After a tap the page scrolls smoothly past other sections. The tapped tab is held until the scroll settles,
  // so the strip does not flicker through every section on the way.
  let held = null;
  let holdTimer = null;
  const release = () => { held = null; markCurrent(); };
  const hold = (target) => { held = target; clearTimeout(holdTimer); holdTimer = setTimeout(release, 250); };
  addEventListener('scroll', () => {
    if (held) { clearTimeout(holdTimer); holdTimer = setTimeout(release, 160); return; }
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; markCurrent(); });
  }, { passive: true });
  addEventListener('resize', () => markCurrent());
  tabs.forEach((a) => {
    a.dataset.text = a.textContent; // lets CSS reserve the bold width, so the active tab never changes the strip width
    a.addEventListener('click', () => { hold(a.dataset.target); markCurrent(a.dataset.target); });
  });
  markCurrent();

  /* ---------- Smooth expand and collapse (journey steps, FAQ) ---------- */
  // The height of the <details> animates between its closed and open size and the panel fades.
  // `open` stays set while closing, so the `.is-closing` class carries the closed look (chevron, plus/minus) at once.
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const toggleDetails = (d) => {
    const panel = d.querySelector('summary').nextElementSibling;
    if (d._anim) d._anim.cancel();
    if (panel) panel.getAnimations().forEach((x) => x.cancel());
    const opening = !d.open;
    const start = d.getBoundingClientRect().height;
    let end;
    if (opening) { d.open = true; end = d.getBoundingClientRect().height; }
    else { d.open = false; end = d.getBoundingClientRect().height; d.open = true; } // measure closed, then keep it open while animating
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || start === end) { d.open = opening; d.classList.remove('is-closing'); return; }
    d.classList.toggle('is-closing', !opening);
    d.style.overflow = 'hidden';
    const grow = d.animate({ height: [start + 'px', end + 'px'] }, { duration: opening ? 340 : 280, easing: EASE });
    if (panel) panel.animate({ opacity: opening ? [0, 1] : [1, 0] }, { duration: opening ? 260 : 160, delay: opening ? 70 : 0, easing: 'ease-out', fill: 'both' });
    d._anim = grow;
    const finish = () => { if (d._anim !== grow) return; d._anim = null; d.open = opening; d.classList.remove('is-closing'); d.style.overflow = ''; grow.cancel(); if (panel) panel.getAnimations().forEach((x) => x.cancel()); };
    grow.onfinish = finish;
    setTimeout(finish, (opening ? 340 : 280) + 80); // safety net if the animation never reports finished (hidden tab)
    grow.oncancel = () => { if (d._anim === grow) { d._anim = null; d.style.overflow = ''; } };
  };
  const steps = $$('details.step__content');
  $$('details.step__content, details.faq, details.more').forEach((d) => {
    d.querySelector('summary').addEventListener('click', (e) => {
      e.preventDefault();
      // One journey step open at a time: opening a step closes the one that was open.
      if (!d.open && d.classList.contains('step__content')) steps.filter((o) => o !== d && o.open).forEach(toggleDetails);
      toggleDetails(d);
    });
  });

  /* ---------- Language sheet ---------- */
  // UI only: the page copy is not translated in this demo, so <html lang> is left alone.
  const sheet = $('#lang-sheet');
  const openBtn = $('#lang-open');
  const code = $('#lang-code');
  const options = $$('.lang');
  const KEY = 'passport-language';

  const select = (btn, { persist = true } = {}) => {
    options.forEach((o) => o.setAttribute('aria-checked', o === btn ? 'true' : 'false'));
    code.textContent = btn.dataset.code;
    openBtn.setAttribute('aria-label', 'Language: ' + btn.firstChild.textContent.trim());
    if (persist) { try { localStorage.setItem(KEY, btn.dataset.code); } catch (e) { /* storage may be blocked */ } }
  };
  try {
    const saved = localStorage.getItem(KEY);
    const match = options.find((o) => o.dataset.code === saved);
    if (match) select(match, { persist: false });
  } catch (e) { /* storage may be blocked */ }

  // The sheet slides up and the scrim fades in; closing plays the same motion backwards before the dialog is closed.
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  sheet.setAttribute('tabindex', '-1'); // focus lands on the sheet itself, so no ring is drawn on the close button after a tap
  let closing = false;
  const openSheet = () => {
    closing = false;
    sheet.showModal();
    sheet.focus({ preventScroll: true });
    void sheet.offsetHeight; // commit the off-screen start position, then animate in
    sheet.classList.add('is-in');
  };
  const closeSheet = () => {
    if (!sheet.open || closing) return;
    closing = true;
    sheet.classList.remove('is-in');
    const done = () => { if (!closing) return; closing = false; sheet.close(); };
    if (reduceMotion()) { done(); return; }
    sheet.addEventListener('transitionend', (e) => { if (e.target === sheet && e.propertyName === 'transform') done(); }, { once: true });
    setTimeout(done, 450); // safety net if transitionend never fires
  };
  openBtn.addEventListener('click', openSheet);
  $('#lang-close').addEventListener('click', closeSheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); }); // tap on the scrim
  sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); });     // Esc key
  sheet.addEventListener('close', () => sheet.classList.remove('is-in'));
  options.forEach((o) => o.addEventListener('click', () => { select(o); closeSheet(); }));

  // Swipe down on the sheet to dismiss it: it follows the finger, then either flies out or springs back.
  // A swipe that starts inside a scrolled list scrolls the list instead.
  const list = $('#lang-list');
  let drag = null;
  sheet.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || closing) return;
    drag = { y: e.touches[0].clientY, t: performance.now(), dy: 0, active: false, inList: !!e.target.closest('.lang-list') };
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (!drag) return;
    const dy = e.touches[0].clientY - drag.y;
    if (!drag.active) {
      if (dy < -4 || (drag.inList && list.scrollTop > 0)) { drag = null; return; }  // scrolling up, or the list has its own scroll
      if (dy <= 4) return;
      drag.active = true;
      sheet.style.transition = 'none';
    }
    e.preventDefault();
    drag.dy = Math.max(0, dy);
    sheet.style.transform = 'translateY(' + drag.dy + 'px)';
  }, { passive: false });
  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.active) return;
    const speed = d.dy / Math.max(1, performance.now() - d.t); // px per ms
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (d.dy > 110 || (d.dy > 40 && speed > 0.55)) closeSheet(); // the CSS transition continues from where the finger let go
  };
  sheet.addEventListener('touchend', endDrag);
  sheet.addEventListener('touchcancel', endDrag);

  /* ---------- "How we verify" opens the answer about authenticity ---------- */
  $$('[data-open]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const d = document.getElementById(a.dataset.open);
    if (!d) return;
    document.getElementById('faq').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' });
    window.setTimeout(() => { if (!d.open) toggleDetails(d); }, reduceMotion() ? 0 : 450);
  }));

  /* ---------- Copy link ---------- */
  const copyBtn = $('#copy-link');
  const copyStatus = $('#copy-status');
  const COPY_LABEL = copyBtn.textContent;
  let copyTimer = null;
  copyBtn.addEventListener('click', async () => {
    const url = location.href.split('#')[0];
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
    }
    clearTimeout(copyTimer);
    copyBtn.textContent = ok ? 'Link copied' : 'Could not copy, copy the address from the browser bar';
    copyStatus.textContent = copyBtn.textContent;
    copyTimer = setTimeout(() => { copyBtn.textContent = COPY_LABEL; copyStatus.textContent = ''; }, 2600);
  });

  /* ---------- Report form ---------- */
  const form = $('#report-form');
  const send = $('#send');
  const status = $('#form-status');
  const emailField = $('#email-field');
  const email = $('#email');
  const emailError = $('#email-error');
  const details = $('#details');
  const reason = $('#reason');

  const autosize = (el) => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };
  details.addEventListener('input', () => autosize(details));

  [details, email, reason].forEach((el) =>
    el.addEventListener('input', () => el.classList.toggle('is-filled', el.value.trim() !== '')));
  reason.addEventListener('change', () => { reason.classList.add('is-filled'); setReasonInvalid(false); });

  // The reason has no default, so an accidental send cannot file the wrong complaint.
  const reasonField = reason.closest('.field');
  const reasonError = $('#reason-error');
  function setReasonInvalid(bad) {
    reasonField.classList.toggle('is-invalid', bad);
    reasonError.hidden = !bad;
    reason.setAttribute('aria-invalid', bad ? 'true' : 'false');
  }

  const validEmail = (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); // optional field
  const setInvalid = (bad) => {
    emailField.classList.toggle('is-invalid', bad);
    emailError.hidden = !bad;
    email.setAttribute('aria-invalid', bad ? 'true' : 'false');
  };
  email.addEventListener('input', () => { if (emailField.classList.contains('is-invalid') && validEmail(email.value.trim())) setInvalid(false); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!reason.value) { setReasonInvalid(true); reason.focus(); return; }
    if (!validEmail(email.value.trim())) { setInvalid(true); email.focus(); return; }
    setInvalid(false);
    // Loading state. There is no backend in this demo: the request is simulated.
    send.textContent = 'Sending…';
    send.setAttribute('aria-busy', 'true');
    status.textContent = '';
    window.setTimeout(() => {
      send.textContent = 'Send to the brand';
      send.removeAttribute('aria-busy');
      status.textContent = 'Sent. Thank you, the brand will see this.';
      form.reset();
      [details, email, reason].forEach((el) => el.classList.remove('is-filled'));
      autosize(details);
    }, 900);
  });

  /* ---------- Journey map ---------- */
  // One component fed by the steps in the page. Leaflet and the tiles load only when the map is near the screen.
  // In the page the map only previews (a tap opens it); the full screen sheet is where it can be moved and zoomed.
  // The dot travels once from the first stop to the last recorded one and rests there. With reduced motion it starts at the end.
  const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';
  const stepData = $$('.step[data-step]').sort((a, b) => a.dataset.step - b.dataset.step).map((el) => ({
    lat: +el.dataset.lat, lng: +el.dataset.lng, city: el.dataset.city, place: el.dataset.place,
    title: el.querySelector('.step__stage').textContent.trim(),
    date: el.querySelector('.step__date').textContent.split(',')[0].trim(),
  }));
  // Every step gets its own point. Steps in one city are spread on a small ring (about 1 km) around the city centre
  // so each move is visible; the positions are schematic, the data only says the city.
  const SPREAD = 0.012;
  const cities = [];
  stepData.forEach((s) => {
    let c = cities.find((x) => x.city === s.city);
    if (!c) { c = { city: s.city, lat: s.lat, lng: s.lng, steps: [] }; cities.push(c); }
    c.steps.push(s);
  });
  cities.forEach((c) => {
    c.many = c.steps.length > 1;
    c.steps.forEach((s, k) => {
      if (!c.many) return;
      const a = ((120 + k * (360 / c.steps.length)) * Math.PI) / 180;
      s.lat = c.lat + SPREAD * Math.sin(a);
      s.lng = c.lng + (SPREAD * Math.cos(a)) / Math.cos((c.lat * Math.PI) / 180);
    });
  });
  const LAST = stepData.length - 1;
  const mapView = $('#map-view');
  const mapFallback = $('#map-fallback');
  const mapReplay = $('#map-replay');
  mapReplay.addEventListener('click', () => { if (inline) inline.play(); });

  let leafletReady = null;
  const loadLeaflet = () => leafletReady || (leafletReady = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.css';
    const js = document.createElement('script');
    js.src = LEAFLET + 'leaflet.js';
    let cssDone = false; let jsDone = false;
    const check = () => { if (cssDone && jsDone) resolve(window.L); };
    css.onload = () => { cssDone = true; check(); };
    js.onload = () => { jsDone = true; check(); };
    const fail = () => { leafletReady = null; reject(new Error('map library')); };
    css.onerror = fail; js.onerror = fail;
    document.head.append(css, js);
  }));

  const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const createMap = (L, el, interactive, bottomPad) => {
    const map = L.map(el, {
      zoomControl: false, attributionControl: false, boxZoom: false, keyboard: false, tap: false, scrollWheelZoom: false,
      dragging: interactive, touchZoom: interactive, doubleClickZoom: interactive, zoomSnap: 0.25,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 14, keepBuffer: 4, attribution: '© OpenStreetMap contributors' }).addTo(map);
    L.control.attribution({ prefix: false, position: 'bottomleft' }).addTo(map);
    const pts = stepData.map((s) => [s.lat, s.lng]);
    const weight = interactive ? 2.5 : 2;
    // The route is drawn on a canvas of our own, in screen pixels, on every frame of a move or zoom. Leaflet's vector
    // layers only scale their picture while the camera zooms, which made the lines blur and jitter.
    const routePane = map.createPane('route');
    routePane.style.zIndex = 450;
    routePane.style.pointerEvents = 'none';
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    routePane.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let prog = [];
    const stroke = (list, alpha) => {
      if (list.length < 2) return;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      list.forEach((ll, i) => {
        const p = map.latLngToContainerPoint(ll).round();
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    };
    const draw = () => {
      if (!map._loaded) return;
      const size = map.getSize();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(size.x * dpr) || canvas.height !== Math.round(size.y * dpr)) {
        canvas.width = Math.round(size.x * dpr); canvas.height = Math.round(size.y * dpr);
        canvas.style.width = size.x + 'px'; canvas.style.height = size.y + 'px';
      }
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]).round());
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);
      ctx.strokeStyle = '#1b1b19'; ctx.lineWidth = weight; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      stroke(pts, 0.3);
      stroke(prog, 1);
    };
    const progress = { setLatLngs: (list) => { prog = list; draw(); } };
    map.on('move zoom moveend zoomend viewreset resize', draw);
    map.whenReady(draw);
    const north = Math.max(...cities.map((c) => c.lat));
    const markers = [];
    const dotIcon = L.divIcon({ className: 'map-dot-wrap', html: '<span class="map-dot"></span>', iconSize: [44, 44], iconAnchor: [22, 22] });
    stepData.forEach((s, i) => {
      markers[i] = L.marker([s.lat, s.lng], { icon: dotIcon, keyboard: false, interactive }).addTo(map);
    });
    // Each label sits on its own side of the city, so cities that are close at the overview zoom do not collide.
    const west = Math.min(...cities.map((c) => c.lng));
    const east = cities.filter((c) => c.lng !== west);
    const northmost = Math.max(...east.map((c) => c.lat));
    const southmost = Math.min(...east.map((c) => c.lat));
    cities.forEach((c) => {
      const dir = c.lng === west ? 'right' : (c.lat === northmost ? 'top' : (c.lat === southmost ? 'bottom' : 'left'));
      const anchor = L.latLng(c.many ? c.lat + (dir === 'bottom' ? -SPREAD : SPREAD) : c.lat, c.lng);
      const label = L.marker(anchor, { icon: L.divIcon({ className: 'map-anchor', iconSize: [0, 0] }), interactive: false, keyboard: false }).addTo(map);
      const off = { top: [0, -10], bottom: [0, 10], right: [20, 0], left: [-20, 0] }[dir];
      label.bindTooltip(c.city, { permanent: true, direction: dir, offset: off, className: 'map-label' });
    });
    const trav = L.marker(pts[0], {
      icon: L.divIcon({ className: 'trav', html: '<span class="trav__pulse"></span><span class="trav__pulse trav__pulse--2"></span><span class="trav__dot"></span>', iconSize: [1, 1], iconAnchor: [0, 0] }),
      interactive: false, keyboard: false, zIndexOffset: 1000,
    }).addTo(map);
    const travEl = () => trav.getElement();
    let at = { lat: stepData[0].lat, lng: stepData[0].lng };
    const place = (p) => { at = { lat: p.lat, lng: p.lng }; trav.setLatLng([p.lat, p.lng]); };
    const POV = { paddingTopLeft: [64, bottomPad > 100 ? 80 : 40], paddingBottomRight: [64, bottomPad] };
    const fit = (animate, ms) => {
      const bounds = L.latLngBounds(pts);
      if (animate && !reduceMotion()) map.flyToBounds(bounds, { ...POV, maxZoom: 11, duration: (ms || 1100) / 1000 });
      else map.fitBounds(bounds, { ...POV, maxZoom: 11, animate: false });
    };
    // Longer legs take longer, so a jump between cities feels like a journey and a step inside a city feels quick.
    const legMs = (from, to) => Math.round(700 + Math.min(1000, (map.distance([from.lat, from.lng], [to.lat, to.lng]) / 1000) * 12));
    const move = (to, ms, onFrame, dead) => new Promise((resolve) => {
      const from = at;
      if (!ms || reduceMotion()) { place(to); if (onFrame) onFrame(1); resolve(); return; }
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        const e = ease(k);
        place({ lat: from.lat + (to.lat - from.lat) * e, lng: from.lng + (to.lng - from.lng) * e });
        if (onFrame) onFrame(e);
        if (k < 1 && !(dead && dead())) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    const rest = (on) => { const e = trav.getElement(); if (e) e.classList.toggle('is-resting', on); };
    const drawAll = () => progress.setLatLngs(pts);
    // Camera: it frames the city the product is in. A move inside the city only moves the dot; a move to another city
    // flies the camera out and back in, over the same time as the dot. Zoom is capped so street names stay unreadable.
    let focused = null;
    const focus = (i, animate, ms) => {
      const s = stepData[i];
      const c = cities.find((x) => x.city === s.city);
      if (focused === c.city && map.getBounds().pad(-0.12).contains([s.lat, s.lng])) return;
      focused = c.city;
      const d = SPREAD * 1.5;
      const dl = d / Math.cos((c.lat * Math.PI) / 180);
      const bounds = L.latLngBounds([c.lat - d, c.lng - dl], [c.lat + d, c.lng + dl]);
      const o = { paddingTopLeft: [48, bottomPad > 100 ? 80 : 28], paddingBottomRight: [48, bottomPad], maxZoom: 12 };
      if (!animate || reduceMotion()) map.fitBounds(bounds, { ...o, animate: false }); else map.flyToBounds(bounds, { ...o, duration: (ms || 900) / 1000 });
    };
    const unfocus = () => { focused = null; };
    let run = 0;
    let running = false;
    let onState = () => {};
    const setRunning = (on) => { running = on; onState(on); };
    const finish = () => {
      run += 1;
      place(stepData[stepData.length - 1]); drawAll(); rest(true); unfocus(); fit(false);
      setRunning(false);
    };
    // The camera zooms in on the first step, the dot visits every step in order and leaves the ink trail behind it,
    // then the camera eases back out to the whole route and the dot rests on the last step.
    const play = async () => {
      if (running) return;
      const id = (run += 1);
      const dead = () => id !== run;
      const end = stepData.length - 1;
      if (reduceMotion()) { finish(); return; }
      setRunning(true);
      progress.setLatLngs([]); place(stepData[0]); rest(false); unfocus();
      focus(0, true, 1000);
      await wait(1100);
      for (let i = 1; i <= end && !dead(); i += 1) {
        const ms = legMs(stepData[i - 1], stepData[i]);
        focus(i, true, ms);
        await move(stepData[i], ms, () => progress.setLatLngs([...pts.slice(0, i), [at.lat, at.lng]]), dead);
        if (dead()) return;
        progress.setLatLngs(pts.slice(0, i + 1));
        await wait(i === end ? 0 : 120);
      }
      if (dead()) return;
      rest(true);
      await wait(500);
      if (dead()) return;
      unfocus(); fit(true, 1300);
      setRunning(false);
    };
    return { map, markers, pts, trail: (list) => progress.setLatLngs(list), fit, move, rest, drawAll, focus, unfocus, play, finish, legMs, at: () => at, isRunning: () => running, onState: (f) => { onState = f; } };
  };

  /* In the page */
  let inline = null;
  const initInline = async () => {
    if (inline) return;
    try {
      const L = await loadLeaflet();
      inline = createMap(L, $('#map-canvas'), false, 44);
      inline.fit(false);
      inline.onState((on) => { mapReplay.hidden = on; });
      // Plays once when the map comes into view, again each time the reader scrolls back to it, and stops when it leaves.
      let armed = true;
      const po = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.intersectionRatio >= 0.6 && armed) { armed = false; inline.play(); }
          else if (e.intersectionRatio === 0) { if (inline.isRunning()) inline.finish(); armed = true; }
        });
      }, { threshold: [0, 0.6] });
      po.observe(mapView);
    } catch (err) {
      mapFallback.hidden = false;
    }
  };
  new IntersectionObserver((entries, o) => {
    if (entries.some((e) => e.isIntersecting)) { o.disconnect(); initInline(); }
  }, { rootMargin: '600px 0px' }).observe(mapView);

  /* Full screen sheet with the step viewer */
  const mapSheet = $('#map-sheet');
  const mapTitle = $('#map-title');
  const mapDate = $('#map-date');
  const mapPlace = $('#map-place');
  const mapCount = $('#map-count');
  const mapPrev = $('#map-prev');
  const mapNext = $('#map-next');
  mapSheet.setAttribute('tabindex', '-1');
  let full = null;
  let cardH = 250;
  let current = 0;
  let moveId = 0;
  let inflight = false;
  let mapClosing = false;

  const selectStep = (i, { instant = false } = {}) => {
    const prev = current;
    current = Math.max(0, Math.min(LAST, i));
    const s = stepData[current];
    mapTitle.textContent = s.title;
    mapDate.textContent = s.date;
    mapPlace.textContent = s.place;
    mapCount.textContent = 'Step ' + (current + 1) + ' of ' + stepData.length;
    mapPrev.disabled = current === 0;
    mapNext.disabled = current === LAST;
    if (full) {
      full.rest(current === LAST);
      const ms = instant ? 0 : full.legMs(full.at(), s);
      // The ink trail shows the way travelled up to the selected step, and follows the dot between steps.
      const base = full.pts.slice(0, Math.min(prev, current) + 1);
      const id = (moveId += 1);
      const target = current;
      // A tap during a move cancels it and continues from the step we were heading to, so the trail never draws a stray segment.
      if (inflight) full.move({ lat: full.pts[prev][0], lng: full.pts[prev][1] }, 0);
      inflight = ms > 0;
      full.move({ lat: s.lat, lng: s.lng }, ms, () => { if (id === moveId) full.trail([...base, [full.at().lat, full.at().lng]]); }, () => id !== moveId)
        .then(() => { if (id === moveId) { inflight = false; full.trail(full.pts.slice(0, target + 1)); } });
      if (!instant) full.focus(current, true, ms);
    }
  };
  mapPrev.addEventListener('click', () => selectStep(current - 1));
  mapNext.addEventListener('click', () => selectStep(current + 1));

  const openMap = async () => {
    if (mapSheet.open) return;
    let L;
    try { L = await loadLeaflet(); } catch (err) { mapFallback.hidden = false; return; }
    mapClosing = false;
    history.pushState({ map: true }, '', '#map');
    mapSheet.showModal();
    mapSheet.focus({ preventScroll: true });
    if (!full) {
      cardH = $('.map-card').offsetHeight;
      mapSheet.style.setProperty('--card-h', cardH + 'px');
      full = createMap(L, $('#map-full'), true, cardH + 32);
      full.markers.forEach((m, i) => m.on('click', () => selectStep(i)));
    }
    full.map.invalidateSize();
    full.fit(false);
    full.unfocus();
    selectStep(0, { instant: true }); // opens at the first step with the whole route in view; Next walks forward to now
    void mapSheet.offsetHeight;
    mapSheet.classList.add('is-in');
  };
  const closeMapSheet = () => {
    if (!mapSheet.open || mapClosing) return;
    mapClosing = true;
    mapSheet.classList.remove('is-in');
    const done = () => { if (!mapClosing) return; mapClosing = false; mapSheet.close(); mapView.focus({ preventScroll: true }); };
    if (reduceMotion()) { done(); return; }
    mapSheet.addEventListener('transitionend', (e) => { if (e.target === mapSheet && e.propertyName === 'transform') done(); }, { once: true });
    setTimeout(done, 480);
  };
  // Closing goes through the history entry that opening added, so the system Back button closes the map too.
  const closeMap = () => { if (history.state && history.state.map) history.back(); else closeMapSheet(); };
  addEventListener('popstate', () => { if (mapSheet.open && !(history.state && history.state.map)) closeMapSheet(); });
  mapSheet.addEventListener('close', () => mapSheet.classList.remove('is-in'));
  mapSheet.addEventListener('cancel', (e) => { e.preventDefault(); closeMap(); });
  $('#map-close').addEventListener('click', closeMap);
  mapSheet.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); selectStep(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); selectStep(current + 1); }
  });
  mapView.addEventListener('click', openMap);
  mapView.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMap(); } });
  /* ---------- Video: nothing loads until the reader taps play, then the player replaces the card in place ---------- */
  $$('.video').forEach((fig) => {
    const btn = $('.video__play', fig);
    btn.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.className = 'video__frame';
      frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(fig.dataset.videoId) + '?autoplay=1&rel=0';
      frame.title = $('.video__title', fig).textContent.trim();
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      btn.replaceWith(frame);
    });
  });
})();
