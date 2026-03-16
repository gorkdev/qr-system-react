import { useState } from "react";
import { Sidebar, MobileHeader } from "@/components/navigation/Sidebar";

export const AdminShell = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen flex-col md:flex-row">
        <MobileHeader onMenuClick={() => setMobileOpen(true)} />
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main className="flex-1 overflow-y-auto bg-muted/30 px-4 pt-4 pb-5 md:px-6 md:pt-6 md:pb-7">
          <div className="max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
