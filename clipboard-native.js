let clipboardInstance = null;

async function getInstance() {
  if (!clipboardInstance) {
    const { Clipboard } = await import('@napi-rs/clipboard');
    clipboardInstance = new Clipboard();
  }
  return clipboardInstance;
}

async function read() {
  const cb = await getInstance();
  return cb.getText() || '';
}

async function write(text) {
  const cb = await getInstance();
  cb.setText(text);
}

module.exports = { read, write };