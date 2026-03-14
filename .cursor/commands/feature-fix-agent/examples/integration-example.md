# Ejemplo: Corrección de Integración Angular

## Problema Original

```typescript
import { Component } from '@angular/core';
import { ProductService } from '../../shared/services/product.service';
import { CartService } from '../../shared/services/cart.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html'
})
export class ProductDetailComponent {
  product: any = null;
  loading = false;
  inCart = false;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private route: ActivatedRoute
  ) {
    this.loadProduct();
  }

  loadProduct() {
    const slug = this.route.snapshot.paramMap.get('slug');
    this.loading = true;
    
    this.productService.getProductBySlug(slug!).subscribe(
      (product) => {
        this.product = product;
        this.loading = false;
        this.checkIfInCart();
      }
    );
  }

  checkIfInCart() {
    // Lógica incorrecta para verificar si está en el carrito
    const cart = localStorage.getItem('cart');
    if (cart) {
      const cartItems = JSON.parse(cart);
      this.inCart = cartItems.some((item: any) => item.id === this.product.id);
    }
  }

  addToCart() {
    this.cartService.addToCart(this.product).subscribe(
      () => {
        alert('Producto agregado al carrito');
        this.inCart = true;
      }
    );
  }
}
```

## Problemas Identificados

1. **No usa NGXS**: Accede directamente a localStorage en lugar de usar CartState
2. **Subscription No Cerrada**: Múltiples subscriptions sin cerrar
3. **No es Standalone**: Falta configuración de standalone component
4. **Error Handling**: No maneja errores de carga o de agregar al carrito
5. **Alert Nativo**: Usa `alert()` en lugar de NotificationService
6. **Lógica de Estado Incorrecta**: No sincroniza con el estado global de NGXS
7. **Falta RouterModule**: No importa RouterModule para ActivatedRoute

## Causa Raíz

- El proyecto usa NGXS para state management, no se debe acceder directamente a localStorage
- Falta integración con CartState para sincronizar estado del carrito
- No sigue la arquitectura de standalone components
- Falta manejo de errores consistente con el proyecto

## Solución Corregida

```typescript
import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Select, Store } from '@ngxs/store';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ProductService } from '../../shared/services/product.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Product } from '../../shared/interface/product.interface';
import { AddToCart } from '../../shared/store/action/cart.action';
import { CartState } from '../../shared/store/state/cart.state';
import { LoaderState } from '../../shared/store/state/loader.state';
import { TranslateModule } from '@ngx-translate/core';
import { LoaderComponent } from '../../shared/components/widgets/loader/loader.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LoaderComponent],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private notificationService = inject(NotificationService);
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  // Usar NGXS para obtener estado del carrito
  cartItems$ = this.store.select(CartState.cartItems);
  loading$ = this.store.select(LoaderState.status);

  // Obtener slug de la ruta
  slug$ = this.route.paramMap.pipe(
    map(params => params.get('slug') || '')
  );

  // Cargar producto basado en slug
  product$: Observable<Product | null> = this.slug$.pipe(
    map(slug => {
      if (!slug) return of(null);
      return this.productService.getProductBySlug(slug).pipe(
        catchError(error => {
          this.notificationService.showError('Error al cargar el producto');
          console.error('Error loading product:', error);
          return of(null);
        })
      );
    })
  );

  // Verificar si el producto está en el carrito
  inCart$: Observable<boolean> = combineLatest([
    this.product$,
    this.cartItems$
  ]).pipe(
    map(([product, cartItems]) => {
      if (!product) return false;
      return cartItems.some(item => item.product_id === product.id);
    })
  );

  ngOnInit() {
    // El componente se inicializa automáticamente con los observables
  }

  addToCart(product: Product) {
    this.store.dispatch(new AddToCart({
      product_id: product.id,
      quantity: 1,
      product: product
    })).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.notificationService.showSuccess('Producto agregado al carrito');
      },
      error: (error) => {
        this.notificationService.showError('Error al agregar al carrito');
        console.error('Error adding to cart:', error);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Template Corregido

```html
<div class="product-detail">
  @if (loading$ | async) {
    <app-loader></app-loader>
  } @else {
    @if (product$ | async; as product) {
      <div class="product-info">
        <h1>{{ product.name }}</h1>
        <p class="price">{{ product.price | currency }}</p>
        <p>{{ product.description }}</p>
        
        @if (inCart$ | async) {
          <button class="btn btn-secondary" disabled>
            {{ 'cart.inCart' | translate }}
          </button>
        } @else {
          <button 
            class="btn btn-primary" 
            (click)="addToCart(product)">
            {{ 'cart.addToCart' | translate }}
          </button>
        }
      </div>
    } @else {
      <div class="error-message">
        <p>{{ 'products.notFound' | translate }}</p>
      </div>
    }
  }
</div>
```

## Alternativa con switchMap (Más Eficiente)

```typescript
import { switchMap } from 'rxjs/operators';

export class ProductDetailComponent implements OnInit {
  // ... inyecciones

  product$: Observable<Product | null> = this.slug$.pipe(
    switchMap(slug => {
      if (!slug) return of(null);
      return this.productService.getProductBySlug(slug).pipe(
        catchError(error => {
          this.notificationService.showError('Error al cargar el producto');
          return of(null);
        })
      );
    })
  );

  // ... resto del código
}
```

## Explicación de Cambios

1. **NGXS Integration**: Usa `CartState` y `Store.dispatch()` en lugar de localStorage
2. **Standalone Component**: Configurado como standalone con imports explícitos
3. **Observables con Async Pipe**: Elimina necesidad de cerrar subscriptions manualmente
4. **Error Handling**: Integración con NotificationService
5. **OnPush Strategy**: Mejor performance con change detection optimizada
6. **RouterModule**: Importado para ActivatedRoute
7. **combineLatest**: Para combinar múltiples observables (producto y carrito)
8. **Actions de NGXS**: Usa `AddToCart` action en lugar de llamar servicio directamente

## Integración con NGXS

### Action (ya existe en el proyecto)

```typescript
// cart.action.ts
export class AddToCart {
  static readonly type = '[Cart] Add To Cart';
  constructor(public payload: CartItem) {}
}
```

### State (ya existe en el proyecto)

```typescript
// cart.state.ts
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

## Checklist de Validación

- [x] Integración correcta con NGXS (Store, Select, Actions)
- [x] Standalone component con imports explícitos
- [x] Subscriptions manejadas con async pipe o takeUntil
- [x] Error handling con NotificationService
- [x] No accede directamente a localStorage
- [x] Usa acciones de NGXS para modificar estado
- [x] OnPush change detection
- [x] Compatible con interceptores del proyecto
- [x] i18n con ngx-translate
