# Backend: Especificacion de Notificaciones por WhatsApp

## 1) Objetivo

Definir el modulo backend para enviar recordatorios automaticos de pago por WhatsApp a clientes, con secuencia programada, idempotencia, trazabilidad y reintentos.

Alcance de este documento:

- Solo canal `whatsapp`.
- Solo recordatorios de cartera por propiedad.
- Secuencia base: `D-3`, `D0`, `D+3` respecto a fecha de vencimiento.

Fuera de alcance:

- Email, SMS, push.
- Campañas masivas avanzadas.
- Motor de reglas complejo (ML/scoring).

---

## 2) Reglas de negocio

1. Elegibilidad de envio:
   - Solo enviar si `propiedades.monto_a_la_fecha > 0`.
2. Secuencia:
   - `d_minus_3`: 3 dias antes del vencimiento.
   - `d_day_0`: dia del vencimiento.
   - `d_plus_3`: 3 dias despues del vencimiento.
3. Idempotencia:
   - Un evento unico por combinacion (`propiedad_id`, `stage`, `due_date`).
4. Corte de secuencia:
   - Si la deuda se salda (`monto_a_la_fecha <= 0`), cancelar eventos futuros pendientes.
5. Destinatario:
   - Telefono del cliente asociado a la propiedad.
6. Auditoria:
   - Persistir estados de entrega (`queued`, `sent`, `delivered`, `read`, `failed`, `cancelled`).

---

## 3) Contrato API (REST)

Base path: `/api/v1/notifications`

### 3.1 POST `/send`

Uso: disparo manual desde UI admin o integraciones internas.

Request:

```json
{
  "channel": "whatsapp",
  "propiedad_id": "uuid",
  "stage": "d_day_0",
  "due_date": "2026-04-14",
  "idempotency_key": "propiedad:stage:due_date"
}
```

Response `202`:

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

Errores esperados:

- `400 VALIDATION_ERROR`
- `404 NOT_FOUND` (propiedad/cliente inexistente)
- `409 CONFLICT` (idempotency key duplicada)

### 3.2 GET `/propiedades/:propiedadId/events`

Uso: consultar trazabilidad de envios para UI y soporte.

Query params:

- `channel=whatsapp`
- `limit=1..100`
- `sort=created_at|scheduled_for`
- `order=asc|desc`

