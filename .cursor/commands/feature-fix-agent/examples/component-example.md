# Ejemplo: Corrección de Componente Angular

## Problema Original

```typescript
import { Component } from '@angular/core';
import { ProductService } from '../../shared/services/product.service';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent {
  products: any[] = [];
  loading = false;

  constructor(private productService: ProductService) {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.productService.getProducts().subscribe(
      (data) => {
        this.products = data.data;
        this.loading = false;
      },
      (error) => {
        console.error(error);
        this.loading = false;
      }
    );
  }
}
```

## Problemas Identificados

1. **Memory Leak**: La subscription no se cierra, causando memory leaks
2. **Error Handling**: Solo usa console.error, no notifica al usuario
3. **No es Standalone**: Falta la configuración de standalone component
4. **Tipado Débil**: Usa `any[]` en lugar de interfaces tipadas
5. **Falta Change Detection Strategy**: No usa OnPush para optimización
6. **Imports Faltantes**: No importa CommonModule ni otros módulos necesarios

## Causa Raíz

- Las subscriptions de RxJS deben ser cerradas para evitar memory leaks
- El componente no sigue la arquitectura de standalone components del proyecto
- Falta integración con NotificationService para mostrar errores al usuario
- No se aprovecha OnPush change detection para mejor performance

## Solución Corregida

```typescript
import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { ProductService } from '../../shared/services/product.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Product, ProductModel } from '../../shared/interface/product.interface';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent {
  private productService = inject(ProductService);
  private notificationService = inject(NotificationService);

  // Usar Observable con async pipe en template
  products$: Observable<Product[]> = this.productService.getProducts().pipe(
    catchError((error) => {
      this.notificationService.showError('Error al cargar productos');
      console.error('Error loading products:', error);
      return of([]);
    })
  );

  // Si necesitas loading state, usar un BehaviorSubject o combinar con el observable
  loading$: Observable<boolean> = this.productService.skeletonLoader;
}
```

## Template Corregido

```html
<div class="product-list">
  @if (products$ | async; as products) {
    @if (products.length > 0) {
      <div class="products-grid">
        @for (product of products; track product.id) {
          <app-product-card [product]="product"></app-product-card>
        }
      </div>
    } @else {
      <p>{{ 'products.noProducts' | translate }}</p>
    }
  } @else {
    <app-loader></app-loader>
  }
</div>
```

## Explicación de Cambios

1. **Standalone Component**: Agregado `standalone: true` e imports explícitos
2. **Async Pipe**: Uso de async pipe elimina necesidad de cerrar subscriptions manualmente
3. **Error Handling**: Integración con NotificationService para mostrar errores al usuario
4. **Tipado Fuerte**: Uso de interfaces `Product[]` y `ProductModel`
5. **OnPush**: Change detection strategy para mejor performance
6. **inject()**: Uso de `inject()` en lugar de constructor injection (patrón moderno)
7. **Control Flow**: Uso de nueva sintaxis `@if` y `@for` de Angular 17+

## Mejoras Adicionales

Si necesitas manejar loading state de forma más granular:

```typescript
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Observable, BehaviorSubject, catchError, of, startWith } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  // ... configuración
})
export class ProductListComponent {
  private productService = inject(ProductService);
  private notificationService = inject(NotificationService);

  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$ = this.loadingSubject.asObservable();

  products$: Observable<Product[]> = this.productService.getProducts().pipe(
    map(response => response.data),
    catchError((error) => {
      this.notificationService.showError('Error al cargar productos');
      return of([]);
    }),
    startWith([])
  );
}
```

## Checklist de Validación

- [x] Standalone component con imports explícitos
- [x] Subscriptions manejadas con async pipe
- [x] Error handling con NotificationService
- [x] Tipado fuerte con interfaces
- [x] OnPush change detection
- [x] Uso de inject() para DI
- [x] Compatible con arquitectura del proyecto
