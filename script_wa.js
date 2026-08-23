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
      btn.textContent = '🔒 Terkunci';
      btn.style.background = '#008069';
      console.log('🔒 Layar terkunci — template tidak akan meluncur.');
    } else {
      btn.textContent = '🔓 Bebas';
      btn.style.background = '#0b141a';
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
  btn.style.cssText = 'position:fixed;z-index:999999;bottom:20px;right:20px;background:#008069;color:#fff;padding:10px 16px;border-radius:999px;font:600 14px sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4);user-select:none;';
  btn.addEventListener('click', () => setLock(!locked));
  document.body.appendChild(btn);

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function getHiddenText(el) {
    return el.getAttribute('alt')
      || el.getAttribute('data-plain-text')
      || el.getAttribute('aria-label')
      || el.getAttribute('title');
  }

  function extractMessageText(bubble) {
    const clone = bubble.cloneNode(true);
    const out = [];
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          out.push(child.textContent);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.getAttribute('aria-hidden') === 'true') continue;
          if (child.children.length === 0 && /^\d{1,2}[:.]\d{2}$/.test(child.textContent.trim())) continue;
          const tag = child.tagName;
          if (tag === 'BR') {
            out.push('\n');
          } else if (tag === 'IMG') {
            const alt = getHiddenText(child);
            if (alt) out.push(alt);
            continue;
          } else if (child.children.length === 0) {
            const leaf = child.textContent || '';
            if (leaf === '\n' || leaf === '\r\n') {
              out.push('\n');
              continue;
            }
            if (leaf.trim() === '') {
              const alt = getHiddenText(child);
              if (alt && /\p{Extended_Pictographic}/u.test(alt)) out.push(alt);
              continue;
            }
            out.push(leaf);
            continue;
          } else {
            const isBlock = /^(DIV|P|LI|H[1-6]|SECTION|UL|OL|BLOCKQUOTE)$/.test(tag);
            if (isBlock) out.push('\n');
            walk(child);
            if (isBlock) out.push('\n');
          }
        }
      }
    };
    walk(clone);
    return out.join('')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  document.addEventListener('contextmenu', (e) => {
    const bubble = e.target.closest('div.copyable-text');
    if (!bubble) return;
    e.preventDefault();
    const imgs = bubble.querySelectorAll('img');
    if (imgs.length) {
      console.log('🔍 Debug emoji img:', [...imgs].map((i) => i.getAttribute('alt') || '(tanpa alt)').join(' | '));
    }
    const text = extractMessageText(bubble);
    if (!text) return;
    copyToClipboard(text).then(() => {
      console.log('📋 Klik-kanan: teks pesan masuk clipboard (emoji & baris terjaga).');
    });
  }, true);

  setLock(true);
  console.log('🧊 Freeze-scroll AKTIF otomatis. Klik tombol untuk Bebas/Terkunci.');
  console.log('🖱️ Klik-kanan pada pesan = langsung copy teksnya.');
})();