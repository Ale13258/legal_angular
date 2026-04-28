# Estructuras Backend Necesarias (Node.js + NestJS + Prisma + PostgreSQL + AWS)

Este documento responde a: **que necesito por todas las estructuras** para que el sistema funcione end-to-end, manteniendo `registro` y dejando fuera `notificaciones por correo`.

## 1) Estructura de arquitectura (anillo + repository)

## 1.1 Capas obligatorias

- `domain`
  - Entidades de negocio
  - Reglas puras
  - Interfaces de repositorio (puertos)
- `application`
  - Casos de uso
  - DTOs de entrada/salida
  - Orquestacion de reglas
- `infrastructure`
  - HTTP (controllers, guards)
  - Persistencia (Prisma repositories)
  - Seguridad (JWT)
  - Integraciones (cache, storage, logs)

## 1.2 Regla de dependencia

- `domain` no depende de framework ni DB.
- `application` depende de `domain`.
- `infrastructure` depende de `application` y `domain`.

---

## 2) Estructura de carpetas necesaria

```txt
src/
  modules/
    auth/
      domain/
        repositories/
      application/
        dto/
        use-cases/
      infrastructure/
        http/
          auth.controller.ts
        security/
          jwt.strategy.ts
          guards/
        persistence/
          prisma/
            auth-prisma.repository.ts
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

  main.ts
```

---

## 3) Estructura de base de datos (PostgreSQL)

## 3.1 Tablas necesarias

- `usuarios`
- `refresh_tokens`
- `clientes`
- `propiedades`
- `historial_pagos`
- `cuentas`
- `gestiones`

## 3.2 Enums necesarios

- `role_enum`: `admin`, `cliente`
- `tipo_persona_enum`: `natural`, `juridica`
- `tipo_propiedad_enum`: `apartamento`, `local`, `parqueadero`, `otro`
- `estado_pago_enum`: `pendiente`, `parcial`, `pagado`, `vencido`
- `concepto_pago_enum`: `administracion`, `intereses`, `extraordinaria`, `otros`
- `tipo_cuenta_enum`: `juridica`, `extrajudicial`, `acuerdo_de_pago`
- `estado_cuenta_enum`: `activa`, `cerrada`, `en_proceso`
- `etapa_proceso_enum`: `inicial`, `notificacion`, `conciliacion`, `demanda`, `ejecucion`
- `notification_channel_enum`: `whatsapp`
- `notification_stage_enum`: `d_minus_3`, `d_day_0`, `d_plus_3`
- `notification_status_enum`: `queued`, `processing`, `sent`, `delivered`, `read`, `failed`, `cancelled`

## 3.3 Relaciones clave

- `usuarios.cliente_id -> clientes.id` (nullable para admin)
- `propiedades.cliente_id -> clientes.id`
- `historial_pagos.propiedad_id -> propiedades.id`
- `cuentas.cliente_id -> clientes.id`
- `cuentas.propiedad_id -> propiedades.id` (nullable)
- `gestiones.propiedad_id -> propiedades.id`
- `refresh_tokens.usuario_id -> usuarios.id`
- `notification_sequences.propiedad_id -> propiedades.id`
- `notification_events.sequence_id -> notification_sequences.id`

## 3.4 Regla critica de saldo

Para `monto_a_la_fecha`:

- El backend calcula saldo al crear un historial:
  - `saldo_nuevo = saldo_anterior + valor_cobrado - valor_pagado`
- Guarda ese saldo en:
  - `historial_pagos.monto_a_la_fecha`
  - `propiedades.monto_a_la_fecha`
- Todo dentro de una transaccion.

---

## 4) Estructura de API (endpoints necesarios)

Base path: `/api/v1`

## 4.1 Infra

- `GET /health`

## 4.2 Auth (registro incluido)

- `POST /auth/login`
- `POST /auth/register-cliente`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

## 4.3 Clientes

- `GET /clientes`
- `GET /clientes/:id`
- `POST /clientes`
- `PATCH /clientes/:id`

## 4.4 Propiedades

- `GET /propiedades`
- `GET /propiedades/:id`
- `POST /propiedades`
- `PATCH /propiedades/:id`
- `GET /clientes/:id/propiedades`

