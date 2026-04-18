import { MedlyLogoMark } from "@/components/brand/MedlyLogoMark"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl shadow-md">
          <MedlyLogoMark decorative className="size-full" />
        </div>
        <span className="text-lg font-bold tracking-tight">Medly</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
