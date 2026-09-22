import { openBundle } from './vault.mjs';
import { startReading } from './reader.mjs';

const gate = document.getElementById('entry-screen');
const form = document.getElementById('entry-form');
const password = document.getElementById('entry-password');
const error = document.getElementById('entry-error');
const submit = document.getElementById('entry-submit');
const content = document.getElementById('chronicle-content');
let stopReading = null;
let pending = false;

function clearError() {
  error.textContent = '';
  password.removeAttribute('aria-invalid');
}

function lock() {
  stopReading?.();
  stopReading = null;
  content.hidden = true;
  content.setAttribute('inert', '');
  content.replaceChildren();
  gate.hidden = false;
  document.body.classList.remove('chronicle-open', 'motion-ready');
  password.value = '';
  clearError();
  window.scrollTo({ top: 0, behavior: 'instant' });
  password.focus({ preventScroll: true });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  const passphrase = password.value.trim();
  password.value = '';
  clearError();
  if (!globalThis.crypto?.subtle) {
    error.textContent = '请使用支持 HTTPS 的现代浏览器打开此页面。';
    return;
  }
  pending = true;
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  let envelope;
  try {
    const response = await fetch(new URL('./archive.enc.json', import.meta.url), { cache: 'no-store' });
    if (!response.ok) throw new Error('Load failed');
    envelope = await response.json();
  } catch {
    error.textContent = '暂时没能打开，请检查网络后再试一次。';
  }
  if (envelope) {
    try {
      const bundle = await openBundle(envelope, passphrase);
      if (typeof bundle.html !== 'string' || !bundle.html.includes('id="timeline"')) throw new Error('Invalid content');
      // HTML comes from the authenticated, locally generated archive, never from form input.
      content.innerHTML = bundle.html;
      gate.hidden = true;
      content.hidden = false;
      content.removeAttribute('inert');
      document.body.classList.add('chronicle-open');
      stopReading = startReading(content);
      content.querySelector('[data-lock]')?.addEventListener('click', lock, { once: true });
      document.getElementById('chronicle-title')?.focus({ preventScroll: true });
    } catch {
      content.replaceChildren();
      content.hidden = true;
      content.setAttribute('inert', '');
      gate.hidden = false;
      document.body.classList.remove('chronicle-open');
      error.textContent = '口令不太对，再试一次。';
      password.setAttribute('aria-invalid', 'true');
      password.focus();
    }
  }
  pending = false;
  submit.disabled = false;
  form.removeAttribute('aria-busy');
});
password.addEventListener('input', clearError);
window.addEventListener('pagehide', lock);
