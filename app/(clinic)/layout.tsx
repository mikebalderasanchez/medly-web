import { AppSidebar } from "@/components/app-sidebar"
import { ClinicHeaderProfile } from "@/components/clinic-header-profile"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-20 shrink-0 items-center gap-4 px-6">
          <SidebarTrigger className="-ml-2 h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-colors" />
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <ClinicHeaderProfile />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:gap-8 lg:p-8 lg:pt-0 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
