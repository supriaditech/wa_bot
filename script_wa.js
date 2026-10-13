(() => {
  if (window.__waFreezeInstalled) {
    console.log('🧊 Sudah terpasang — F5 dulu sebelum paste ulang agar versi lama tidak menumpuk.');
    return;
  }
  window.__waFreezeInstalled = true;

  let locked = true;
  let anchor = 0;
  let scrollers = [];
  let btn = null;

  function findScrollers() {
    const main = document.querySelector('#main');
    if (!main) return [];
    const candidates = main.querySelectorAll(
      '[data-testid="conversation-panel-messages"], [role="log"]'
    );
    for (const el of candidates) {
      if (el.scrollHeight > el.clientHeight) return [el];
    }
    let list = [];
    main.querySelectorAll('div').forEach((el) => {
      if (el.scrollHeight > el.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
        list.push(el);
      }
    });
    return list;
  }

  function setLock(v) {
    locked = v;
    scrollers = findScrollers();
    if (locked) {
      anchor = scrollers.length ? scrollers[0].scrollTop : 0;
      if (btn) {
        btn.textContent = '🔒 Terkunci';
        btn.style.background = '#008069';
      }
      console.log('🔒 Layar terkunci — template tidak akan meluncur.');
    } else {
      if (btn) {
        btn.textContent = '🔓 Bebas';
        btn.style.background = '#0b141a';
      }
      console.log('🔓 Layar bebas — meluncur ke pesan terbaru.');
    }
  }

  setInterval(() => {
    if (scrollers.length === 0) scrollers = findScrollers();
    if (!scrollers.length) return;
    if (!locked) {
      anchor = scrollers[0].scrollTop;
      return;
    }
    if (scrollers[0].scrollTop !== anchor) scrollers[0].scrollTop = anchor;
  }, 80);

  window.addEventListener('scroll', () => {
    if (!locked || !scrollers.length) return;
    if (scrollers[0].scrollTop !== anchor) scrollers[0].scrollTop = anchor;
  }, true);

  new MutationObserver(() => {
    scrollers = findScrollers();
  }).observe(document.body, { childList: true, subtree: true });

  btn = document.createElement('div');
  btn.textContent = '🔒 Terkunci';
  btn.style.cssText = 'position:fixed;z-index:999999;top:20px;right:200px;background:#008069;color:#fff;padding:10px 16px;border-radius:999px;font:600 14px sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4);user-select:none;';
  btn.addEventListener('click', () => setLock(!locked));
  document.body.appendChild(btn);

  function toast(msg, ok) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `position:fixed;z-index:999999;top:20px;left:50%;transform:translateX(-50%);background:${ok ? '#008069' : '#c33'};color:#fff;padding:10px 18px;border-radius:999px;font:600 14px sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.4);transition:opacity .5s;`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 2500);
  }

  function copyPlainText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function getMsgId(bubble) {
    return bubble.getAttribute('data-id')
      || (bubble.closest('[data-id]') ? bubble.closest('[data-id]').getAttribute('data-id') : null);
  }

  function extractWithMarkdown(bubble) {
    const out = [];
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) { out.push(child.textContent); continue; }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        if (child.getAttribute('aria-hidden') === 'true') continue;
        const tag = child.tagName;
        if (tag === 'BR') { out.push('\n'); continue; }
        if (tag === 'IMG') {
          const alt = child.getAttribute('data-plain-text') || child.getAttribute('alt');
          if (alt) out.push(alt);
          continue;
        }
        const tpl = child.getAttribute('data-app-text-template');
        if (tpl) {
          const parts = tpl.split('${appText}');
          out.push(parts[0] || '');
          walk(child);
          out.push(parts[1] || '');
          continue;
        }
        if (tag === 'OL' || tag === 'UL') {
          const start = tag === 'OL' ? (parseInt(child.getAttribute('start'), 10) || 1) : 0;
          let liIdx = 0;
          for (const li of child.children) {
            if (li.tagName !== 'LI') { walk(li); continue; }
            let marker = '';
            try { marker = getComputedStyle(li, '::marker').content; } catch (err) {}
            const clean = marker ? marker.replace(/^["']|["']$/g, '') : '';
            let label;
            if (clean && clean !== 'none' && clean !== 'normal') {
              label = clean;
            } else if (tag === 'OL') {
              label = (start + liIdx) + '.';
            } else {
              label = '\u2022';
            }
            out.push(label + ' ');
            walk(li);
            out.push('\n');
            liIdx++;
          }
          continue;
        }
        if (child.children.length === 0 && /^\d{1,2}[:.]\d{2}$/.test(child.textContent.trim())) continue;
        walk(child);
      }
    };
    walk(bubble);
    return out.join('').replace(/\n{3,}/g, '\n\n').trim();
  }

  function findStore() {
    if (window.Store && window.Store.Msg && typeof window.Store.Msg.get === 'function') return window.Store;
    try {
      const candidates = [];
      for (const key of Object.keys(window)) {
        if (key === 'webpackJsonp' || key.indexOf('webpackChunk') === 0) candidates.push(window[key]);
      }
      for (const chunks of candidates) {
        if (!chunks || typeof chunks.length !== 'number') continue;
        for (const chunk of chunks) {
          const mods = chunk && chunk[1];
          if (!mods) continue;
          for (const modKey of Object.keys(mods)) {
            const exp = mods[modKey] && mods[modKey].exports;
            if (!exp) continue;
            const hit = (exp.Msg && typeof exp.Msg.get === 'function') ? exp
              : (exp.default && exp.default.Msg && typeof exp.default.Msg.get === 'function' ? exp.default : null);
            if (hit) { window.Store = hit; return hit; }
          }
        }
      }
    } catch (err) {}
    return window.Store && window.Store.Msg && typeof window.Store.Msg.get === 'function' ? window.Store : null;
  }

  function findMsgBodyViaFiber(bubble) {
    try {
      let node = bubble;
      for (let hop = 0; hop < 8 && node; hop++) {
        const key = Object.keys(node).find((k) => k.indexOf('__reactFiber$') === 0 || k.indexOf('__reactInternalInstance$') === 0);
        if (key) {
          let fiber = node[key];
          for (let depth = 0; fiber && depth < 40; depth++) {
            const p = fiber.memoizedProps;
            if (p) {
              for (const propName of ['msg', 'message']) {
                const c = p[propName];
                if (c && typeof c.body === 'string' && c.body) return c.body;
              }
              if (typeof p.text === 'string' && p.text) return p.text;
            }
            fiber = fiber.return;
          }
          break;
        }
        node = node.parentNode;
      }
    } catch (err) {}
    return null;
  }

  function copyBubbleText(bubble) {
    const id = getMsgId(bubble);
    const store = findStore();
    if (id && store && store.Msg && store.Msg.get) {
      try {
        const msg = store.Msg.get(id);
        if (msg && typeof msg.body === 'string' && msg.body) {
          if (copyPlainText(msg.body)) {
            toast('📋 Store: teks asli disalin — ' + msg.body.slice(0, 40).replace(/\n/g, '⏎'), true);
            console.log('📋 Klik-kanan: teks ASLI dari Store disalin (markdown & emoji 100% utuh).');
            return true;
          }
        }
      } catch (err) {
        console.log('⚠️ Store gagal, pakai jalur lain:', err && err.message ? err.message : err);
      }
    }
    const body = findMsgBodyViaFiber(bubble);
    if (body) {
      if (copyPlainText(body)) {
        toast('📋 Fiber: teks asli disalin — ' + body.slice(0, 40).replace(/\n/g, '⏎'), true);
        console.log('📋 Klik-kanan: teks asli via React fiber (angka & markdown benar).');
        return true;
      }
    }
    const text = extractWithMarkdown(bubble);
    if (!text) return false;
    const ok = copyPlainText(text);
    toast(ok ? '📋 DOM: teks disalin — ' + text.slice(0, 40).replace(/\n/g, '⏎') : '❌ Gagal salin otomatis', ok);
    console.log(ok
      ? '📋 Klik-kanan: teks disalin via ekstraksi DOM (angka, emoji, baris, * utuh).'
      : '⚠️ Gagal salin otomatis — gunakan menu Salin bawaan WA.');
    return ok;
  }

  document.addEventListener('contextmenu', (e) => {
    const bubble = e.target.closest('div.copyable-text');
    if (!bubble) return;
    e.preventDefault();
    copyBubbleText(bubble);
  }, true);

  setLock(true);
  console.log('🧊 Freeze-scroll AKTIF otomatis. Klik tombol untuk Bebas/Terkunci.');
  console.log('🖱️ Klik-kanan pada pesan = langsung copy teksnya.');
})();