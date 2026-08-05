// PIN-based token encryption for participant self-reporting.
// The host's PAT is encrypted with the PIN (PBKDF2 -> AES-GCM) and shipped
// in the published data; participants who know the PIN decrypt it in-browser.
const enc = new TextEncoder()
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0))

async function deriveKey(pin, salt) {
  const material = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptToken(token, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(pin, salt)
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(token))
  return { salt: b64(salt), iv: b64(iv), data: b64(data) }
}

// Throws on wrong PIN (AES-GCM authentication fails).
export async function decryptToken({ salt, iv, data }, pin) {
  const key = await deriveKey(pin, unb64(salt))
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(data))
  return new TextDecoder().decode(buf)
}
