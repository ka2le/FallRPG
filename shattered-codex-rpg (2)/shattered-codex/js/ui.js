'use strict';
(function () {
  const U = G.U;
  const UI = G.UI = { dirtyInv: true, dirtyQuests: true, panel: null, shakeAmt: 0 };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RCOL = { common: '#e8e2d2', magic: '#7fb2ff', rare: '#f2d45c', unique: '#f59a3c', potion: '#e8e2d2', quest: '#c3a8ff' };
  UI.RCOL = RCOL;
  const CS = 46; // inventory cell size
  let mapRot = null;
  const el = {};

  // ---------------- basic HUD helpers ----------------
  UI.msg = function (text, cls) {
    const log = el.log; if (!log) return;
    const d = document.createElement('div'); d.className = 'lm ' + (cls || ''); d.textContent = text;
    log.appendChild(d); while (log.children.length > 7) log.firstChild.remove();
    setTimeout(() => d.classList.add('fade'), 7000); setTimeout(() => d.remove(), 9000);
  };
  let toastT = null;
  UI.toast = function (text, cls) {
    const t = el.toast; t.className = 'show ' + (cls || ''); t.innerHTML = text;
    clearTimeout(toastT); toastT = setTimeout(() => t.className = '', 2600);
  };
  UI.hurt = function (f) { el.hurt.style.opacity = Math.min(0.8, 0.25 + f * 3); clearTimeout(UI._ht); UI._ht = setTimeout(() => el.hurt.style.opacity = 0, 180); UI.shake(Math.min(0.3, f * 2)); };
  UI.shake = a => { UI.shakeAmt = Math.max(UI.shakeAmt, a); };
  UI.flashMana = function () { el.mpBar.classList.remove('blink'); void el.mpBar.offsetWidth; el.mpBar.classList.add('blink'); };
  UI.castFlash = function (id) { const i = G.P.hotbar.indexOf(id); if (i >= 0 && el.slots[i]) { const s = el.slots[i]; s.classList.remove('pulse'); void s.offsetWidth; s.classList.add('pulse'); } };

  // ---------------- panels ----------------
  UI.isOpen = () => !!UI.panel;
  UI.open = function (name, arg) {
    if (document.pointerLockElement) document.exitPointerLock();
    G.Input.keys = {}; G.Input.held = {};
    UI.panel = name; UI.arg = arg; UI.sel = null; UI.openedAt = performance.now();
    el.overlay.classList.remove('hidden'); el.overlay.dataset.panel = name;
    render();
  };
  // re-grab mouse-look when a panel closes (the click/key that closed it counts as the user gesture)
  function relock() {
    if (G.touchMode || !G.started || G.P.dead || document.pointerLockElement) return;
    const c = document.getElementById('touchLayer');
    try { const r = c && c.requestPointerLock && c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { }
  }
  UI.relock = relock;
  UI.close = function () {
    if (UI.panel === 'death') return;
    UI.panel = null; UI.shop = null; UI.pickSel = null; el.overlay.classList.add('hidden'); el.panel.innerHTML = ''; hideTip();
    relock();
  };
  const forceClose = () => { UI.panel = null; UI.shop = null; UI.pickSel = null; el.overlay.classList.add('hidden'); el.panel.innerHTML = ''; hideTip(); relock(); };
  UI.toggle = function (name) { if (UI.panel === name) UI.close(); else if (!UI.panel || UI.panel !== 'death') UI.open(name); };
  UI.onKey = function (c) {
    if (c === 'Escape') { if (performance.now() - (UI.openedAt || 0) < 250) return true; if (UI.panel) UI.close(); else UI.open('pause'); return true; }
    if (UI.panel === 'death') return true;
    if (c === 'KeyI') { UI.toggle('inv'); return true; }
    if (c === 'KeyB' || c === 'KeyK') { UI.toggle('book'); return true; }
    if (c === 'KeyJ' || c === 'KeyL') { UI.toggle('quests'); return true; }
    if (c === 'KeyM') { UI.toggle('map'); return true; }
    if (UI.panel && c === 'KeyE' && UI.panel === 'dialog') { UI.close(); return true; }
    return false;
  };
  UI.showDeath = () => UI.open('death');
  UI.openPortal = () => UI.open('portal');
  // spell picks are never forced open: the player brings them up (✨ button, or the spellbook)
  UI.openPick = function () {
    if (G.P.pendingPicks <= 0 || G.P.dead) return;
    if (!UI.pickOpts || !UI.pickOpts.length || UI.pickLvl !== G.P.level) { UI.pickOpts = G.SP.offerFor(G.P.level); UI.pickLvl = G.P.level; }
    if (!UI.pickOpts.length) { G.P.pendingPicks = 0; return; }
    UI.pickSel = null;
    if (UI.panel) { UI.panel = 'pick'; el.overlay.dataset.panel = 'pick'; render(); } else UI.open('pick');
  };
  UI.checkSpellPick = function () { };

  function head(title) { return `<div class="ph"><span>${title}</span>${UI.panel === 'death' ? '' : '<button class="x" data-act="close">✕</button>'}</div>`; }
  function render() {
    const p = el.panel; hideTip();
    const f = { inv: renderInv, book: renderBook, quests: renderQuests, map: renderMap, dialog: renderDialog, pause: renderPause, death: renderDeath, pick: renderPick, portal: renderPortal }[UI.panel];
    p.className = 'panel p-' + UI.panel;
    if (f) f(p);
    fit();
  }
  UI.render = () => { if (UI.panel) render(); };
  function fit() {
    const p = el.panel; p.style.transform = 'none';
    const w = p.offsetWidth, h = p.offsetHeight; const vw = window.innerWidth - 12, vh = window.innerHeight - 12;
    const s = Math.min(1, vw / w, vh / h); p.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', () => { if (UI.panel) fit(); });

  // ---------------- tooltip ----------------
  function compareFor(it) {
    if (!it.slot) return null;
    if (it.slot === 'ring') return G.P.equip.ring1 || G.P.equip.ring2 || null;
    return G.P.equip[it.slot] || null;
  }
  function showTip(html, x, y) { const t = el.tip; t.innerHTML = html; t.style.display = 'block'; posTip(x, y); }
  function posTip(x, y) { const t = el.tip; const w = t.offsetWidth, h = t.offsetHeight; let px = x + 18, py = y + 12; if (px + w > innerWidth - 4) px = x - w - 18; if (py + h > innerHeight - 4) py = innerHeight - h - 4; t.style.left = Math.max(4, px) + 'px'; t.style.top = Math.max(4, py) + 'px'; }
  function hideTip() { if (el.tip) el.tip.style.display = 'none'; }
  function itemTip(it, cmp) { let h = G.Items.tooltip(it, cmp && cmp !== it ? cmp : null); if (it.shopPrice !== undefined && UI.shop && UI.shop.items.includes(it)) h += `<div class="tt-price">Price: ${it.shopPrice} gold</div>`; return h; }

  // ---------------- inventory / character ----------------
  const DOLL = ['ring1', 'head', 'amulet', 'weapon', 'body', 'offhand', 'gloves', 'belt', 'ring2', null, 'boots', null];
  const SLOT_ICON = { head: '🎩', amulet: '📿', weapon: '🥢', body: '👘', offhand: '🔮', gloves: '🧤', belt: '🎗️', ring1: '💍', ring2: '💍', boots: '👢' };
  function itemBox(it, extra) {
    const f = it.hue ? `filter:hue-rotate(${it.hue}deg) saturate(1.4);` : '';
    const bad = it.req && it.req > G.P.level ? ' toohigh' : '';
    return `<span class="ie" style="${f}">${it.e}</span>${it.stack > 1 ? `<span class="stk">${it.stack}</span>` : ''}${extra || ''}<span class="rb r-${it.rarity}${bad}"></span>`;
  }
  function renderInv(p) {
    const P = G.P, D = P.D;
    const shop = UI.shop;
    let left = '';
    if (shop) {
      left = `<div class="shop" data-drop="shop"><div class="sh-title">${esc(shop.npc.name)}'s wares</div><div class="sh-hint">Drag items here or right-click to sell</div><div class="sh-list">` +
        shop.items.map((it, i) => `<div class="sh-it${UI.sel && UI.sel.from === 'shop' && UI.sel.i === i ? ' sel' : ''}" data-shop="${i}"><div class="sh-ic">${itemBox(it)}</div><div class="sh-n" style="color:${RCOL[it.rarity]}">${esc(it.name)}${it.buyback ? ' <em>(sold)</em>' : ''}</div><div class="sh-p${P.gold < it.shopPrice ? ' neg' : ''}">${it.shopPrice}g</div></div>`).join('') + `</div></div>`;
    } else {
      left = `<div class="doll">` + DOLL.map(s => {
        if (!s) return '<div></div>';
        const it = P.equip[s];
        return `<div class="slot${it ? '' : ' empty'}${UI.sel && UI.sel.from === 'eq' && UI.sel.slot === s ? ' sel' : ''}" data-slot="${s}" style="grid-area:${s}">${it ? itemBox(it) : `<span class="ghosticon">${SLOT_ICON[s]}</span>`}<span class="sl">${G.Items.SLOT_NAMES[s]}</span></div>`;
      }).join('') + `</div>` + renderStats();
    }
    const items = P.inv.map(e => `<div class="gi${UI.sel && UI.sel.uid === e.it.uid ? ' sel' : ''}" data-uid="${e.it.uid}" style="left:${e.x * CS}px;top:${e.y * CS}px;width:${e.it.w * CS}px;height:${e.it.h * CS}px">${itemBox(e.it)}</div>`).join('');
    let cells = ''; for (let y = 0; y < 6; y++) for (let x = 0; x < 10; x++) cells += `<div class="cell" style="left:${x * CS}px;top:${y * CS}px"></div>`;
    p.innerHTML = head(shop ? 'Trade' : 'Character') +
      `<div class="inv-body${UI.showDer ? ' der' : ''}"><div class="inv-left">${left}</div><div class="inv-right">
        <div class="grid" style="width:${10 * CS}px;height:${6 * CS}px">${cells}${items}</div>
        <div class="inv-foot"><span class="gold">🪙 ${U.fmt(P.gold)}</span><button class="dtog" data-act="der">📊</button><span class="lvl">Level ${P.level} · ${P.statPts ? `<b class="pts">${P.statPts} point${P.statPts > 1 ? "s" : ""} to spend</b>` : 'XP ' + U.fmt(P.xp) + ' / ' + U.fmt(G.xpNext(P.level))}</span></div>
        <div class="selbox">${selInfo()}</div></div></div>`;
    bindInv(p);
  }
  function renderStats() {
    const P = G.P, D = P.D;
    const pct = v => (v * 100).toFixed(1).replace('.0', '') + '%';
    const arm = D.armor / (D.armor + 30 + 12 * P.level);
    let h = '<div class="stats"><div class="st-attrs">';
    G.STAT_KEYS.forEach(k => {
      const base = P.alloc[k] + P.bonus[k], tot = D.attr[k];
      h += `<div class="sa" title="${G.STATS[k].d}"><span class="san">${G.STATS[k].n}</span><span class="sav">${tot}${tot !== base ? `<small> (${base})</small>` : ''}</span>${P.statPts ? `<button class="plus" data-stat="${k}">+</button>` : ''}<div class="sad">${G.STATS[k].d}</div></div>`;
    });
    h += '</div><div class="st-der">';
    const rows = [['Health', `${Math.round(P.hp)} / ${D.maxHp}`], ['Mana', `${Math.round(P.mana)} / ${D.maxMana}`], ['Health regen', D.hpRegen.toFixed(1) + '/s'], ['Mana regen', D.manaRegen.toFixed(2) + '/s'],
      ['Spell damage', '+' + pct(D.spellPower)], ['Cast speed', (D.haste >= 0 ? '+' : '') + pct(D.haste)], ['Critical chance', pct(D.crit)], ['Critical damage', pct(D.critMult)],
      ['Move speed', pct(D.moveMul)], ['Armor', `${Math.round(D.armor)} (−${pct(arm)} phys.)`], ['Magic resist', pct(D.resist)], ['Dodge', pct(D.dodge)]];
    if (D.manaCost) rows.push(['Mana cost', '−' + pct(D.manaCost)]);
    for (const k in D.school) if (D.school[k]) rows.push([k[0].toUpperCase() + k.slice(1) + ' damage', '+' + pct(D.school[k])]);
    h += rows.map(r => `<div class="sd"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
    const sp = Object.keys(D.specials); if (sp.length) h += '<div class="sd-sp">' + sp.map(s => { const u = G.Items.UNIQUES.find(u => u.id === s); return `<div>✦ ${esc(u.sp)}</div>`; }).join('') + '</div>';
    return h + '</div></div>';
  }
  function selItem() {
    const s = UI.sel; if (!s) return null;
    if (s.from === 'inv') { const e = G.Inv.get(s.uid); return e ? e.it : null; }
    if (s.from === 'eq') return G.P.equip[s.slot] || null;
    if (s.from === 'shop') return UI.shop && UI.shop.items[s.i] || null;
  }
  function selInfo() {
    const it = selItem(); if (!it) return `<div class="hint">${G.touchMode ? 'Tap an item to inspect it. Drag items to move or equip them.' : 'Hover to inspect. Drag to move/equip · Right-click to equip/use' + (UI.shop ? '/sell' : '') + ' · Double-click to use.'}</div>`;
    const s = UI.sel; let btn = '';
    if (s.from === 'inv') {
      if (it.potion) btn += `<button data-act="use">Drink</button>`;
      else if (it.slot) { btn += `<button data-act="equip">Equip</button>`; if (it.slot === 'ring') btn += `<button data-act="equip2">Equip (ring 2)</button>`; }
      if (UI.shop && !it.quest) btn += `<button data-act="sell">Sell for ${G.Items.sellPrice(it)}g</button>`;
      if (!it.quest) btn += `<button class="danger" data-act="destroy">${UI.confirmDestroy === it.uid ? 'Really destroy?' : 'Destroy'}</button>`;
    } else if (s.from === 'eq') btn = `<button data-act="unequip">Unequip</button>`;
    else if (s.from === 'shop') { btn = `<button data-act="buy">Buy (${it.shopPrice}g)</button>`; if (it.potion) btn += `<button data-act="buy5">Buy ×5 (${it.shopPrice * 5}g)</button>`; }
    return `<div class="seltip">${itemTip(it, s.from !== 'eq' ? compareFor(it) : null)}</div><div class="selbtn">${btn}</div>`;
  }
  function doAct(act) {
    const P = G.P, s = UI.sel, it = selItem();
    if (act === 'close') { UI.close(); return; }
    if (act === 'der') { UI.showDer = !UI.showDer; render(); return; }
    if (!it) return;
    if (act === 'use') G.Inv.use(s.uid);
    else if (act === 'equip') G.Inv.equip(s.uid);
    else if (act === 'equip2') G.Inv.equip(s.uid, 'ring2');
    else if (act === 'unequip') { G.Inv.unequip(s.slot); UI.sel = null; }
    else if (act === 'sell') sell(s.uid);
    else if (act === 'destroy') { if (UI.confirmDestroy === it.uid) { G.Inv.remove(it.uid); UI.sel = null; UI.confirmDestroy = null; } else UI.confirmDestroy = it.uid; }
    else if (act === 'buy') buy(s.i, 1);
    else if (act === 'buy5') buy(s.i, 5);
    if (act !== 'destroy') UI.confirmDestroy = null;
    if (s && s.from === 'inv' && !G.Inv.get(s.uid)) UI.sel = null;
    render();
  }
  function sell(uid) {
    const e = G.Inv.get(uid); if (!e || e.it.quest) return;
    const price = G.Items.sellPrice(e.it); G.P.gold += price; G.Inv.remove(uid);
    const it = e.it; it.shopPrice = price; it.buyback = true;
    if (!it.potion) UI.shop.items.push(it);
    UI.msg('Sold ' + it.name + ' for ' + price + ' gold.', 'gold');
    if (UI.sel && UI.sel.uid === uid) UI.sel = null;
  }
  function buy(i, n) {
    const it = UI.shop.items[i]; if (!it) return;
    for (let k = 0; k < n; k++) {
      if (G.P.gold < it.shopPrice) { UI.msg('Not enough gold.', 'warn'); break; }
      const copy = it.potion ? G.Items.potion(it.potion.kind, it.potion.tier, 1) : it;
      if (!G.Inv.add(copy)) { UI.msg('Your pack is full.', 'warn'); break; }
      G.P.gold -= it.shopPrice;
      if (!it.potion) { UI.shop.items.splice(i, 1); delete it.shopPrice; delete it.buyback; UI.sel = null; UI.msg('Bought ' + it.name + '.', it.rarity); break; }
    }
  }
  let lastTap = { t: 0, key: null };
  function bindInv(p) {
    p.querySelectorAll('[data-act]').forEach(b => b.onclick = e => { e.stopPropagation(); doAct(b.dataset.act); });
    p.querySelectorAll('[data-stat]').forEach(b => b.onclick = e => {
      e.stopPropagation(); const n = e.shiftKey ? G.P.statPts : 1; G.P.alloc[b.dataset.stat] += n; G.P.statPts -= n;
      const hpF = G.P.hp / G.P.D.maxHp; G.P.recalc(); if (b.dataset.stat === 'vitality') G.P.hp = Math.min(G.P.D.maxHp, G.P.hp + 12 * n); render();
    });
    const drag = (node, src) => {
      node.addEventListener('pointerdown', e => {
        if (e.button === 2) return;
        if (src.from !== 'shop') e.preventDefault(); hideTip();
        const r = node.getBoundingClientRect(); const it = src.item();
        if (!it) return;
        const cw = r.width / (src.from === 'inv' ? it.w : 1);
        const st = { x: e.clientX, y: e.clientY, dragging: false, ox: src.from === 'inv' ? Math.floor((e.clientX - r.left) / cw) : 0, oy: src.from === 'inv' ? Math.floor((e.clientY - r.top) / cw) : 0 };
        const move = ev => {
          if (!st.dragging && Math.hypot(ev.clientX - st.x, ev.clientY - st.y) > 7 && src.from !== 'shop') {
            st.dragging = true; node.style.opacity = 0.3;
            const sc = el.panel.getBoundingClientRect().width / el.panel.offsetWidth;
            el.ghost.innerHTML = itemBox(it); el.ghost.style.width = (src.from === 'inv' ? it.w : Math.min(it.w, 2)) * CS * sc + 'px'; el.ghost.style.height = (src.from === 'inv' ? it.h : Math.min(it.h, 2)) * CS * sc + 'px'; el.ghost.style.display = 'flex';
            st.gx = st.ox * CS * sc + CS * sc / 2; st.gy = st.oy * CS * sc + CS * sc / 2;
          }
          if (st.dragging) { el.ghost.style.left = (ev.clientX - st.gx) + 'px'; el.ghost.style.top = (ev.clientY - st.gy) + 'px'; }
        };
        const up = ev => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
          el.ghost.style.display = 'none'; node.style.opacity = '';
          if (!st.dragging) {
            const key = src.key; const now = performance.now();
            if (lastTap.key === key && now - lastTap.t < 380) { lastTap.key = null; quick(src); render(); return; }
            lastTap = { t: now, key };
            UI.sel = src.sel; UI.confirmDestroy = null; render(); return;
          }
          const t = document.elementFromPoint(ev.clientX, ev.clientY);
          if (t) dropOn(t, ev, src, st);
          render();
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      });
      node.addEventListener('contextmenu', e => { e.preventDefault(); quick(src); render(); });
      node.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { const it = src.item(); if (it) showTip(itemTip(it, src.from !== 'eq' ? compareFor(it) : null), e.clientX, e.clientY); } });
      node.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && el.tip.style.display === 'block') posTip(e.clientX, e.clientY); });
      node.addEventListener('pointerleave', hideTip);
    };
    p.querySelectorAll('.gi').forEach(n => { const uid = n.dataset.uid; drag(n, { from: 'inv', uid, key: 'i' + uid, sel: { from: 'inv', uid }, item: () => (G.Inv.get(uid) || {}).it }); });
    p.querySelectorAll('.slot').forEach(n => { const slot = n.dataset.slot; if (G.P.equip[slot]) drag(n, { from: 'eq', slot, key: 'e' + slot, sel: { from: 'eq', slot }, item: () => G.P.equip[slot] }); });
    p.querySelectorAll('.sh-it').forEach(n => { const i = +n.dataset.shop; drag(n, { from: 'shop', i, key: 's' + i + UI.shop.items[i].uid, sel: { from: 'shop', i }, item: () => UI.shop.items[i] }); });
  }
  function quick(src) {
    if (src.from === 'inv') { const e = G.Inv.get(src.uid); if (!e) return; if (UI.shop && !e.it.potion && !e.it.quest) sell(src.uid); else G.Inv.use(src.uid); }
    else if (src.from === 'eq') G.Inv.unequip(src.slot);
    else if (src.from === 'shop') buy(src.i, 1);
    UI.sel = null;
  }
  function dropOn(t, ev, src, st) {
    const slotEl = t.closest('[data-slot]'), grid = t.closest('.grid'), shop = t.closest('[data-drop="shop"]');
    if (slotEl && src.from === 'inv') { G.Inv.equip(src.uid, slotEl.dataset.slot); UI.sel = null; return; }
    if (slotEl && src.from === 'eq') {
      const a = src.slot, b = slotEl.dataset.slot;
      if (a !== b && a.startsWith('ring') && b.startsWith('ring')) { const P = G.P; [P.equip[a], P.equip[b]] = [P.equip[b], P.equip[a]]; if (!P.equip[a]) delete P.equip[a]; P.recalc(); }
      return;
    }
    if (grid) {
      const r = grid.getBoundingClientRect(); const cw = r.width / 10;
      const gx = Math.floor((ev.clientX - r.left) / cw) - st.ox, gy = Math.floor((ev.clientY - r.top) / cw) - st.oy;
      if (src.from === 'inv') { if (!G.Inv.move(src.uid, gx, gy)) { const e = G.Inv.get(src.uid); /* potion stacking */ } }
      else if (src.from === 'eq') G.Inv.unequip(src.slot, gx, gy);
      return;
    }
    if (shop && src.from === 'inv') sell(src.uid);
  }

  // ---------------- shop ----------------
  const shopCache = {};
  UI.openShop = function (npc) {
    const lvl = G.P.level; let c = shopCache[npc.id];
    if (!c || Math.abs(c.lvl - lvl) >= 2 || G.now - c.t > 600) { c = shopCache[npc.id] = { lvl, t: G.now, items: G.Items.shopStock(npc.shop, lvl + (npc.shop === 'magic' ? 1 : 0)) }; }
    UI.shop = { npc, items: c.items };
    UI.open('inv'); UI.shop = { npc, items: c.items }; render();
  };

  // ---------------- spellbook ----------------
  function renderBook(p) {
    const P = G.P, S = G.SP;
    const known = Object.keys(P.spells);
    const bar = P.hotbar.map((id, i) => `<div class="hs${UI.selSpell && P.hotbar[i] === UI.selSpell ? ' on' : ''}" data-hot="${i}"><span class="hk">${i === 9 ? 0 : i + 1}</span>${id ? `<span class="hi">${S.defs[id].e}</span><button class="clr" data-clr="${i}">✕</button>` : ''}</div>`).join('');
    const cards = known.map(id => {
      const d = S.defs[id], r = P.spells[id];
      return `<div class="sc${UI.selSpell === id ? ' sel' : ''}" data-spell="${id}"><div class="sci" style="--sc:#${S.SCH_COL[d.school].toString(16).padStart(6, '0')}">${d.e}</div><div class="scb"><div class="scn">${d.n} ${d.maxRank > 1 ? `<span class="rk">Rank ${r}/${d.maxRank}</span>` : ''}</div>
        <div class="scm">${d.mana ? S.costOf(id) + (P.D.specials.bloodpact ? ' health' : ' mana') : 'Free'}${d.cd ? ' · ' + (d.cd * P.D.cdMul).toFixed(1) + 's cooldown' : ''} · ${d.school}</div><div class="scd">${d.desc(r)}</div></div></div>`;
    }).join('');
    p.innerHTML = head('Spellbook') + (P.pendingPicks > 0 ? `<div class="bk-learn"><span>✨ The Art deepens — you can learn ${P.pendingPicks > 1 ? P.pendingPicks + ' new spells' : 'a new spell'}.</span><button data-act="pick">Choose spell</button></div>` : '') + `<div class="bk-hint">${G.touchMode ? 'Tap a spell, then tap a hotbar slot to bind it.' : 'Click a spell then a slot — or drag it onto a slot. Keys 1–0 cast; left/right mouse cast slots 1 and 2.'}</div><div class="hotrow">${bar}</div><div class="cards">${cards}</div>`;
    const pb = p.querySelector('[data-act=pick]'); if (pb) pb.onclick = () => UI.openPick();
    p.querySelectorAll('[data-clr]').forEach(b => b.onclick = e => { e.stopPropagation(); P.hotbar[+b.dataset.clr] = null; render(); });
    p.querySelectorAll('[data-hot]').forEach(h => h.onclick = () => { if (UI.selSpell) assign(UI.selSpell, +h.dataset.hot); });
    p.querySelectorAll('[data-spell]').forEach(c => {
      c.addEventListener('pointerdown', e => {
        const id = c.dataset.spell; const st = { x: e.clientX, y: e.clientY, drag: false };
        const mv = ev => { if (!st.drag && Math.hypot(ev.clientX - st.x, ev.clientY - st.y) > 8) { st.drag = true; el.ghost.innerHTML = `<span class="ie">${S.defs[id].e}</span>`; el.ghost.style.width = el.ghost.style.height = '48px'; el.ghost.style.display = 'flex'; } if (st.drag) { el.ghost.style.left = ev.clientX - 24 + 'px'; el.ghost.style.top = ev.clientY - 24 + 'px'; } };
        const up = ev => {
          window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); el.ghost.style.display = 'none';
          if (st.drag) { const t = document.elementFromPoint(ev.clientX, ev.clientY); const h = t && t.closest('[data-hot]'); if (h) assign(id, +h.dataset.hot); }
          else { UI.selSpell = UI.selSpell === id ? null : id; render(); }
        };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
    });
    p.querySelector('[data-act=close]').onclick = UI.close;
  }
  function assign(id, i) {
    const P = G.P; const old = P.hotbar.indexOf(id);
    if (old >= 0) P.hotbar[old] = P.hotbar[i];
    P.hotbar[i] = id; UI.selSpell = null; render();
  }

  // ---------------- quests ----------------
  function renderQuests(p) {
    const Q = G.Quests;
    const act = Q.active();
    const done = G.QUESTS.filter(q => Q.st(q.id) === 'done');
    const card = q => `<div class="qc${q.main ? ' main' : ''}"><div class="qt">${q.main ? '📜 ' : ''}${esc(q.title)}${Q.st(q.id) === 'ready' ? ' <span class="rdy">Ready to turn in</span>' : ''}</div><div class="qp">${esc(Q.progText(q))}</div><div class="qd">${esc(q.intro)}</div><div class="qr">Reward: ${rewardText(q)} · from ${Q.npcName(q.giver)}</div></div>`;
    p.innerHTML = head('Quest Journal') + `<div class="ql">${act.length ? act.map(card).join('') : '<div class="hint">No active quests. Look for villagers marked with <b>!</b></div>'}
      ${done.length ? `<div class="qdone"><div class="qdh">Completed (${done.length})</div>${done.map(q => `<div>✔ ${esc(q.title)}</div>`).join('')}</div>` : ''}</div>`;
    p.querySelector('[data-act=close]').onclick = UI.close;
  }
  function rewardText(q) {
    const r = q.reward; const a = [];
    if (r.xp) a.push(U.fmt(r.xp) + ' XP'); if (r.gold) a.push(r.gold + ' gold');
    if (r.item) a.push(`<span style="color:${RCOL[r.item.rarity]}">${r.item.rarity} ${r.item.slot || 'item'}</span>`);
    if (r.potions) a.push('potions');
    [r.spell, r.spell2].forEach(s => s && a.push(`<b class="sp">spell: ${G.SP.defs[s].n}</b>`));
    return a.join(', ');
  }

  // ---------------- map ----------------
  UI.mapXY = (x, z, S) => [(z + G.W.HALF) / (2 * G.W.HALF) * S, (G.W.HALF - x) / (2 * G.W.HALF) * S];
  function getMapRot() {
    if (mapRot) return mapRot;
    const S = 512; const c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d');
    ctx.translate(0, S); ctx.rotate(-Math.PI / 2); ctx.drawImage(G.W.mapCanvas, 0, 0);
    mapRot = c; return c;
  }
  function renderMap(p) {
    const S = Math.floor(Math.min(innerWidth - 40, innerHeight - 90, 900));
    p.innerHTML = head('Map of the Realm') + `<canvas id="bigmap" width="${S}" height="${S}"></canvas><div class="legend">▲ You · 🏠 Village · ☠ Boss lair · ✦ Shrine · ⭐ Quest target · 📍 Beacon</div>`;
    p.querySelector('[data-act=close]').onclick = UI.close;
    drawMap(p.querySelector('#bigmap'), S);
  }
  function drawMap(cv, S) {
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(getMapRot(), 0, 0, S, S);
    const xy = (x, z) => UI.mapXY(x, z, S);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lab = (t, x, y, col, size, ital) => { ctx.font = `${ital ? 'italic ' : 'bold '}${size}px Palatino Linotype,Book Antiqua,Palatino,Georgia,serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); };
    const fs = Math.max(10, S / 60);
    G.REGIONS.forEach(r => { const [x, y] = xy(r.x, r.z); lab(r.name, x, y + fs * 1.6, 'rgba(240,230,200,.8)', fs * 0.9, true); });
    G.SHRINES.forEach((s, i) => { const [x, y] = xy(s.x, s.z); lab('✦', x, y, G.S.shrines['s' + i] ? '#777' : '#7fd4ff', fs * 1.2); });
    G.BOSSES.forEach(b => {
      const q = G.Quests.active().find(q => q.obj.kind === 'boss' && q.obj.boss === b.id);
      if (!q && !G.S.bossKilled[b.id] && U.d2(G.P.pos.x, G.P.pos.z, b.x, b.z) > 120) return;
      const [x, y] = xy(b.x, b.z); lab('☠', x, y, G.S.bossKilled[b.id] ? '#888' : '#ff5a3a', fs * 1.3);
      lab(b.name + ' (' + b.level + ')', x, y - fs * 1.2, G.S.bossKilled[b.id] ? '#999' : '#ffb09a', fs * 0.75);
    });
    G.VILLAGES.forEach(v => { const [x, y] = xy(v.x, v.z); lab('🏠', x, y, '#fff', fs * 1.3); lab(v.name, x, y - fs * 1.3, G.P.visited[v.id] ? '#ffe9a8' : '#bbb', fs); });
    G.Quests.active().forEach(q => { const t = G.Quests.targetPos(q); if (!t) return; const [x, y] = xy(t.x, t.z); lab('⭐', x + fs, y + fs * 0.2, '#ffd84a', fs * 1.1); });
    if (G.P.beacon) { const [x, y] = xy(G.P.beacon.x, G.P.beacon.z); lab('📍', x, y, '#fff', fs); }
    const [px, py] = xy(G.P.pos.x, G.P.pos.z); arrow(ctx, px, py, fs * 0.9);
    lab('N', S / 2, fs, '#fff', fs * 1.2);
  }
  function arrow(ctx, x, y, s) {
    const f = G.P.forward(); const a = Math.atan2(f.z, f.x);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, -s * 1.2); ctx.lineTo(s * 0.8, s * 0.8); ctx.lineTo(0, s * 0.35); ctx.lineTo(-s * 0.8, s * 0.8); ctx.closePath();
    ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function drawMinimap() {
    const cv = el.mini, ctx = cv.getContext('2d'), S = cv.width; const P = G.P; const R = 130; // world units radius
    const src = getMapRot(); const ss = src.width;
    const [cx, cy] = UI.mapXY(P.pos.x, P.pos.z, ss); const sr = R / (2 * G.W.HALF) * ss;
    ctx.clearRect(0, 0, S, S); ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, 7); ctx.clip();
    ctx.fillStyle = '#0d2238'; ctx.fillRect(0, 0, S, S);
    ctx.drawImage(src, cx - sr, cy - sr, sr * 2, sr * 2, 0, 0, S, S);
    const k = S / (2 * R);
    const pt = (x, z) => [S / 2 + (z - P.pos.z) * k, S / 2 - (x - P.pos.x) * k];
    const dot = (x, z, col, r) => { const [a, b] = pt(x, z); if (Math.hypot(a - S / 2, b - S / 2) > S / 2 - 3) return; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1; ctx.stroke(); };
    G.W.chests.forEach(c => { if (!c.opened && U.d2(c.x, c.z, P.pos.x, P.pos.z) < R) dot(c.x, c.z, '#c8943a', 2.5); });
    G.W.shrines.forEach(s => { if (U.d2(s.x, s.z, P.pos.x, P.pos.z) < R) dot(s.x, s.z, s.used ? '#666' : '#7fd4ff', 3.5); });
    G.W.npcs.forEach(n => { if (U.d2(n.x, n.z, P.pos.x, P.pos.z) < R) dot(n.x, n.z, n.marker ? '#ffd84a' : '#f4ecd0', n.marker ? 3.5 : 2.2); });
    G.E.monsters.forEach(m => { if (!m.dead) dot(m.pos.x, m.pos.z, m.boss ? '#ff3a1a' : m.elite ? '#ffb020' : '#e0443a', m.boss ? 5 : m.elite ? 3.2 : 2.3); });
    G.E.bags.forEach(b => dot(b.x, b.z, '#ffe98a', 2));
    // quest target direction on rim
    G.Quests.active().forEach(q => {
      const t = G.Quests.targetPos(q); if (!t) return; let [a, b] = pt(t.x, t.z); const dx = a - S / 2, dy = b - S / 2, d = Math.hypot(dx, dy);
      if (d > S / 2 - 8) { a = S / 2 + dx / d * (S / 2 - 8); b = S / 2 + dy / d * (S / 2 - 8); }
      ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', a, b);
    });
    ctx.restore();
    arrow(ctx, S / 2, S / 2, 6);
    ctx.font = 'bold 12px Georgia,serif'; ctx.fillStyle = '#f2d45c'; ctx.textAlign = 'center'; ctx.fillText('N', S / 2, 11);
  }

  // ---------------- dialog ----------------
  function renderDialog(p) {
    const npc = UI.arg; const def = npc.def; const Q = G.Quests;
    const view = UI.dview || { k: 'main' };
    let text = '', opts = '';
    if (view.k === 'main') {
      text = Q.GREET[def.id] || 'Well met, traveler.';
      const os = Q.optionsFor(def.id);
      os.forEach((o, i) => {
        if (o.kind === 'offer') opts += `<button data-o="${i}"><b class="qm">!</b> ${esc(o.q.title)}${o.q.main ? ' <em>(main quest)</em>' : ''}</button>`;
        if (o.kind === 'turnin') opts += `<button data-o="${i}"><b class="qm">?</b> ${esc(o.q.title)} — complete</button>`;
        if (o.kind === 'progress') opts += `<button data-o="${i}">… ${esc(o.q.title)}</button>`;
      });
      if (def.shop) opts += `<button data-o="shop">🛒 ${def.shop === 'armor' ? 'Browse armor and wards' : def.shop === 'magic' ? 'Browse enchanted wares' : 'Browse wares and potions'}</button>`;
      opts += `<button data-o="bye">Farewell</button>`;
      UI._opts = os;
    } else if (view.k === 'offer') {
      text = view.q.intro + `<div class="dq-rew">Reward: ${rewardText(view.q)}</div>`;
      opts = `<button data-o="accept">Accept</button><button data-o="back">Not now</button>`;
    } else if (view.k === 'turnin') {
      text = view.q.doneText + `<div class="dq-rew">Reward: ${rewardText(view.q)}</div>`;
      opts = `<button data-o="claim">Claim reward</button>`;
    } else if (view.k === 'progress') {
      text = view.q.intro + `<div class="dq-rew">${esc(Q.progText(view.q))}</div>`;
      opts = `<button data-o="back">I'll get to it</button>`;
    }
    p.innerHTML = `<div class="dlg"><div class="dnpc"><div class="dface">${def.e}</div><div class="dname">${esc(def.name)}</div></div><div class="dtext">${text}</div><div class="dopts">${opts}</div></div>`;
    p.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
      const o = b.dataset.o;
      if (o === 'bye') { UI.dview = null; UI.close(); return; }
      if (o === 'shop') { UI.dview = null; UI.openShop(def); return; }
      if (o === 'back') UI.dview = { k: 'main' };
      else if (o === 'accept') { Q.accept(view.q.id); UI.dview = { k: 'main' }; }
      else if (o === 'claim') { Q.complete(view.q.id); UI.dview = { k: 'main' }; }
      else { const op = UI._opts[+o]; UI.dview = { k: op.kind, q: op.q }; }
      render();
    });
  }

  // ---------------- misc panels ----------------
  function renderPause(p) {
    const st = G.settings;
    p.innerHTML = head('Paused') + `<div class="pm">
      <button data-p="resume">Resume</button><button data-p="save">Save game</button>
      <label>Mouse sensitivity <input type="range" min="0.0006" max="0.006" step="0.0002" value="${st.sens}" data-s="sens"></label>
      <label>Touch look sensitivity <input type="range" min="0.002" max="0.014" step="0.0005" value="${st.touchSens}" data-s="touchSens"></label>
      <label class="cb"><input type="checkbox" ${st.invertY ? 'checked' : ''} data-s="invertY"> Invert look Y</label>
      <label>View distance <select data-s="viewDist"><option value="0.7">Near (faster)</option><option value="1">Normal</option><option value="1.4">Far</option></select></label>
      <div class="help">${helpHtml()}</div>
      <button data-p="quit" class="danger">Save &amp; quit to title</button></div>`;
    p.querySelector('select').value = String(st.viewDist);
    p.querySelector('[data-act=close]').onclick = UI.close;
    p.querySelectorAll('[data-s]').forEach(i => i.onchange = i.oninput = () => { const k = i.dataset.s; st[k] = i.type === 'checkbox' ? i.checked : +i.value; G.saveSettings(); if (k === 'viewDist') G.applyView(); });
    p.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      const a = b.dataset.p;
      if (a === 'resume') UI.close();
      if (a === 'save') { G.save(); UI.msg('Game saved.', 'info'); UI.close(); }
      if (a === 'quit') { G.save(); location.reload(); }
    });
  }
  function helpHtml() {
    return `<b>Desktop:</b> WASD move · Mouse look (click to capture) · Left/Right click cast slots 1/2 · 1–0 cast · Space jump / fly up · C fly down · E interact · Q/R potions · I character · B spellbook · J quests · M map · Esc pause<br>
      <b>Touch:</b> drag left side to walk (up = forward) · drag right side to look · tap hotbar to cast · buttons for jump, potions, interact and menus`;
  }
  function renderDeath(p) {
    p.innerHTML = `<div class="death"><div class="dt">You have fallen</div><div class="dd">Your spirit returns to ${G.VILLAGES.find(v => v.id === G.P.lastVillage).name}, but some of your gold is lost on the way.</div><button data-act="rise">Rise again</button></div>`;
    p.querySelector('[data-act=rise]').onclick = () => { forceClose(); G.P.respawn(); };
  }
  function renderPick(p) {
    const P = G.P, S = G.SP;
    p.innerHTML = head(`Choose a spell${P.pendingPicks > 1 ? ` (${P.pendingPicks} to choose)` : ''}`) + `<div class="pick-sub">The Art deepens within you. Select a new spell or strengthen one you know, then confirm.</div><div class="picks">` +
      UI.pickOpts.map(id => { const d = S.defs[id]; const r = P.spells[id] || 0;
        return `<div class="pk${UI.pickSel === id ? ' sel' : ''}" data-pk="${id}"><div class="pki" style="--sc:#${S.SCH_COL[d.school].toString(16).padStart(6, '0')}">${d.e}</div><div class="pkn">${d.n}</div><div class="pkr">${r ? `Rank ${r} → ${r + 1}` : '<b>New spell</b>'} · ${d.school}</div><div class="pkm">${d.mana ? S.baseCost(id) + ' mana' : 'Free'}${d.cd ? ' · ' + d.cd + 's cd' : ''}</div><div class="pkd">${d.desc(r + 1)}</div></div>`; }).join('') +
      `</div><div class="pick-foot"><button class="later" data-act="later">Decide later</button><button class="learn" data-act="learn" ${UI.pickSel ? '' : 'disabled'}>${UI.pickSel ? 'Learn ' + S.defs[UI.pickSel].n : 'Select a spell'}</button></div>`;
    p.querySelectorAll('[data-pk]').forEach(c => c.onclick = () => { UI.pickSel = c.dataset.pk; render(); });
    p.querySelector('[data-act=later]').onclick = () => UI.close();
    p.querySelector('[data-act=learn]').onclick = () => {
      if (!UI.pickSel) return;
      S.learn(UI.pickSel); P.pendingPicks--; UI.pickSel = null; UI.pickOpts = null;
      G.FX.burst(new THREE.Vector3(P.pos.x, P.pos.y + 1.2, P.pos.z), 0xb890ff, 40, 5, 1, 0.9, -1);
      if (P.pendingPicks > 0) UI.openPick(); else UI.close();
    };
  }
  function renderPortal(p) {
    const vs = G.VILLAGES.filter(v => G.P.visited[v.id]);
    p.innerHTML = head('Town Portal') + `<div class="pm">${vs.map(v => `<button data-v="${v.id}">🏘️ ${v.name}</button>`).join('')}<div class="hint">Costs ${G.SP.costOf('town_portal')} mana.</div></div>`;
    p.querySelector('[data-act=close]').onclick = UI.close;
    p.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { forceClose(); G.SP.payPortal(b.dataset.v); });
  }

  // ---------------- interaction ----------------
  let near = null;
  function findNear() {
    const P = G.P; let best = null, bd = 1e9;
    const consider = (d, o) => { if (d < bd) { bd = d; best = o; } };
    G.W.npcs.forEach(n => { const d = U.d2(P.pos.x, P.pos.z, n.x, n.z); if (d < 4.2) consider(d, { k: 'npc', o: n, t: (G.touchMode ? '' : 'E — ') + 'Talk to ' + n.def.name }); });
    G.W.chests.forEach(c => { if (c.opened) return; const d = U.d2(P.pos.x, P.pos.z, c.x, c.z); if (d < 3.5) consider(d, { k: 'chest', o: c, t: (G.touchMode ? '' : 'E — ') + 'Open chest' }); });
    G.W.shrines.forEach(s => { if (s.used) return; const d = U.d2(P.pos.x, P.pos.z, s.x, s.z); if (d < 4.5) consider(d, { k: 'shrine', o: s, t: (G.touchMode ? '' : 'E — ') + 'Pray at the Shrine of ' + G.STATS[s.stat].n }); });
    return best;
  }
  UI.interact = function () {
    if (!near || G.P.dead) return;
    const o = near.o;
    if (near.k === 'npc') { UI.dview = { k: 'main' }; UI.open('dialog', o); }
    else if (near.k === 'chest') UI.openChest(o);
    else if (near.k === 'shrine') {
      o.used = true; G.S.shrines[o.id] = true; G.P.bonus[o.stat] += 1; G.P.recalc();
      G.FX.burst(new THREE.Vector3(o.x, o.y + 2.6, o.z), 0x7fd4ff, 80, 6, 1.2, 1.2, -2);
      UI.toast('+1 ' + G.STATS[o.stat].n, 'level'); UI.msg('The shrine blesses you: +1 ' + G.STATS[o.stat].n + ' permanently.', 'gold');
    }
  };
  const chestAnims = [];
  UI.openChest = function (c, silent) {
    if (c.boss && !silent) { const bid = c.id.slice(3); if (!G.S.bossKilled[bid]) { UI.msg('The chest is sealed by dark magic. Its guardian still lives.', 'warn'); return; } }
    c.opened = true; G.S.chests[c.id] = true;
    if (silent) { c.mesh.userData.lid.rotation.x = -1.9; return; }
    chestAnims.push({ c, t: 0 });
    const loot = G.Items.chestLoot(c.level, c.boss);
    const P = G.P; G.E.dropBag(P.pos.x + (c.x - P.pos.x) * 0.3, P.pos.z + (c.z - P.pos.z) * 0.3, loot.items, loot.gold);
    G.FX.burst(new THREE.Vector3(c.x, c.y + 1, c.z), 0xffd84a, 40, 5, 1, 0.8, -1);
  };

  // ---------------- HUD build / update ----------------
  UI.init = function () {
    ['log', 'toast', 'hurt', 'overlay', 'panel', 'tip', 'ghost', 'hotbar', 'buffs', 'prompt', 'tracker', 'zoneLine', 'targetFrame', 'clock'].forEach(k => el[k] = $(k));
    el.mini = $('minimap');
    el.hpBar = $('hpBar'); el.mpBar = $('mpBar'); el.xpBar = $('xpBar');
    el.hpFill = el.hpBar.querySelector('.fill'); el.mpFill = el.mpBar.querySelector('.fill'); el.xpFill = el.xpBar.querySelector('.fill');
    el.hpTxt = el.hpBar.querySelector('.txt'); el.mpTxt = el.mpBar.querySelector('.txt'); el.xpTxt = el.xpBar.querySelector('.txt');
    el.overlay.addEventListener('pointerdown', e => { if (e.target === el.overlay && UI.panel !== 'death') UI.close(); });
    el.panel.addEventListener('click', e => { const b = e.target.closest('[data-act=close]'); if (b) UI.close(); });
    // hotbar
    el.slots = [];
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('div'); s.className = 'hb'; s.innerHTML = `<span class="ic"></span><span class="cd"></span><span class="key">${i === 9 ? 0 : i + 1}</span><span class="cost"></span>`;
      s.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (UI.panel) return; G.Input.held['k' + i] = true; G.SP.castSlot(i); });
      const up = () => { G.Input.held['k' + i] = false; };
      s.addEventListener('pointerup', up); s.addEventListener('pointerleave', up); s.addEventListener('pointercancel', up);
      s.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !document.pointerLockElement) { const id = G.P.hotbar[i]; if (id) { const d = G.SP.defs[id]; showTip(`<div class="tt-name">${d.e} ${d.n}</div><div class="tt-sub">${d.mana ? G.SP.costOf(id) + ' mana' : 'Free'}${d.cd ? ' · ' + d.cd + 's cooldown' : ''}</div><div class="tt-line">${d.desc(G.P.spells[id])}</div>`, e.clientX, e.clientY - 120); } } });
      s.addEventListener('pointerleave', hideTip);
      el.hotbar.appendChild(s); el.slots.push(s);
    }
    const btn = (id, fn) => { const b = $(id); if (!b) return; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(true); }); b.addEventListener('pointerup', e => { e.preventDefault(); fn(false); }); b.addEventListener('pointerleave', () => fn(false)); };
    btn('btnHp', d => d && G.P.drink('hp')); btn('btnMp', d => d && G.P.drink('mp'));
    btn('btnJump', d => { G.Input.btnJump = d; }); btn('btnUp', d => { G.Input.btnUp = d; }); btn('btnDown', d => { G.Input.btnDown = d; });
    btn('btnUse', d => d && UI.interact());
    document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); UI.toggle(b.dataset.open); }));
    $('btnLearn').addEventListener('click', e => { e.stopPropagation(); UI.openPick(); });
    $('mapWrap').addEventListener('click', () => UI.toggle('map'));
  };

  let hudT = 0, lastHot = '', zoneKey = '', lastRegion = null;
  UI.update = function (dt) {
    const P = G.P, D = P.D;
    for (let i = chestAnims.length - 1; i >= 0; i--) { const a = chestAnims[i]; a.t += dt; a.c.mesh.userData.lid.rotation.x = -1.9 * Math.min(1, a.t / 0.5); if (a.t > 0.5) chestAnims.splice(i, 1); }
    UI.shakeAmt = Math.max(0, UI.shakeAmt - dt);
    // bars every frame
    el.hpFill.style.width = (P.hp / D.maxHp * 100).toFixed(1) + '%';
    el.mpFill.style.width = (P.mana / D.maxMana * 100).toFixed(1) + '%';
    el.xpFill.style.width = (P.xp / G.xpNext(P.level) * 100).toFixed(1) + '%';
    el.hpBar.classList.toggle('shielded', !!P.buffs.shield);
    // hotbar cooldowns
    const hk = P.hotbar.join(',') + JSON.stringify(P.spells);
    if (hk !== lastHot) { lastHot = hk; P.hotbar.forEach((id, i) => { const s = el.slots[i]; s.querySelector('.ic').textContent = id ? G.SP.defs[id].e : ''; s.classList.toggle('empty', !id); }); }
    const S = G.SP;
    P.hotbar.forEach((id, i) => {
      const s = el.slots[i]; if (!id) return;
      const cd = S.cds[id] > 0 ? S.cds[id] / (S.cdMax[id] || 1) : 0; const g = S.gcd > 0 ? S.gcd / S.gcdMax : 0; const f = Math.max(cd, g * 0.7);
      s.children[1].style.background = f > 0 ? `conic-gradient(rgba(10,14,30,.72) ${(f * 100).toFixed(1)}%, transparent 0)` : '';
      const cost = S.costOf(id);
      s.classList.toggle('nomana', D.specials.bloodpact ? P.hp <= cost : P.mana < cost);
      s.classList.toggle('active', (id === 'fly' && P.flying));
    });
    hudT -= dt; if (hudT > 0) return; hudT = 0.1;
    el.hpTxt.textContent = `${Math.ceil(P.hp)} / ${D.maxHp}` + (P.buffs.shield ? `  (+${Math.round(P.buffs.shield.amt)})` : '');
    el.mpTxt.textContent = `${Math.floor(P.mana)} / ${D.maxMana}`;
    el.xpTxt.textContent = `Level ${P.level}  ·  ${U.fmt(P.xp)} / ${U.fmt(G.xpNext(P.level))} XP`;
    P.hotbar.forEach((id, i) => { if (id) el.slots[i].querySelector('.cost').textContent = S.costOf(id) || ''; });
    // buffs & debuffs
    const B = [];
    const bi = { stone: ['🪨', 'Stone Skin'], shield: ['🛡️', 'Arcane Shield'], haste: ['💨', 'Haste'], invis: ['👻', 'Invisible'], water: ['🌊', 'Water Walking'], apower: ['🔆', 'Arcane Power'], soul: ['💀', 'Soul Harvest'], slowtime: ['⏳', 'Slow Time'] };
    for (const k in P.buffs) if (bi[k]) B.push(`<div class="bf" title="${bi[k][1]}">${bi[k][0]}<span>${k === 'soul' ? '×' + P.buffs.soul.n : Math.ceil(P.buffs[k].t) + 's'}</span></div>`);
    if (P.flying) B.push(`<div class="bf" title="Flying">🪽<span>fly</span></div>`);
    if (P.deb.poison.length) B.push(`<div class="bf deb" title="Poisoned">🤢<span>${P.deb.poison.length}</span></div>`);
    if (P.deb.burn.length) B.push(`<div class="bf deb" title="Burning">🔥</div>`);
    if (P.deb.slowT > 0) B.push(`<div class="bf deb" title="Slowed">🐌</div>`);
    if (P.deb.stunT > 0) B.push(`<div class="bf deb" title="Stunned">💫</div>`);
    if (P.deb.weakT > 0) B.push(`<div class="bf deb" title="Weakened: −25% damage">🥀</div>`);
    el.buffs.innerHTML = B.join('');
    // potions
    $('btnHp').querySelector('b').textContent = G.Inv.count('hp'); $('btnMp').querySelector('b').textContent = G.Inv.count('mp');
    // target
    const t = G.SP.aimTarget(8, 70);
    if (t) { el.targetFrame.style.display = 'block'; el.targetFrame.innerHTML = `<div class="tfn" style="color:${t.boss ? '#ff7a5a' : t.elite ? '#f2d45c' : '#f1ead8'}">${t.elite && !t.boss ? 'Elite ' : ''}${esc(t.name)} <small>level ${t.level}</small></div><div class="tfb"><div style="width:${(t.hp / t.maxHp * 100).toFixed(1)}%"></div><span>${U.fmt(Math.max(0, t.hp))} / ${U.fmt(t.maxHp)}</span></div>`; }
    else el.targetFrame.style.display = 'none';
    // zone
    const reg = G.W.regionAt(P.pos.x, P.pos.z); const zl = G.W.zoneLevel(P.pos.x, P.pos.z);
    const danger = zl - P.level; const dcol = danger >= 5 ? '#ff5a3a' : danger >= 2 ? '#ffb040' : danger <= -5 ? '#9a9a9a' : '#9fe07a';
    const zk = reg.id + zl;
    if (zk !== zoneKey) { zoneKey = zk; el.zoneLine.innerHTML = `${esc(reg.name)} · <span style="color:${dcol}">Lv ${zl}</span>`; }
    if (reg !== lastRegion) { if (lastRegion) UI.toast(`<div class="zt">${esc(reg.name)}</div><div class="zs" style="color:${dcol}">Danger level ${zl}${danger >= 5 ? ' — deadly!' : ''}</div>`, 'zone'); lastRegion = reg; }
    el.clock.textContent = G.W.isNight ? '🌙' : '☀️';
    // tracker
    if (UI.dirtyQuests || Math.random() < 0.2) {
      UI.dirtyQuests = false;
      const f = P.forward();
      el.tracker.innerHTML = G.Quests.active().slice(0, 4).map(q => {
        const tp = G.Quests.targetPos(q); let dir = '';
        if (tp) { const dx = tp.x - P.pos.x, dz = tp.z - P.pos.z; const d = Math.hypot(dx, dz); const a = Math.atan2(dz, dx) - Math.atan2(f.z, f.x); dir = `<span class="qdir" style="transform:rotate(${a - Math.PI / 2}rad)">➤</span> ${Math.round(d)}m`; }
        return `<div class="tq${G.Quests.st(q.id) === 'ready' ? ' rdy' : ''}"><div class="tqt">${q.main ? '📜 ' : ''}${esc(q.title)}</div><div class="tqp">${esc(G.Quests.progText(q))} ${dir}</div></div>`;
      }).join('');
    }
    drawMinimap();
    // interaction
    near = P.dead ? null : findNear();
    el.prompt.textContent = near ? near.t : ''; el.prompt.style.display = near ? 'block' : 'none';
    $('btnUse').style.display = near ? 'flex' : 'none';
    document.body.classList.toggle('flying', P.flying);
    if (P.pendingPicks !== lastPk || P.statPts !== lastSp) {
      lastPk = P.pendingPicks; lastSp = P.statPts;
      const lb = $('btnLearn'); lb.style.display = lastPk > 0 ? '' : 'none'; lb.querySelector('b').textContent = lastPk > 1 ? lastPk : '';
      document.querySelector('[data-open=inv]').dataset.badge = lastSp > 0 ? lastSp : '';
      document.querySelector('[data-open=book]').dataset.badge = lastPk > 0 ? '✨' : '';
    }
    if (UI.panel === 'inv' && UI.dirtyInv) { UI.dirtyInv = false; if (!el.ghost.style.display || el.ghost.style.display === 'none') render(); }
  };
  let lastPk = -1, lastSp = -1;
  UI.showHUD = () => { $('hud').classList.remove('hidden'); };
  UI.helpHtml = helpHtml;
})();
