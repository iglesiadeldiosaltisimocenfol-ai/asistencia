/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Genera el Logo oficial de CENFOL (Iglesia del Dios Altísimo) en formato PNG Base64
 * de forma 100% síncrona mediante HTML5 Canvas, garantizando máxima nitidez y compatibilidad
 * tanto para jsPDF como para ExcelJS en navegadores web y móviles.
 */

let cachedEmblemBase64: string | null = null;
let cachedBannerBase64: string | null = null;

/**
 * Dibuja el emblema circular oficial de CENFOL en un canvas 2D
 */
export function drawCenfolEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Fondo circular blanco con sombra sutil
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Borde exterior decorativo esmeralda / dorado sutil
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#047857'; // Esmeralda institucional
  ctx.stroke();

  // Anillo gris característico CENFOL
  ctx.beginPath();
  ctx.arc(0, 0, 84, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#8C98A4';
  ctx.stroke();

  // Origen para las coordenadas vectoriales (el centro del viewBox 200x200 es 100,100)
  ctx.translate(-100, -100);

  // 1. Pluma inferior / cola en rojo carmesí / borgoña (#832034)
  ctx.beginPath();
  ctx.moveTo(98, 152);
  ctx.bezierCurveTo(88, 155, 78, 157, 72, 153);
  ctx.bezierCurveTo(74, 148, 80, 142, 92, 136);
  ctx.bezierCurveTo(96, 142, 98, 148, 98, 152);
  ctx.closePath();
  ctx.fillStyle = '#832034';
  ctx.fill();

  // 2. Ala principal grande en Azul Marino Pizarra (#283747)
  ctx.beginPath();
  ctx.moveTo(94, 136);
  ctx.bezierCurveTo(82, 124, 62, 98, 56, 68);
  ctx.bezierCurveTo(51, 44, 58, 24, 82, 14);
  ctx.bezierCurveTo(87, 28, 92, 46, 88, 64);
  ctx.bezierCurveTo(84, 80, 77, 92, 85, 108);
  ctx.bezierCurveTo(92, 120, 102, 128, 105, 136);
  ctx.bezierCurveTo(101, 137, 97, 137, 94, 136);
  ctx.closePath();
  ctx.fillStyle = '#283747';
  ctx.fill();

  // 3. Cuerpo y cabeza de la paloma en Gris Plateado (#9AA5B1)
  ctx.beginPath();
  ctx.moveTo(103, 136);
  ctx.bezierCurveTo(114, 128, 126, 112, 124, 94);
  ctx.bezierCurveTo(122, 80, 116, 74, 118, 64);
  ctx.bezierCurveTo(122, 60, 128, 62, 134, 69);
  ctx.bezierCurveTo(130, 78, 128, 88, 128, 98);
  ctx.bezierCurveTo(128, 116, 118, 138, 98, 150);
  ctx.bezierCurveTo(102, 145, 104, 140, 103, 136);
  ctx.closePath();
  ctx.fillStyle = '#9AA5B1';
  ctx.fill();

  ctx.restore();
}

/**
 * Obtiene el emblema circular oficial en PNG Base64 (200x200 px a 2x de densidad)
 */
export function getCenfolEmblemPng(size: number = 240): string {
  if (cachedEmblemBase64 && size === 240) {
    return cachedEmblemBase64;
  }

  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fondo transparente o blanco limpio
  ctx.clearRect(0, 0, size, size);

  const scale = size / 200;
  drawCenfolEmblem(ctx, size / 2, size / 2, scale * 0.95);

  const dataUrl = canvas.toDataURL('image/png');
  if (size === 240) cachedEmblemBase64 = dataUrl;
  return dataUrl;
}

/**
 * Obtiene un banner institucional completo con el emblema y tipografía oficial
 * "CENFOL - IGLESIA DEL DIOS ALTÍSIMO" (ancho: 650px, alto: 140px)
 */
export function getCenfolBannerPng(): string {
  if (cachedBannerBase64) {
    return cachedBannerBase64;
  }

  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 650;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fondo blanco puro con borde sutil inferior
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 650, 140);

  // Dibujar emblema a la izquierda
  drawCenfolEmblem(ctx, 75, 70, 0.62);

  // Textos institucionales
  // Título CENFOL
  ctx.fillStyle = '#047857'; // Esmeralda iglesia
  ctx.font = 'bold 36px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillText('CENFOL', 155, 54);

  // Subtítulo Iglesia del Dios Altísimo
  ctx.fillStyle = '#1E293B'; // Pizarra oscuro
  ctx.font = 'bold 18px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillText('IGLESIA DEL DIOS ALTÍSIMO', 156, 82);

  // Lema / descripción
  ctx.fillStyle = '#64748B'; // Gris medio
  ctx.font = '500 13px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillText('Centro de Formación y Liderazgo Cristiano • Sede Principal', 156, 106);

  // Línea decorativa verde esmeralda y oro
  ctx.fillStyle = '#10B981';
  ctx.fillRect(156, 116, 260, 3);
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(418, 116, 60, 3);

  const dataUrl = canvas.toDataURL('image/png');
  cachedBannerBase64 = dataUrl;
  return dataUrl;
}
