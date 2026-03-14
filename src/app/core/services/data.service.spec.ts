import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should format currency in COP', () => {
    expect(service.formatCurrency(1000000)).toContain('1');
    expect(service.formatCurrency(1000000)).toMatch(/[\d.,]+/);
  });

  it('should get cliente by id', () => {
    const c = service.getClienteById('c1');
    expect(c).toBeDefined();
    expect(c?.nombre).toBe('María Alejandra Rodríguez');
  });

  it('should get total cartera', () => {
    const total = service.getTotalCartera();
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(0);
  });
});
