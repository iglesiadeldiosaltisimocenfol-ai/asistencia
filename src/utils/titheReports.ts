/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { FinancialRecord, Member } from '../types';
import { getCenfolBannerPng, getCenfolEmblemPng } from './reportAssets';

export interface TitheReportOptions {
  records: FinancialRecord[];
  members: Member[];
  generatedBy: string;
  userRole?: string;
  filterType?: 'only_tithes' | 'all_income' | 'all_transactions';
  dateRangeLabel?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Formatea valores numéricos como Pesos Colombianos / Estándar
 */
const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const formatShortDate = (isoStr: string): string => {
  if (!isoStr) return '';
  try {
    const [y, m, d] = isoStr.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
  } catch {
    // fallback
  }
  return isoStr;
};

/**
 * Filtra los registros según las opciones seleccionadas
 */
function getFilteredRecords(options: TitheReportOptions): FinancialRecord[] {
  const { records, filterType = 'only_tithes', startDate, endDate } = options;

  return records.filter((r) => {
    // Filtro por tipo
    if (filterType === 'only_tithes' && r.type !== 'diezmo') return false;
    if (filterType === 'all_income' && (r.type === 'gasto')) return false;

    // Filtro por fecha
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;

    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * EXPORTAR REPORTE DE DIEZMOS A PDF CON LOGO OFICIAL DE CENFOL
 */
export async function exportTithesToPdf(options: TitheReportOptions): Promise<void> {
  const filtered = getFilteredRecords(options);
  const isOnlyTithes = (options.filterType || 'only_tithes') === 'only_tithes';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Incorporar el Logo oficial de CENFOL
  const logoDataUrl = getCenfolEmblemPng(260);
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 14, 12, 22, 22);
    } catch (e) {
      console.warn('No se pudo insertar logo en PDF:', e);
    }
  }

  // 2. Encabezado institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(4, 120, 87); // #047857 Esmeralda
  doc.text('CENFOL - IGLESIA DEL DIOS ALTÍSIMO', 40, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Gris slate
  doc.text('Centro de Formación y Liderazgo Cristiano • Sistema de Mayordomía y Tesorería', 40, 23);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const titleText = isOnlyTithes
    ? 'REPORTE OFICIAL DE DIEZMOS'
    : 'INFORME DE MOVIMIENTOS DE TESORERÍA';
  doc.text(titleText, 40, 31);

  // Línea decorativa verde esmeralda y dorada
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.8);
  doc.line(14, 38, pageWidth - 14, 38);
  doc.setDrawColor(245, 158, 11); // Dorado
  doc.setLineWidth(0.8);
  doc.line(pageWidth - 45, 38, pageWidth - 14, 38);

  // 3. Cuadro de Metadatos y Estadísticas
  const now = new Date();
  const fechaGeneracion = `${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

  let totalMonto = 0;
  const donorsSet = new Set<string>();
  const methodTotals: Record<string, number> = {};

  filtered.forEach((r) => {
    totalMonto += Number(r.amount) || 0;
    if (r.memberName) donorsSet.add(r.memberName);
    const m = r.paymentMethod || 'Efectivo';
    methodTotals[m] = (methodTotals[m] || 0) + (Number(r.amount) || 0);
  });

  // Caja de resumen
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, pageWidth - 28, 23, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  // Columna 1
  doc.text(`Fecha de Emisión:`, 18, 48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(fechaGeneracion, 46, 48);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado Por:`, 18, 54);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${options.generatedBy} (${options.userRole || 'Líder'})`, 46, 54);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Período:`, 18, 60);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(options.dateRangeLabel || 'Histórico Completo', 46, 60);

  // Columna 2: Totales destacados
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Registros:`, 110, 48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${filtered.length} aportes`, 135, 48);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Diezmantes ID:`, 110, 54);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${donorsSet.size} personas`, 135, 54);

  // Total en recuadro verde
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(pageWidth - 72, 45, 54, 17, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(isOnlyTithes ? 'TOTAL DIEZMOS' : 'TOTAL RECAUDADO', pageWidth - 70, 50);

  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70);
  doc.text(formatCurrency(totalMonto), pageWidth - 70, 58);

  // 4. Tabla de Diezmos / Movimientos con autoTable
  const tableData = filtered.map((r, idx) => [
    (idx + 1).toString(),
    formatShortDate(r.date),
    r.memberName || 'Aporte Anónimo / General',
    r.description || (r.type === 'diezmo' ? 'Diezmo dominical' : r.type),
    r.paymentMethod || 'Efectivo',
    r.registeredBy || 'Tesorería',
    formatCurrency(r.amount),
  ]);

  autoTable(doc, {
    startY: 69,
    head: [[
      '#',
      'Fecha',
      'Diezmante / Miembro',
      'Concepto',
      'Método',
      'Registró',
      'Monto ($ COP)',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [4, 120, 87], // Esmeralda CENFOL
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { cellWidth: 50 },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 24, fontSize: 7.5 },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    foot: [[
      '',
      '',
      'TOTAL GENERAL',
      `${filtered.length} aportes registrados`,
      '',
      '',
      formatCurrency(totalMonto),
    ]],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [4, 120, 87],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      // Pie de página oficial en cada hoja
      const pageNumber = data.pageNumber;
      const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : pageNumber;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);

      // Línea inferior
      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

      doc.text(
        'CENFOL - Centro de Formación y Liderazgo Cristiano • Iglesia del Dios Altísimo | Documento de Mayordomía Confidencial',
        14,
        pageHeight - 7
      );

      doc.text(
        `Pág. ${pageNumber}`,
        pageWidth - 24,
        pageHeight - 7
      );
    },
  });

  const fileDate = now.toISOString().split('T')[0];
  const fileName = `Reporte_Diezmos_CENFOL_${fileDate}.pdf`;
  doc.save(fileName);
}

