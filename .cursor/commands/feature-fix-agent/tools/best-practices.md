# Mejores Prácticas Angular - Proyecto Borboleta

## Principios Generales

### 1. Standalone First
Todos los componentes nuevos deben ser standalone components.

### 2. Type Safety
Usar TypeScript estricto, evitar `any` cuando sea posible.

### 3. Reactive Programming
Preferir programación reactiva con RxJS y async pipe.

### 4. State Management
Usar NGXS para estado global, evitar estado local cuando sea compartido.

## Componentes

### ✅ DO: Standalone Components

```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss'
})
export class ExampleComponent {}
```

### ❌ DON'T: Módulos (Legacy)

```typescript
// No crear módulos para componentes nuevos
@NgModule({
  declarations: [ExampleComponent],
  // ...
})
export class ExampleModule {}
```

### ✅ DO: OnPush Change Detection

```typescript
@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleComponent {
  @Input() data: Data[] = []; // Inmutable
}
```

### ❌ DON'T: Default Change Detection

```typescript
// Evitar si es posible
@Component({
  // changeDetection: ChangeDetectionStrategy.Default (implícito)
})
```

### ✅ DO: Async Pipe

```typescript
export class ExampleComponent {
  data$ = this.service.getData();
}
```

```html
<div *ngIf="data$ | async as data">
  {{ data.name }}
</div>
```

### ❌ DON'T: Subscriptions Manuales

```typescript
// Evitar si es posible
export class ExampleComponent {
  data: any;
  
  ngOnInit() {
    this.service.getData().subscribe(d => {
      this.data = d; // Memory leak si no se cierra
    });
  }
}
```

### ✅ DO: takeUntil si Necesitas Subscription Manual

```typescript
export class ExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.service.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // ...
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Servicios

### ✅ DO: providedIn: 'root'

```typescript
@Injectable({
  providedIn: 'root'
})
export class MyService {}
```

### ❌ DON'T: providedIn sin 'root'

```typescript
@Injectable()
export class MyService {} // Requiere registro manual
```

### ✅ DO: inject() Function

```typescript
export class MyService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
}
```

### ❌ DON'T: Constructor Injection (cuando inject() es posible)

```typescript
// Aunque funciona, inject() es más moderno
export class MyService {
  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}
}
```

### ✅ DO: Error Handling Centralizado

```typescript
@Injectable({
  providedIn: 'root'
})
export class MyService {
  private handleError(error: HttpErrorResponse): Observable<never> {
    this.notificationService.showError('Ha ocurrido un error');
    return throwError(() => error);
  }

  getData(): Observable<Data> {
    return this.http.get<Data>(this.apiUrl).pipe(
      catchError(this.handleError.bind(this))
    );
  }
}
```

### ❌ DON'T: Error Handling Inconsistente

```typescript
getData(): Observable<Data> {
  return this.http.get<Data>(this.apiUrl); // Sin manejo de errores
}
```

## NGXS

### ✅ DO: Usar NGXS para Estado Global

```typescript
export class ExampleComponent {
  private store = inject(Store);
  
  cartItems$ = this.store.select(CartState.cartItems);

  addItem(product: Product) {
    this.store.dispatch(new AddToCart(product));
  }
}
```

### ❌ DON'T: Acceso Directo a localStorage

```typescript
// Evitar cuando hay State disponible
const cart = localStorage.getItem('cart');
```

### ✅ DO: Actions para Modificar Estado

```typescript
this.store.dispatch(new AddToCart(product));
```

### ❌ DON'T: Modificar Estado Directamente

```typescript
// No hacer esto
this.store.patchState({ items: [...] });
```

## RxJS

### ✅ DO: Operadores Apropiados

```typescript
this.data$ = this.searchTerm$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.service.search(term)),
  catchError(error => of([]))
);
```

### ❌ DON'T: Callback Hell

```typescript
// Evitar nested subscriptions
this.service.getUser().subscribe(user => {
  this.service.getOrders(user.id).subscribe(orders => {
    // ...
  });
});
```

### ✅ DO: switchMap para Búsquedas

```typescript
results$ = this.searchTerm$.pipe(
  switchMap(term => this.service.search(term))
);
```

### ❌ DON'T: mergeMap para Búsquedas

```typescript
// mergeMap ejecuta todas las peticiones
// switchMap cancela la anterior (mejor para búsquedas)
results$ = this.searchTerm$.pipe(
  mergeMap(term => this.service.search(term)) // ❌
);
```

### ❌ DON'T: Side Effects en map(), filter()

```typescript
// No mutar estado ni hacer setTimeout dentro de operadores de transformación
countries$ = this.store.select(CountryState.countries).pipe(
  map(countries => {
    setTimeout(() => this.form.patchValue(...), 100); // ❌ Side effect en map
    return countries;
  })
);
```

### ✅ DO: Efectos Fuera del Pipe

```typescript
countries$ = this.store.select(CountryState.countries);

this.countries$.pipe(takeUntil(this.destroy$), filter(c => c?.length > 0))
  .subscribe(countries => {
    const colombia = countries.find(c => c.label?.includes('Colombia'));
    if (colombia) this.form.patchValue({ country_id: colombia.value });
  });
