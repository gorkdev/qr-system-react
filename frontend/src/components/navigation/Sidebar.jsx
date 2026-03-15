import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  BarChart3,
  Boxes,
  PlusSquare,
  Settings,
  Trash2,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { label: "Genel", to: "/genel", icon: LayoutDashboard },
  { label: "İstatistikler", to: "/istatistikler", icon: BarChart3 },
  { label: "Ürünler", to: "/urunler", icon: Boxes },
  { label: "Yeni Ürün", to: "/yeni-urun", icon: PlusSquare },
  { label: "Ziyaret geçmişi", to: "/ziyaret-gecmisi", icon: BarChart3 },
  { label: "İşlem geçmişi", to: "/islem-gecmisi", icon: Clock3 },
  { label: "Çöp kutusu", to: "/cop-kutusu", icon: Trash2 },
  { label: "Ayarlar", to: "/ayarlar", icon: Settings },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/giris-yap");
  };

  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-background/90 px-4 pb-4 pt-4 md:pt-6 md:flex lg:w-72">
      <div className="flex items-center px-2">
        <span className="text-xl w-full font-semibold tracking-wide text-foreground brand-reflection">
          Akcan <span className="text-xl text-muted-foreground">Grup</span>
        </span>
      </div>

      <nav className="mt-5 flex-1 space-y-1">
        <AnimatePresence initial={false}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  isActive && "text-primary",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-primary/10"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 40,
                        mass: 0.7,
                      }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-current" />
                    <span>{item.label}</span>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </AnimatePresence>
      </nav>

      <div className="mt-4 flex items-center justify-between rounded-xl border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            admin
          </Badge>
          <span className="text-xs text-muted-foreground/80">Oturum açık</span>
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-[11px]"
          onClick={handleLogout}
        >
          Çıkış yap
        </Button>
      </div>
    </aside>
  );
};
