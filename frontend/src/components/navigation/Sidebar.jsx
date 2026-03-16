import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  BarChart3,
  Boxes,
  PlusSquare,
  Settings,
  Trash2,
  Clock3,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

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

const SidebarContent = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/giris-yap");
  };

  return (
    <>
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
              onClick={onNavigate}
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

      <a
        href="https://clicktopeak.com"
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
      >
        <span>by</span>
        <span className="font-semibold">Click to Peak</span>
      </a>
    </>
  );
};

export const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const location = useLocation();

  // Route değişince mobil sidebar'ı kapat
  useEffect(() => {
    onMobileClose?.();
  }, [location.pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 flex-col border-r bg-background/90 px-4 pb-4 pt-6 md:flex lg:w-72">
        <SidebarContent />
      </aside>

      {/* Mobil overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={onMobileClose}
            />

            {/* Mobil sidebar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-background px-4 pb-4 pt-4 md:hidden"
            >
              <div className="mb-2 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onMobileClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <SidebarContent onNavigate={onMobileClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export const MobileHeader = ({ onMenuClick }) => (
  <header className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={onMenuClick}
    >
      <Menu className="h-5 w-5" />
    </Button>
    <span className="text-lg font-semibold tracking-wide text-foreground">
      Akcan <span className="text-muted-foreground">Grup</span>
    </span>
  </header>
);
