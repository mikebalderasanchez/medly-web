export function isAuthSecretConfigured(): boolean {
  return (process.env.AUTH_SECRET?.trim().length ?? 0) >= 32
}

export function getAuthSecretBytes(): Uint8Array {
  const raw = process.env.AUTH_SECRET?.trim() ?? ""
  if (raw.length < 32) {
    throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.")
  }
  return new TextEncoder().encode(raw)
}
