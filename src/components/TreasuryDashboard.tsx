/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FinancialRecord, TransactionType, PaymentMethod, Member } from '../types';
import { 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Wallet, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Calendar, 
  Receipt, 
  CreditCard, 
  Banknote, 
  FileText,
  HeartHandshake,
  TrendingUp,
  AlertCircle,
  Table,
  Download,
  Printer,
  Sparkles,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import ReportExportModal from './ReportExportModal';
import { exportTithesToPdf, exportTithesToExcel } from '../utils/titheReports';

interface TreasuryDashboardProps {
  records: FinancialRecord[];
  members: Member[];
  currentUserName: string;
  onAddRecord: (record: Omit<FinancialRecord, 'id' | 'createdAt'>) => void;
  onDeleteRecord: (id: string) => void;
  onSaveToSheets?: () => Promise<void> | void;
  isSyncingSheets?: boolean;
  onClearTreasury?: (mode: 'diezmo' | 'todos') => Promise<void> | void;
}

export const parseFlexibleAmount = (input: string | number): number => {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input) return 0;
  let str = input.toString().trim();
  if (!str) return 0;

  // Manejar abreviaciones populares como "k", "mil", "m", "millón"
  let multiplier = 1;
  const lower = str.toLowerCase();
  if (/\b\d+\s*mil\b/.test(lower) || lower.endsWith('mil')) {
    multiplier = 1000;
    str = str.replace(/mil/gi, '').trim();
  } else if (/\b\d+\s*k\b/.test(lower) || lower.endsWith('k')) {
    multiplier = 1000;
    str = str.replace(/k/gi, '').trim();
  } else if (/\b\d+\s*m\b/.test(lower) || lower.endsWith('m') || lower.includes('millon') || lower.includes('millón')) {
    multiplier = 1000000;
    str = str.replace(/millones|millón|millon|m/gi, '').trim();
  }

  // Quitar palabras como "cop", "pesos", "$", apóstrofes, espacios
  let clean = str.replace(/(cop|pesos|usd|\$|'|\s)/gi, '').trim();
  if (!clean) return 0;

  // Si tiene puntos y comas combinados (ej: 1.500.000,50 o 1,500,000.50)
  if (clean.includes('.') && clean.includes(',')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // 1.500.000,50 -> coma es decimal
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,500,000.50 -> punto es decimal
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes('.')) {
    // Si contiene solo puntos:
    const parts = clean.split('.');
    if (parts.length > 2) {
      // 1.000.000 -> miles
      clean = clean.replace(/\./g, '');
    } else if (parts.length === 2) {
      // Si el grupo posterior tiene 3 dígitos (ej: 50.000) es separador de miles
      if (parts[1].length === 3) {
        clean = clean.replace(/\./g, '');
      }
      // Si tiene 1 o 2 dígitos (ej: 25.5 o 25.50) se conserva como punto decimal
    }
  } else if (clean.includes(',')) {
    // Si contiene solo comas:
    const parts = clean.split(',');
    if (parts.length > 2) {
      clean = clean.replace(/,/g, '');
    } else if (parts.length === 2) {
      if (parts[1].length === 3) {
        clean = clean.replace(/,/g, '');
      } else {
        clean = clean.replace(',', '.');
      }
    }
  }

  // Eliminar cualquier otro carácter residual no numérico excepto el punto decimal
  clean = clean.replace(/[^0-9.]/g, '');

  const val = parseFloat(clean);
  const result = isNaN(val) ? 0 : val * multiplier;
  return result;
};

export default function TreasuryDashboard({
  records,
  members,
  currentUserName,
  onAddRecord,
  onDeleteRecord,
  onSaveToSheets,
  isSyncingSheets = false,
  onClearTreasury,
}: TreasuryDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingQuick, setIsExportingQuick] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearMode, setClearMode] = useState<'diezmo' | 'todos'>('diezmo');
  const [isClearing, setIsClearing] = useState(false);

  const handleConfirmClear = async () => {
    if (!onClearTreasury) return;
    setIsClearing(true);
    try {
      await onClearTreasury(clearMode);
      setShowClearModal(false);
    } finally {
      setIsClearing(false);
    }
  };

  const handleQuickDownloadTithesPdf = async () => {
    setIsExportingQuick(true);
    try {
      await exportTithesToPdf({
        records,
        members,
        generatedBy: currentUserName,
        filterType: 'only_tithes',
        dateRangeLabel: 'Histórico de Diezmos',
      });
    } catch (e) {
      console.error(e);
      alert('Error descargando reporte PDF.');
    } finally {
      setIsExportingQuick(false);
    }
  };

  const handleQuickDownloadTithesExcel = async () => {
    setIsExportingQuick(true);
    try {
      await exportTithesToExcel({
        records,
        members,
        generatedBy: currentUserName,
        filterType: 'only_tithes',
        dateRangeLabel: 'Histórico de Diezmos',
      });
    } catch (e) {
      console.error(e);
      alert('Error descargando reporte Excel.');
    } finally {
      setIsExportingQuick(false);
    }
  };

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('ofrenda');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [memberId, setMemberId] = useState<string>('');
  const [customDonorName, setCustomDonorName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [formError, setFormError] = useState<string | null>(null);

  // Totales
  const stats = useMemo(() => {
    let totalDiezmos = 0;
    let totalOfrendas = 0;
    let totalDonaciones = 0;
    let totalGastos = 0;

    records.forEach((r) => {
      const val = Number(r.amount) || 0;
      if (r.type === 'diezmo') totalDiezmos += val;
      else if (r.type === 'ofrenda') totalOfrendas += val;
      else if (r.type === 'donacion') totalDonaciones += val;
      else if (r.type === 'gasto') totalGastos += val;
    });

    const totalIngresos = totalDiezmos + totalOfrendas + totalDonaciones;
    const saldoNeto = totalIngresos - totalGastos;

    return {
      totalDiezmos,
      totalOfrendas,
      totalDonaciones,
      totalIngresos,
      totalGastos,
      saldoNeto,
    };
  }, [records]);

  // Formateador de moneda (Pesos / estándar con soporte decimal)
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const openModal = (defaultType?: TransactionType) => {
    setDate(new Date().toISOString().split('T')[0]);
    setType(defaultType || 'ofrenda');
    setAmount('');
    setDescription('');
    setMemberId('');
    setCustomDonorName('');
    setPaymentMethod('Efectivo');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFlexibleAmount(amount);
    if (parsedAmount <= 0) {
      setFormError('Por favor ingresa un monto válido mayor a 0 (ej: 50.000, 25.50, 100k o $100.000 COP).');
      return;
    }

    const linkedMember = members.find((m) => m.id === memberId);
    const donorName = linkedMember?.name || customDonorName.trim() || undefined;

    // Si la descripción está vacía, generar concepto automático según el tipo
    const finalDescription = description.trim() || (
      type === 'diezmo'
        ? (donorName ? `Diezmo de ${donorName}` : 'Diezmo dominical')
        : type === 'ofrenda'
        ? 'Ofrenda culto dominical'
        : type === 'gasto'
        ? 'Gasto de reunión dominical'
        : (donorName ? `Donación de ${donorName}` : 'Donación general')
    );

    onAddRecord({
      date,
      type,
      amount: parsedAmount,
      description: finalDescription,
      memberId: memberId || undefined,
      memberName: donorName,
      paymentMethod,
      registeredBy: currentUserName,
    });

    setIsModalOpen(false);
  };

  const handleDelete = (record: FinancialRecord) => {
    const confirmed = window.confirm(
      `¿Desea eliminar el registro "${record.description}" por valor de ${formatMoney(record.amount)}?`
    );
    if (confirmed) {
      onDeleteRecord(record.id);
    }
  };

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.memberName && r.memberName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          r.date.includes(searchTerm);
        const matchesType = selectedTypeFilter === 'Todos' || r.type === selectedTypeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, searchTerm, selectedTypeFilter]);

  return (
    <div className="space-y-6" id="treasury-dashboard">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Coins className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Tesorería y Finanzas</h2>
              <p className="text-xs text-slate-500">
                Registro de diezmos, ofrendas dominicales, donaciones y egresos de la iglesia
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Indicador en tiempo real */}
          <div 
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-[11px] font-bold"
            title="Todos los diezmos y ofrendas registrados se reflejan al instante en celulares y computadores"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>En vivo</span>
          </div>

          {/* Botones de Descarga de Reportes con Logo Oficial CENFOL */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={handleQuickDownloadTithesPdf}
              disabled={isExportingQuick}
              title="Descargar Reporte Oficial de Diezmos en formato PDF con Logo CENFOL"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Diezmos</span>
            </button>
            <button
              onClick={handleQuickDownloadTithesExcel}
              disabled={isExportingQuick}
              title="Descargar Reporte Oficial de Diezmos en Excel (.xlsx) con Logo CENFOL"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Excel Diezmos</span>
            </button>

            {onSaveToSheets && (
              <button
                onClick={onSaveToSheets}
                disabled={isSyncingSheets}
                title="Guardar todos los registros de tesorería y diezmos directamente en Google Sheets"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isSyncingSheets ? 'Guardando...' : 'Guardar en Sheets'}</span>
              </button>
            )}

            <button
              onClick={() => setIsExportModalOpen(true)}
              title="Opciones avanzadas de reporte (filtros de fechas, ingresos o tesorería completa)"
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Opciones</span>
            </button>

            {onClearTreasury && (
              <button
                onClick={() => setShowClearModal(true)}
                title="Limpiar datos de diezmos o vaciar tesorería para nuevos ingresos"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-rose-700 hover:text-rose-800 hover:bg-rose-50 text-xs font-bold rounded-lg border border-rose-200 transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Limpiar Diezmos</span>
              </button>
            )}
          </div>

          <button
            onClick={() => openModal('ofrenda')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Ofrenda / Diezmo
          </button>
          <button
            onClick={() => openModal('gasto')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Registrar Gasto
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Recaudado</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-800 tracking-tight">
            {formatMoney(stats.totalIngresos)}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Diezmos + Ofrendas + Donaciones
          </div>
        </div>

        {/* Diezmos */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Diezmos</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-800 tracking-tight">
            {formatMoney(stats.totalDiezmos)}
          </div>
          <div className="text-[10px] text-slate-400">
            Aportes identificados de miembros
          </div>
        </div>

        {/* Egresos / Gastos */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Egresos / Gastos</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-800 tracking-tight">
            {formatMoney(stats.totalGastos)}
          </div>
          <div className="text-[10px] text-rose-600 font-medium">
            Pagos, servicios y suministros
          </div>
        </div>

        {/* Saldo Neto en Caja */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-300 text-xs font-medium">
            <span>Saldo Disponible en Caja</span>
            <div className="p-1.5 bg-white/10 text-emerald-400 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-emerald-400">
            {formatMoney(stats.saldoNeto)}
          </div>
          <div className="text-[10px] text-slate-300">
            Balance general actual
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por concepto, miembro o fecha..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Tipo:</span>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="Todos">Todos los movimientos ({records.length})</option>
            <option value="ofrenda">Ofrendas</option>
            <option value="diezmo">Diezmos</option>
            <option value="donacion">Donaciones</option>
            <option value="gasto">Gastos / Egresos</option>
          </select>
        </div>
      </div>

      {/* Tabla de Movimientos Financieros */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Concepto / Descripción</th>
                <th className="py-3 px-4">Miembro Asociado</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Registrado por</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-xs text-slate-700">El registro de diezmos y tesorería está limpio</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      No hay registros en la base de datos. Haz clic en <span className="font-semibold text-emerald-700">«Nueva Ofrenda / Diezmo»</span> para comenzar a ingresar los datos dominicales.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isExpense = r.type === 'gasto';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.date}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            r.type === 'diezmo'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : r.type === 'ofrenda'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : r.type === 'donacion'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {r.type === 'diezmo' && 'Diezmo'}
                          {r.type === 'ofrenda' && 'Ofrenda'}
                          {r.type === 'donacion' && 'Donación'}
                          {r.type === 'gasto' && 'Gasto'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-800 font-medium max-w-xs truncate">
                        {r.description}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {r.memberName ? (
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {r.memberName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">General / Anónimo</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <span className="text-[11px]">{r.paymentMethod}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {r.registeredBy}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                        <span className={isExpense ? 'text-rose-600' : 'text-emerald-700'}>
                          {isExpense ? '- ' : '+ '}
                          {formatMoney(r.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Eliminar este movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Movimiento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {type === 'gasto' ? 'Registrar Gasto o Salida' : 'Registrar Ingreso / Ofrenda'}
                </h3>
                <p className="text-xs text-slate-500">Tesorería de la Reunión Dominical</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Movimiento *
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['ofrenda', 'diezmo', 'donacion', 'gasto'] as TransactionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 text-[11px] font-bold rounded-lg border text-center transition-colors cursor-pointer capitalize ${
                        type === t
                          ? t === 'gasto'
                            ? 'bg-rose-50 border-rose-400 text-rose-700'
                            : 'bg-amber-50 border-amber-400 text-amber-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto flexible */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Valor / Monto * (Cualquier valor o formato)
                  </label>
                  {parseFlexibleAmount(amount) > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {formatMoney(parseFlexibleAmount(amount))}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ej: 50.000, 25.50, 100, etc."
                    className="w-full text-xs pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {/* Accesos rápidos de monto */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 mr-0.5">Sugeridos:</span>
                  {[10000, 20000, 50000, 100000, 200000, 500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val.toString())}
                      className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 rounded transition-colors cursor-pointer"
                    >
                      ${val.toLocaleString('es-CO')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha del Movimiento *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Miembro Asociado (Relevante para diezmos o donaciones) */}
              {type !== 'gasto' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Aportante (Para Diezmos o Donaciones)
                  </label>
                  <select
                    value={memberId}
                    onChange={(e) => {
                      setMemberId(e.target.value);
                      if (e.target.value) setCustomDonorName('');
                    }}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">-- Seleccionar de la lista de miembros --</option>
                    {members
                      .filter((m) => m.active)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.category})
                        </option>
                      ))}
                  </select>

                  {!memberId && (
                    <input
                      type="text"
                      value={customDonorName}
                      onChange={(e) => setCustomDonorName(e.target.value)}
                      placeholder="O escribir nombre del aportante (ej: Familia Gómez, Visita Carlos...)"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
                    />
                  )}
                  <p className="text-[10px] text-slate-400">
                    Si se deja en blanco se registrará como aporte anónimo o colecta general.
                  </p>
                </div>
              )}

              {/* Método de Pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Método de Pago / Recaudo
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="Efectivo">Efectivo en sobre / canastilla</option>
                  <option value="Transferencia">Transferencia Bancaria / Nequi / Daviplata</option>
                  <option value="Datafono">Datáfono / Tarjeta</option>
                  <option value="Otro">Otro medio</option>
                </select>
              </div>

              {/* Concepto / Descripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Concepto / Detalle (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    type === 'diezmo'
                      ? 'Opcional (se asigna automáticamente)'
                      : type === 'ofrenda'
                      ? 'Opcional (por defecto: Ofrenda culto dominical)'
                      : type === 'gasto'
                      ? 'Detalle del gasto...'
                      : 'Donación pro-templo'
                  }
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer ${
                    type === 'gasto'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal oficial de Descarga de Reportes de Diezmos y Tesorería */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reportType="diezmos"
        financialRecords={records}
        members={members}
        currentUserName={currentUserName}
      />

      {/* Modal de Confirmación para Limpiar Diezmos o Vaciar Tesorería */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Limpiar Registros de Tesorería</h3>
                <p className="text-xs text-slate-500">Dejar el módulo en blanco para nuevos registros</p>
              </div>
            </div>

            <div className="space-y-3 py-1 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Elige qué deseas eliminar de la base de datos:</p>
              
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                clearMode === 'diezmo' ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="clearOption"
                  checked={clearMode === 'diezmo'}
                  onChange={() => setClearMode('diezmo')}
                  className="mt-0.5 text-amber-600"
                />
                <div>
                  <span className="font-bold text-slate-800 block">Borrar solo los Diezmos</span>
                  <span className="text-[11px] text-slate-500">Elimina todos los diezmos registrados y los deja en cero. Mantiene los registros de ofrendas y gastos.</span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                clearMode === 'todos' ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="clearOption"
                  checked={clearMode === 'todos'}
                  onChange={() => setClearMode('todos')}
                  className="mt-0.5 text-rose-600"
                />
                <div>
                  <span className="font-bold text-slate-800 block">Borrar Todos los Movimientos (Vaciar todo)</span>
                  <span className="text-[11px] text-slate-500">Elimina diezmos, ofrendas, donaciones y egresos. Deja la tesorería completamente limpia en todos los dispositivos y Google Sheets.</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Limpiando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar y Limpiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
