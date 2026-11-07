/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member, AttendanceRecord, MemberCategory } from '../types';
import { Search, Filter, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, UserPlus, Phone, MapPin, Mail, Calendar, FileText, Table, Download, FileSpreadsheet } from 'lucide-react';
import ReportExportModal from './ReportExportModal';
import { exportMembersToPdf, exportMembersToExcel } from '../utils/memberReports';

interface MemberListProps {
  members: Member[];
  attendance: AttendanceRecord[];
  onAddMemberClick: () => void;
  onEditMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onToggleActive: (id: string) => void;
  readOnly?: boolean;
  currentUserName?: string;
  userRole?: string;
  onSaveToSheets?: () => Promise<void> | void;
  isSyncingSheets?: boolean;
}

export default function MemberList({
  members,
  attendance,
  onAddMemberClick,
  onEditMember,
  onDeleteMember,
  onToggleActive,
  readOnly = false,
  currentUserName = 'Líder CENFOL',
  userRole = 'Administrador',
  onSaveToSheets,
  isSyncingSheets = false,
}: MemberListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingQuick, setIsExportingQuick] = useState(false);

  const handleQuickDownloadMembersPdf = async () => {
    setIsExportingQuick(true);
    try {
      await exportMembersToPdf({
        members,
        attendance,
        generatedBy: currentUserName,
        userRole,
        categoryFilter: selectedCategory,
        statusFilter: selectedStatus,
        searchTerm,
      });
    } catch (e) {
      console.error(e);
      alert('Error generando PDF del directorio.');
    } finally {
      setIsExportingQuick(false);
    }
  };

  const handleQuickDownloadMembersExcel = async () => {
    setIsExportingQuick(true);
    try {
      await exportMembersToExcel({
        members,
        attendance,
        generatedBy: currentUserName,
        userRole,
        categoryFilter: selectedCategory,
        statusFilter: selectedStatus,
        searchTerm,
      });
    } catch (e) {
      console.error(e);
      alert('Error generando Excel del directorio.');
    } finally {
      setIsExportingQuick(false);
    }
  };

  // Mes actual para calcular inasistencias (formato YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  // Calcular inasistencias del mes actual para todos los miembros
  const currentMonthAbsences = useMemo(() => {
    const monthRecords = attendance.filter((r) => r.date.startsWith(currentMonthStr));
    const totalRecordsCount = monthRecords.length;

    const map = new Map<string, { absences: number; attended: number; total: number }>();

    members.forEach((member) => {
      let attendedCount = 0;
      monthRecords.forEach((record) => {
        if (record.presentIds.includes(member.id)) {
          attendedCount++;
        }
      });
      const absencesCount = totalRecordsCount - attendedCount;
      map.set(member.id, {
        absences: absencesCount,
        attended: attendedCount,
        total: totalRecordsCount,
      });
    });

    return map;
  }, [attendance, members, currentMonthStr]);

  // Filtrado de miembros
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.address.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'Todos' || m.category === selectedCategory;
      const matchesStatus =
        selectedStatus === 'Todos' ||
        (selectedStatus === 'Activos' && m.active) ||
        (selectedStatus === 'Inactivos' && !m.active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [members, searchTerm, selectedCategory, selectedStatus]);

  const handleDelete = (member: Member) => {
    const confirmed = window.confirm(
      `¿Está completamente seguro de eliminar a "${member.name}"? Se borrarán sus datos personales de forma permanente.`
    );
    if (confirmed) {
      onDeleteMember(member.id);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" id="member-list">
      {/* Cabecera y botón de crear */}
      <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">Directorio de Personas</h2>
            {readOnly && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md">
                Modo Consulta (Tesorero)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {readOnly
              ? 'Consulta información y contactos de miembros para vinculación con diezmos y donaciones'
              : 'Administra los datos personales de hombres, mujeres, niños y niñas'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Indicador en tiempo real */}
          <div 
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-[11px] font-bold"
            title="Cualquier persona que registres o modifiques se actualiza al instante en todos los celulares y computadores"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>En vivo</span>
          </div>

          {/* Botones de Descarga de Directorio con Logo Oficial CENFOL */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={handleQuickDownloadMembersPdf}
              disabled={isExportingQuick}
              title="Descargar Directorio de Personas en PDF con Logo Oficial CENFOL"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Directorio</span>
            </button>
            <button
              onClick={handleQuickDownloadMembersExcel}
              disabled={isExportingQuick}
              title="Descargar Directorio de Personas en Excel (.xlsx) con Logo Oficial CENFOL"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Excel Directorio</span>
            </button>

            {onSaveToSheets && (
              <button
                onClick={onSaveToSheets}
                disabled={isSyncingSheets}
                title="Guardar todos los miembros registrados en Google Sheets"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isSyncingSheets ? 'Guardando...' : 'Guardar en Sheets'}</span>
              </button>
            )}

            <button
              onClick={() => setIsExportModalOpen(true)}
              title="Opciones avanzadas y filtros para exportar el directorio"
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Opciones</span>
            </button>
          </div>

          {!readOnly && (
            <button
              onClick={onAddMemberClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Registrar Persona
            </button>
          )}
        </div>
      </div>

      {/* Buscador y filtros */}
      <div className="p-4 bg-slate-50/50 border-b border-slate-50 grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Input de búsqueda */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, celular, correo o dirección..."
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Filtro de Categoría */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-600 font-medium outline-none border-none py-1 cursor-pointer"
          >
            <option value="Todos">Todas las categorías</option>
            <option value="Hombres">Hombres</option>
            <option value="Mujeres">Mujeres</option>
            <option value="Niños">Niños</option>
            <option value="Niñas">Niñas</option>
          </select>
        </div>

        {/* Filtro de Estado */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
          <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-600 font-medium outline-none border-none py-1 cursor-pointer"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activos">Solo Activos</option>
            <option value="Inactivos">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* Lista de Miembros en Tabla Responsiva */}
      {filteredMembers.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm text-slate-400 font-medium">No se encontraron personas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 bg-slate-50/30">
                <th className="py-3 px-6">Información Personal</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Inasistencias (Este Mes)</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const absencesInfo = currentMonthAbsences.get(member.id);
                const hasWarning = absencesInfo && absencesInfo.absences >= 3 && absencesInfo.total >= 3 && member.active;

                return (
                  <tr
                    key={member.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs text-slate-600 ${
                      hasWarning ? 'bg-amber-50/10' : ''
                    }`}
                  >
                    {/* Información Personal */}
                    <td className="py-4 px-6 max-w-[280px]">
                      <div className="font-semibold text-slate-800 text-sm mb-1">{member.name}</div>
                      <div className="space-y-1 text-[11px] text-slate-500">
                        {member.phone && (
                          <div className="flex items-center gap-1.5 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        )}
                        {member.address && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{member.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          <span>Registrado: {member.createdAt}</span>
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide ${
                          member.category === 'Hombres' ? 'bg-sky-50 text-sky-700' :
                          member.category === 'Mujeres' ? 'bg-rose-50 text-rose-700' :
                          member.category === 'Niños' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {member.category}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => onToggleActive(member.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                          member.active
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                        title="Haga clic para cambiar estado"
                      >
                        {member.active ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Activo
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactivo
                          </>
                        )}
                      </button>
                    </td>

                    {/* Alertas de Inasistencia */}
                    <td className="py-4 px-4">
                      {member.active ? (
                        absencesInfo && absencesInfo.total >= 3 ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 font-medium">
                              <span
                                className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                                  hasWarning
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {absencesInfo.absences} faltas
                              </span>
                              <span className="text-[10px] text-slate-400">
                                de {absencesInfo.total} domingos
                              </span>
                            </div>
                            {hasWarning && (
                              <div className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-bold bg-rose-50/50 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Alerta: Faltó 3 veces en el mes</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">
                            {absencesInfo && absencesInfo.total > 0
                              ? `Faltas: ${absencesInfo.absences} (de ${absencesInfo.total} reg.)`
                              : 'Sin registros este mes'}
                          </div>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No aplica (Inactivo)</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-4 px-4 text-right">
                      {readOnly ? (
                        <span className="text-[10px] text-slate-400 italic">Consulta</span>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => onEditMember(member)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            title="Editar datos personales"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal oficial de Descarga de Directorio */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reportType="directorio"
        members={members}
        attendance={attendance}
        currentUserName={currentUserName}
        userRole={userRole}
      />
    </div>
  );
}
