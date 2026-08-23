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

  function copyBubbleText(bubble) {
    const content = bubble.querySelector('[data-testid="selectable-text"]');
    if (!content) return false;

    const marks = [];
    for (const el of content.querySelectorAll('[data-app-text-template]')) {
      const before = document.createTextNode('*');
      const after = document.createTextNode('*');
      el.parentNode.insertBefore(before, el);
      el.parentNode.insertBefore(after, el.nextSibling);
      marks.push(before, after);
    }

    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(content);
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    sel.removeAllRanges();

    for (const node of marks) {
      if (node.parentNode) node.parentNode.removeChild(node);
    }
    return ok;
  }

  document.addEventListener('contextmenu', (e) => {
    const bubble = e.target.closest('div.copyable-text');
    if (!bubble) return;
    e.preventDefault();
    const ok = copyBubbleText(bubble);
    console.log(ok
      ? '📋 Klik-kanan: teks disalin (emoji, angka, markdown * terjaga).'
      : '⚠️ Gagal salin otomatis — gunakan menu Salin bawaan WA.');
  }, true);

  setLock(true);
  console.log('🧊 Freeze-scroll AKTIF otomatis. Klik tombol untuk Bebas/Terkunci.');
  console.log('🖱️ Klik-kanan pada pesan = langsung copy teksnya.');
})();