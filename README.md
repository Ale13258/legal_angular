# Gestión Legal y Cartera (Angular)

Aplicación Angular 21 para administrar clientes, propiedades y seguimiento de cobranza.

## Stack

- **Angular 21** (standalone components, signals)
- **Tailwind CSS v4**
- **Spartan/ui** (componentes tipo shadcn)
- **Chart.js / ng2-charts** (gráficos)
- **jsPDF + jspdf-autotable + xlsx** (reportes PDF y Excel)

## Comandos

```sh
# Instalar dependencias
npm install

# Servidor de desarrollo
npm start
# o: ng serve

# Build de producción
npm run build
# o: ng build

# Tests unitarios
npm test
# o: ng test
```

## Rutas

- `/` — Bienvenida
- `/dashboard` — Cartera (cuentas, filtros)
- `/clientes/nuevo` — Alta de cliente
- `/clientes/:id` — Detalle de cliente (informe general PDF/Excel)
- `/propiedades` — Listado de propiedades
- `/propiedades/:id` — Detalle de propiedad (historial, informe PDF/Excel)
- `/graficos` — Gráficos y analítica

## Estructura

- `src/app/core` — Modelos y DataService (datos en memoria)
- `src/app/layout` — Layout con navegación
- `src/app/pages` — Páginas (lazy-loaded)
- `src/app/shared` — BalanceCard, StatusBadge
- `src/app/components` — Diálogos de reportes (ClientReportDialog, ReportPreviewDialog)
