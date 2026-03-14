# Anti-patrones del Proyecto Borboleta

Lista de anti-patrones que el agente debe detectar y corregir prioritariamente.

## Prioridad Crítica

### alert()
- **Problema**: `alert()` para mensajes al usuario
- **Solución**: `NotificationService.showError()` o `showSuccess()`
- **Ejemplo**: `alert('Complete los campos')` → `this.notificationService.showError('Complete los campos')`

### console.log / console.warn / console.error
- **Problema**: Logs de debug en código que va a producción
- **Solución**: Eliminar o condicionar con `if (!environment.production)`
- **Ejemplo**:
```typescript
if (!environment.production) {
  console.log('Debug:', data);
}
```

### Memory Leaks (Subscriptions no cerradas)
- **Problema**: `.subscribe()` sin `takeUntil(destroy$)` o async pipe
- **Solución**: Usar async pipe o `pipe(takeUntil(this.destroy$))` + `ngOnDestroy`

### Acceso a undefined
- **Problema**: `arr.length`, `obj.prop` cuando pueden ser undefined
- **Solución**: `arr?.length`, inicializar `arr = []`, optional chaining

## Prioridad Alta

### Side effects en operadores RxJS
- **Problema**: `setTimeout`, mutación de estado o `form.patchValue()` dentro de `map()`, `filter()`
- **Solución**: Mover efectos fuera del pipe; usar subscription separada o `effect()`

### setTimeout arbitrarios
- **Problema**: Múltiples `setTimeout(..., 50)`, `setTimeout(..., 300)` para "asegurar" que algo ocurra
- **Solución**: Flujo reactivo con `debounceTime`, `switchMap`, `combineLatest`

### Props inconsistentes
- **Problema**: Bloques condicionales (guest vs auth) con inputs diferentes en el mismo componente hijo
- **Solución**: Pasar los mismos inputs en ambos bloques

### Textos hardcodeados
- **Problema**: Strings literales visibles al usuario sin `| translate`
- **Solución**: Añadir clave en i18n y usar `{{ 'key' | translate }}`

### Colores hardcodeados
- **Problema**: `#C4B896`, `rgb(...)` en lugar de variables de tema
- **Solución**: `var(--theme-primary)` o tokens del theme

## Prioridad Media

### Constructor injection cuando inject() es posible
- **Problema**: Usar constructor para servicios que pueden inyectarse con `inject()`
- **Solución**: `private service = inject(MyService)`

### Nested subscriptions
- **Problema**: subscribe dentro de subscribe
- **Solución**: `switchMap`, `mergeMap`, `concatMap`

### Sin OnPush
- **Problema**: Componente sin `ChangeDetectionStrategy.OnPush` cuando es viable
- **Solución**: Añadir OnPush si los inputs son inmutables

## Referencias

- [best-practices.md](best-practices.md)
- [angular-patterns.md](angular-patterns.md)
- [code-analysis.md](code-analysis.md)
