import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Scale, Users, Building2, BarChart3, ArrowRight, Shield } from 'lucide-react';

const features = [
  { icon: Users, label: 'Clientes', desc: 'Gestiona tu base de clientes', path: '/dashboard' },
  { icon: Building2, label: 'Propiedades', desc: 'Administra inmuebles y cartera', path: '/dashboard' },
  { icon: BarChart3, label: 'Gráficos', desc: 'Analítica y reportes financieros', path: '/graficos' },
];

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
            <Scale className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">LegalTech</span>
        </div>
        <Button onClick={() => navigate('/dashboard')} size="sm">
          Entrar al sistema <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-5xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Plataforma de Gestión Legal
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold text-foreground mb-6 leading-[1.1]">
              Bienvenidos a{' '}
              <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
                LegalTech
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Gestión de Cartera con Precisión Legal. Administra propiedad horizontal,
              cobros jurídicos y cuentas con total claridad financiera.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/dashboard')}>
                Entrar al sistema <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/graficos')}>
                <BarChart3 className="w-5 h-5 mr-1" /> Ver gráficos generales
              </Button>
            </div>
          </motion.div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.2, 0, 0, 1] }}
                onClick={() => navigate(f.path)}
                className="bg-card shadow-card rounded-2xl p-6 cursor-pointer hover:shadow-card-hover transition-all duration-300 group border border-border/50"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground text-lg mb-1">{f.label}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-muted-foreground text-xs">
        © 2026 LegalTech — Gestión de Cartera y Propiedad Horizontal
      </footer>
    </div>
  );
}
