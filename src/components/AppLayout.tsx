import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Scale, LayoutDashboard, Building2, BarChart3, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Cartera', path: '/dashboard' },
  { icon: Building2, label: 'Propiedades', path: '/propiedades' },
  { icon: BarChart3, label: 'Gráficos', path: '/graficos' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-card border-b border-border px-6 py-3 flex items-center gap-6 shrink-0">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center mr-4">
          <Scale className="w-5 h-5 text-primary-foreground" />
        </button>
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={cn(
                  'px-4 py-2 rounded-full flex items-center gap-2 transition-all text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary',
                  active && 'bg-secondary text-primary'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Salir"
        >
          <LogOut className="w-4 h-4" />
          <span>Salir</span>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
