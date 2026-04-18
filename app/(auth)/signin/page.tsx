import { LoginForm } from "@/components/clinic/login-form"

export default async function InicioSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const sp = await searchParams
  const err = typeof sp.error === "string" ? sp.error : undefined
  const rawNext = typeof sp.next === "string" ? sp.next : "/"
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"
  return <LoginForm initialError={err} nextPath={nextPath} />
}
