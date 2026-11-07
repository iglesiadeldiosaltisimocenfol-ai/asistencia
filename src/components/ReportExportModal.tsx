/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, Table, Download, X, Calendar, CheckCircle2, Filter, Sparkles, ShieldCheck } from 'lucide-react';
import { FinancialRecord, Member, AttendanceRecord, MemberCategory } from '../types';
import { exportTithesToPdf, exportTithesToExcel, TitheReportOptions } from '../utils/titheReports';
import { exportMembersToPdf, exportMembersToExcel, MemberReportOptions } from '../utils/memberReports';
import CenfolLogo from './CenfolLogo';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'diezmos' | 'directorio';
  financialRecords?: FinancialRecord[];
  members?: Member[];
  attendance?: AttendanceRecord[];
  currentUserName: string;
  userRole?: string;
}

export default function ReportExportModal({
  isOpen,
  onClose,
  reportType,
  financialRecords = [],
  members = [],
  attendance = [],
  currentUserName,
  userRole = 'Administrador',
}: ReportExportModalProps) {
  if (!isOpen) return null;

  const isTithe = reportType === 'diezmos';

  // Opciones para Diezmos
  const [titheFilterType, setTitheFilterType] = useState<'only_tithes' | 'all_income' | 'all_transactions'>('only_tithes');
  const [dateRangeOption, setDateRangeOption] = useState<'all' | 'this_month' | 'last_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Opciones para Directorio
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  // Estado de descarga
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Calcular fechas para filtros
  const getDateRangeParams = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed

    if (dateRangeOption === 'this_month') {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      const monthName = today.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      return {
        startDate: start,
        endDate: end,
        dateRangeLabel: `Mes de ${monthName}`,
      };
    }

    if (dateRangeOption === 'last_month') {
      const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      const lastMonthDate = new Date(year, month - 1, 1);
      const monthName = lastMonthDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      return {
        startDate: start,
        endDate: end,
        dateRangeLabel: `Mes de ${monthName}`,
      };
    }

    if (dateRangeOption === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        dateRangeLabel: `Del ${customStartDate} al ${customEndDate}`,
      };
    }

    return {
      startDate: undefined,
      endDate: undefined,
      dateRangeLabel: 'Histórico Completo',
    };
  };

  // Previsualización de conteos
  const dateParams = getDateRangeParams();
  const previewTithes = financialRecords.filter((r) => {
    if (titheFilterType === 'only_tithes' && r.type !== 'diezmo') return false;
    if (titheFilterType === 'all_income' && r.type === 'gasto') return false;
    if (dateParams.startDate && r.date < dateParams.startDate) return false;
    if (dateParams.endDate && r.date > dateParams.endDate) return false;
    return true;
  });

  const tithesTotalAmount = previewTithes.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  const previewMembers = members.filter((m) => {
    if (categoryFilter !== 'Todos' && m.category !== categoryFilter) return false;
    if (statusFilter === 'Activos' && !m.active) return false;
    if (statusFilter === 'Inactivos' && m.active) return false;
    return true;
  });

  const handleDownload = async (format: 'pdf' | 'excel') => {
    setIsGenerating(true);
    setSuccessMessage(null);

    try {
      if (isTithe) {
        const options: TitheReportOptions = {
          records: financialRecords,
          members,
          generatedBy: currentUserName,
          userRole,
          filterType: titheFilterType,
          startDate: dateParams.startDate,
          endDate: dateParams.endDate,
          dateRangeLabel: dateParams.dateRangeLabel,
        };

        if (format === 'pdf') {
          await exportTithesToPdf(options);
          setSuccessMessage('¡Reporte de Diezmos en PDF con Logo descargado exitosamente!');
        } else {
          await exportTithesToExcel(options);
          setSuccessMessage('¡Reporte de Diezmos en Excel (.xlsx) con Logo descargado exitosamente!');
        }
      } else {
        const options: MemberReportOptions = {
          members,
          attendance,
          generatedBy: currentUserName,
          userRole,
          categoryFilter,
          statusFilter,
        };

        if (format === 'pdf') {
          await exportMembersToPdf(options);
          setSuccessMessage('¡Directorio de Personas en PDF con Logo descargado exitosamente!');
        } else {
          await exportMembersToExcel(options);
          setSuccessMessage('¡Directorio de Personas en Excel (.xlsx) con Logo descargado exitosamente!');
        }
      }
    } catch (err: any) {
      console.error('Error generando reporte:', err);
      alert('Ocurrió un error al generar el archivo. Por favor reintenta.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera con Logo CENFOL */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-emerald-200/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="p-1 bg-white rounded-full shadow-md shrink-0">
              <CenfolLogo variant="emblem" size={48} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-200 text-[10px] font-bold rounded uppercase tracking-wider">
                  CENFOL • Reportes Oficiales
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-semibold">
                  <ShieldCheck className="w-3 h-3" /> Con Logo Oficial
                </span>
              </div>
              <h2 className="text-lg font-bold mt-1 text-white">
                {isTithe ? 'Descargar Reporte de Diezmos' : 'Descargar Directorio de Asistentes'}
              </h2>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                {isTithe
                  ? 'Genera informes de diezmos y mayordomía con logo institucional en PDF y Excel'
                  : 'Genera el directorio de miembros y personas que asisten con logo en PDF y Excel'}
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo de configuración */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Alerta de éxito */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Opciones para Diezmos */}
          {isTithe && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" /> Contenido a incluir
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTitheFilterType('only_tithes')}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                      titheFilterType === 'only_tithes'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block font-bold">Solo Diezmos</span>
                    <span className="text-[10px] text-slate-500">Aportes y diezmantes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTitheFilterType('all_income')}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                      titheFilterType === 'all_income'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block font-bold">Todos los Ingresos</span>
                    <span className="text-[10px] text-slate-500">Diezmos + Ofrendas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTitheFilterType('all_transactions')}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                      titheFilterType === 'all_transactions'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block font-bold">Completo Tesorería</span>
                    <span className="text-[10px] text-slate-500">Ingresos y egresos</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Período de fechas
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setDateRangeOption('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                      dateRangeOption === 'all'
                        ? 'bg-slate-800 border-slate-800 text-white font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Todo el Histórico
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRangeOption('this_month')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                      dateRangeOption === 'this_month'
                        ? 'bg-slate-800 border-slate-800 text-white font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Este Mes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRangeOption('last_month')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                      dateRangeOption === 'last_month'
                        ? 'bg-slate-800 border-slate-800 text-white font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Mes Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRangeOption('custom')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                      dateRangeOption === 'custom'
                        ? 'bg-slate-800 border-slate-800 text-white font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>

                {dateRangeOption === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Desde:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Hasta:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tarjeta de previsualización */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-900 block">
                    Registros a exportar: {previewTithes.length}
                  </span>
                  <span className="text-[10px] text-emerald-700">
                    {dateParams.dateRangeLabel} • {titheFilterType === 'only_tithes' ? 'Solo diezmos' : 'General'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Monto Total</span>
                  <span className="text-sm font-extrabold text-emerald-800 font-mono">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(tithesTotalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Opciones para Directorio */}
          {!isTithe && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-emerald-600" /> Categoría / Ministerio
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Todos">Todas las categorías ({members.length})</option>
                    <option value="Hombres">Hombres</option>
                    <option value="Mujeres">Mujeres</option>
                    <option value="Niños">Niños</option>
                    <option value="Niñas">Niñas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Estado de Membresía
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="Activos">Solo Miembros Activos</option>
                    <option value="Inactivos">Solo Inactivos</option>
                  </select>
                </div>
              </div>

              {/* Tarjeta de previsualización */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-900 block">
                    Total personas en el archivo: {previewMembers.length}
                  </span>
                  <span className="text-[10px] text-emerald-700">
                    Incluye datos de contacto, teléfonos, direcciones e historial de asistencias
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-white text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 shadow-2xs">
                    Formato Listo
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Información del Logo Incluido */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white shadow-2xs flex items-center justify-center p-0.5 border border-slate-200 shrink-0">
              <CenfolLogo variant="emblem" size={26} />
            </div>
            <div className="text-[11px] text-slate-600">
              <span className="font-bold text-slate-800 block">Logo oficial CENFOL integrado</span>
              Los archivos PDF y Excel generados contienen el emblema institucional en alta resolución y membrete oficial.
            </div>
          </div>
        </div>

        {/* Botones de Descarga */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Botón Descargar PDF */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleDownload('pdf')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>

            {/* Botón Descargar Excel */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleDownload('excel')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Table className="w-4 h-4" />
              <span>Descargar Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
