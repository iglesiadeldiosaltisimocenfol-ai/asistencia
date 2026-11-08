/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { Member, AttendanceRecord, MemberCategory } from '../types';
import { getCenfolEmblemPng } from './reportAssets';

export interface MemberReportOptions {
  members: Member[];
  attendance: AttendanceRecord[];
  generatedBy: string;
  userRole?: string;
  categoryFilter?: string; // 'Todos' | MemberCategory
  statusFilter?: string; // 'Todos' | 'Activos' | 'Inactivos'
  searchTerm?: string;
}

/**
 * Filtra los miembros según los criterios seleccionados
 */
function getFilteredMembers(options: MemberReportOptions): Member[] {
  const { members, categoryFilter = 'Todos', statusFilter = 'Todos', searchTerm = '' } = options;
  const lowerSearch = searchTerm.toLowerCase().trim();

  return members.filter((m) => {
    const matchesCategory = categoryFilter === 'Todos' || m.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'Todos' ||
      (statusFilter === 'Activos' && m.active) ||
      (statusFilter === 'Inactivos' && !m.active);

    const matchesSearch =
      !lowerSearch ||
      m.name.toLowerCase().includes(lowerSearch) ||
      m.phone.includes(lowerSearch) ||
      m.email.toLowerCase().includes(lowerSearch) ||
      m.address.toLowerCase().includes(lowerSearch) ||
      Boolean(m.neighborhood && m.neighborhood.toLowerCase().includes(lowerSearch));

    return matchesCategory && matchesStatus && matchesSearch;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Calcula asistencias del mes actual y totales para un miembro
 */
function getMemberAttendanceStats(
  memberId: string,
  attendance: AttendanceRecord[]
): { attendedMonth: number; totalMonthSundays: number; totalHistorical: number } {
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const monthRecords = attendance.filter((r) => r.date.startsWith(currentMonthStr));
  let attendedMonth = 0;
  monthRecords.forEach((r) => {
    if (r.presentIds.includes(memberId)) attendedMonth++;
  });

  let totalHistorical = 0;
  attendance.forEach((r) => {
    if (r.presentIds.includes(memberId)) totalHistorical++;
  });

  return {
    attendedMonth,
    totalMonthSundays: monthRecords.length,
    totalHistorical,
  };
}

/**
 * EXPORTAR DIRECTORIO DE PERSONAS QUE ASISTEN A PDF CON LOGO OFICIAL CENFOL
 */
export async function exportMembersToPdf(options: MemberReportOptions): Promise<void> {
  const filtered = getFilteredMembers(options);

  // Formato horizontal (landscape) para permitir ver todos los campos cómodamente
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Logo oficial de CENFOL
  const logoDataUrl = getCenfolEmblemPng(260);
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 14, 10, 20, 20);
    } catch (e) {
      console.warn('No se pudo insertar logo en PDF:', e);
    }
  }

  // 2. Encabezado institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(4, 120, 87); // #047857 Esmeralda CENFOL
  doc.text('CENFOL - IGLESIA DEL DIOS ALTÍSIMO', 38, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Centro de Formación y Liderazgo Cristiano • Directorio Oficial de Personas y Asistentes', 38, 21);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('DIRECTORIO DE MEMBRESÍA Y ASISTENCIA CONGREGACIONAL', 38, 28);

  // Línea decorativa verde esmeralda y dorada
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.8);
  doc.line(14, 33, pageWidth - 14, 33);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.8);
  doc.line(pageWidth - 60, 33, pageWidth - 14, 33);

  // 3. Resumen y Metadatos
  const now = new Date();
  const fechaGeneracion = `${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

  let countHombres = 0;
  let countMujeres = 0;
  let countNinos = 0;
  let countNinas = 0;
  let countActivos = 0;

  filtered.forEach((m) => {
    if (m.active) countActivos++;
    if (m.category === 'Hombres') countHombres++;
    else if (m.category === 'Mujeres') countMujeres++;
    else if (m.category === 'Niños') countNinos++;
    else if (m.category === 'Niñas') countNinas++;
  });

  // Caja de resumen
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 36, pageWidth - 28, 16, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  doc.text(`Fecha de Emisión:`, 18, 41);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(fechaGeneracion, 46, 41);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado Por:`, 18, 48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${options.generatedBy} (${options.userRole || 'Líder'})`, 46, 48);

  // Totales
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Total en Lista:`, 105, 41);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${filtered.length} personas (${countActivos} activas)`, 128, 41);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Distribución:`, 105, 48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Hombres: ${countHombres} | Mujeres: ${countMujeres} | Niños: ${countNinos} | Niñas: ${countNinas}`, 128, 48);

  // Badge derecho
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(pageWidth - 62, 38, 48, 12, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('DIRECTORIO CENFOL', pageWidth - 58, 43);
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text(`${countActivos} Miembros Activos`, pageWidth - 58, 48);

  // 4. Tabla con autoTable
  const tableData = filtered.map((m, idx) => {
    const stats = getMemberAttendanceStats(m.id, options.attendance);
    const asistenciasMes = stats.totalMonthSundays > 0
      ? `${stats.attendedMonth}/${stats.totalMonthSundays} domingos`
      : `${stats.totalHistorical} asistencias`;

    const addressDisplay = m.address
      ? (m.neighborhood ? `${m.address} (B/ ${m.neighborhood})` : m.address)
      : (m.neighborhood ? `B/ ${m.neighborhood}` : 'Sin registrar');

    return [
      (idx + 1).toString(),
      m.name,
      m.category,
      m.phone || 'Sin registrar',
      m.email || 'Sin registrar',
      addressDisplay,
      asistenciasMes,
      m.active ? 'Activo' : 'Inactivo',
    ];
  });

  autoTable(doc, {
    startY: 55,
    head: [[
      '#',
      'Nombre Completo',
      'Categoría',
      'Teléfono / Celular',
      'Correo Electrónico',
      'Dirección / Barrio',
      'Asistencia Mes',
      'Estado',
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
      fillColor: [4, 120, 87],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 48, fontStyle: 'bold' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 32 },
      4: { cellWidth: 48 },
      5: { cellWidth: 50 },
      6: { cellWidth: 30, halign: 'center' },
      7: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 18 },
    didDrawPage: (data) => {
      const pageNumber = data.pageNumber;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);

      // Línea inferior
      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

      doc.text(
        'CENFOL - Centro de Formación y Liderazgo Cristiano • Directorio Oficial de Personas que Asisten | Confidencial para Uso Pastoral',
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
  const fileName = `Directorio_Personas_CENFOL_${fileDate}.pdf`;
  doc.save(fileName);
}

/**
 * EXPORTAR DIRECTORIO DE PERSONAS QUE ASISTEN A EXCEL CON LOGO OFICIAL EMBEBIDO
 */
export async function exportMembersToExcel(options: MemberReportOptions): Promise<void> {
  const filtered = getFilteredMembers(options);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = `CENFOL - ${options.generatedBy}`;
  workbook.lastModifiedBy = options.generatedBy;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Directorio de Personas', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  // 1. Logo oficial CENFOL
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
  worksheet.mergeCells('C1:H1');
  const titleCell = worksheet.getCell('C1');
  titleCell.value = 'CENFOL - IGLESIA DEL DIOS ALTÍSIMO';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF047857' } };
  titleCell.alignment = { vertical: 'middle' };

  worksheet.mergeCells('C2:H2');
  const subtitleCell = worksheet.getCell('C2');
  subtitleCell.value = 'Centro de Formación y Liderazgo Cristiano • Directorio Oficial de Personas y Asistentes';
  subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  subtitleCell.alignment = { vertical: 'middle' };

  worksheet.mergeCells('C3:H3');
  const docTitleCell = worksheet.getCell('C3');
  docTitleCell.value = 'DIRECTORIO GENERAL DE MEMBRESÍA Y ASISTENCIA CONGREGACIONAL';
  docTitleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E293B' } };
  docTitleCell.alignment = { vertical: 'middle' };

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 18;
  worksheet.getRow(3).height = 22;

  // 3. Metadatos
  const now = new Date();
  const fechaGeneracion = `${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

  let countHombres = 0;
  let countMujeres = 0;
  let countNinos = 0;
  let countNinas = 0;
  let countActivos = 0;

  filtered.forEach((m) => {
    if (m.active) countActivos++;
    if (m.category === 'Hombres') countHombres++;
    else if (m.category === 'Mujeres') countMujeres++;
    else if (m.category === 'Niños') countNinos++;
    else if (m.category === 'Niñas') countNinas++;
  });

  worksheet.getCell('A5').value = 'Fecha de Emisión:';
  worksheet.getCell('B5').value = fechaGeneracion;
  worksheet.getCell('A6').value = 'Generado Por:';
  worksheet.getCell('B6').value = `${options.generatedBy} (${options.userRole || 'Líder'})`;
  worksheet.getCell('A7').value = 'Filtros:';
  worksheet.getCell('B7').value = `Categoría: ${options.categoryFilter || 'Todos'} | Estado: ${options.statusFilter || 'Todos'}`;

  ['A5', 'A6', 'A7'].forEach((c) => {
    worksheet.getCell(c).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  });
  ['B5', 'B6', 'B7'].forEach((c) => {
    worksheet.getCell(c).font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
  });

  // Resumen en columnas E y F
  worksheet.getCell('E5').value = 'Total Personas:';
  worksheet.getCell('F5').value = filtered.length;
  worksheet.getCell('E6').value = 'Miembros Activos:';
  worksheet.getCell('F6').value = countActivos;
  worksheet.getCell('E7').value = 'Hombres / Mujeres:';
  worksheet.getCell('F7').value = `${countHombres} Hombres / ${countMujeres} Mujeres`;

  worksheet.getCell('G5').value = 'Niños / Niñas:';
  worksheet.getCell('H5').value = `${countNinos} Niños / ${countNinas} Niñas`;
  worksheet.getCell('G6').value = 'Estado Inactivos:';
  worksheet.getCell('H6').value = filtered.length - countActivos;

  ['E5', 'E6', 'E7', 'G5', 'G6'].forEach((c) => {
    worksheet.getCell(c).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  });
  ['F5', 'F6', 'F7', 'H5', 'H6'].forEach((c) => {
    worksheet.getCell(c).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
  });

  // 4. Encabezados de tabla en fila 9
  const headers = [
    '#',
    'Nombre Completo',
    'Categoría',
    'Teléfono / Celular',
    'Correo Electrónico',
    'Dirección de Residencia',
    'Barrio',
    'Asistencias Mes',
    'Total Asistencias',
    'Estado',
    'Fecha de Registro',
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

  worksheet.getCell('B9').alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getCell('E9').alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getCell('F9').alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getCell('G9').alignment = { vertical: 'middle', horizontal: 'left' };

  // 5. Filas de datos
  let currentRow = 10;
  filtered.forEach((m, idx) => {
    const stats = getMemberAttendanceStats(m.id, options.attendance);
    const asistenciasMesStr = stats.totalMonthSundays > 0
      ? `${stats.attendedMonth} de ${stats.totalMonthSundays} domingos`
      : 'Sin registros este mes';

    const row = worksheet.getRow(currentRow);
    row.values = [
      idx + 1,
      m.name,
      m.category,
      m.phone || '',
      m.email || '',
      m.address || '',
      m.neighborhood || '',
      asistenciasMesStr,
      stats.totalHistorical,
      m.active ? 'Activo' : 'Inactivo',
      m.createdAt ? m.createdAt.split('T')[0] : '',
    ];

    row.height = 20;

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

      if (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 8 || colNumber === 9 || colNumber === 10 || colNumber === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Estilo para Estado
      if (colNumber === 10) {
        if (m.active) {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
        } else {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF94A3B8' } };
        }
      }
    });

    currentRow++;
  });

  // Habilitar autofiltro en la tabla
  worksheet.autoFilter = {
    from: 'A9',
    to: `K${currentRow - 1}`,
  };

  // 6. Ancho de columnas
  worksheet.getColumn(1).width = 6;   // #
  worksheet.getColumn(2).width = 30;  // Nombre
  worksheet.getColumn(3).width = 16;  // Categoría
  worksheet.getColumn(4).width = 18;  // Teléfono
  worksheet.getColumn(5).width = 30;  // Email
  worksheet.getColumn(6).width = 32;  // Dirección
  worksheet.getColumn(7).width = 22;  // Barrio
  worksheet.getColumn(8).width = 24;  // Asistencias Mes
  worksheet.getColumn(9).width = 18;  // Total Asistencias
  worksheet.getColumn(10).width = 14; // Estado
  worksheet.getColumn(11).width = 16; // Fecha Registro

  // 7. Descargar archivo en el navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileDate = now.toISOString().split('T')[0];
  const fileName = `Directorio_Personas_CENFOL_${fileDate}.xlsx`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
