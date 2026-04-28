# Backend Blueprint: Node.js + Prisma + PostgreSQL + AWS

## 1) Resumen

Este documento define la arquitectura backend objetivo para migrar el estado actual del frontend (mocks y `localStorage`) a un backend real, escalable y mantenible.

Decisiones cerradas:

- Stack: `Node.js` + `NestJS` + `Prisma` + `PostgreSQL`.
- Arquitectura: Hexagonal pragmatica (anillo) con modulos por dominio.
- Persistencia: patron Repository (puertos en dominio, adaptadores Prisma en infraestructura).
- Infraestructura: AWS para entorno productivo.

Dominios cubiertos:

- `auth`
- `clientes`
- `propiedades`
- `historial_pagos`
- `cuentas`
- `gestiones`
- `metrics`
- `notifications` (recordatorios WhatsApp)

---

## 2) Arquitectura backend (anillo + repository)

### 2.1 Capas

- `domain`: entidades, value objects, reglas puras, puertos de repositorio.
- `application`: casos de uso, DTOs de entrada/salida, coordinacion de reglas.
- `infrastructure`: adaptadores (HTTP, Prisma, JWT, cache, storage, logging).

### 2.2 Regla de dependencias

- `domain` no depende de framework ni DB.
- `application` depende de `domain`.
- `infrastructure` depende de `application` y `domain`.
- Nunca al reves.

### 2.3 Flujo de una solicitud

`Controller -> UseCase -> RepositoryPort -> PrismaRepository -> PostgreSQL`

### 2.4 NestJS: como encajar el anillo sin romper dependencias

NestJS es un framework de infraestructura. La regla practica:

- `UseCase` y `RepositoryPort` viven en `domain/application`.
- `Controller`, `Guards`, `PrismaRepository` viven en `infrastructure`.
- En el `*.module.ts` del dominio, se hace el binding explicito:

```ts
// Ejemplo conceptual (no es codigo del repo actual)
providers: [
  { provide: CLIENTES_REPOSITORY, useClass: ClientesPrismaRepository },
  CreateClienteUseCase,
]
```

Beneficio: el caso de uso depende de `CLIENTES_REPOSITORY` (interfaz), no de Prisma.

---

## 3) Estructura de carpetas recomendada

```txt
src/
  modules/
    auth/
      domain/
        entities/
        repositories/
        services/
      application/
        dto/
        use-cases/
      infrastructure/
        http/
          auth.controller.ts
        persistence/
          prisma/
            auth-prisma.repository.ts
        security/
          guards/
          jwt.strategy.ts
      auth.module.ts

    clientes/
      domain/
        entities/
        repositories/
      application/
        dto/
        use-cases/
      infrastructure/
        http/
          clientes.controller.ts
        persistence/
          prisma/
            clientes-prisma.repository.ts
      clientes.module.ts

    propiedades/
      domain/
      application/
      infrastructure/
      propiedades.module.ts

    pagos/
      domain/
      application/
      infrastructure/
      pagos.module.ts

    cuentas/
      domain/
      application/
      infrastructure/
      cuentas.module.ts

    gestiones/
      domain/
      application/
      infrastructure/
      gestiones.module.ts

    metrics/
      application/
      infrastructure/
      metrics.module.ts

  shared/
    domain/
      errors/
      result.ts
    infrastructure/
      prisma/
        prisma.module.ts
        prisma.service.ts
      config/
      logger/
      cache/
      storage/
      observability/

  main.ts
```

---

## 4) Convenciones API

- Base path: `/api/v1`.
- Formato JSON: `snake_case` (alineado con modelos frontend actuales).
- Versionado: por prefijo (`v1`).
- Healthcheck publico:
  - `GET /api/v1/health` -> `{ "status": "ok" }`
- Autenticacion:
  - header `Authorization: Bearer <access_token>`
- Idempotencia (opcional, recomendado en escrituras sensibles):
  - header `Idempotency-Key: <uuid>` en `POST` de pagos/cuentas/gestiones