Response `200`:

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
      "sent_at": "2026-04-14T13:00:05.000Z",
      "delivered_at": null,
      "provider_message_id": "wamid.xxx",
      "error_code": null,
      "error_message": null,
      "created_at": "2026-04-14T13:00:00.000Z",
      "updated_at": "2026-04-14T13:00:05.000Z"
    }
  ]
}
```

### 3.3 POST `/schedules/run`

Uso: endpoint interno para barrido periodico de secuencias.

Auth recomendada:

- Token de servicio o allowlist interna (EventBridge/CronJob).

Response `200`:

```json
{
  "processed_properties": 142,
  "queued_events": 37,
  "skipped_paid_off": 21,
  "cancelled_future_events": 9
}
```

### 3.4 POST `/webhooks/whatsapp`

Uso: recibir callbacks del proveedor (delivery/read/failure).

Requisitos:

- Verificacion de firma HMAC o token de proveedor.
- Idempotencia por `provider_message_id + event_type + event_time`.

Payload ejemplo (normalizado internamente):

```json
{
  "provider_message_id": "wamid.xxx",
  "event_type": "delivered",
  "event_time": "2026-04-14T13:00:22.000Z",
  "error_code": null,
  "error_message": null
}
```

Response `204`.

---

## 4) DTOs y enums

### 4.1 Enums

- `NotificationChannel`: `whatsapp`
- `NotificationStage`: `d_minus_3 | d_day_0 | d_plus_3`
- `NotificationStatus`: `queued | processing | sent | delivered | read | failed | cancelled`

### 4.2 DTOs

- `SendNotificationDto`
  - `channel: "whatsapp"`
  - `propiedad_id: uuid`
  - `stage: NotificationStage`
  - `due_date: YYYY-MM-DD`
  - `idempotency_key?: string`
- `NotificationEventDto`
  - estado y metadata de envio para UI.
- `RunSchedulesResultDto`
  - metricas del barrido de scheduler.
- `WhatsAppWebhookDto`
  - datos del callback del proveedor.

---

## 5) Persistencia minima (PostgreSQL)

### 5.1 Tabla `notification_sequences`

- `id` uuid pk
- `propiedad_id` uuid fk -> `propiedades.id`
- `channel` notification_channel_enum default `whatsapp`
- `due_date` date not null
- `is_active` boolean default true
- `created_at` timestamptz
- `updated_at` timestamptz

### 5.2 Tabla `notification_events`

- `id` uuid pk
- `sequence_id` uuid fk -> `notification_sequences.id`
- `propiedad_id` uuid fk -> `propiedades.id` (denormalizada para consultas)
- `stage` notification_stage_enum
- `status` notification_status_enum default `queued`
- `scheduled_for` timestamptz not null
- `sent_at` timestamptz null
- `delivered_at` timestamptz null
- `provider_message_id` text null
- `error_code` text null
- `error_message` text null
- `idempotency_key` text unique not null
- `created_at` timestamptz
- `updated_at` timestamptz

### 5.3 Indices

- `idx_notification_events_propiedad_created` (`propiedad_id`, `created_at DESC`)
- `idx_notification_events_status_scheduled` (`status`, `scheduled_for`)
- unique `notification_events.idempotency_key`

---

## 6) Scheduler + cola + worker

### 6.1 Scheduler

Frecuencia sugerida: cada 15 minutos.

Flujo:

1. Buscar propiedades con `monto_a_la_fecha > 0`.
2. Resolver `due_date` y etapa aplicable (`D-3`, `D0`, `D+3`).
3. Crear evento `queued` si no existe idempotencia previa.
4. Encolar job de envio en cola `notifications:whatsapp`.

### 6.2 Cola (BullMQ + Redis)

Job payload minimo:

```json
{
  "event_id": "uuid",
  "propiedad_id": "uuid",
  "cliente_id": "uuid",
  "telefono": "573001112233",
  "template_key": "reminder_d_day_0",
  "variables": {
    "cliente_nombre": "string",
    "propiedad_identificador": "string",
    "monto_pendiente": "1250000",
    "fecha_corte": "2026-04-14"
  }
}
```

Reintentos sugeridos:

- `attempts: 5`
- backoff exponencial (ej. 30s, 2m, 10m, 30m, 2h)

Estados worker:

- `queued -> processing -> sent`
- `processing -> failed` (si agota reintentos)

---

## 7) Integracion proveedor WhatsApp

Crear interfaz:

- `WhatsAppProvider.sendTemplateMessage(to, template, variables) -> { provider_message_id }`

Implementaciones posibles:

- Meta WhatsApp Cloud API
- Twilio WhatsApp

Requisitos:

- Plantillas aprobadas por Meta.
- Normalizacion de telefono a E.164.
- Manejo de errores por codigo de proveedor.

---

## 8) Seguridad y cumplimiento

- Endpoint `/send`: solo `admin` o servicio interno autorizado.
- Endpoint `/schedules/run`: solo interno.
- Endpoint `/webhooks/whatsapp`: validar firma del proveedor.
- Rate limit en endpoints publicos.
- Registrar `request_id` en logs para trazabilidad.
- Cumplir politicas de consentimiento y ventanas horarias de contacto.

---

## 9) Observabilidad

Metricas minimas:

- `notifications_queued_total`
- `notifications_sent_total`
- `notifications_delivered_total`
- `notifications_failed_total`
- `notifications_retry_total`
- `notification_queue_backlog`

Alertas:

- Ratio de fallo > umbral (ej. 10% en 15m)
- Cola con backlog sostenido
- Webhook sin trafico esperado

---

## 10) Criterios de aceptacion

1. Se crea evento `queued` al disparar `/send`.
2. El worker envia y actualiza a `sent` con `provider_message_id`.
3. Webhook actualiza a `delivered`/`read`/`failed`.
4. No se duplican eventos para misma idempotencia.
5. Si deuda queda en `<= 0`, no se encolan etapas futuras.
6. UI puede consultar ultimo estado por propiedad.

---

## 11) Plan de pruebas (backend)

- Caso feliz: propiedad con deuda -> `/send` -> `queued` -> `sent`.
- Idempotencia: repetir request con misma llave -> `409` o respuesta deduplicada.
- Corte por saldo: saldar deuda antes de `D+3` -> evento futuro `cancelled`.
- Fallo proveedor: simular timeout -> reintentos -> `failed`.
- Webhook: `delivered/read` actualizan estado correctamente.
