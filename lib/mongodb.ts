import { MongoClient, type Db } from "mongodb"

const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>
}

export function normalizeMongoUri(raw: string): string {
  let u = raw.trim()
  if (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim()
  }
  return u
}

export function getMongoClientPromise(): Promise<MongoClient> | null {
  const uri = normalizeMongoUri(process.env.MONGODB_URI ?? "")
  if (!uri) return null

  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = MongoClient.connect(uri, {
      appName: "medly-web",
      serverSelectionTimeoutMS: 12_000,
    }).catch((err) => {
      globalForMongo.mongoClientPromise = undefined
      return Promise.reject(err)
    })
  }
  return globalForMongo.mongoClientPromise
}

export async function getMedlyDb(): Promise<Db | null> {
  const p = getMongoClientPromise()
  if (!p) return null
  const client = await p
  const name = process.env.MONGODB_DB?.trim() || "medly"
  return client.db(name)
}

export function isAtlasConfigured(): boolean {
  return Boolean(normalizeMongoUri(process.env.MONGODB_URI ?? ""))
}

export function mongoConnectionUserHint(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err)
  const code = err instanceof Error ? (err as NodeJS.ErrnoException & { code?: string }).code : ""
  const blob = `${msg} ${code}`.toLowerCase()

  if (blob.includes("querysrv") && (blob.includes("econnrefused") || blob.includes("etimedout"))) {
    return [
      "Tu equipo no pudo completar la consulta DNS SRV que usa mongodb+srv:// (aún no se prueba usuario ni contraseña).",
      "",
      "Qué suele funcionar:",
      "• En Atlas: Connect → Drivers → elige la cadena «estándar» (mongodb:// con varios hosts …:27017 y replicaSet=…), cópiala a MONGODB_URI. Evita depender del lookup _mongodb._tcp.",
      "• Prueba otra red, sin VPN, o cambia el DNS del adaptador a 8.8.8.8 o 1.1.1.1.",
      "• Revisa firewall/antivirus o red corporativa que bloquee DNS o tráfico saliente.",
    ].join("\n")
  }

  if (blob.includes("querysrv") && blob.includes("enotfound")) {
    return [
      "No se encontró el registro SRV del clúster (DNS). Comprueba que el nombre del host en la URI coincida con Atlas, tu conexión a Internet y el DNS.",
      "También puedes usar la URI «mongodb://» estándar de varios hosts que muestra Atlas.",
    ].join("\n")
  }

  return null
}

export function mongoUriLikelyHasUnencodedPassword(uri: string): boolean {
  const u = normalizeMongoUri(uri)
  const schemeEnd = u.indexOf("://")
  if (schemeEnd < 0) return false
  const rest = u.slice(schemeEnd + 3)
  const at = rest.indexOf("@")
  if (at < 0) return false
  const userInfo = rest.slice(0, at)
  const colon = userInfo.indexOf(":")
  const pass = colon >= 0 ? userInfo.slice(colon + 1) : ""
  return pass.includes("<") || pass.includes(">")
}
