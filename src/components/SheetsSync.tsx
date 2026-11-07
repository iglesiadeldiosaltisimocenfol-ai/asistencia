/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { getSavedSpreadsheetId, createAttendanceSpreadsheet, saveSpreadsheetId, disconnectSpreadsheet } from '../sheetsService';
import { CheckCircle, Database, FileSpreadsheet, RefreshCw, LogOut, Link2, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface SheetsSyncProps {
  user: User | null;
  accessToken: string | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onImportFromSheets: (skipConfirm?: boolean) => Promise<void>;
  onExportToSheets: (skipConfirm?: boolean) => Promise<void>;
}

export default function SheetsSync({
  user,
  accessToken,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  onImportFromSheets,
  onExportToSheets,
}: SheetsSyncProps) {
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getSavedSpreadsheetId());
  const [inputUrl, setInputUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Extraer el ID de la hoja de cálculo de un enlace o usarlo directamente
  const parseSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    
    // Regex para extraer el ID de un enlace estándar de Google Sheets
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    return trimmed; // Retornar tal cual si no es un enlace completo
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) return;
    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await createAttendanceSpreadsheet(accessToken);
      setSpreadsheetId(result.spreadsheetId);
      setSuccessMsg('¡Nueva hoja creada y vinculada con éxito en tu Google Drive!');
      // Exportar automáticamente los datos actuales locales para que no comience vacío
      await onExportToSheets(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al intentar crear la hoja de cálculo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkExistingSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedId = parseSpreadsheetId(inputUrl);
    if (!parsedId) {
      setError('Por favor, ingresa un enlace o ID de Google Sheets válido.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      saveSpreadsheetId(parsedId);
      setSpreadsheetId(parsedId);
      setInputUrl('');
      setSuccessMsg('Se ha vinculado la hoja de cálculo seleccionada.');
      // Importar datos de esa hoja para que el usuario comience con lo que ya tiene
      await onImportFromSheets(true);
    } catch (err: any) {
      console.error(err);
      setError('No se pudo verificar el acceso a la hoja de cálculo. Asegúrate de tener permisos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisconnect = () => {
    const confirmed = window.confirm(
      '¿Deseas desvincular la hoja de cálculo actual? Los datos seguirán existiendo en Google Drive y en tu memoria local, pero no se sincronizarán hasta que la vincules de nuevo.'
    );
    if (confirmed) {
      disconnectSpreadsheet();
      setSpreadsheetId(null);
      setSuccessMsg('Se ha desvinculado la hoja de cálculo con éxito.');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6" id="sheets-sync">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-600" />
          Sincronización con Google Sheets
        </h2>
        <p className="text-xs text-slate-500">Guarda toda tu información de asistencia dominical en la nube de Google</p>
      </div>

      {/* Caso 1: Requiere Autenticación */}
      {needsAuth || !user ? (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4 text-center">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-700">Conecta tu cuenta de Google</h3>
            <p className="text-xs text-slate-500">
              Inicia sesión con Google para sincronizar tus miembros y asistencias directamente en una hoja de cálculo privada de Google Sheets. Podrás abrirla desde cualquier celular o PC.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            {/* Botón GSI oficial */}
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="gsi-material-button focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 shadow hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-semibold text-xs">
                  {isLoggingIn ? 'Iniciando sesión...' : 'Iniciar sesión con Google'}
                </span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* Caso 2: Autenticado */
        <div className="space-y-6">
          {/* Perfil del usuario conectado */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl gap-4">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google user'}
                  className="w-10 h-10 rounded-full border border-emerald-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-slate-800">{user.displayName}</div>
                <div className="text-[10px] text-slate-500 font-medium">{user.email}</div>
                <div className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 font-bold mt-0.5">
                  <ShieldCheck className="w-3 h-3" /> Conexión con Google Activa
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          </div>

          {/* Estado de la Hoja de Cálculo Vinculada */}
          {spreadsheetId ? (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg mt-0.5">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-800">Hoja de cálculo vinculada con éxito</h3>
                  <p className="text-xs text-slate-400">
                    ID de la Hoja: <span className="font-mono text-[10px] bg-slate-200/50 px-1.5 py-0.5 rounded text-slate-600">{spreadsheetId}</span>
                  </p>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline pt-1"
                  >
                    Abrir Google Sheets <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Acciones de Sincronización Manual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={onImportFromSheets}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  title="Descargar los datos de la hoja de Google Sheets y reemplazar la memoria local"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                  Cargar desde Google Sheets
                </button>
                <button
                  onClick={onExportToSheets}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                  title="Subir la lista de personas y asistencias actuales de la memoria local a Google Sheets"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                  Subir a Google Sheets
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-slate-400 hover:text-rose-600 font-medium cursor-pointer"
                >
                  Desvincular esta hoja de cálculo
                </button>
              </div>
            </div>
          ) : (
            /* Si está autenticado pero NO tiene hoja de cálculo vinculada */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Opción A: Crear nueva */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-800">Opción 1: Crear una nueva hoja</h3>
                  <p className="text-xs text-slate-500">
                    Crea automáticamente una hoja llamada "Registro de Asistencia Dominical" en tu Google Drive con las tablas de Miembros y Asistencias listas.
                  </p>
                </div>
                <button
                  onClick={handleCreateNewSheet}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  {isProcessing ? 'Creando...' : 'Crear y Vincular Hoja'}
                </button>
              </div>

              {/* Opción B: Vincular existente */}
              <form
                onSubmit={handleLinkExistingSheet}
                className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-800">Opción 2: Vincular hoja existente</h3>
                  <p className="text-xs text-slate-500">
                    Pega el enlace o el ID de una hoja de cálculo que ya poseas para comenzar a leer o guardar tus datos ahí.
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Enlace completo o ID de la hoja"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={isProcessing}
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !inputUrl.trim()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Vincular Hoja Existente
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Alertas de Éxito / Errores */}
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-800 p-3.5 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-800 p-3.5 rounded-lg text-xs">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
