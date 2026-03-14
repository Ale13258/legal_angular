import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import WelcomePage from "./pages/WelcomePage";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";

import ClienteDetailPage from "./pages/ClienteDetailPage";
import PropiedadesPage from "./pages/PropiedadesPage";
import PropiedadDetailPage from "./pages/PropiedadDetailPage";
import GraficosPage from "./pages/GraficosPage";
import NuevoClientePage from "./pages/NuevoClientePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            
            <Route path="/clientes/nuevo" element={<NuevoClientePage />} />
            <Route path="/clientes/:id" element={<ClienteDetailPage />} />
            <Route path="/propiedades" element={<PropiedadesPage />} />
            <Route path="/propiedades/:id" element={<PropiedadDetailPage />} />
            <Route path="/graficos" element={<GraficosPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