```

### ❌ DON'T: setTimeout para "Asegurar" Ejecución

```typescript
// Evitar múltiples setTimeout con delays arbitrarios
setTimeout(() => this.checkout(), 50);
setTimeout(() => this.checkout(), 300);
```

### ✅ DO: Flujo Reactivo con debounceTime

```typescript
this.cartItem$.pipe(
  takeUntil(this.destroy$),
  debounceTime(150),
  filter(items => items?.length > 0)
).subscribe(() => this.checkout());
```

## Templates

### ✅ DO: Nueva Sintaxis de Control Flow

```html
@if (data$ | async; as data) {
  <div>{{ data.name }}</div>
} @else {
  <app-loader></app-loader>
}

@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
}
```

### ❌ DON'T: Sintaxis Antigua (si puedes usar la nueva)

```html
<div *ngIf="data$ | async as data">
  <div>{{ data.name }}</div>
</div>
<div *ngIf="!(data$ | async)">
  <app-loader></app-loader>
</div>
```

### ✅ DO: trackBy en Listas

```typescript
trackByFn(index: number, item: Product): number {
  return item.id;
}
```

```html
<div *ngFor="let product of products; trackBy: trackByFn">
  {{ product.name }}
</div>
```

### ❌ DON'T: Sin trackBy en Listas Grandes

```html
<div *ngFor="let product of products">
  {{ product.name }}
</div>
```

### ✅ DO: i18n para Textos

```html
<h1>{{ 'common.title' | translate }}</h1>
```

### ❌ DON'T: Texto Hardcodeado

```html
<h1>Mi Título</h1>
```

## Error Handling

### ✅ DO: NotificationService

```typescript
this.service.getData().pipe(
  catchError(error => {
    this.notificationService.showError('Error loading data');
    return of([]);
  })
);
```

### ❌ DON'T: alert()

```typescript
// Nunca usar alert() para mensajes al usuario
alert('Por favor complete todos los campos'); // ❌
```

### ✅ DO: NotificationService para Mensajes al Usuario

```typescript
this.notificationService.showError('Por favor complete todos los campos');
this.notificationService.showSuccess('Operación exitosa');
```

### ❌ DON'T: Solo console.error

```typescript
this.service.getData().subscribe({
  error: (error) => console.error(error) // Usuario no ve el error
});
```

### ❌ DON'T: console.log en Producción

```typescript
// Evitar console.log/warn/error en código que llega a producción
console.log('Debug:', data); // ❌ Puede filtrar datos sensibles y ensuciar consola
```

### ✅ DO: Logs Condicionados

```typescript
if (!environment.production) {
  console.log('Debug:', data);
}
```

### ✅ DO: Error Handling en Servicios

```typescript
private handleError(error: HttpErrorResponse): Observable<never> {
  this.notificationService.showError('Ha ocurrido un error');
  return throwError(() => error);
}
```

## Performance

### ✅ DO: Lazy Loading

```typescript
const routes: Routes = [
  {
    path: 'products',
    loadComponent: () => import('./products/products.component')
      .then(m => m.ProductsComponent)
  }
];
```

### ✅ DO: shareReplay para Datos Compartidos

```typescript
private dataCache$ = this.service.getData().pipe(
  shareReplay(1)
);
```

### ✅ DO: OnPush Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

## TypeScript

### ✅ DO: Interfaces Tipadas

```typescript
export interface Product {
  id: number;
  name: string;
  price: number;
}
```

### ❌ DON'T: any

```typescript
product: any; // Evitar cuando sea posible
```

### ✅ DO: Tipado Fuerte

```typescript
getData(): Observable<Product[]> {
  return this.http.get<Product[]>(this.apiUrl);
}
```

## Estructura de Archivos

### ✅ DO: Organización por Feature

```
components/
  product/
    product.component.ts
    product.component.html
    product.component.scss
```

### ✅ DO: Servicios Compartidos

```
shared/
  services/
    product.service.ts
```

### ✅ DO: Interfaces Compartidas

```
shared/
  interface/
    product.interface.ts
```

## Testing (Opcional)

### ✅ DO: Código Testeable

```typescript
export class ExampleComponent {
  private service = inject(MyService); // Fácil de mockear
}
```

### ❌ DON'T: Lógica Compleja en Templates

```html
<!-- Difícil de testear -->
<div>{{ calculateComplexLogic() }}</div>
```

## Resumen de Reglas de Oro

1. **Standalone components** siempre
2. **Async pipe** sobre subscriptions manuales
3. **OnPush** cuando sea posible
4. **NGXS** para estado global
5. **inject()** para dependency injection
6. **providedIn: 'root'** para servicios
7. **Interfaces TypeScript** en lugar de `any`
8. **NotificationService** para errores (nunca `alert()`)
9. **i18n** para todos los textos
10. **Error handling** siempre
11. **Sin console.log** en producción (condicionar con `!environment.production`)
12. **Sin side effects** en operadores RxJS (`map`, `filter`); usar efectos fuera o `tap()` controlado

## Referencias

- Ver ejemplos en: `examples/`
- Ver patrones en: `tools/angular-patterns.md`
- Ver análisis en: `tools/code-analysis.md`