## 4.5 Historial pagos

- `GET /propiedades/:id/historial`
- `POST /propiedades/:id/historial`

## 4.6 Cuentas

- `GET /clientes/:id/cuentas`
- `GET /cuentas/:id`
- `POST /cuentas`
- `PATCH /cuentas/:id`

## 4.7 Gestiones

- `GET /propiedades/:id/gestiones`
- `POST /propiedades/:id/gestiones`

## 4.8 Metrics

- `GET /metrics/dashboard`
- `GET /metrics/distribucion-estados`
- `GET /metrics/evolucion-cartera?months=12`

## 4.9 Notifications (WhatsApp)

- `POST /notifications/send` (disparo manual admin; crea evento `queued`)
- `GET /notifications/propiedades/:id/events?channel=whatsapp&limit=1&sort=created_at&order=desc`
- `POST /notifications/schedules/run` (interno: evalua secuencia y encola etapas pendientes)
- `POST /notifications/webhooks/whatsapp` (callback de proveedor para `delivered/read/failed`)

Reglas minimas:

- Secuencia por defecto: `D-3`, `D0`, `D+3`.
- Elegible solo si `propiedades.monto_a_la_fecha > 0`.
- Idempotencia por `propiedad_id + stage + due_date`.
- Cancelar etapas futuras cuando la deuda quede en `<= 0`.

## 4.10 Fuera de alcance (por pedido)

- Email automatico, SMS y campañas multicanal avanzadas.

## 4.11 Bodies (request/response) por endpoint

Convencion:

