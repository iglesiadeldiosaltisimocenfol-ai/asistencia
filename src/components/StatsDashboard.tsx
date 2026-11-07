/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Member, AttendanceRecord, FinancialRecord, MemberCategory } from '../types';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  AlertTriangle, 
  Phone, 
  Mail, 
  Award, 
  Calendar, 
  Coins, 
  HeartHandshake, 
  TrendingUp, 
  Crown, 
  ArrowUpRight, 
  Wallet, 
  Sparkles, 
  CreditCard,
  Building,
  CheckCircle,
  BarChart3
} from 'lucide-react';

interface StatsDashboardProps {
  members: Member[];
  attendance: AttendanceRecord[];
  financialRecords?: FinancialRecord[];
  onSelectMember?: (member: Member) => void;
  canViewTithes?: boolean;
  userRole?: string;
}

export default function StatsDashboard({ 
  members, 
  attendance, 
  financialRecords = [], 
  onSelectMember,
  canViewTithes = true,
  userRole,
}: StatsDashboardProps) {
  const isLiderRole = Boolean(
    !canViewTithes ||
    userRole === 'lider_asistencia' ||
    (typeof userRole === 'string' && (
      userRole.toLowerCase().includes('lider') ||
      userRole.toLowerCase().includes('asistencia')
    ))
  );

  const effectiveCanViewTithes = canViewTithes && !isLiderRole;

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [activeTab, setActiveTab] = useState<'todos' | 'diezmos' | 'asistencia'>(() => {
    return effectiveCanViewTithes ? 'todos' : 'asistencia';
  });

  // Si el rol es líder de asistencia o no puede ver diezmos, forzar la pestaña de asistencia siempre
  React.useEffect(() => {
    if (!effectiveCanViewTithes && activeTab !== 'asistencia') {
      setActiveTab('asistencia');
    }
  }, [effectiveCanViewTithes, activeTab]);

  // Formateador oficial de moneda en pesos colombianos (COP)
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Lista de meses disponibles tanto en asistencias como en finanzas y hoy
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const today = new Date();
    months.add(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    
    attendance.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        months.add(r.date.substring(0, 7));
      }
    });

    (financialRecords || []).forEach((r) => {
      if (r.date && r.date.length >= 7) {
        months.add(r.date.substring(0, 7));
      }
    });
    
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [attendance, financialRecords]);

  // Nombre legible del mes seleccionado
  const selectedMonthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 2);
    const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selectedMonth]);

  // ==========================================
  // 1. ESTADÍSTICAS DE DIEZMOS Y MAYOR APORTANTE
  // ==========================================

  // Todos los diezmos históricos
  const allTithes = useMemo(() => {
    return (financialRecords || []).filter((r) => r.type === 'diezmo');
  }, [financialRecords]);

  // Diezmos correspondientes al mes seleccionado
  const selectedMonthTithes = useMemo(() => {
    return allTithes.filter((r) => r.date.startsWith(selectedMonth));
  }, [allTithes, selectedMonth]);

  // Total recaudado en diezmos en el mes seleccionado
  const totalTithesSelectedMonth = useMemo(() => {
    return selectedMonthTithes.reduce((sum, r) => sum + r.amount, 0);
  }, [selectedMonthTithes]);

  // Interfaz para el resumen por aportante
  interface TitherStat {
    key: string;
    memberId?: string;
    name: string;
    category?: MemberCategory;
    phone?: string;
    email?: string;
    totalAmount: number;
    count: number;
    percentage: number;
    paymentMethods: string[];
    memberObj?: Member;
  }

  // Agrupar los diezmos del mes por cada persona
  const tithersSelectedMonth = useMemo<TitherStat[]>(() => {
    if (selectedMonthTithes.length === 0) return [];

    const map = new Map<string, {
      name: string;
      memberId?: string;
      totalAmount: number;
      count: number;
      paymentMethods: Set<string>;
    }>();

    selectedMonthTithes.forEach((r) => {
      // Clave única: preferir memberId si existe, sino el nombre normalizado
      const key = r.memberId 
        ? `id_${r.memberId}` 
        : `name_${(r.memberName || 'General / Anónimo').trim().toLowerCase()}`;
      
      const displayName = r.memberName || 'Miembro General';
      
      const existing = map.get(key) || {
        name: displayName,
        memberId: r.memberId,
        totalAmount: 0,
        count: 0,
        paymentMethods: new Set<string>(),
      };

      existing.totalAmount += r.amount;
      existing.count += 1;
      if (r.paymentMethod) existing.paymentMethods.add(r.paymentMethod);
      if (r.memberId && !existing.memberId) existing.memberId = r.memberId;
      if (r.memberName && existing.name === 'Miembro General') existing.name = r.memberName;

      map.set(key, existing);
    });

    const totalMonth = totalTithesSelectedMonth || 1;

    const list: TitherStat[] = Array.from(map.entries()).map(([key, item]) => {
      // Buscar información del miembro en la lista de la iglesia
      let foundMember = item.memberId 
        ? members.find((m) => m.id === item.memberId) 
        : undefined;

      if (!foundMember) {
        foundMember = members.find(
          (m) => m.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );
      }

      return {
        key,
        memberId: item.memberId || foundMember?.id,
        name: foundMember ? foundMember.name : item.name,
        category: foundMember?.category,
        phone: foundMember?.phone,
        email: foundMember?.email,
        totalAmount: item.totalAmount,
        count: item.count,
        percentage: Math.round((item.totalAmount / totalMonth) * 100),
        paymentMethods: Array.from(item.paymentMethods),
        memberObj: foundMember,
      };
    });

    // Ordenar de mayor a menor monto diezmado en el mes
    return list.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [selectedMonthTithes, totalTithesSelectedMonth, members]);

  // Persona que más diezma en el mes seleccionado
  const topTitherSelectedMonth = useMemo<TitherStat | null>(() => {
    return tithersSelectedMonth.length > 0 ? tithersSelectedMonth[0] : null;
  }, [tithersSelectedMonth]);

  // Promedio de diezmo por cada aportante en el mes
  const averageTithePerMember = useMemo(() => {
    if (tithersSelectedMonth.length === 0) return 0;
    return Math.round(totalTithesSelectedMonth / tithersSelectedMonth.length);
  }, [totalTithesSelectedMonth, tithersSelectedMonth]);

  // Historial mensual de diezmos para comparativa entre meses
  const monthlyTithesHistory = useMemo(() => {
    const monthMap = new Map<string, { 
      total: number; 
      count: number; 
      tithersMap: Map<string, { name: string; amount: number }>;
    }>();

    allTithes.forEach((r) => {
      if (!r.date || r.date.length < 7) return;
      const mKey = r.date.substring(0, 7);
      const existing = monthMap.get(mKey) || {
        total: 0,
        count: 0,
        tithersMap: new Map(),
      };

      existing.total += r.amount;
      existing.count += 1;

      const tKey = r.memberId 
        ? `id_${r.memberId}` 
        : `name_${(r.memberName || 'General').trim().toLowerCase()}`;
      
      const currentPerson = existing.tithersMap.get(tKey) || { 
        name: r.memberName || 'Miembro General', 
        amount: 0 
      };
      currentPerson.amount += r.amount;
      if (r.memberName) currentPerson.name = r.memberName;
      existing.tithersMap.set(tKey, currentPerson);

      monthMap.set(mKey, existing);
    });

    return Array.from(monthMap.entries())
      .map(([mKey, data]) => {
        let topName = 'Sin registro';
        let topAmount = 0;
        data.tithersMap.forEach((person) => {
          if (person.amount > topAmount) {
            topAmount = person.amount;
            topName = person.name;
          }
        });

        const [y, m] = mKey.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, 2);
        const label = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        return {
          monthKey: mKey,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          total: data.total,
          count: data.count,
          distinctTithers: data.tithersMap.size,
          topTitherName: topName,
          topTitherAmount: topAmount,
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allTithes]);

  // ==========================================
  // 2. ESTADÍSTICAS DE ASISTENCIA Y CONGREGACIÓN
  // ==========================================

  const activeMembers = useMemo(() => members.filter(m => m.active), [members]);
  const inactiveMembers = useMemo(() => members.filter(m => !m.active), [members]);

  const categoryCounts = useMemo(() => {
    const counts = { Hombres: 0, Mujeres: 0, Niños: 0, Niñas: 0 };
    activeMembers.forEach((m) => {
      if (counts[m.category] !== undefined) {
        counts[m.category]++;
      }
    });
    return counts;
  }, [activeMembers]);

  const selectedMonthRecords = useMemo(() => {
    return attendance.filter(r => r.date && r.date.startsWith(selectedMonth));
  }, [attendance, selectedMonth]);

  const avgAttendanceSelectedMonth = useMemo(() => {
    if (selectedMonthRecords.length === 0) return 0;
    const total = selectedMonthRecords.reduce((sum, r) => sum + r.presentIds.length, 0);
    return Math.round(total / selectedMonthRecords.length);
  }, [selectedMonthRecords]);

  const categoryAttendanceStats = useMemo(() => {
    const totals = { Hombres: 0, Mujeres: 0, Niños: 0, Niñas: 0 };
    let totalAssistance = 0;

    selectedMonthRecords.forEach((record) => {
      record.presentIds.forEach((id) => {
        const member = activeMembers.find(m => m.id === id);
        if (member && totals[member.category] !== undefined) {
          totals[member.category]++;
          totalAssistance++;
        }
      });
    });

    const sundaysCount = selectedMonthRecords.length || 1;
    const averages = {
      Hombres: Math.round(totals.Hombres / sundaysCount),
      Mujeres: Math.round(totals.Mujeres / sundaysCount),
      Niños: Math.round(totals.Niños / sundaysCount),
      Niñas: Math.round(totals.Niñas / sundaysCount),
    };

    let maxCategory: MemberCategory = 'Hombres';
    let maxVal = -1;
    (Object.keys(averages) as MemberCategory[]).forEach((cat) => {
      if (averages[cat] > maxVal) {
        maxVal = averages[cat];
        maxCategory = cat;
      }
    });

    return {
      averages,
      totalAssistance,
      maxCategory,
      maxVal,
    };
  }, [selectedMonthRecords, activeMembers]);

  const absenceAlerts = useMemo(() => {
    if (selectedMonthRecords.length < 3) return [];
    
    const totalSundaysInMonth = selectedMonthRecords.length;
    
    return activeMembers.map((member) => {
      let attendedCount = 0;
      selectedMonthRecords.forEach((record) => {
        if (record.presentIds.includes(member.id)) {
          attendedCount++;
        }
      });

      const absences = totalSundaysInMonth - attendedCount;
      return {
        member,
        absences,
        attendedCount,
        totalSundays: totalSundaysInMonth,
      };
    }).filter((item) => item.absences >= 3)
      .sort((a, b) => b.absences - a.absences);
  }, [selectedMonthRecords, activeMembers]);

  const recentTrends = useMemo(() => {
    const sorted = [...attendance].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-6);
  }, [attendance]);

  const maxTrendAttendance = useMemo(() => {
    if (recentTrends.length === 0) return 10;
    const max = Math.max(...recentTrends.map((r) => r.presentIds.length));
    return max === 0 ? 10 : Math.ceil(max * 1.2);
  }, [recentTrends]);

  return (
    <div className="space-y-8" id="stats-dashboard">
      {/* Barra Superior con Selector de Mes y Filtro de Vistas */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Panel Estadístico de Asistencia</span>
          </h2>
          <p className="text-xs text-slate-500">
            {effectiveCanViewTithes 
              ? 'Métricas de asistencia dominical y fidelidad en diezmos por meses'
              : 'Métricas de asistencia dominical, demografía y alertas de inasistencias por meses'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Sub-pestañas para alternar fácilmente (Ocultas para rol Líder de Asistencia) */}
          {effectiveCanViewTithes && (
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('todos')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'todos' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setActiveTab('diezmos')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'diezmos' 
                    ? 'bg-amber-500 text-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Diezmos por Mes</span>
              </button>
              <button
                onClick={() => setActiveTab('asistencia')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'asistencia' 
                    ? 'bg-emerald-600 text-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Asistencia</span>
              </button>
            </div>
          )}

          {/* Selector de Mes Activo */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer text-xs"
              title="Selecciona el mes a consultar"
            >
              {availableMonths.map((m) => {
                const [year, month] = m.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, 2);
                const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                return (
                  <option key={m} value={m}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECCIÓN PRINCIPAL DE DIEZMOS POR MES Y MAYOR APORTANTE          */}
      {/* Estrictamente excluida y nunca renderizada en Líder Asistencia */}
      {/* ============================================================== */}
      {effectiveCanViewTithes && (activeTab === 'todos' || activeTab === 'diezmos') && (
        <section className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>Estadísticas de Diezmo en {selectedMonthLabel}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Análisis de fidelidad financiera y persona con mayor aporte en el mes
              </p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full self-start sm:self-auto">
              Total Mes: {formatMoney(totalTithesSelectedMonth)}
            </span>
          </div>

          {/* Tarjeta Destacada: LA PERSONA QUE MÁS DIEZMA EN EL MES */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-2xl p-6 sm:p-7 shadow-md">
            {/* Adorno visual de fondo */}
            <div className="absolute -right-6 -bottom-6 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute right-6 top-6 text-amber-200/20 pointer-events-none">
              <Crown className="w-28 h-28" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Información del Mayor Diezmante */}
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-extrabold tracking-wide uppercase shadow-2xs">
                  <Crown className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                  <span>Persona que más diezma en {selectedMonthLabel}</span>
                </div>

                {topTitherSelectedMonth ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-white text-amber-700 font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0">
                        {topTitherSelectedMonth.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 
                          onClick={() => topTitherSelectedMonth.memberObj && onSelectMember && onSelectMember(topTitherSelectedMonth.memberObj)}
                          className={`text-2xl font-black tracking-tight leading-tight ${topTitherSelectedMonth.memberObj ? 'hover:underline cursor-pointer' : ''}`}
                          title={topTitherSelectedMonth.memberObj ? 'Ver ficha de miembro en el directorio' : ''}
                        >
                          {topTitherSelectedMonth.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {topTitherSelectedMonth.category && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white">
                              {topTitherSelectedMonth.category}
                            </span>
                          )}
                          <span className="text-xs text-amber-100 font-medium">
                            {topTitherSelectedMonth.count} aporte{topTitherSelectedMonth.count > 1 ? 's' : ''} registrado{topTitherSelectedMonth.count > 1 ? 's' : ''} este mes
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-amber-100 leading-relaxed pt-1">
                      Con un aporte acumulado de <span className="font-bold text-white">{formatMoney(topTitherSelectedMonth.totalAmount)}</span>, representa el <span className="font-bold text-white">{topTitherSelectedMonth.percentage}%</span> de todos los diezmos recibidos en {selectedMonthLabel}.
                    </p>
                  </div>
                ) : (
                  <div className="py-2 space-y-1">
                    <h4 className="text-xl font-bold">Sin Diezmos Registrados en {selectedMonthLabel}</h4>
                    <p className="text-xs text-amber-100 max-w-md">
                      Aún no se han ingresado registros de diezmo para este mes. Cuando registres los aportes dominicales en el módulo de Tesorería, aquí aparecerá automáticamente el mayor aportante.
                    </p>
                  </div>
                )}
              </div>

              {/* Estadísticas numéricas y Botones pastorales */}
              {topTitherSelectedMonth ? (
                <div className="bg-amber-900/40 backdrop-blur-xs p-5 rounded-xl border border-white/15 flex flex-col sm:flex-row lg:flex-col justify-between items-start sm:items-center lg:items-end gap-4 min-w-[240px]">
                  <div className="text-left sm:text-right lg:text-right">
                    <span className="text-[11px] uppercase tracking-wider text-amber-200 font-bold block">
                      Total Diezmado en el Mes
                    </span>
                    <span className="text-3xl font-black text-white tracking-tight">
                      {formatMoney(topTitherSelectedMonth.totalAmount)}
                    </span>
                    <span className="text-[11px] text-amber-200 block mt-0.5 font-medium">
                      Método: {topTitherSelectedMonth.paymentMethods.join(', ') || 'Efectivo'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {topTitherSelectedMonth.phone && (
                      <a
                        href={`https://wa.me/${topTitherSelectedMonth.phone.replace(/[^0-9]/g, '')}?text=Apreciado/a%20${encodeURIComponent(topTitherSelectedMonth.name)},%20te%20saludamos%20con%20afecto%20desde%20la%20iglesia%20CENFOL.%20Queremos%20agradecerte%20de%20todo%20coraz%C3%B3n%20por%20tu%20fidelidad%20y%20compromiso%20con%20la%20obra%20del%20Se%C3%B1or%20durante%20este%20mes.%20%C2%A1Que%20Dios%20siga%20multiplicando%20tus%20bendiciones!`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                        title="Enviar mensaje pastoral de agradecimiento por WhatsApp"
                      >
                        <HeartHandshake className="w-3.5 h-3.5" />
                        <span>Agradecer WhatsApp</span>
                      </a>
                    )}
                    {topTitherSelectedMonth.memberObj && (
                      <button
                        onClick={() => onSelectMember && onSelectMember(topTitherSelectedMonth.memberObj!)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                        title="Ver ficha completa en el Directorio"
                      >
                        <span>Ver Miembro</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Cuadrícula de Métricas de Diezmo del Mes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Diezmos del Mes</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-amber-900 tracking-tight">
                {formatMoney(totalTithesSelectedMonth)}
              </div>
              <div className="text-[10px] text-amber-700 font-medium">
                Recaudación exclusiva en diezmos
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Miembros Diezmantes</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-800 tracking-tight">
                {tithersSelectedMonth.length} <span className="text-xs font-normal text-slate-400">personas</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-medium">
                Aportantes distintos identificados
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Promedio por Aportante</span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-800 tracking-tight">
                {formatMoney(averageTithePerMember)}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Aporte medio por miembro activo
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Transacciones en el Mes</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-800 tracking-tight">
                {selectedMonthTithes.length} <span className="text-xs font-normal text-slate-400">entregas</span>
              </div>
              <div className="text-[10px] text-purple-700 font-medium">
                Sobres o transferencias recibidas
              </div>
            </div>
          </div>

          {/* Tabla de Ranking de Diezmantes del Mes y Comparativa Histórica */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista y Ranking de Diezmantes del Mes Seleccionado (2 columnas) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Ranking de Aportantes en {selectedMonthLabel}</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Detalle ordenado de mayor a menor según el monto diezmado
                  </p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  {tithersSelectedMonth.length} aportante{tithersSelectedMonth.length !== 1 ? 's' : ''}
                </span>
              </div>

              {tithersSelectedMonth.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                  <Coins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No hay diezmos registrados para {selectedMonthLabel}</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Los aportes registrados en el módulo de Tesorería se clasificarán automáticamente aquí por mes y aportante.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                        <th className="py-3 px-3 text-center">#</th>
                        <th className="py-3 px-3">Miembro Aportante</th>
                        <th className="py-3 px-3">Grupo</th>
                        <th className="py-3 px-3 text-right">Monto Diezmado</th>
                        <th className="py-3 px-3 text-center">% Mes</th>
                        <th className="py-3 px-3">Método</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {tithersSelectedMonth.map((tither, index) => {
                        const isTop = index === 0;

                        return (
                          <tr 
                            key={tither.key}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isTop ? 'bg-amber-50/40 font-semibold' : ''
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              {isTop ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-black text-[11px] shadow-2xs">
                                  👑
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                                  {index + 1}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex flex-col">
                                <button
                                  onClick={() => tither.memberObj && onSelectMember && onSelectMember(tither.memberObj)}
                                  className={`text-left font-bold ${
                                    isTop ? 'text-amber-900 font-extrabold' : 'text-slate-800'
                                  } ${tither.memberObj ? 'hover:text-emerald-700 cursor-pointer' : ''}`}
                                >
                                  {tither.name}
                                </button>
                                <span className="text-[10px] text-slate-400">
                                  {tither.count} aporte{tither.count > 1 ? 's' : ''} registrado{tither.count > 1 ? 's' : ''}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              {tither.category ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tither.category === 'Hombres' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                                  tither.category === 'Mujeres' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                  tither.category === 'Niños' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                  'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {tither.category}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">General</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap text-slate-800">
                              <span className={isTop ? 'text-amber-800 text-sm' : ''}>
                                {formatMoney(tither.totalAmount)}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${isTop ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, tither.percentage)}%` }}
                                  />
                                </div>
                                <span className="font-bold text-[10px] text-slate-600">
                                  {tither.percentage}%
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-500">
                              {tither.paymentMethods.join(', ') || 'Efectivo'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Comparativa Histórica de Diezmos por Mes (1 columna) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Historial de Diezmos por Mes</span>
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Evolución mensual y mayor diezmante de cada período
                </p>

                {monthlyTithesHistory.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    No hay histórico de diezmos disponible aún.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {monthlyTithesHistory.slice(0, 6).map((monthItem) => {
                      const isSelected = monthItem.monthKey === selectedMonth;

                      return (
                        <div
                          key={monthItem.monthKey}
                          onClick={() => setSelectedMonth(monthItem.monthKey)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                              : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-800">{monthItem.label}</span>
                            <span className="font-mono font-extrabold text-amber-800">
                              {formatMoney(monthItem.total)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                            <div className="flex items-center gap-1 truncate max-w-[170px]" title={monthItem.topTitherName}>
                              <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate font-medium text-slate-700">
                                {monthItem.topTitherName}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {monthItem.distinctTithers} aportante{monthItem.distinctTithers !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 text-center">
                <span className="text-[10px] text-slate-400">
                  Toca cualquier mes para consultar su ranking y detalles
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* SECCIÓN DE ASISTENCIA Y CONGREGACIÓN                            */}
      {/* ============================================================== */}
      {(activeTab === 'todos' || activeTab === 'asistencia') && (
        <section className="space-y-6 pt-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Asistencia y Demografía en {selectedMonthLabel}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Presencia dominical, distribución por grupos y alertas de inasistencia
              </p>
            </div>
          </div>

          {/* Tarjetas Informativas Generales (Bento-Grid de Asistencia) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Miembros Activos</p>
                <h3 className="text-2xl font-bold text-slate-800">{activeMembers.length}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Asistencia Promedio</p>
                <h3 className="text-2xl font-bold text-slate-800">
                  {avgAttendanceSelectedMonth} <span className="text-xs font-normal text-slate-400">pers.</span>
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Categoría Más Frecuente</p>
                <h3 className="text-lg font-bold text-slate-800">
                  {categoryAttendanceStats.totalAssistance > 0 ? categoryAttendanceStats.maxCategory : 'Ninguna'}
                </h3>
                <p className="text-[10px] text-amber-600 font-medium">
                  Prom: {categoryAttendanceStats.maxVal} pers / domingo
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Alertas de Inasistencia (3+)</p>
                <h3 className="text-2xl font-bold text-slate-800">{absenceAlerts.length}</h3>
              </div>
            </div>
          </div>

          {/* Gráficos de Estadísticas de Asistencia */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Desglose por Género y Edad (Categorías) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Distribución y Asistencia por Categoría</h3>
                <p className="text-xs text-slate-400 mb-6">Promedio de asistentes por domingo en este mes</p>
              </div>
              
              <div className="space-y-5">
                {(['Hombres', 'Mujeres', 'Niños', 'Niñas'] as MemberCategory[]).map((cat) => {
                  const activeCount = members.filter(m => m.active && m.category === cat).length;
                  const avg = categoryAttendanceStats.averages[cat] || 0;
                  const percentage = activeCount > 0 ? Math.round((avg / activeCount) * 100) : 0;
                  
                  let barColor = 'bg-sky-500';
                  let badgeBg = 'bg-sky-50 text-sky-700';
                  if (cat === 'Mujeres') {
                    barColor = 'bg-rose-500';
                    badgeBg = 'bg-rose-50 text-rose-700';
                  } else if (cat === 'Niños') {
                    barColor = 'bg-indigo-500';
                    badgeBg = 'bg-indigo-50 text-indigo-700';
                  } else if (cat === 'Niñas') {
                    barColor = 'bg-amber-500';
                    badgeBg = 'bg-amber-50 text-amber-700';
                  }

                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-700">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeBg}`}>
                            {avg} presentes / {activeCount} inscritos
                          </span>
                          <span className="font-bold text-slate-700 w-8 text-right">{percentage}%</span>
                        </div>
                      </div>
                      
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 mt-6 border-t border-slate-50 flex justify-between text-xs text-slate-500">
                <span>Total Miembros en Sistema: {members.length}</span>
                <span>Inactivos: {inactiveMembers.length}</span>
              </div>
            </div>

            {/* Gráfico de Línea de Tendencia (Últimos domingos registrados) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Tendencia de Asistencia</h3>
                <p className="text-xs text-slate-400 mb-6">Comportamiento en las últimas reuniones dominicales</p>
              </div>

              {recentTrends.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No hay suficientes datos de asistencia registrados
                </div>
              ) : (
                <div className="relative w-full h-48">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
                    <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="70" x2="480" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="170" x2="480" y2="170" stroke="#f8fafc" strokeWidth="1.5" />

                    <text x="15" y="24" className="text-[10px] fill-slate-400 font-medium">{maxTrendAttendance}</text>
                    <text x="15" y="74" className="text-[10px] fill-slate-400 font-medium">{Math.round(maxTrendAttendance / 2)}</text>
                    <text x="15" y="124" className="text-[10px] fill-slate-400 font-medium">{Math.round(maxTrendAttendance / 4)}</text>
                    <text x="15" y="174" className="text-[10px] fill-slate-400 font-medium">0</text>

                    {(() => {
                      const paddingLeft = 60;
                      const paddingRight = 440;
                      const stepX = recentTrends.length > 1 ? (paddingRight - paddingLeft) / (recentTrends.length - 1) : 0;
                      
                      const points = recentTrends.map((r, idx) => {
                        const x = paddingLeft + idx * stepX;
                        const val = r.presentIds.length;
                        const y = 170 - (val / maxTrendAttendance) * 150;
                        return { x, y, val, date: r.date };
                      });

                      const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaPath = points.length > 0 
                        ? `${linePath} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z` 
                        : '';

                      return (
                        <>
                          <defs>
                            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {areaPath && <path d={areaPath} fill="url(#trendGradient)" />}

                          <path
                            d={linePath}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {points.map((p, idx) => (
                            <g key={idx} className="group cursor-pointer">
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="5"
                                className="fill-white stroke-emerald-500 stroke-[3px] hover:r-7 transition-all duration-150"
                              />
                              <rect
                                x={p.x - 14}
                                y={p.y - 25}
                                width="28"
                                height="16"
                                rx="4"
                                className="fill-slate-800 opacity-80"
                              />
                              <text
                                x={p.x}
                                y={p.y - 14}
                                textAnchor="middle"
                                className="text-[9px] fill-white font-bold"
                              >
                                {p.val}
                              </text>
                              <text
                                x={p.x}
                                y="192"
                                textAnchor="middle"
                                className="text-[9px] fill-slate-500 font-medium"
                              >
                                {(() => {
                                  const [, mStr, dStr] = p.date.split('-');
                                  return `${dStr}/${mStr}`;
                                })()}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Alertas de Inasistencia Crítica (3+ veces en el mes) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Alerta de Inasistencia Crítica (3+ faltas en el mes)
                </h3>
                <p className="text-xs text-slate-400">
                  Miembros activos que han faltado 3 o más domingos durante {selectedMonthLabel}
                </p>
              </div>
              <span className="bg-rose-50 text-rose-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {absenceAlerts.length} personas
              </span>
            </div>

            {absenceAlerts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-100">
                <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">¡Felicidades! Ningún miembro tiene alertas de inasistencia en este mes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-4">Miembro</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Inasistencias este mes</th>
                      <th className="py-3 px-4">Contacto</th>
                      <th className="py-3 px-4 text-right">Acción de Seguimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absenceAlerts.map(({ member, absences, attendedCount, totalSundays }) => (
                      <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs text-slate-600">
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => onSelectMember && onSelectMember(member)}
                            className="font-semibold text-slate-800 hover:text-emerald-600 text-left cursor-pointer focus:outline-none"
                          >
                            {member.name}
                          </button>
                          <div className="text-[10px] text-slate-400 font-medium">{member.email || 'Sin correo electrónico'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            member.category === 'Hombres' ? 'bg-sky-50 text-sky-700' :
                            member.category === 'Mujeres' ? 'bg-rose-50 text-rose-700' :
                            member.category === 'Niños' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {member.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                              {absences} de {totalSundays}
                            </span>
                            <span className="text-[10px] text-slate-400">(Asistió {attendedCount} veces)</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-medium">
                              <Phone className="w-3 h-3 text-slate-400" /> {member.phone || 'No registrado'}
                            </div>
                            {member.address && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {member.address}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            {member.phone && (
                              <a
                                href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(member.name)},%20te%20escribimos%20de%20la%20iglesia%20porque%20te%20hemos%20extra%C3%B1ado%20en%20las%20reuniones%20dominicales.%20%C2%BFC%C3%B3mo%20est%C3%A1s?`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors"
                              >
                                Escribir WhatsApp
                              </a>
                            )}
                            {member.email && (
                              <a
                                href={`mailto:${member.email}?subject=Te%20extra%C3%B1amos%20en%20la%20Reuni%C3%B3n%20Dominical&body=Hola%20${encodeURIComponent(member.name)},%20esperamos%20que%20te%20encuentres%20muy%20bien.%20Te%20escribimos%20de%20la%20asistencia%20dominical%20porque%20notamos%20que%20no%20has%20podido%20acompa%C3%B1arnos%20en%20las%20%C3%BAltimas%20semanas%20y%20queremos%20saber%20si%20est%C3%A1s%20bien%20o%20si%20necesitas%20oraci%C3%B3n%20o%20apoyo.%20%C2%A1Esperamos%20verte%20pronto!`}
                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors"
                              >
                                <Mail className="w-3 h-3" /> Enviar Correo
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
