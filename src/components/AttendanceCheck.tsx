/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Member, AttendanceRecord, MemberCategory } from '../types';
import { Calendar, CheckSquare, Square, Search, Filter, Save, Users, AlertCircle, Sparkles, FileSpreadsheet, RefreshCw, Check } from 'lucide-react';

interface AttendanceCheckProps {
  members: Member[];
  attendance: AttendanceRecord[];
  onSaveAttendance: (date: string, presentIds: string[]) => Promise<void> | void;
  onSaveToSheets?: () => Promise<void> | void;
  isSyncingSheets?: boolean;
}

export default function AttendanceCheck({ 
  members, 
  attendance, 
  onSaveAttendance,
  onSaveToSheets,
  isSyncingSheets = false
}: AttendanceCheckProps) {
  // Pre-calcular el domingo más reciente o el actual
  const defaultDateStr = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0: Domingo, 1: Lunes, ...
    
    // Restar días para llegar al domingo más cercano (si hoy es lunes, restar 1 día; si es domingo, restar 0)
    const sundayOffset = day === 0 ? 0 : day;
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - sundayOffset);
    
    const year = lastSunday.getFullYear();
    const month = String(lastSunday.getMonth() + 1).padStart(2, '0');
    const date = String(lastSunday.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(defaultDateStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Filtrar solo los miembros activos
  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);

  // Cargar registro de asistencia existente si ya fue tomado para esta fecha
  useEffect(() => {
    const existingRecord = attendance.find((r) => r.date === selectedDate);
    if (existingRecord) {
      setPresentIds(existingRecord.presentIds);
    } else {
      setPresentIds([]);
    }
  }, [selectedDate, attendance]);

  // Filtrado de los miembros activos en pantalla
  const filteredMembers = useMemo(() => {
    return activeMembers.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeMembers, searchTerm, selectedCategory]);

  const toggleMemberPresence = (id: string) => {
    setPresentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredMembers.map((m) => m.id);
    setPresentIds((prev) => {
      const otherIds = prev.filter((id) => !filteredIds.includes(id));
      return [...otherIds, ...filteredIds];
    });
  };

  const deselectAllFiltered = () => {
    const filteredIds = filteredMembers.map((m) => m.id);
    setPresentIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
  };

  const handleSave = async () => {
    setIsSavingLocal(true);
    try {
      await onSaveAttendance(selectedDate, presentIds);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3500);
    } finally {
      setIsSavingLocal(false);
    }
  };

  // Cálculo de totales actuales para la visualización del resumen de asistencia en vivo
  const liveSummary = useMemo(() => {
    const summary = { Hombres: 0, Mujeres: 0, Niños: 0, Niñas: 0 };
    presentIds.forEach((id) => {
      const member = activeMembers.find((m) => m.id === id);
      if (member && summary[member.category] !== undefined) {
        summary[member.category]++;
      }
    });
    return summary;
  }, [presentIds, activeMembers]);

  const totalPresent = presentIds.length;
  const totalActive = activeMembers.length;
  const attendancePercentage = totalActive > 0 ? Math.round((totalPresent / totalActive) * 100) : 0;

  // Verificar si la fecha seleccionada es un domingo
  const isSunday = useMemo(() => {
    if (!selectedDate) return false;
    // Añadimos 'T12:00:00' para evitar desfases de zona horaria al instanciar la fecha
    const dateObj = new Date(selectedDate + 'T12:00:00');
    return dateObj.getDay() === 0;
  }, [selectedDate]);

  return (
    <div className="space-y-6" id="attendance-check">
      {/* Selector de Fecha */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Tomar Asistencia</h2>
          <p className="text-xs text-slate-500">Selecciona la fecha y marca la asistencia de los asistentes dominicales</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Indicador de Transmisión en Tiempo Real */}
          <div 
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[11px] font-bold"
            title="Cualquier registro o cambio de asistencia se transmite de inmediato a todos los computadores y celulares conectados a la iglesia"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>En vivo en todos los dispositivos</span>
          </div>

          <div className="relative">
            <Calendar className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSavingLocal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
            title="Guardar asistencia y reflejar de inmediato en celulares y computadores"
          >
            {isSavingLocal ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : justSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200" />
                <span>¡Sincronizado!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Asistencia</span>
              </>
            )}
          </button>

          {onSaveToSheets && (
            <button
              onClick={onSaveToSheets}
              disabled={isSyncingSheets}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Guardar y exportar asistencia a Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isSyncingSheets ? 'Guardando en Sheets...' : 'Guardar en Sheets'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de no-domingo */}
      {!isSunday && selectedDate && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Nota:</strong> La fecha seleccionada no es un domingo. Tradicionalmente las reuniones se registran en los días domingo, pero puedes continuar si tienes reuniones especiales.
          </span>
        </div>
      )}

      {/* Estadísticas de asistencia en vivo de la fecha seleccionada */}
      <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total General */}
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm col-span-2 md:col-span-1 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Presentes</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{totalPresent}</span>
            <span className="text-xs text-slate-400">/ {totalActive} activos</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${attendancePercentage}%` }} />
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1">Suma el {attendancePercentage}% de asistencia</span>
        </div>

        {/* Hombres */}
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wide">Hombres</span>
          <span className="text-2xl font-bold text-slate-800 mt-1">{liveSummary.Hombres}</span>
          <span className="text-[10px] text-slate-400 font-medium">Asistentes varones</span>
        </div>

        {/* Mujeres */}
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">Mujeres</span>
          <span className="text-2xl font-bold text-slate-800 mt-1">{liveSummary.Mujeres}</span>
          <span className="text-[10px] text-slate-400 font-medium">Asistentes damas</span>
        </div>

        {/* Niños */}
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Niños</span>
          <span className="text-2xl font-bold text-slate-800 mt-1">{liveSummary.Niños}</span>
          <span className="text-[10px] text-slate-400 font-medium">Menores de edad varones</span>
        </div>

        {/* Niñas */}
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Niñas</span>
          <span className="text-2xl font-bold text-slate-800 mt-1">{liveSummary.Niñas}</span>
          <span className="text-[10px] text-slate-400 font-medium">Menores de edad hembras</span>
        </div>
      </div>

      {/* Buscador y Controles Rápidos */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Buscador en la lista de toma de asistencia */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre en la lista..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Selector rápido de categorías */}
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-transparent font-medium outline-none border-none py-1 cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="Hombres">Hombres</option>
            <option value="Mujeres">Mujeres</option>
            <option value="Niños">Niños</option>
            <option value="Niñas">Niñas</option>
          </select>
        </div>

        {/* Acciones por lote */}
        <div className="flex gap-2">
          <button
            onClick={selectAllFiltered}
            className="flex-1 md:flex-none text-center px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Marcar Todos
          </button>
          <button
            onClick={deselectAllFiltered}
            className="flex-1 md:flex-none text-center px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Desmarcar Todos
          </button>
        </div>
      </div>

      {/* Lista Checkable de Miembros */}
      {activeMembers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-100 shadow-sm">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium mb-1">No hay miembros activos registrados todavía.</p>
          <p className="text-xs text-slate-400">Por favor, registre personas en la pestaña "Directorio" primero.</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-100 shadow-sm text-slate-400 text-xs">
          No se encontraron personas con el filtro especificado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMembers.map((member) => {
            const isPresent = presentIds.includes(member.id);
            
            let categoryStyle = 'border-sky-100 bg-sky-50/10 text-sky-800';
            let dotColor = 'bg-sky-500';
            if (member.category === 'Mujeres') {
              categoryStyle = 'border-rose-100 bg-rose-50/10 text-rose-800';
              dotColor = 'bg-rose-500';
            } else if (member.category === 'Niños') {
              categoryStyle = 'border-indigo-100 bg-indigo-50/10 text-indigo-800';
              dotColor = 'bg-indigo-500';
            } else if (member.category === 'Niñas') {
              categoryStyle = 'border-amber-100 bg-amber-50/10 text-amber-800';
              dotColor = 'bg-amber-500';
            }

            return (
              <button
                key={member.id}
                onClick={() => toggleMemberPresence(member.id)}
                className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                  isPresent
                    ? 'border-emerald-500 bg-emerald-50/35 shadow-sm'
                    : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                {/* Checkbox Icon */}
                <div className="shrink-0">
                  {isPresent ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-100/10" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300" />
                  )}
                </div>

                {/* Detalles de la persona */}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold truncate text-xs ${isPresent ? 'text-emerald-950 font-bold' : 'text-slate-800'}`}>
                    {member.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${categoryStyle}`}>
                      <span className={`w-1 h-1 rounded-full ${dotColor}`} />
                      {member.category}
                    </span>
                    {member.phone && (
                      <span className="text-[9px] text-slate-400 font-medium truncate">
                        {member.phone}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Botón flotante inferior para guardar si hay cambios */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Sincronización en vivo activada: cada domingo guardado se actualiza en celulares y PC.</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onSaveToSheets && (
            <button
              onClick={onSaveToSheets}
              disabled={isSyncingSheets}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isSyncingSheets ? 'Guardando en Sheets...' : 'Guardar en Google Sheets'}</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSavingLocal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
          >
            {isSavingLocal ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Transmitiendo...</span>
              </>
            ) : justSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>¡Asistencia Guardada en Vivo!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Registro de Asistencia</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
