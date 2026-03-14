# Patrones Angular del Proyecto Borboleta

## Estructura del Proyecto

```
src/app/
├── components/          # Componentes de páginas
│   ├── home/
│   ├── shop/
│   ├── account/
│   └── auth/
├── shared/             # Código compartido
│   ├── components/     # Componentes compartidos
│   ├── services/       # Servicios compartidos
│   ├── interface/      # Interfaces TypeScript
│   └── store/          # NGXS (states, actions)
├── core/               # Core del proyecto
│   ├── interceptors/   # Interceptores HTTP
│   ├── guards/         # Route guards
│   └── error/          # Error handlers
└── layout/             # Componentes de layout
```

## Patrones de Componentes

### Standalone Components

Todos los componentes deben ser standalone:

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

### Dependency Injection con inject()

Preferir `inject()` sobre constructor injection:

```typescript
export class ExampleComponent {
  private service = inject(MyService);
  private notificationService = inject(NotificationService);
  private store = inject(Store);
}
```

### Change Detection Strategy

Usar OnPush cuando sea posible:

```typescript
@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleComponent {
  @Input() data: Data[] = []; // Debe ser inmutable
}
```

### Lifecycle Hooks

```typescript
export class ExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Inicialización
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Patrones de Servicios

### Configuración de Servicios

```typescript
@Injectable({
  providedIn: 'root'
})
export class MyService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private readonly apiUrl = `${environment.URLS}/endpoint`;
}
```

### Métodos HTTP

```typescript
getData(): Observable<DataModel> {
  return this.http.get<DataModel>(this.apiUrl).pipe(
    catchError(this.handleError.bind(this))
  );
}

private handleError(error: HttpErrorResponse): Observable<never> {
  const errorMessage = error.error?.message || 'Ha ocurrido un error';
  this.notificationService.showError(errorMessage);
  console.error('Service Error:', error);
  return throwError(() => new Error(errorMessage));
}
```

## Patrones de NGXS

### Leer Estado

```typescript
export class ExampleComponent {
  private store = inject(Store);

  // Usando Select decorator
  @Select(CartState.cartItems) cartItems$!: Observable<CartItem[]>;

  // O usando Store.select()
  cartItems$ = this.store.select(CartState.cartItems);
}
```

### Modificar Estado

```typescript
addToCart(product: Product) {
  this.store.dispatch(new AddToCart({
    product_id: product.id,
    quantity: 1
  }));
}
```

### Actions

```typescript
// shared/store/action/cart.action.ts
export class AddToCart {
  static readonly type = '[Cart] Add To Cart';
  constructor(public payload: CartItem) {}
}
```

### States

```typescript
// shared/store/state/cart.state.ts
@State<CartStateModel>({
  name: 'cart',
  defaults: {
    items: []
  }
})
export class CartState {
  @Selector()
  static cartItems(state: CartStateModel) {
    return state.items;
  }

  @Action(AddToCart)
  addToCart(ctx: StateContext<CartStateModel>, action: AddToCart) {
    const state = ctx.getState();
    ctx.patchState({
      items: [...state.items, action.payload]
    });
  }
}
```

## Patrones de RxJS

### Async Pipe (Preferido)

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

### takeUntil para Subscriptions Manuales

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

### Error Handling

```typescript
data$ = this.service.getData().pipe(
  catchError(error => {
    this.notificationService.showError('Error loading data');
    return of([]);
  })
);
```

### Combinar Observables

```typescript
// combineLatest: Combina últimos valores
combined$ = combineLatest([
  this.user$,
  this.orders$
]).pipe(
  map(([user, orders]) => ({ user, orders }))
);

// forkJoin: Espera todos
allData$ = forkJoin({
  user: this.service.getUser(),
  orders: this.service.getOrders()
});
```

### switchMap para Búsquedas

```typescript
results$ = this.searchTerm$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.service.search(term))
);
```

## Patrones de Templates

### Control Flow (Angular 17+)

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

### i18n

```html
<h1>{{ 'common.title' | translate }}</h1>
<button>{{ 'button.submit' | translate }}</button>
```

### trackBy en Listas

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

## Patrones de Error Handling

### En Componentes

```typescript
data$ = this.service.getData().pipe(
  catchError(error => {
    this.notificationService.showError('Error loading data');
    return of(null);
  })
);
```

### En Servicios

```typescript
private handleError(error: HttpErrorResponse): Observable<never> {
  this.notificationService.showError('Ha ocurrido un error');
  console.error('Service Error:', error);
  return throwError(() => error);
}
```

### Global Error Handler

Ya configurado en `core/error/global-error-handler.ts`:
- Maneja errores globalmente
- Muestra notificaciones
- Loggea errores

## Patrones de Interceptores

### AuthInterceptor

Ya configurado en `core/interceptors/auth.interceptor.ts`:
- Agrega token automáticamente
- Maneja 401 (token expirado)
- Redirige a login si es necesario

### GlobalErrorHandlerInterceptor

Ya configurado en `core/interceptors/global-error-handler.interceptor.ts`:
- Maneja errores HTTP globalmente
- Muestra notificaciones
- Loggea errores

### LoaderInterceptor

Ya configurado en `core/interceptors/loader.interceptor.ts`:
- Muestra loader automáticamente
- Oculta loader al completar

**No necesitas configurar estos interceptores, ya están en `app.config.ts`**

## Convenciones de Naming

### Archivos
- Componentes: `kebab-case.component.ts`
- Servicios: `kebab-case.service.ts`
- Interfaces: `kebab-case.interface.ts`
- Actions: `kebab-case.action.ts`
- States: `kebab-case.state.ts`

### Selectors
- Componentes: `app-kebab-case`
- Ejemplo: `app-product-list`, `app-cart-item`

### Clases
- Componentes: `PascalCaseComponent`
- Servicios: `PascalCaseService`
- Interfaces: `PascalCase` o `PascalCaseInterface`

### Variables y Métodos
- camelCase para variables y métodos
- UPPER_CASE para constantes

## Estructura de Interfaces

```typescript
// shared/interface/product.interface.ts
export interface Product {
  id: number;
  name: string;
  price: number;
  slug: string;
}

export interface ProductModel {
  data: Product[];
  meta: {
    current_page: number;
    total: number;
  };
}
```

## Referencias

- [Angular Documentation](https://angular.io/docs)
- [NGXS Documentation](https://www.ngxs.io/)
- [RxJS Documentation](https://rxjs.dev/)
- Ver ejemplos en: `examples/`
