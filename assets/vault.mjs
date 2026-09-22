const encoder = new TextEncoder();
const decoder = new TextDecoder();
const context = encoder.encode('static-page:v1');
const rounds = 210000;

function toBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), c => c.charCodeAt(0));
}

async function derive(password, salt, usage) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: rounds, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

export async function sealBundle(bundle, password) {
  if (!password) throw new Error('A passphrase is required.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: context }, key, encoder.encode(JSON.stringify(bundle)));
  return { version: 1, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) };
}

export async function openBundle(envelope, password) {
  if (envelope?.version !== 1 || !['salt', 'iv', 'data'].every(k => typeof envelope[k] === 'string')) throw new Error('Invalid archive.');
  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error('Invalid archive.');
  const key = await derive(password, salt, 'decrypt');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: context }, key, fromBase64(envelope.data));
  return JSON.parse(decoder.decode(plaintext));
}
