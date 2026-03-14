# Corregir Feature en Angular

**Comando único** para analizar y corregir componentes, servicios, integraciones, RxJS y performance en el proyecto Borboleta Frontoffice.

## Uso

```
@corregir-feature.md

[Describe el problema, pega el código, o indica componentes a analizar]
```

**Ejemplos**: "Corrige el Checkout" · "Este servicio tiene problemas de error handling: [código]" · "Analiza los archivos modificados en git"

## Modos

- **Focal**: Un componente, servicio o código concreto
- **Batch**: "todos", "archivos modificados en git", o lista de componentes → plan priorizado con tabla de problemas

## Proceso del Agente

1. Analiza el código (y archivos relacionados: template, estilos, interfaces)
2. Identifica problemas por tipo: lógica, integración, UI, performance, RxJS
3. Explica causa raíz de cada uno
4. Propone soluciones siguiendo patrones del proyecto
5. Sugiere refactorizaciones cuando aplique

## Qué Detecta (Según Tipo de Código)

### Componentes
- Standalone con imports explícitos, OnPush cuando sea posible
- Subscriptions: async pipe o takeUntil(destroy$), nunca sin cerrar
- alert() → NotificationService; console.* → condicionar con `!environment.production`
- Side effects en pipes RxJS → mover fuera o usar tap() controlado
- Props consistentes entre bloques condicionales (guest vs auth)
- Acceso seguro: `arr?.length`, inicialización `= []`
- i18n para textos; variables de tema para colores

### Servicios
- `providedIn: 'root'`, `inject()` para DI
- Método `handleError` centralizado + NotificationService
- Retornar Observables, nunca subscriptions internas sin cerrar
- Tipado fuerte con interfaces

### Integración (NGXS, interceptores)
- Leer: `Store.select(State.selector)`
- Modificar: `Store.dispatch(new Action(payload))`
- Evitar localStorage directo cuando hay State
- HttpClient pasa por interceptores (Auth, Error, Loader)

### RxJS
- Async pipe preferido; si subscription manual → takeUntil(destroy$)
- No side effects en map()/filter(); efectos fuera del pipe
- No setTimeout arbitrarios; usar debounceTime, switchMap, combineLatest
- catchError siempre; evitar nested subscriptions (usar switchMap/mergeMap)

### Performance
- OnPush, trackBy en listas, pipes puros para cálculos
- Lazy loading de rutas, shareReplay para datos compartidos

## Qué Detecta el Agente (Detalle)

### Errores de Lógica
- Condiciones incorrectas o incompletas
- Loops mal estructurados
- Validaciones faltantes
- Manejo de estados incorrecto
- Acceso a propiedades que pueden ser `undefined` (ej. `arr.length` sin `arr?.length`)

### Problemas de Integración
- Integración incorrecta con NGXS
- Uso incorrecto de servicios
- Problemas con interceptores
- Dependencias circulares
- Props inconsistentes entre bloques condicionales (ej. guest vs autenticado)

### Problemas de UI
- Templates con bindings incorrectos
- Eventos no manejados correctamente
- Problemas de renderizado
- Falta de accesibilidad
- Textos hardcodeados sin i18n
- Colores hardcodeados en lugar de variables de tema

### Problemas de Performance
- Memory leaks (subscriptions no cerradas)
- Change detection innecesaria
- Observables no cerrados
- Falta de lazy loading

### Anti-patrones Explícitos (Prioridad Alta)
- **`alert()`**: Siempre usar `NotificationService.showError()` o `showSuccess()`
- **`console.log/warn/error` en producción**: Eliminar o envolver en `if (!environment.production)`
- **Side effects en operadores RxJS**: No mutar estado ni hacer `setTimeout` dentro de `map()`; usar `tap()` o efectos separados
- **`setTimeout` arbitrarios** para "asegurar" que algo ocurra: Preferir flujos reactivos con `debounceTime`, `switchMap`, etc.

## Patrones que Respeta

- ✅ Standalone components, NGXS, RxJS async pipe
- ✅ Servicios `providedIn: 'root'`, interceptores (Auth, Error, Loader)
- ✅ i18n con ngx-translate, NotificationService (no alert)
- ✅ OnPush cuando sea posible

## Formato de Respuesta

**Modo focal**: Problema → Causa raíz → Solución → Mejoras opcionales

**Modo batch**: Resumen → Tabla de problemas (Componente | Problema | Severidad | Acción) → Plan priorizado → Diffs por archivo → Checklist de validación

## Referencias

- [Especificación completa](feature-fix-agent/feature-fix-agent.md)
- [Patrones](feature-fix-agent/tools/angular-patterns.md) · [Mejores prácticas](feature-fix-agent/tools/best-practices.md) · [Anti-patrones](feature-fix-agent/tools/anti-patterns.md)

## Notas

- Respeta arquitectura y convenciones del proyecto
- Compatible con SSR
- Código debe compilar sin errores TypeScript