/**
 * EXPORTAR REPORTE DE DIEZMOS A EXCEL CON LOGO OFICIAL EMBEBIDO
 */
export async function exportTithesToExcel(options: TitheReportOptions): Promise<void> {
  const filtered = getFilteredRecords(options);
  const isOnlyTithes = (options.filterType || 'only_tithes') === 'only_tithes';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = `CENFOL - ${options.generatedBy}`;
  workbook.lastModifiedBy = options.generatedBy;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Reporte de Diezmos', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });

  // 1. Agregar el Logo oficial de CENFOL a la hoja
  const logoDataUrl = getCenfolEmblemPng(200);
  if (logoDataUrl) {
    try {
      const base64Data = logoDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageId = workbook.addImage({
        base64: base64Data,
        extension: 'png',
      });

      worksheet.addImage(imageId, {
        tl: { col: 0.2, row: 0.2 },
        ext: { width: 55, height: 55 },
      });
    } catch (e) {
      console.warn('No se pudo insertar logo en Excel:', e);
    }
  }

  // 2. Encabezado institucional
  worksheet.mergeCells('C1:G1');
  const titleCell = worksheet.getCell('C1');
  titleCell.value = 'CENFOL - IGLESIA DEL DIOS ALTÍSIMO';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF047857' } };
  titleCell.alignment = { vertical: 'middle' };

  worksheet.mergeCells('C2:G2');
  const subtitleCell = worksheet.getCell('C2');
  subtitleCell.value = 'Centro de Formación y Liderazgo Cristiano • Sistema Oficial de Tesorería';
  subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  subtitleCell.alignment = { vertical: 'middle' };

  worksheet.mergeCells('C3:G3');
  const docTitleCell = worksheet.getCell('C3');
  docTitleCell.value = isOnlyTithes
    ? 'REPORTE OFICIAL DE DIEZMOS Y MAYORDOMÍA'
    : 'INFORME GENERAL DE MOVIMIENTOS FINANCIEROS';
  docTitleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E293B' } };
  docTitleCell.alignment = { vertical: 'middle' };

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 18;
  worksheet.getRow(3).height = 22;

  // 3. Bloque de Metadatos
  const now = new Date();
  const fechaGeneracion = `${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

  worksheet.getCell('A5').value = 'Fecha de Expedición:';
  worksheet.getCell('B5').value = fechaGeneracion;
  worksheet.getCell('A6').value = 'Generado Por:';
  worksheet.getCell('B6').value = `${options.generatedBy} (${options.userRole || 'Líder'})`;
  worksheet.getCell('A7').value = 'Período:';
  worksheet.getCell('B7').value = options.dateRangeLabel || 'Histórico Completo';

  ['A5', 'A6', 'A7'].forEach((c) => {
    worksheet.getCell(c).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  });
  ['B5', 'B6', 'B7'].forEach((c) => {
    worksheet.getCell(c).font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
  });

  // Métricas
  let totalMonto = 0;
  const donorsSet = new Set<string>();
  filtered.forEach((r) => {
    totalMonto += Number(r.amount) || 0;
    if (r.memberName) donorsSet.add(r.memberName);
  });

  worksheet.getCell('E5').value = 'Total Registros:';
  worksheet.getCell('F5').value = filtered.length;
  worksheet.getCell('E6').value = 'Diezmantes Únicos:';
  worksheet.getCell('F6').value = donorsSet.size;
  worksheet.getCell('E7').value = 'TOTAL DIEZMOS:';
  worksheet.getCell('F7').value = totalMonto;
  worksheet.getCell('F7').numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';

  ['E5', 'E6', 'E7'].forEach((c) => {
    worksheet.getCell(c).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  });
  worksheet.getCell('E7').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF047857' } };
  worksheet.getCell('F7').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF047857' } };

  // 4. Encabezados de la Tabla en fila 9
  const headers = [
    '#',
    'Fecha',
    'Diezmante / Miembro',
    'Concepto / Descripción',
    'Método de Pago',
    'Registrado Por',
    'Monto ($ COP)',
  ];

  const headerRow = worksheet.getRow(9);
  headerRow.values = headers;
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF047857' }, // Esmeralda CENFOL
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF065F46' } },
      bottom: { style: 'medium', color: { argb: 'FF065F46' } },
      left: { style: 'thin', color: { argb: 'FF065F46' } },
      right: { style: 'thin', color: { argb: 'FF065F46' } },
    };
  });

  // Ajustar alineación de columnas específicas del header
  worksheet.getCell('C9').alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getCell('D9').alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getCell('G9').alignment = { vertical: 'middle', horizontal: 'right' };

  // 5. Filas de datos
  let currentRow = 10;
  filtered.forEach((r, idx) => {
    const row = worksheet.getRow(currentRow);
    row.values = [
      idx + 1,
      r.date,
      r.memberName || 'Aporte Anónimo / General',
      r.description || (r.type === 'diezmo' ? 'Diezmo dominical' : r.type),
      r.paymentMethod || 'Efectivo',
      r.registeredBy || 'Tesorería',
      Number(r.amount) || 0,
    ];

    row.height = 20;

    // Estilos y bordes
    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb },
      };
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (colNumber === 1 || colNumber === 2 || colNumber === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });

    currentRow++;
  });

  // Fila de Total con fórmula SUM de Excel
  const totalRow = worksheet.getRow(currentRow);
  totalRow.getCell(1).value = '';
  totalRow.getCell(2).value = '';
  totalRow.getCell(3).value = 'TOTAL GENERAL:';
  totalRow.getCell(4).value = `${filtered.length} aportes`;
  totalRow.getCell(5).value = '';
  totalRow.getCell(6).value = '';
  totalRow.getCell(7).value = { formula: `SUM(G10:G${currentRow - 1})` };
  totalRow.getCell(7).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';

  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF047857' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'double', color: { argb: 'FF047857' } },
    };
  });
  totalRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
  totalRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };

  // 6. Ancho óptimo de columnas
  worksheet.getColumn(1).width = 6;   // #
  worksheet.getColumn(2).width = 14;  // Fecha
  worksheet.getColumn(3).width = 30;  // Diezmante / Miembro
  worksheet.getColumn(4).width = 36;  // Concepto
  worksheet.getColumn(5).width = 18;  // Método
  worksheet.getColumn(6).width = 20;  // Registrado Por
  worksheet.getColumn(7).width = 20;  // Monto

  // 7. Descargar archivo en el navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileDate = now.toISOString().split('T')[0];
  const fileName = `Reporte_Diezmos_CENFOL_${fileDate}.xlsx`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
