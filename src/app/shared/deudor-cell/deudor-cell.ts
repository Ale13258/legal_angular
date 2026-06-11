import { Component, Input, inject } from '@angular/core';
import type { Propiedad } from '../../core/models';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-deudor-cell',
  standalone: true,
  template: `
    <div class="deudor-cell group relative w-full min-h-[2.25rem]" tabindex="0">
      <div class="truncate font-medium text-foreground">{{ data.formatDeudorCorto(propiedad) }}</div>
      @if (propiedad.cobro_email.trim()) {
        <div class="text-xs text-muted-foreground mt-0.5 truncate">{{ propiedad.cobro_email }}</div>
      }
      <div class="deudor-cell-tooltip" role="tooltip" aria-hidden="true">
        @for (line of tooltipLines; track line) {
          <p class="leading-snug">{{ line }}</p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .deudor-cell-tooltip {
        position: absolute;
        left: 0;
        bottom: calc(100% + 6px);
        z-index: 60;
        min-width: 220px;
        max-width: 300px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: var(--popover);
        color: var(--popover-foreground);
        font-size: 12px;
        line-height: 1.45;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition:
          opacity 0.12s ease,
          visibility 0.12s ease;
      }

      .deudor-cell-tooltip p + p {
        margin-top: 4px;
      }

      .deudor-cell:hover .deudor-cell-tooltip,
      .deudor-cell:focus-visible .deudor-cell-tooltip {
        opacity: 1;
        visibility: visible;
      }

      .deudor-cell:focus-visible {
        outline: none;
      }
    `,
  ],
})
export class DeudorCell {
  protected readonly data = inject(DataService);

  @Input({ required: true }) propiedad!: Pick<
    Propiedad,
    'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email'
  >;

  get tooltipLines(): string[] {
    return this.data.formatDeudorTooltip(this.propiedad).split('\n');
  }
}