- `Content-Type: application/json`
- respuestas de error:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Payload invalido",
  "details": {},
  "request_id": "uuid"
}
```

### Auth

`POST /api/v1/auth/login`

Request:

```json
{
  "email": "admin@legaltech.com",
  "password": "admin123"
}
```

Response 200:

```json
{
  "access_token": "jwt_access",
  "refresh_token": "jwt_refresh",
  "user": {
    "id": "uuid",
    "email": "admin@legaltech.com",
    "role": "admin",
    "cliente_id": null
  }
}
```

`POST /api/v1/auth/register-cliente`

Request:

```json
{
  "email": "cliente@email.com",
  "password": "secreto123",
  "confirm_password": "secreto123"
}
```

Response 201:

```json
{
  "user": {
    "id": "uuid",
    "email": "cliente@email.com",
    "role": "cliente",
    "cliente_id": "uuid"
  }
}
```

`GET /api/v1/auth/me`

Response 200:

```json
{
  "id": "uuid",
  "email": "cliente@email.com",
  "role": "cliente",
  "cliente_id": "uuid"
}
```

`POST /api/v1/auth/refresh`

Request:

```json
{
  "refresh_token": "jwt_refresh"
}
```

Response 200:

```json
{
  "access_token": "new_jwt_access",
  "refresh_token": "new_jwt_refresh"
}
```

`POST /api/v1/auth/logout`

Request:

```json
{
  "refresh_token": "jwt_refresh"
}
```

Response 204: sin body.

### Clientes

`POST /api/v1/clientes`

Request:

```json
{
  "nombre": "Maria Alejandra Rodriguez",
  "tipo_persona": "natural",
  "documento": "1023456789",
  "telefono": "3102345678",
  "email": "maria@email.com",
  "direccion": "Cra 15 #82-30",
  "observaciones": "Cliente con seguimiento"
}
```

Response 201:

```json
{
  "id": "uuid",
  "nombre": "Maria Alejandra Rodriguez",
  "tipo_persona": "natural",
  "documento": "1023456789",
  "telefono": "3102345678",
  "email": "maria@email.com",
  "direccion": "Cra 15 #82-30",
  "observaciones": "Cliente con seguimiento",
  "created_at": "2026-03-19T10:00:00.000Z"
}
```

`PATCH /api/v1/clientes/:id`

Request (parcial):

```json
{
  "telefono": "3001234567",
  "direccion": "Nueva direccion",
  "observaciones": "Actualizado"
}
```

Response 200: mismo shape de cliente actualizado.

### Propiedades

`POST /api/v1/propiedades`

Request:

```json
{
  "cliente_id": "uuid",
  "tipo_propiedad": "apartamento",
  "identificador": "Torre A - Apto 301",
  "direccion": "Conjunto Los Pinos",
  "notas": "Propiedad principal"
}
```

Response 201:

```json
{
  "id": "uuid",
  "cliente_id": "uuid",
  "tipo_propiedad": "apartamento",
  "identificador": "Torre A - Apto 301",
  "direccion": "Conjunto Los Pinos",
  "notas": "Propiedad principal",
  "monto_a_la_fecha": 0,
  "created_at": "2026-03-19T10:00:00.000Z"
}
```

`PATCH /api/v1/propiedades/:id`

Request (parcial):

```json
{
  "notas": "Actualizacion de notas",
  "direccion": "Direccion corregida"
}
```

Response 200: propiedad actualizada.

### Historial pagos

`POST /api/v1/propiedades/:id/historial`

Request:

```json
{
  "periodo": "2026-03",
  "concepto": "administracion",
  "valor_cobrado": 850000,
  "valor_pagado": 400000,
  "fecha_pago": "2026-03-20",
  "estado_pago": "parcial",
  "observaciones": "Abono parcial"
}
```

Response 201:

```json
{
  "id": "uuid",
  "propiedad_id": "uuid",
  "periodo": "2026-03",
  "concepto": "administracion",
  "valor_cobrado": 850000,
  "valor_pagado": 400000,
  "fecha_pago": "2026-03-20",
  "estado_pago": "parcial",
  "monto_a_la_fecha": 1300000,
  "observaciones": "Abono parcial",
  "created_at": "2026-03-20T10:00:00.000Z"
}
```

### Cuentas

`POST /api/v1/cuentas`

Request:

```json
{
  "cliente_id": "uuid",
  "propiedad_id": "uuid",
  "numero_cuenta": "CTA-2026-001",
  "tipo": "juridica",
  "estado": "activa",
  "etapa_proceso": "inicial"
}
```

Response 201:

```json
{
  "id": "uuid",
  "cliente_id": "uuid",
  "propiedad_id": "uuid",
  "numero_cuenta": "CTA-2026-001",
  "tipo": "juridica",
  "estado": "activa",
  "etapa_proceso": "inicial",
  "created_at": "2026-03-19T10:00:00.000Z"
}
```

`PATCH /api/v1/cuentas/:id`

Request (parcial):

```json
{
  "estado": "en_proceso",
  "etapa_proceso": "conciliacion"
}
```

Response 200: cuenta actualizada.

### Gestiones

`POST /api/v1/propiedades/:id/gestiones`

Request:

```json
{
  "fecha": "2026-03-19",
  "estado": "contactado",
  "descripcion": "Se realizo llamada y se acordo pago parcial"
}
```

Response 201:

```json
{
  "id": "uuid",
  "propiedad_id": "uuid",
  "fecha": "2026-03-19",
  "estado": "contactado",
  "descripcion": "Se realizo llamada y se acordo pago parcial",
  "created_at": "2026-03-19T10:00:00.000Z"
}
```

### Metrics

`GET /api/v1/metrics/dashboard`

Response 200:

```json
{
  "total_cartera": 14280000,
  "clientes_activos": 42,
  "cuentas_activas": 57
}
```

### Notifications (WhatsApp)

`POST /api/v1/notifications/send`

Request:

```json
{
  "channel": "whatsapp",
  "propiedad_id": "uuid",
  "stage": "d_day_0",
  "due_date": "2026-04-14",
  "idempotency_key": "uuid-o-compuesta"
}
```

Response 202:

```json
{
  "id": "uuid",
  "propiedad_id": "uuid",
  "stage": "d_day_0",
  "channel": "whatsapp",
  "status": "queued",
  "scheduled_for": "2026-04-14T13:00:00.000Z",
  "provider_message_id": null,
  "created_at": "2026-04-14T13:00:00.000Z",
  "updated_at": "2026-04-14T13:00:00.000Z"
}
```

`GET /api/v1/notifications/propiedades/:id/events?channel=whatsapp&limit=1`

Response 200:

```json
{
  "items": [
    {
      "id": "uuid",
      "propiedad_id": "uuid",
      "stage": "d_day_0",
      "channel": "whatsapp",
      "status": "sent",
      "scheduled_for": "2026-04-14T13:00:00.000Z",
      "sent_at": "2026-04-14T13:00:07.000Z",
      "provider_message_id": "wamid.xxx",
      "created_at": "2026-04-14T13:00:00.000Z",
      "updated_at": "2026-04-14T13:00:07.000Z"
    }
  ]
}
```

`POST /api/v1/notifications/schedules/run`

Response 200:

```json
{
  "processed_properties": 142,
  "queued_events": 37,
  "skipped_paid_off": 21
}
```

`GET /api/v1/metrics/distribucion-estados`

Response 200:

```json
{
  "activa": 30,
  "en_proceso": 20,
  "cerrada": 7
}
```

`GET /api/v1/metrics/evolucion-cartera?months=6`

Response 200:

```json
{
  "series": [
    { "periodo": "2025-10", "total": 8200000 },
    { "periodo": "2025-11", "total": 9000000 },
    { "periodo": "2025-12", "total": 10100000 },
    { "periodo": "2026-01", "total": 12000000 },
    { "periodo": "2026-02", "total": 13600000 },
    { "periodo": "2026-03", "total": 14280000 }
  ]
}
```

---

## 5) Estructura de seguridad

## 5.1 Autenticacion y tokens

- Access token JWT corto (ej. 15 min)
- Refresh token rotado (ej. 7-30 dias)
- Hash de password con `argon2` (o `bcrypt`)

## 5.2 Autorizacion

- `admin`: CRUD administrativo
- `cliente`: solo recursos de su `cliente_id`

## 5.3 Guardas requeridas

- `AuthGuard` (token valido)
- `RolesGuard` (admin/cliente)
- `OwnershipGuard` para recursos de cliente

---

## 6) Estructura de infraestructura AWS necesaria

## 6.1 Red

- VPC multi-AZ
- Subred publica: ALB
- Subred privada: ECS, RDS, Redis
- NAT Gateway

## 6.2 Compute y datos

- ECS Fargate: API NestJS
- RDS PostgreSQL Multi-AZ
- ElastiCache Redis (cache/rate-limit)
- S3 (archivos/reportes si aplica)

## 6.3 Seguridad

- WAF delante de ALB
- Route53 + ACM (DNS/TLS)
- Secrets Manager + KMS
- Security Groups estrictos

## 6.4 Observabilidad

- CloudWatch logs/metrics/alarms
- Healthcheck ALB a `/api/v1/health`
- Alarmas minimas:
  - 5xx
  - latencia p95
  - CPU/memoria ECS
  - conexiones y storage en RDS

---

## 7) Estructura de CI/CD e IaC

## 7.1 Pipeline minimo

1. `lint`
2. `test`
3. `build` + Docker image
4. push a ECR
5. deploy ECS
6. `prisma migrate deploy`
7. smoke tests

## 7.2 Infra como codigo

- Terraform para:
  - VPC
  - ALB
  - ECS
  - RDS
  - Redis
  - S3
  - IAM
  - WAF

---

## 8) Estructura de implementacion por fases

## Fase 1 (obligatoria para operar)

- Auth completo (incluye registro)
- Clientes, propiedades, historial, cuentas, gestiones
- Metrics basicas
- AWS base: ALB + ECS + RDS + Secrets + CloudWatch

## Fase 2 (hardening y optimizacion)

- Redis avanzado
- reportes/archivos mas robustos
- trazas distribuidas completas
- optimizaciones de consultas y costos

---

## 9) Checklist final de “todo lo necesario”

- Estructura de carpetas hexagonal por modulos
- Repository ports + Prisma adapters
- Endpoints REST completos
- Esquema PostgreSQL + migraciones Prisma
- JWT + roles + ownership
- AWS productivo con monitoreo
- CI/CD con rollback
- Modulo de recordatorios automaticos por WhatsApp con secuencia D-3/D0/D+3
- Sin modulo de notificaciones por correo

