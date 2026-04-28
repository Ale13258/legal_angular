# Gestión Legal y Cartera (Angular)

Aplicación Angular 21 para administrar clientes, propiedades y seguimiento de cobranza.

## Stack

- **Angular 21** (standalone components, signals)
- **Tailwind CSS v4**
- **Spartan/ui** (componentes tipo shadcn)
- **Chart.js / ng2-charts** (gráficos)
- **jsPDF + jspdf-autotable + xlsx** (reportes PDF y Excel)

## Autenticación (demo)

La sesión y los usuarios se guardan en **localStorage**. **No es seguridad de producción**: las contraseñas van en claro y el rol se puede alterar desde las herramientas de desarrollo. Para un entorno real hace falta backend con JWT (u otro) y validación en servidor.

### Credenciales administrador (demo)

| Campo        | Valor                 |
|-------------|------------------------|
| Correo      | `admin@legaltech.com` |
| Contraseña  | `admin123`            |

La primera vez que la app usa `localStorage` vacío, se crea este usuario automáticamente. Si solo hay clientes registrados y falta el admin, **se vuelve a insertar** el admin demo al leer usuarios. En la pantalla **Login** verás el bloque “Usuario demo” y el botón para entrar con un clic.

### Registro de cliente

1. El administrador debe tener al cliente dado de alta en cartera (mocks en `DataService`) con un **correo** concreto.
2. El cliente se registra en `/registro` con **ese mismo correo** y una contraseña (mín. 6 caracteres).
3. Tras el registro, inicia sesión en `/login` y solo ve **Mi cartera** (`/mi-cartera`): tablas de propiedades, cuentas e historial de pagos **solo de su ficha**.

Ejemplos de correos válidos para registro (existen en los datos mock): `maria.rodriguez@email.com`, `contabilidad@eldorado.com`, `jcmendoza@gmail.com`.

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
- `/login` — Inicio de sesión
- `/registro` — Alta de cuenta cliente (correo debe existir en cartera)
- `/mi-cartera` — Portal cliente (solo lectura, sus datos)
- `/dashboard` — Cartera (admin)
- `/clientes/nuevo` — Alta de cliente (admin)
- `/clientes/:id` — Detalle de cliente (admin)
- `/propiedades` — Listado de propiedades (admin)
- `/propiedades/:id` — Detalle de propiedad (admin)
- `/graficos` — Informes y analítica (admin)

## Estructura

- `src/app/core` — Modelos, DataService, AuthService, guards
- `src/app/layout` — Layout con navegación según rol
- `src/app/pages` — Páginas (lazy-loaded)
- `src/app/shared` — BalanceCard, StatusBadge
- `src/app/components` — Diálogos de reportes (ClientReportDialog, ReportPreviewDialog)
