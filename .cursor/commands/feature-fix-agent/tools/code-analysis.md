# Guía de Análisis de Código Angular

## Checklist de Análisis

Usa esta checklist para analizar código Angular en el proyecto Borboleta Frontoffice.

## 1. Análisis de Componentes

### Estructura y Configuración
- [ ] ¿Es standalone component con `standalone: true`?
- [ ] ¿Tiene imports explícitos en el decorador?
- [ ] ¿Usa `ChangeDetectionStrategy.OnPush`?
- [ ] ¿Tiene selector apropiado (`app-*`)?
- [ ] ¿Tiene templateUrl y styleUrl configurados?

### Dependency Injection
- [ ] ¿Usa `inject()` en lugar de constructor injection?
- [ ] ¿Las dependencias están correctamente inyectadas?
- [ ] ¿No hay dependencias circulares?

### Lifecycle Hooks
- [ ] ¿Implementa `OnInit` si necesita inicialización?
- [ ] ¿Implementa `OnDestroy` si tiene subscriptions manuales?
- [ ] ¿Los hooks están implementados correctamente?

### Subscriptions y Observables
- [ ] ¿Usa async pipe cuando es posible?
- [ ] ¿Las subscriptions manuales usan `takeUntil`?
- [ ] ¿No hay memory leaks (subscriptions no cerradas)?
- [ ] ¿Los Observables se completan apropiadamente?

### Tipado
- [ ] ¿Usa interfaces TypeScript en lugar de `any`?
- [ ] ¿Los inputs/outputs están tipados?
- [ ] ¿No hay uso de `any` innecesario?

### Templates
- [ ] ¿Usa nueva sintaxis de control flow (`@if`, `@for`)?
- [ ] ¿Usa `trackBy` en listas?
- [ ] ¿Las cadenas de texto usan i18n (`| translate`)?
- [ ] ¿No hay texto hardcodeado (strings literales visibles al usuario)?
- [ ] ¿No hay colores hardcodeados (usar variables de tema)?
- [ ] ¿No hay lógica compleja en templates?
- [ ] ¿Props consistentes entre bloques condicionales (ej. guest vs auth)?

### Error Handling
- [ ] ¿Maneja errores con `catchError`?
- [ ] ¿Usa `NotificationService` para mostrar errores?
- [ ] ¿No hay uso de `alert()`?
- [ ] ¿Los errores se loggean apropiadamente?

### Logging y Debug
- [ ] ¿No hay `console.log`/`warn`/`error` sin condicionar a `!environment.production`?

### RxJS y Side Effects
- [ ] ¿No hay side effects (setTimeout, mutación) dentro de `map()`, `filter()`?
- [ ] ¿No hay múltiples `setTimeout` arbitrarios para "asegurar" ejecución?

## 2. Análisis de Servicios

### Configuración
- [ ] ¿Usa `@Injectable({ providedIn: 'root' })`?
- [ ] ¿Usa `inject()` para dependency injection?
- [ ] ¿Está en la carpeta correcta (`shared/services/`)?

### HTTP Client
- [ ] ¿Usa `HttpClient` correctamente?
- [ ] ¿Las URLs usan `environment.URLS`?
- [ ] ¿Hay una constante para la URL base?
- [ ] ¿Los métodos retornan Observables?

### Error Handling
- [ ] ¿Tiene método `handleError` centralizado?
- [ ] ¿Usa `NotificationService` para errores?
- [ ] ¿Los errores se manejan con `catchError`?
- [ ] ¿Retorna `throwError` apropiadamente?

### Tipado
- [ ] ¿Usa interfaces TypeScript para requests/responses?
- [ ] ¿No hay uso de `any`?
- [ ] ¿Los tipos están en `shared/interface/`?

### RxJS
- [ ] ¿Usa operadores apropiados (map, catchError, etc.)?
- [ ] ¿No crea subscriptions que no se cierran?
- [ ] ¿Usa `shareReplay` cuando es apropiado?

## 3. Análisis de Integración

### NGXS Integration
- [ ] ¿Usa `Store.select()` para leer estado?
- [ ] ¿Usa `Store.dispatch()` para modificar estado?
- [ ] ¿No accede directamente a localStorage cuando hay State?
- [ ] ¿Usa Actions correctamente?
- [ ] ¿Los Actions están en `shared/store/action/`?

