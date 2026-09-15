import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  PieController,
  Title,
  Tooltip,
  type ChartConfiguration,
  type ChartType,
} from 'chart.js';

let registered = false;

function ensureChartJsRegistered(): void {
  if (registered) return;
  Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    DoughnutController,
    PieController,
    ArcElement,
    Legend,
    Title,
    Tooltip,
  );
  registered = true;
}

export type ChartPngResult = {
  /** data URL `data:image/png;base64,...` */
  dataUrl: string;
  width: number;
  height: number;
};

/**
 * Renderiza un chart de Chart.js en un canvas offscreen y devuelve PNG.
 * Pensado para embeds en PDF/DOCX (sin depender del DOM de la UI).
 */
export function renderChartToPng<TType extends ChartType = ChartType>(
  config: ChartConfiguration<TType>,
  size: { width: number; height: number } = { width: 900, height: 420 },
): ChartPngResult {
  ensureChartJsRegistered();
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const chart = new Chart(canvas, {
    ...config,
    options: {
      ...(config.options ?? {}),
      responsive: false,
      animation: false,
    } as ChartConfiguration<TType>['options'],
  });
  const dataUrl = chart.toBase64Image('image/png', 1);
  chart.destroy();
  return { dataUrl, width: size.width, height: size.height };
}

export function pngDataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