- Errores estandar:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Payload invalido",
  "details": {
    "field": "email"
  },
  "request_id": "uuid"
}
```

- Paginacion:
  - query params: `page`, `page_size`, `sort`, `order`.
  - respuesta: `items`, `meta`.

### 4.1 Codigos HTTP minimos

- `200` OK
- `201` Created
- `204` No Content (DELETE soft)
- `400` Payload invalido / regla de negocio
- `401` No autenticado
- `403` Autenticado pero sin permiso
- `404` Recurso no encontrado
- `409` Conflicto (unique constraint, estado invalido)
- `429` Rate limit
- `500` Error interno

### 4.2 Codigos de error sugeridos (`code`)

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `BUSINESS_RULE_VIOLATION` (ej: registro cliente sin email en cartera)
- `RATE_LIMITED`
- `INTERNAL_ERROR`

---

## 5) Catalogo de APIs (REST)

### 5.0 Matriz rapida: pantalla Angular -> endpoints

Referencias de rutas actuales en el frontend:

- `src/app/pages/login-page/login-page.ts` -> `POST /auth/login`
- `src/app/pages/registro-page/registro-page.ts` -> `POST /auth/register-cliente`
- `src/app/pages/dashboard-page/dashboard-page.ts` -> `GET /metrics/dashboard` + `GET /clientes` + `GET /cuentas` (segun filtros UI)
- `src/app/pages/nuevo-cliente-page/nuevo-cliente-page.ts` -> `POST /clientes`
- `src/app/pages/cliente-detail-page/cliente-detail-page.ts` -> `GET /clientes/:id` + `GET /clientes/:id/propiedades` + `GET /clientes/:id/cuentas` + `GET /propiedades/:id/historial` (via propiedades)
- `src/app/pages/propiedades-page/propiedades-page.ts` -> `GET /propiedades`
- `src/app/pages/propiedad-detail-page/propiedad-detail-page.ts` -> `GET /propiedades/:id` + `GET /propiedades/:id/historial` + `GET /propiedades/:id/gestiones` + `POST /propiedades/:id/historial`
- `src/app/components/agregar-registro-dialog/agregar-registro-dialog.ts` -> `POST /propiedades/:id/historial`
- `src/app/pages/graficos-page/graficos-page.ts` -> `GET /metrics/*`
- `src/app/pages/cliente-portal-page/cliente-portal-page.ts` -> `GET /clientes/:id/propiedades` + lecturas de saldo/historial por propiedad (mismo contrato, con `cliente` scope)

### 5.0.1 Reglas de autorizacion por rol (minimo viable)

- `admin`: acceso completo a lecturas/escrituras administrativas.
- `cliente`: solo lecturas (y endpoints explicitamente permitidos) sobre:
  - su `cliente_id` del JWT
  - propiedades/historial/gestiones/cuentas derivadas de ese cliente

Endpoints tipicamente `admin-only`:

- `POST/PATCH/DELETE` de `clientes`, `propiedades`, `cuentas`
- `POST` de `historial` (si la UI admin lo permite; si el portal cliente debe registrar pagos, definirlo como caso aparte)

## 5.1 Auth

- `POST /api/v1/auth/login`
  - body: `{ "email": "string", "password": "string" }`
  - 200: `{ "access_token", "refresh_token", "user": { "id", "role", "cliente_id?" } }`
- `POST /api/v1/auth/register-cliente`
  - body: `{ "email", "password", "confirm_password" }`
  - regla: el email debe existir en `clientes`.
- `POST /api/v1/auth/refresh`
  - body: `{ "refresh_token": "string" }`
- `GET /api/v1/auth/me`
  - header `Authorization: Bearer <token>`
- `POST /api/v1/auth/logout`
  - invalida refresh token (denylist o rotacion).

## 5.2 Clientes

- `GET /api/v1/clientes`
  - filtros: `search`, `tipo_persona`.
- `GET /api/v1/clientes/:id`
- `POST /api/v1/clientes`
  - body:
  ```json
  {
    "nombre": "string",
    "tipo_persona": "natural|juridica",
    "documento": "string",
    "telefono": "string",
    "email": "string",
    "direccion": "string",
    "observaciones": "string"
  }
  ```
- `PATCH /api/v1/clientes/:id`
- `DELETE /api/v1/clientes/:id` (soft delete recomendado).

## 5.3 Propiedades

- `GET /api/v1/propiedades`
  - filtros: `cliente_id`, `tipo_propiedad`, `con_saldo`.
- `GET /api/v1/propiedades/:id`
- `POST /api/v1/propiedades`
- `PATCH /api/v1/propiedades/:id`
- `GET /api/v1/clientes/:id/propiedades`

## 5.4 Historial de pagos

- `GET /api/v1/propiedades/:id/historial`
  - filtros: `periodo_from`, `periodo_to`, `estado_pago`.
- `POST /api/v1/propiedades/:id/historial`
  - body:
  ```json
  {
    "periodo": "YYYY-MM",
    "concepto": "administracion|intereses|extraordinaria|otros",
    "valor_cobrado": 0,
    "valor_pagado": 0,
    "fecha_pago": "YYYY-MM-DD",
    "estado_pago": "pendiente|parcial|pagado|vencido",
    "observaciones": "string"
  }
  ```
  - regla de negocio: recalcular `monto_a_la_fecha` de la propiedad en backend.

## 5.5 Cuentas

- `GET /api/v1/clientes/:id/cuentas`
- `GET /api/v1/cuentas/:id`
- `POST /api/v1/cuentas`
- `PATCH /api/v1/cuentas/:id`

## 5.6 Gestiones

- `GET /api/v1/propiedades/:id/gestiones`
- `POST /api/v1/propiedades/:id/gestiones` (habilitar desde v1 si se requiere trazabilidad completa).

## 5.7 Metrics (dashboard y graficos)

- `GET /api/v1/metrics/dashboard`
  - total cartera, clientes activos, cuentas activas.
- `GET /api/v1/metrics/distribucion-estados`
- `GET /api/v1/metrics/evolucion-cartera?months=12`

## 5.8 Notifications (WhatsApp)

- `POST /api/v1/notifications/send`
  - uso: disparo manual desde UI admin (fallback operativo frente al scheduler).
  - body:
  ```json
  {
    "channel": "whatsapp",
    "propiedad_id": "uuid",
    "stage": "d_day_0",
    "due_date": "2026-04-14",
    "idempotency_key": "propiedad:stage:due_date"
  }
  ```
- `GET /api/v1/notifications/propiedades/:id/events`
  - filtros: `channel`, `limit`, `sort`, `order`.
- `POST /api/v1/notifications/schedules/run`
  - endpoint interno para ejecutar barrido de secuencia (`D-3`, `D0`, `D+3`) sobre cartera con deuda.
- `POST /api/v1/notifications/webhooks/whatsapp`
  - callback del proveedor para actualizar estados `delivered`, `read`, `failed`.

Reglas de negocio minimas:

- Elegibilidad: enviar solo cuando `propiedades.monto_a_la_fecha > 0`.
- Idempotencia: unica por (`propiedad_id`, `stage`, `due_date`).
- Corte: si la deuda se salda (`<= 0`) se cancelan etapas futuras pendientes.

### 5.8 Ejemplos de respuesta (referencia)

Lista paginada:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 125
  }
}
```

---

## 6) Modelo de datos PostgreSQL

## 6.1 Enums

- `tipo_persona_enum`: `natural`, `juridica`.
- `tipo_propiedad_enum`: `apartamento`, `local`, `parqueadero`, `otro`.
- `estado_pago_enum`: `pendiente`, `parcial`, `pagado`, `vencido`.
- `concepto_pago_enum`: `administracion`, `intereses`, `extraordinaria`, `otros`.
- `tipo_cuenta_enum`: `juridica`, `extrajudicial`, `acuerdo_de_pago`.
- `estado_cuenta_enum`: `activa`, `cerrada`, `en_proceso`.
- `etapa_proceso_enum`: `inicial`, `notificacion`, `conciliacion`, `demanda`, `ejecucion`.
- `role_enum`: `admin`, `cliente`.
- `notification_channel_enum`: `whatsapp`.
- `notification_stage_enum`: `d_minus_3`, `d_day_0`, `d_plus_3`.
- `notification_status_enum`: `queued`, `processing`, `sent`, `delivered`, `read`, `failed`, `cancelled`.

## 6.2 Tablas principales

- `usuarios`
  - `id` (uuid pk)
  - `email` (unique)
  - `password_hash`
  - `role`
  - `cliente_id` (nullable fk a `clientes`)
  - `created_at`, `updated_at`

- `clientes`
  - `id` (uuid pk)
  - `nombre`
  - `tipo_persona`
  - `documento` (unique)
  - `telefono`
  - `email` (unique)
  - `direccion`
  - `observaciones`
  - `is_active` (bool)
  - `created_at`, `updated_at`

- `propiedades`
  - `id` (uuid pk)
  - `cliente_id` (fk)
  - `tipo_propiedad`
  - `identificador`
  - `direccion`
  - `notas`
  - `monto_a_la_fecha` (numeric(14,2), default 0)
  - `edad_mora_dias` (integer nullable, agregado)
  - `fecha_inicio_cobro`, `fecha_fin_cobro` (date nullable, **calculados por backend**, ver 6.5.1)
  - `created_at`, `updated_at`

- `historial_pagos`
  - `id` (uuid pk)
  - `propiedad_id` (fk)
  - `periodo` (char(7))
  - `concepto`
  - `valor_cobrado` (numeric(14,2))
  - `valor_pagado` (numeric(14,2))
  - `fecha_pago` (date nullable)
  - `estado_pago`
  - `monto_a_la_fecha` (numeric(14,2))
  - `dias_en_mora` (integer nullable, opcional por movimiento)
  - `observaciones`
  - `created_at`, `updated_at`

- `cuentas`
  - `id` (uuid pk)
  - `cliente_id` (fk)
  - `propiedad_id` (fk nullable)
  - `numero_cuenta` (unique)
  - `tipo`
  - `estado`
  - `etapa_proceso`
  - `created_at`, `updated_at`

- `gestiones`
  - `id` (uuid pk)
  - `propiedad_id` (fk)
  - `fecha` (date)
  - `estado` (varchar)
  - `descripcion` (text)
  - `created_at`, `updated_at`

- `notification_sequences`
  - `id` (uuid pk)
  - `propiedad_id` (fk)
  - `channel` (`whatsapp`)
  - `due_date` (date)
  - `is_active` (bool)
  - `created_at`, `updated_at`

- `notification_events`
  - `id` (uuid pk)
  - `sequence_id` (fk)
  - `propiedad_id` (fk denormalizada para consultas)
  - `stage` (`d_minus_3|d_day_0|d_plus_3`)
  - `status` (`queued|processing|sent|delivered|read|failed|cancelled`)
  - `scheduled_for` (timestamptz)
  - `sent_at`, `delivered_at` (timestamptz nullable)
  - `provider_message_id` (text nullable)
  - `error_code`, `error_message` (nullable)
  - `idempotency_key` (text unique)
  - `created_at`, `updated_at`

## 6.3 Indices recomendados

- `clientes(email)`, `clientes(documento)`.
- `propiedades(cliente_id)`.
- `historial_pagos(propiedad_id, periodo)`.
- `cuentas(cliente_id)`, `cuentas(numero_cuenta)`.
- `gestiones(propiedad_id, fecha desc)`.
- `notification_events(propiedad_id, created_at desc)`.
- `notification_events(status, scheduled_for)`.
- `notification_events(idempotency_key unique)`.

## 6.4 Invariantes criticas

- `valor_cobrado >= 0` y `valor_pagado >= 0`.
- `periodo` formato `YYYY-MM`.
- `monto_a_la_fecha` calculado en backend y no confiado al cliente.
- Un usuario `cliente` debe mapear a un `cliente_id` valido.

## 6.5 Estrategia recomendada para `monto_a_la_fecha` (consistencia)

Objetivo: evitar divergencias entre:

- saldo mostrado en `propiedades.monto_a_la_fecha`
- saldo derivado del historial

Regla recomendada (fuente de verdad):

1. Al crear un `historial_pagos`, calcular:
   - `saldo_nuevo = saldo_anterior + valor_cobrado - valor_pagado`
   - donde `saldo_anterior` es el `monto_a_la_fecha` del ultimo registro de historial para esa propiedad (orden por `created_at`, desempate por `id`).
2. Persistir `historial_pagos.monto_a_la_fecha = saldo_nuevo` (campo denormalizado util para auditoria/UI).
3. Actualizar `propiedades.monto_a_la_fecha = saldo_nuevo` en la misma transaccion.

Notas:

- Si necesitas recalcular por corrupcion o migracion, usa un job offline que recompute desde cero por propiedad.
- Evita confiar en la formula del frontend (`DataService.addHistorialPago`) como contrato final; el backend debe ser autoritativo.

## 6.5.1 Mora, edad en mora y ventana de cobro (alineado con la UI)

**Alcance:** `edad_mora_dias`, `fecha_inicio_cobro` y `fecha_fin_cobro` son **por propiedad** (cada apartamento, casa, local u otra unidad en cartera), es decir **por deudor/unidad**, no por cada fila de `historial_pagos`. La UI no debe repetirlos en cada movimiento del historial.

### Regla de negocio: inicio y fin del cobro (no vienen del formulario de historial)

Estas fechas las calcula **solo el backend**; el cliente **no** las envia en `POST /propiedades/:id/historial`.

1. **`fecha_inicio_cobro`**  
   - Es el **dia en que se crea la propiedad en la plataforma** (alta del inmueble/unidad en el sistema).  
   - Implementacion recomendada: `date(propiedades.created_at)` en la zona horaria/regla que defina el producto (solo la parte fecha, sin depender de `cuentas`).  
   - Al hacer `POST /propiedades` (o equivalente), el backend puede **persistir** `fecha_inicio_cobro` igual a esa fecha o derivarla siempre de `created_at` al exponer el DTO.

2. **`fecha_fin_cobro`**  
   - Es la fecha en que el proceso de cobro se considera **cerrado** porque el **saldo actual vuelve a coincidir con el saldo inicial de referencia** (misma magnitud que al inicio del esquema de cobro para esa propiedad).  
   - Implementacion recomendada: persistir en `propiedades` el **saldo inicial de referencia** al crear la propiedad (equivalente al `saldo_inicial` del alta, ver flujo de creacion) y comparar contra `propiedades.monto_a_la_fecha` tras cada movimiento de historial.  
   - `fecha_fin_cobro` = **fecha** (ej. `date` del movimiento o `created_at` del registro de historial) del **primer** momento en que `monto_a_la_fecha` **iguala** ese saldo inicial de referencia **luego** de haber estado en cobro activo (definir si exige haber tenido saldo distinto antes, para no marcar fin en el primer movimiento).  
   - Mientras no se cumpla la condicion, `fecha_fin_cobro` permanece `NULL`.

**Invariante:** si ambas fechas existen, debe cumplirse `fecha_fin_cobro >= fecha_inicio_cobro`.

### Otros campos

**En `historial_pagos` (por movimiento):**

- Opcionalmente `dias_en_mora` (`integer`, nullable) si el negocio quiere antiguedad **por periodo/concepto**; no sustituye el agregado por unidad en `propiedades`.

- **No** persistir `fecha_inicio_cobro` ni `fecha_fin_cobro` en `historial_pagos`: solo en `propiedades`.

**En `propiedades` (una fila = una unidad / deudor en ese inmueble):**

- `edad_mora_dias` (`integer`, nullable): agregado por esa propiedad (regla acordada; puede derivarse del historial de esa propiedad).

- `fecha_inicio_cobro`, `fecha_fin_cobro`: `fecha_inicio_cobro` queda fijada por la **creacion de la propiedad**; `fecha_fin_cobro` se actualiza segun la regla de saldo; ambas se mantienen coherentes al insertar historial de **esa** propiedad.

El `POST /propiedades/:id/historial` **no** debe aceptar `fecha_inicio_cobro`, `fecha_fin_cobro` ni `dias_en_mora` desde el cliente (ignorar o rechazar).

Ejemplo de fragmento JSON de propiedad en listado:

```json
{
  "id": "…",
  "cliente_id": "…",
  "monto_a_la_fecha": "1250000.00",
  "edad_mora_dias": 45,
  "fecha_inicio_cobro": "2025-11-01",
  "fecha_fin_cobro": "2026-02-28"
}
```

## 6.6 SQL DDL base (PostgreSQL) - esqueleto ejecutable

> Ajusta nombres/tipos segun convencion del equipo. Esto es una base para `prisma migrate` equivalente.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE role_enum AS ENUM ('admin', 'cliente');
CREATE TYPE tipo_persona_enum AS ENUM ('natural', 'juridica');
CREATE TYPE tipo_propiedad_enum AS ENUM ('apartamento', 'local', 'parqueadero', 'otro');
CREATE TYPE estado_pago_enum AS ENUM ('pendiente', 'parcial', 'pagado', 'vencido');
CREATE TYPE concepto_pago_enum AS ENUM ('administracion', 'intereses', 'extraordinaria', 'otros');
CREATE TYPE tipo_cuenta_enum AS ENUM ('juridica', 'extrajudicial', 'acuerdo_de_pago');
CREATE TYPE estado_cuenta_enum AS ENUM ('activa', 'cerrada', 'en_proceso');
CREATE TYPE etapa_proceso_enum AS ENUM ('inicial', 'notificacion', 'conciliacion', 'demanda', 'ejecucion');

CREATE TABLE clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo_persona tipo_persona_enum NOT NULL,
  documento text NOT NULL UNIQUE,
  telefono text,
  email text NOT NULL UNIQUE,
  direccion text,
  observaciones text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role role_enum NOT NULL,
  cliente_id uuid NULL REFERENCES clientes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_cliente_role_chk CHECK (
    (role = 'cliente' AND cliente_id IS NOT NULL) OR (role = 'admin')
  )
);

CREATE TABLE propiedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id),
  tipo_propiedad tipo_propiedad_enum NOT NULL,
  identificador text NOT NULL,
  direccion text,
  notas text,
  monto_a_la_fecha numeric(14,2) NOT NULL DEFAULT 0,
  edad_mora_dias integer NULL,
  fecha_inicio_cobro date NULL,
  fecha_fin_cobro date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_propiedad_cobro_fechas CHECK (
    fecha_inicio_cobro IS NULL OR fecha_fin_cobro IS NULL OR fecha_fin_cobro >= fecha_inicio_cobro
  )
);

CREATE INDEX idx_propiedades_cliente_id ON propiedades(cliente_id);

CREATE TABLE historial_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id uuid NOT NULL REFERENCES propiedades(id),
  periodo char(7) NOT NULL,
  concepto concepto_pago_enum NOT NULL,
  valor_cobrado numeric(14,2) NOT NULL,
  valor_pagado numeric(14,2) NOT NULL,
  fecha_pago date,
  estado_pago estado_pago_enum NOT NULL,
  monto_a_la_fecha numeric(14,2) NOT NULL,
  dias_en_mora integer NULL,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_historial_montos_nonneg CHECK (valor_cobrado >= 0 AND valor_pagado >= 0)
);

CREATE INDEX idx_historial_propiedad_periodo ON historial_pagos(propiedad_id, periodo);

CREATE TABLE cuentas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id),
  propiedad_id uuid NULL REFERENCES propiedades(id),
  numero_cuenta text NOT NULL UNIQUE,
  tipo tipo_cuenta_enum NOT NULL,
  estado estado_cuenta_enum NOT NULL,
  etapa_proceso etapa_proceso_enum NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cuentas_cliente_id ON cuentas(cliente_id);

CREATE TABLE gestiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id uuid NOT NULL REFERENCES propiedades(id),
  fecha date NOT NULL,
  estado text NOT NULL,
  descripcion text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gestiones_propiedad_fecha ON gestiones(propiedad_id, fecha DESC);

-- Refresh tokens (rotacion + revocacion)
CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  replaced_by_token_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
```

---

## 7) Prisma (ORM recomendado)

Prisma es la recomendacion principal por:

- Tipado fuerte y cliente generado para TypeScript.
- Migraciones claras (`prisma migrate`).
- Curva de mantenimiento favorable para equipos full-stack JS/TS.

### 7.1 `schema.prisma` completo (alineado al dominio actual)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  admin
  cliente
}

enum TipoPersona {
  natural
  juridica
}

enum TipoPropiedad {
  apartamento
  local
  parqueadero
  otro
}

enum EstadoPago {
  pendiente
  parcial
  pagado
  vencido
}

enum ConceptoPago {
  administracion
  intereses
  extraordinaria
  otros
}

enum TipoCuenta {
  juridica
  extrajudicial
  acuerdo_de_pago
}

enum EstadoCuenta {
  activa
  cerrada
  en_proceso
}

enum EtapaProceso {
  inicial
  notificacion
  conciliacion
  demanda
  ejecucion
}

model Cliente {
  id            String        @id @default(uuid())
  nombre        String
  tipo_persona  TipoPersona
  documento     String        @unique
  telefono      String?
  email         String        @unique
  direccion     String?
  observaciones String?
  is_active     Boolean       @default(true)

  propiedades Propiedad[]
  cuentas     Cuenta[]
  usuarios    Usuario[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model Usuario {
  id            String   @id @default(uuid())
  email         String   @unique
  password_hash String
  role          Role
  cliente_id    String?
  cliente       Cliente? @relation(fields: [cliente_id], references: [id])

  refresh_tokens RefreshToken[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model Propiedad {
  id             String        @id @default(uuid())
  cliente_id     String
  cliente        Cliente       @relation(fields: [cliente_id], references: [id])
  tipo_propiedad TipoPropiedad
  identificador  String
  direccion      String?
  notas          String?

  // Saldo autoritativo (ver seccion 6.5)
  monto_a_la_fecha Decimal @default(0) @db.Decimal(14, 2)

  // Agregados para listados (ver seccion 6.5.1)
  edad_mora_dias       Int?      @db.Integer
  fecha_inicio_cobro   DateTime? @db.Date
  fecha_fin_cobro      DateTime? @db.Date

  historial_pagos HistorialPago[]
  gestiones       Gestion[]
  cuentas         Cuenta[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model HistorialPago {
  id           String       @id @default(uuid())
  propiedad_id String
  propiedad    Propiedad    @relation(fields: [propiedad_id], references: [id])

  periodo        String       @db.Char(7)
  concepto       ConceptoPago
  valor_cobrado  Decimal      @db.Decimal(14, 2)
  valor_pagado   Decimal      @db.Decimal(14, 2)
  fecha_pago     DateTime?    @db.Date
  estado_pago    EstadoPago

  // Snapshot de saldo despues de aplicar esta fila (auditoria + UI)
  monto_a_la_fecha Decimal @db.Decimal(14, 2)

  dias_en_mora Int? @db.Integer

  observaciones String?

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model Cuenta {
  id            String       @id @default(uuid())
  cliente_id    String
  cliente       Cliente      @relation(fields: [cliente_id], references: [id])
  propiedad_id  String?
  propiedad     Propiedad?   @relation(fields: [propiedad_id], references: [id])

  numero_cuenta String       @unique
  tipo          TipoCuenta
  estado        EstadoCuenta
  etapa_proceso EtapaProceso

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model Gestion {
  id           String    @id @default(uuid())
  propiedad_id String
  propiedad    Propiedad @relation(fields: [propiedad_id], references: [id])

  fecha        DateTime @db.Date
  estado       String
  descripcion  String

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model RefreshToken {
  id         String   @id @default(uuid())
  usuario_id String
  usuario    Usuario  @relation(fields: [usuario_id], references: [id], onDelete: Cascade)

  token_hash String
  expires_at DateTime
  revoked_at DateTime?
  replaced_by_token_id String?

  created_at DateTime @default(now())
}
```

Modelo adicional sugerido para notificaciones:

```prisma
enum NotificationChannel {
  whatsapp
}

enum NotificationStage {
  d_minus_3
  d_day_0
  d_plus_3
}

enum NotificationStatus {
  queued
  processing
  sent
  delivered
  read
  failed
  cancelled
}

model NotificationSequence {
  id          String              @id @default(uuid())
  propiedad_id String
  propiedad   Propiedad           @relation(fields: [propiedad_id], references: [id])
  channel     NotificationChannel @default(whatsapp)
  due_date    DateTime            @db.Date
  is_active   Boolean             @default(true)
  events      NotificationEvent[]
  created_at  DateTime            @default(now())
  updated_at  DateTime            @updatedAt
}

model NotificationEvent {
  id                  String              @id @default(uuid())
  sequence_id         String
  sequence            NotificationSequence @relation(fields: [sequence_id], references: [id])
  propiedad_id        String
  propiedad           Propiedad           @relation(fields: [propiedad_id], references: [id])
  stage               NotificationStage
  status              NotificationStatus  @default(queued)
  scheduled_for       DateTime
  sent_at             DateTime?
  delivered_at        DateTime?
  provider_message_id String?
  error_code          String?
  error_message       String?
  idempotency_key     String              @unique
  created_at          DateTime            @default(now())
  updated_at          DateTime            @updatedAt

  @@index([propiedad_id, created_at(sort: Desc)])
  @@index([status, scheduled_for])
}
```

### 7.2 Migraciones y seed

- Migraciones:
  - `npx prisma migrate dev --name init_core_schema`
  - `npx prisma migrate deploy` (staging/prod)
- Seed:
  - usuario admin inicial
  - catalogo minimo de datos de prueba
- Politica:
  - no editar manualmente migraciones aplicadas en prod
  - cambios por nuevas migraciones incrementales

---

## 8) Seguridad y acceso

- JWT access token corto (15m) + refresh token rotado (7-30d).
- Password hashing con `argon2` (preferido) o `bcrypt`.
- `RBAC`: `admin` y `cliente`.
- Regla ABAC minima: `cliente` solo consulta recursos asociados a su `cliente_id`.
- Secretos en AWS Secrets Manager, cifrado con KMS.
- CORS restringido a dominios frontend autorizados.
- Rate limiting por IP y por usuario autenticado.

---

## 9) Infraestructura AWS (produccion)

## 9.1 Componentes

- Red:
  - VPC multi-AZ.
  - Subredes publicas (ALB) y privadas (ECS/RDS/Redis).
  - NAT Gateway para egreso controlado.
- DNS/TLS:
  - Route53 para dominio de API.
  - ACM para certificado TLS en ALB.
- Compute:
  - ECS Fargate para API NestJS.
  - Auto scaling por CPU, memoria y request count.
- Base de datos:
  - RDS PostgreSQL Multi-AZ.
  - PITR activado.
- Cache:
  - ElastiCache Redis (cache de lecturas y rate-limit distribuido).
  - Cola BullMQ para scheduler y worker de notificaciones WhatsApp.
- Archivos:
  - S3 (adjuntos, reportes exportados).
- Seguridad:
  - WAF delante de ALB.
  - IAM con minimo privilegio.
  - Security Groups estrictos.
  - KMS para secretos y cifrado S3 (SSE-KMS) si aplica compliance.
- Observabilidad:
  - CloudWatch Logs/Metrics/Alarms.
  - Trazas (X-Ray u OpenTelemetry).

### 9.1.1 Security Groups (regla practica)

- ALB: permite `443` desde internet (o desde CloudFront si lo usas como borde).
- ECS tasks: permite trafico solo desde el SG del ALB en el puerto de la app (ej `3000`/`8080`).
- RDS: permite `5432` solo desde SG de ECS tasks (y bastion si existe).
- Redis: permite `6379` solo desde SG de ECS tasks.

### 9.1.2 Alarmas minimas (CloudWatch)

- ALB `5xx` rate y latencia p95.
- ECS service CPU/memoria y restarts.
- RDS: conexiones, CPU, espacio libre, lag de replica (si aplica).
- Errores de aplicacion (metrica custom por `code` de error de negocio, opcional).

## 9.2 Diagrama (Mermaid)

```mermaid
flowchart LR
  ClientApp["AngularClient"] -->|"HTTPS /api/v1"| ALB["ALB+WAF"]
  ALB --> ECSApi["ECSFargateNestAPI"]
  ECSApi --> RDSPostgres["RDSPostgreSQLMultiAZ"]
  ECSApi --> RedisCache["ElastiCacheRedis"]
  Scheduler["EventBridge(15m)"] -->|"POST /notifications/schedules/run"| ECSApi
  Worker["NotificationsWorkerBullMQ"] --> RedisCache
  Worker --> WhatsAppProvider["WhatsAppProviderAPI"]
  WhatsAppProvider -->|"WebhookStatus"| ECSApi
  ECSApi --> S3Storage["S3"]
  ECSApi --> Secrets["SecretsManagerKMS"]
  ECSApi --> Logs["CloudWatchLogsMetrics"]
```

## 9.3 CI/CD e IaC

- Repositorio:
  - PR checks: lint + test + build.
- Pipeline:
  1. Build imagen Docker.
  2. Push a ECR.
  3. Deploy a ECS (rolling update).
  4. Migracion `prisma migrate deploy`.
  5. Smoke tests post-deploy.
- IaC:
  - Terraform para VPC, ECS, RDS, Redis, IAM, ALB, WAF, S3.

### 9.3.1 Runbook de deploy y rollback (resumen)

- Pre-check:
  - migraciones compatibles hacia atras o plan de rollback de DB documentado
- Deploy:
  - aumentar capacidad temporalmente si hay picos
  - validar `/health` y un smoke `GET /auth/me` con token de prueba
- Rollback:
  - revertir task definition anterior en ECS
  - si hubo migracion destructiva, ejecutar plan de recuperacion (restore snapshot)

---

## 10) Checklist de adopcion desde frontend actual

1. Crear backend v1 y publicar `/api/v1/health`.
2. Implementar `auth/login` y `auth/me`.
3. Migrar pantalla de login para usar backend + interceptor JWT.
4. Exponer `clientes`, `propiedades` y `historial_pagos`.
5. Reemplazar llamadas de `DataService` por `HttpClient` por modulo.
6. Mover calculos de saldo (`monto_a_la_fecha`) al backend.
7. Exponer `metrics/dashboard` para reemplazar agregaciones en frontend.
8. Activar auditoria y trazabilidad de gestiones.
9. Habilitar observabilidad y alarmas minimas en staging.
10. Promocionar a produccion con runbook y rollback definido.
11. Activar secuencia WhatsApp D-3/D0/D+3 con idempotencia y monitoreo de delivery.

### 10.1 Notas de compatibilidad con el mock actual

- El frontend hoy usa `snake_case` en modelos (`src/app/core/models/index.ts`). Mantener el mismo shape reduce friccion.
- `AuthService` hoy valida registro de cliente contra `DataService.getClientes()`; en backend debe replicarse como regla explicita en `register-cliente`.
- `NuevoClientePage` hoy no persiste; al conectar backend, `POST /clientes` se vuelve obligatorio para cerrar el flujo.

---

## 11) Riesgos y tradeoffs

- Mayor robustez implica mayor costo inicial (infra + operacion).
- Implementar todo en una sola iteracion eleva riesgo de regresion.
- Recomendacion: fases
  - Fase 1: API core + auth + clientes/propiedades/pagos.
  - Fase 2: metrics avanzadas, archivos, optimizaciones y hardening extra.

---

## 12) Criterios de aceptacion del backend

- Todos los endpoints v1 documentados y testeados.
- Migraciones aplicables en limpio (`migrate deploy`) sin pasos manuales.
- Politicas de acceso por rol funcionando.
- Alertas criticas activas (5xx, latencia, CPU/RAM, conexiones DB).
- Backups y restauracion validados.

