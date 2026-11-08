/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Download, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileJson, 
  Users, 
  Calendar, 
  Coins, 
  KeyRound, 
  ShieldCheck, 
  RefreshCw,
  Info,
  Database
} from 'lucide-react';
import { Member, AttendanceRecord, FinancialRecord, AppUser } from '../types';
import CenfolLogo from './CenfolLogo';

export interface BackupDataPayload {
  version: string;
  exportDate: string;
  appName: string;
  church: string;
  members: Member[];
  attendance: AttendanceRecord[];
  treasury: FinancialRecord[];
  users?: AppUser[];
}

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  attendance: AttendanceRecord[];
  financialRecords: FinancialRecord[];
  users: AppUser[];
  currentUserName: string;
  onRestore: (data: {
    members: Member[];
    attendance: AttendanceRecord[];
    treasury: FinancialRecord[];
    users?: AppUser[];
    mode: 'merge' | 'replace';
  }) => Promise<void>;
}

export default function BackupRestoreModal({
  isOpen,
  onClose,
  members,
  attendance,
  financialRecords,
  users,
  currentUserName,
  onRestore,
}: BackupRestoreModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'download' | 'restore'>('download');

  // Opciones de descarga
  const [includeMembers, setIncludeMembers] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeTreasury, setIncludeTreasury] = useState(true);
  const [includeUsers, setIncludeUsers] = useState(true);

  // Estados de restauración
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<BackupDataPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generar y descargar el archivo JSON de copia de seguridad
  const handleDownloadBackup = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const payload: BackupDataPayload = {
      version: '2.0',
      exportDate: now.toISOString(),
      appName: 'Asistencia y Tesorería Dominical',
      church: 'CENFOL • Iglesia Del Dios Altísimo',
      members: includeMembers ? members : [],
      attendance: includeAttendance ? attendance : [],
      treasury: includeTreasury ? financialRecords : [],
      users: includeUsers ? users : [],
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Copia_Seguridad_CENFOL_${dateStr}_${timeStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessMessage('¡Copia de seguridad descargada exitosamente en tu dispositivo!');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Procesar archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validar formato flexible (acepta payload oficial o arrays directos)
        const membersList = Array.isArray(parsed.members) ? parsed.members : [];
        const attendanceList = Array.isArray(parsed.attendance) ? parsed.attendance : [];
        const treasuryList = Array.isArray(parsed.treasury)
          ? parsed.treasury
          : Array.isArray(parsed.financialRecords)
          ? parsed.financialRecords
          : [];
        const usersList = Array.isArray(parsed.users) ? parsed.users : [];

        if (
          membersList.length === 0 &&
          attendanceList.length === 0 &&
          treasuryList.length === 0 &&
          usersList.length === 0
        ) {
          setParseError('El archivo no contiene registros válidos de miembros, asistencias o tesorería.');
          setParsedData(null);
          return;
        }

        setParsedData({
          version: parsed.version || '1.0',
          exportDate: parsed.exportDate || 'No especificada',
          appName: parsed.appName || 'Respaldo de Congregación',
          church: parsed.church || 'CENFOL',
          members: membersList,
          attendance: attendanceList,
          treasury: treasuryList,
          users: usersList,
        });
      } catch (err) {
        console.error('Error al parsear archivo JSON:', err);
        setParseError('El archivo seleccionado no es un archivo JSON válido.');
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  // Ejecutar restauración
  const handleExecuteRestore = async () => {
    if (!parsedData) return;

    if (restoreMode === 'replace') {
      const confirmed = window.confirm(
        '⚠️ ATENCIÓN: El modo "Reemplazar Todo" sobrescribirá la información actual con la del archivo. ¿Estás seguro de continuar?'
      );
      if (!confirmed) return;
    }

    try {
      setIsProcessing(true);
      await onRestore({
        members: parsedData.members,
        attendance: parsedData.attendance,
        treasury: parsedData.treasury,
        users: parsedData.users,
        mode: restoreMode,
      });

      setSuccessMessage(
        `¡Restauración exitosa! Se actualizaron ${parsedData.members.length} miembros, ${parsedData.attendance.length} asistencias y ${parsedData.treasury.length} registros de tesorería en todos los sistemas y bases de datos.`
      );
      setParsedData(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Error al restaurar los datos en el sistema.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera con Branding CENFOL */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <CenfolLogo className="w-10 h-10 shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200 bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  Gestión Segura
                </span>
                <span className="text-[11px] text-emerald-200">CENFOL • Iglesia Del Dios Altísimo</span>
              </div>
              <h3 className="text-base font-bold text-white leading-tight mt-0.5 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-300" />
                <span>Copia de Seguridad y Restauración de Datos</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-lg transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Alternancia */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab('download');
              setParseError(null);
              setSuccessMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'download'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Descargar Copia (.json)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('restore');
              setParseError(null);
              setSuccessMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'restore'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            <span>Subir y Restaurar Archivo</span>
          </button>
        </div>

        {/* Mensaje de Éxito o Error Global */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {parseError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{parseError}</span>
          </div>
        )}

        {/* Cuerpo de la Ventana */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* ========================================== */}
          {/* VISTA 1: DESCARGAR COPIA DE SEGURIDAD      */}
          {/* ========================================== */}
          {activeTab === 'download' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-sm">Resumen de Información a Respaldar</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    Formato JSON Oficial
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Descarga un archivo seguro con todos los registros actuales para guardarlo en tu computador, disco o Google Drive.
                </p>
              </div>

              {/* Casillas de selección de módulos a respaldar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeMembers}
                    onChange={(e) => setIncludeMembers(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Directorio de Miembros</div>
                      <div className="text-[11px] text-slate-400">{members.length} personas registradas</div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeAttendance}
                    onChange={(e) => setIncludeAttendance(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Historial de Asistencias</div>
                      <div className="text-[11px] text-slate-400">{attendance.length} domingos registrados</div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeTreasury}
                    onChange={(e) => setIncludeTreasury(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Tesorería (Diezmos/Ofrendas)</div>
                      <div className="text-[11px] text-slate-400">{financialRecords.length} movimientos</div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeUsers}
                    onChange={(e) => setIncludeUsers(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800">Cuentas y Roles</div>
                      <div className="text-[11px] text-slate-400">{users.length} usuarios del sistema</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Botón de Descarga */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={!includeMembers && !includeAttendance && !includeTreasury && !includeUsers}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Copia de Seguridad (.json)</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VISTA 2: SUBIR Y RESTAURAR ARCHIVO         */}
          {/* ========================================== */}
          {activeTab === 'restore' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="backup-file-input"
              />

              {/* Zona de Arrastrar o Seleccionar Archivo */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">
                    {selectedFile ? selectedFile.name : 'Haz clic para seleccionar el archivo de respaldo'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Admite archivos oficiales de copia de seguridad en formato <strong>.json</strong>
                  </p>
                </div>
              </div>

              {/* Previsualización del Contenido Detectado en el Archivo */}
              {parsedData && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <FileJson className="w-4 h-4 text-emerald-600" />
                      <span>Datos Detectados en el Archivo</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Fecha del respaldo: <strong>{parsedData.exportDate.split('T')[0]}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-base font-extrabold text-emerald-700">{parsedData.members.length}</div>
                      <div className="text-[10px] text-slate-500">Miembros</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-base font-extrabold text-sky-700">{parsedData.attendance.length}</div>
                      <div className="text-[10px] text-slate-500">Asistencias</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-base font-extrabold text-amber-600">{parsedData.treasury.length}</div>
                      <div className="text-[10px] text-slate-500">Tesorería</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-base font-extrabold text-purple-700">{parsedData.users?.length || 0}</div>
                      <div className="text-[10px] text-slate-500">Usuarios</div>
                    </div>
                  </div>

                  {/* Selector de Modo de Restauración */}
                  <div className="pt-2 space-y-2">
                    <span className="font-bold text-slate-700 text-xs">Modo de Restauración:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          restoreMode === 'merge'
                            ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restore-mode"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5 text-emerald-600 accent-emerald-600"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold block">Combinar / Actualizar (Recomendado)</span>
                          <span className="text-slate-500 font-normal">
                            Agrega los registros del archivo y actualiza los existentes sin borrar otros datos.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          restoreMode === 'replace'
                            ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restore-mode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-0.5 text-amber-600 accent-amber-600"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold block">Reemplazar Todo</span>
                          <span className="text-slate-500 font-normal">
                            Sobrescribe y reemplaza por completo la lista actual con lo que viene en el archivo.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Botón de Ejecución de Restauración */}
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isProcessing}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Restaurando y sincronizando datos...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Restaurar Datos Ahora</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
