# Ejemplo: Corrección de Servicio Angular

## Problema Original

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable()
export class OrderService {
  private orders: any[] = [];

  constructor(private http: HttpClient) {}

  getOrders(): Observable<any> {
    return this.http.get<any>(`${environment.URLS}/orders`);
  }

  getOrderById(id: number): Observable<any> {
    return this.http.get<any>(`${environment.URLS}/orders/${id}`);
  }

  createOrder(order: any): Observable<any> {
    return this.http.post<any>(`${environment.URLS}/orders`, order);
  }

  updateOrderStatus(id: number, status: string): void {
    this.http.patch(`${environment.URLS}/orders/${id}`, { status })
      .subscribe(
        () => console.log('Order updated'),
        (error) => console.error('Error:', error)
      );
  }
}
```

## Problemas Identificados

1. **providedIn Faltante**: No usa `providedIn: 'root'`, requiere registro manual
2. **Tipado Débil**: Usa `any` en lugar de interfaces tipadas
3. **Subscription No Cerrada**: `updateOrderStatus` crea subscription que no se cierra
4. **Error Handling**: Solo usa console.error, no integra con NotificationService
5. **Código Duplicado**: URL base repetida en cada método
6. **Falta Manejo de Errores**: No hay manejo consistente de errores HTTP

## Causa Raíz

- Los servicios deben usar `providedIn: 'root'` para tree-shaking y mejor DI
- Las subscriptions en servicios deben retornarse o manejarse correctamente
- Falta integración con el sistema de notificaciones del proyecto
- No se aprovechan las interfaces TypeScript para type safety

## Solución Corregida

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { NotificationService } from './notification.service';
import { Order, OrderModel, CreateOrderRequest, UpdateOrderStatusRequest } from '../interface/order.interface';
import { Params } from '../interface/core.interface';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private readonly apiUrl = `${environment.URLS}/orders`;

  getOrders(params?: Params): Observable<OrderModel> {
    return this.http.get<OrderModel>(this.apiUrl, { params }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  createOrder(order: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, order).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  updateOrderStatus(id: number, status: string): Observable<Order> {
    const payload: UpdateOrderStatusRequest = { status };
    return this.http.patch<Order>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    // Mostrar notificación al usuario
    this.notificationService.showError(errorMessage);
    
    // Log para debugging
    console.error('OrderService Error:', error);
    
    return throwError(() => new Error(errorMessage));
  }
}
```

## Interfaces TypeScript

```typescript
// order.interface.ts
export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderModel {
  data: Order[];
  meta: {
    current_page: number;
    total: number;
    per_page: number;
  };
}

export interface CreateOrderRequest {
  items: OrderItem[];
  shipping_address_id: number;
  billing_address_id: number;
  payment_method_id: number;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface OrderItem {
  product_id: number;
  quantity: number;
  price: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
```

## Uso del Servicio Corregido

```typescript
// En un componente
export class OrderComponent {
  private orderService = inject(OrderService);
  
  orders$ = this.orderService.getOrders().pipe(
    map(response => response.data)
  );

  updateStatus(orderId: number, status: string) {
    this.orderService.updateOrderStatus(orderId, status).subscribe({
      next: (order) => {
        this.notificationService.showSuccess('Estado actualizado correctamente');
        // Actualizar lista o estado
      }
    });
  }
}
```

## Explicación de Cambios

1. **providedIn: 'root'**: Permite tree-shaking y DI automática
2. **inject()**: Uso de función inject() para dependency injection moderna
3. **Tipado Fuerte**: Interfaces TypeScript para type safety completo
4. **Error Handling Centralizado**: Método `handleError` reutilizable
5. **NotificationService**: Integración con sistema de notificaciones
6. **Observables Retornados**: Todos los métodos retornan Observables para manejo consistente
7. **URL Base**: Constante `apiUrl` para evitar duplicación
8. **Operadores RxJS**: Uso de `catchError` y `map` para transformaciones

## Mejoras Adicionales

### Caché de Datos (Opcional)

```typescript
import { BehaviorSubject, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ordersCache$ = new BehaviorSubject<Order[]>([]);
  
  getOrders(params?: Params): Observable<OrderModel> {
    return this.http.get<OrderModel>(this.apiUrl, { params }).pipe(
      map(response => {
        this.ordersCache$.next(response.data);
        return response;
      }),
      shareReplay(1), // Compartir última emisión
      catchError(this.handleError.bind(this))
    );
  }

  getCachedOrders(): Observable<Order[]> {
    return this.ordersCache$.asObservable();
  }
}
```

### Transformación de Datos

```typescript
getOrders(params?: Params): Observable<Order[]> {
  return this.http.get<OrderModel>(this.apiUrl, { params }).pipe(
    map(response => response.data.map(order => this.transformOrder(order))),
    catchError(this.handleError.bind(this))
  );
}

private transformOrder(order: any): Order {
  return {
    ...order,
    total: parseFloat(order.total),
    created_at: new Date(order.created_at),
    updated_at: new Date(order.updated_at)
  };
}
```

## Checklist de Validación

- [x] `providedIn: 'root'` configurado
- [x] Tipado fuerte con interfaces TypeScript
- [x] Error handling centralizado con NotificationService
- [x] Todas las subscriptions retornan Observables
- [x] Uso de inject() para DI
- [x] URL base centralizada
- [x] Operadores RxJS apropiados
- [x] Compatible con interceptores del proyecto
