import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { Component, Input, inject } from '@angular/core';
import type { DeudorCobro, Propiedad } from '../../core/models';
import { DataService } from '../../core/services/data.service';
import { resolveDeudores } from '../../core/utils/normalize-propiedad-deudores';

@Component({
  selector: 'app-deudor-cell',
  standalone: true,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay],
  template: `
    <div
      class="deudor-cell relative w-full min-h-[2.25rem] outline-none"
      tabindex="0"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      (mouseenter)="open = true"
      (mouseleave)="open = false"
      (focus)="open = true"
      (blur)="open = false"
    >
      <div class="truncate font-medium text-foreground">{{ data.formatDeudorCorto(propiedad) }}</div>
      @if (emailCorto) {
        <div class="text-xs text-muted-foreground mt-0.5 truncate">{{ emailCorto }}</div>
      }
    </div>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayPush]="true"
      [cdkConnectedOverlayViewportMargin]="8"
    >
      <div class="deudor-cell-tooltip" role="tooltip">
        @for (d of deudores; track $index; let i = $index; let last = $last) {
          <div class="deudor-block">
            <p class="font-semibold">
              {{ deudores.length > 1 ? 'Deudor ' + (i + 1) + ': ' : 'Deudor: ' }}{{ d.nombre || '—' }}
            </p>
            <p>Tipo: {{ d.tipo_persona === 'natural' ? 'Persona natural' : 'Persona jurídica' }}</p>
            <p>{{ d.tipo_persona === 'natural' ? 'CC' : 'NIT' }}: {{ d.documento || '—' }}</p>
            @if (d.emails.length === 0) {
              <p>Correo: —</p>
            } @else if (d.emails.length === 1) {
              <p>Correo: {{ d.emails[0] }}</p>
            } @else {
              <p>Correos:</p>
              @for (email of d.emails; track email) {
                <p class="email-item">• {{ email }}</p>
              }
            }
          </div>
          @if (!last) {
            <div class="deudor-sep"></div>
          }
        }
      </div>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .deudor-cell:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: 2px;
        border-radius: 6px;
      }

      .deudor-cell-tooltip {
        min-width: 260px;
        max-width: min(360px, calc(100vw - 24px));
        max-height: min(360px, calc(100vh - 24px));
        overflow-y: auto;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: var(--popover);
        color: var(--popover-foreground);
        font-size: 12px;
        line-height: 1.45;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
        pointer-events: none;
      }

      .deudor-block p + p {
        margin-top: 2px;
      }

      .email-item {
        padding-left: 0.5rem;
      }

      .deudor-sep {
        height: 1px;
        margin: 8px 0;
        background: var(--border);
      }
    `,
  ],
})
export class DeudorCell {
  protected readonly data = inject(DataService);

  @Input({ required: true }) propiedad!: Pick<
    Propiedad,
    'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email' | 'deudores'
  >;

  open = false;

  readonly positions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetY: -8,
    },
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: 8,
    },
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
      offsetY: -8,
    },
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetY: 8,
    },
  ];

  get deudores(): DeudorCobro[] {
    return resolveDeudores(this.propiedad);
  }

  get emailCorto(): string {
    return this.data.formatDeudorEmailCorto(this.propiedad);
  }
}
