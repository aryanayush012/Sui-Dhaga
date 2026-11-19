// Non-cryptographic unique id. crypto.randomUUID only exists in secure contexts (not plain-http LAN testing).
export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)