### Interceptores
- [ ] ¿Las peticiones HTTP pasan por los interceptores?
- [ ] ¿No hay configuración manual de headers que deberían estar en interceptores?
- [ ] ¿Los errores se manejan por GlobalErrorHandlerInterceptor?

### Comunicación entre Componentes
- [ ] ¿Usa NGXS para estado compartido?
- [ ] ¿Usa @Input/@Output para comunicación padre-hijo?
- [ ] ¿No hay comunicación directa entre componentes no relacionados?

### Dependencias
- [ ] ¿No hay dependencias circulares?
- [ ] ¿Las importaciones están organizadas?
- [ ] ¿No hay imports innecesarios?

## 4. Análisis de Performance

### Change Detection
- [ ] ¿Usa `OnPush` change detection strategy?
- [ ] ¿Los inputs son inmutables?
- [ ] ¿No hay detección de cambios innecesaria?

### Observables
- [ ] ¿Usa async pipe en lugar de subscriptions manuales?
- [ ] ¿Usa `shareReplay` para datos compartidos?
- [ ] ¿No hay observables que no se completan?

### Templates
- [ ] ¿Usa `trackBy` en `*ngFor`?
- [ ] ¿No hay cálculos pesados en templates?
- [ ] ¿Usa pipes puros para transformaciones?

### Lazy Loading
- [ ] ¿Las rutas usan lazy loading?
- [ ] ¿Los módulos se cargan bajo demanda?
- [ ] ¿Hay code splitting apropiado?

### Memory Leaks
- [ ] ¿Todas las subscriptions se cierran?
- [ ] ¿Los Observables se completan?
- [ ] ¿No hay event listeners sin cleanup?

## 5. Análisis de Arquitectura

### Estructura de Carpetas
- [ ] ¿Está en la carpeta correcta?
  - `components/` para componentes de páginas
  - `shared/components/` para componentes compartidos
  - `shared/services/` para servicios
  - `core/` para interceptores, guards, error handlers

### Convenciones de Naming
- [ ] ¿Sigue convenciones del proyecto?
  - Componentes: `kebab-case.component.ts`
  - Servicios: `kebab-case.service.ts`
  - Interfaces: `kebab-case.interface.ts`
  - Selectors: `app-kebab-case`

### Separación de Responsabilidades
- [ ] ¿El componente solo maneja UI?
- [ ] ¿La lógica de negocio está en servicios?
- [ ] ¿El estado está en NGXS cuando es apropiado?

### Reutilización
- [ ] ¿El código es reutilizable?
- [ ] ¿Los componentes compartidos están en `shared/`?
- [ ] ¿No hay duplicación de código?

## 6. Análisis de Accesibilidad

- [ ] ¿Usa ARIA labels cuando es necesario?
- [ ] ¿La navegación por teclado funciona?
- [ ] ¿Los elementos interactivos son accesibles?
- [ ] ¿Los colores tienen suficiente contraste?

## 7. Análisis de i18n

- [ ] ¿Todas las cadenas de texto usan `| translate`?
- [ ] ¿No hay texto hardcodeado?
- [ ] ¿Las keys de traducción son descriptivas?

## 8. Análisis de Testing (Opcional)

- [ ] ¿El código es testeable?
- [ ] ¿Las dependencias están inyectadas (fácil de mockear)?
- [ ] ¿No hay lógica compleja en templates?

## Proceso de Análisis Recomendado

1. **Lectura Inicial**: Leer el código completo
2. **Identificar Problemas**: Usar esta checklist
3. **Priorizar**: Clasificar problemas por severidad
4. **Proponer Solución**: Seguir patrones del proyecto
5. **Validar**: Verificar que la solución respeta arquitectura

## Severidad de Problemas

### Crítico
- Memory leaks
- Errores de compilación
- Dependencias circulares
- Acceso directo a localStorage cuando hay State
- Acceso a propiedades undefined sin optional chaining (ej. `arr.length` cuando `arr` puede ser undefined)

### Alto
- Uso de `alert()` en lugar de NotificationService
- Falta de error handling
- Subscriptions no cerradas
- Side effects en operadores RxJS (`map`, `filter`)
- Tipado débil (`any`)
- No integración con NGXS cuando es necesario

### Medio
- Falta de OnPush
- No uso de async pipe
- Falta de i18n
- Código duplicado

### Bajo
- Mejoras de performance menores
- Refactorizaciones sugeridas
- Optimizaciones opcionales
