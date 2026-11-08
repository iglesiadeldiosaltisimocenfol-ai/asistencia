/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Member, 
  AttendanceRecord, 
  AppUser, 
  AppRole, 
  FinancialRecord 
} from './types';
import { initAuth, googleSignIn, logout, getAccessToken } from './firebase';
import { 
  loadDataFromSheets, 
  syncMembersToSheets, 
  syncAttendanceToSheets, 
  syncTreasuryToSheets,
  syncUsersToSheets,
  getSavedSpreadsheetId,
  createAttendanceSpreadsheet,
  saveSpreadsheetId
} from './sheetsService';
import {
  subscribeToMembers,
  subscribeToAttendance,
  subscribeToTreasury,
  subscribeToUsers,
  saveMemberRealtime,
  deleteMemberRealtime,
  saveAttendanceRealtime,
  saveFinancialRecordRealtime,
  deleteFinancialRecordRealtime,
  clearTreasuryRecordsRealtime,
  saveUserRealtime,
  deleteUserRealtime,
  seedFirestoreIfEmpty,
  subscribeToSharedSpreadsheet,
} from './realtimeService';
import { User } from 'firebase/auth';

import StatsDashboard from './components/StatsDashboard';
import MemberList from './components/MemberList';
import MemberForm from './components/MemberForm';
import AttendanceCheck from './components/AttendanceCheck';
import SheetsSync from './components/SheetsSync';
import UserManagement, { ROLE_INFO } from './components/UserManagement';
import TreasuryDashboard from './components/TreasuryDashboard';
import LoginModal from './components/LoginModal';
import LoginPortal from './components/LoginPortal';
import CenfolLogo from './components/CenfolLogo';
import HtmlExportModal from './components/HtmlExportModal';
import BackupRestoreModal from './components/BackupRestoreModal';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import {
  saveMemberToDb,
  deleteMemberFromDb,
  saveAttendanceToDb,
  saveTreasuryToDb,
  deleteTreasuryFromDb,
  seedDatabaseIfEmpty,
  restoreDataToDb
} from './services/apiService';

import { 
  Users, 
  BarChart3, 
  CheckSquare, 
  Database, 
  LogIn, 
  LogOut,
  Heart, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Coins,
  KeyRound,
  ShieldCheck,
  ClipboardCheck,
  ChevronDown,
  UserCheck,
  Lock,
  Clock,
  ShieldAlert,
  FileSpreadsheet,
  ExternalLink,
  Code2,
  Download,
  UploadCloud
} from 'lucide-react';

// Datos de demostración iniciales de Miembros
const DEFAULT_MEMBERS: Member[] = [
  { id: 'm1', name: 'Juan Carlos Pérez', phone: '3001234567', email: 'juan.perez@email.com', address: 'Calle 10 # 5-20', neighborhood: 'Centro', category: 'Hombres', active: true, createdAt: '2026-05-10' },
  { id: 'm2', name: 'Carlos Mario Mendoza', phone: '3124567890', email: 'carlos.mendo@email.com', address: 'Av. El Dorado # 45-12', neighborhood: 'El Salitre', category: 'Hombres', active: true, createdAt: '2026-05-12' },
  { id: 'm3', name: 'David Santiago Lozano', phone: '3157891234', email: 'david.loza@email.com', address: 'Calle 80 # 24-50', neighborhood: 'Pontevedra', category: 'Hombres', active: true, createdAt: '2026-05-15' },
  { id: 'm4', name: 'María Camila Delgado', phone: '3209876543', email: 'maria.delg@email.com', address: 'Carrera 15 # 100-30', neighborhood: 'Chicó Norte', category: 'Mujeres', active: true, createdAt: '2026-05-15' },
  { id: 'm5', name: 'Sofía Valentina Restrepo', phone: '3116543210', email: 'sofia.restre@email.com', address: 'Transversal 5 # 8-15', neighborhood: 'La Candelaria', category: 'Mujeres', active: true, createdAt: '2026-05-18' },
  { id: 'm6', name: 'Elizabeth Ortiz', phone: '3183210987', email: 'elizabeth.o@email.com', address: 'Calle 50 # 13-24', neighborhood: 'Chapinero', category: 'Mujeres', active: true, createdAt: '2026-05-20' },
  { id: 'm7', name: 'Mateo Alejandro Delgado', phone: '3109876543', email: 'mateo.delg@email.com', address: 'Carrera 15 # 100-30', neighborhood: 'Chicó Norte', category: 'Niños', active: true, createdAt: '2026-05-15' },
  { id: 'm8', name: 'Santiago Restrepo', phone: '3116543210', email: '', address: 'Transversal 5 # 8-15', neighborhood: 'La Candelaria', category: 'Niños', active: true, createdAt: '2026-05-18' },
  { id: 'm9', name: 'Luciana Pérez Ortiz', phone: '3001234567', email: '', address: 'Calle 10 # 5-20', neighborhood: 'Centro', category: 'Niñas', active: true, createdAt: '2026-05-10' },
  { id: 'm10', name: 'Valentina Mendoza Delgado', phone: '3124567890', email: '', address: 'Av. El Dorado # 45-12', neighborhood: 'El Salitre', category: 'Niñas', active: true, createdAt: '2026-05-12' },
];

const DEFAULT_ATTENDANCE: AttendanceRecord[] = [
  { date: '2026-06-07', presentIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'] },
  { date: '2026-06-14', presentIds: ['m1', 'm2', 'm4', 'm5', 'm6', 'm7', 'm10'] },
  { date: '2026-06-21', presentIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm8', 'm9'] },
  { date: '2026-06-28', presentIds: ['m1', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'] },
  { date: '2026-07-05', presentIds: ['m1', 'm4', 'm5', 'm6', 'm7', 'm8'] },
  { date: '2026-07-12', presentIds: ['m1', 'm4', 'm6', 'm7', 'm8'] },
];

// Usuarios iniciales del sistema con los 3 roles
const DEFAULT_USERS: AppUser[] = [
  {
    id: 'u_admin',
    name: 'Pastor Administrador',
    email: 'iglesiadeldiosaltisimocenfol@gmail.com',
    role: 'admin',
    phone: '3001234567',
    password: 'iglesia2026',
    active: true,
    createdAt: '2026-05-01',
  },
  {
    id: 'u_tesorero',
    name: 'Hermano Tesorero (Finanzas)',
    email: 'tesoreria.iglesia@email.com',
    role: 'tesorero',
    phone: '3151122334',
    password: 'iglesia2026',
    active: true,
    createdAt: '2026-05-02',
  },
  {
    id: 'u_lider',
    name: 'Líder de Asistencia Dominical',
    email: 'asistencia.lider@email.com',
    role: 'lider_asistencia',
    phone: '3109988776',
    password: 'iglesia2026',
    active: true,
    createdAt: '2026-05-02',
  },
];

// Movimientos de Tesorería iniciales (Limpio para nuevos registros reales de la iglesia)
const DEFAULT_FINANCIAL_RECORDS: FinancialRecord[] = [];

type TabType = 'dashboard' | 'asistencia' | 'directorio' | 'tesoreria' | 'usuarios' | 'sheets';

interface SessionUser {
  name: string;
  email: string;
  role: AppRole;
}

const isLiderAsistenciaRole = (r?: string | null): boolean => {
  if (!r) return false;
  const lower = r.toLowerCase().trim();
  return lower === 'lider_asistencia' || lower.includes('lider') || lower.includes('asistencia');
};

export default function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);

  // Sesión de usuario activa (si no existe sesión guardada, la aplicación web queda cerrada y protegida)
  const [activeSessionUser, setActiveSessionUser] = useState<SessionUser | null>(() => {
    const saved = localStorage.getItem('asistencia_dominical_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Rol activo actual y simulador de roles
  const [currentRole, setCurrentRole] = useState<AppRole>(() => {
    const saved = localStorage.getItem('asistencia_dominical_session');
    if (saved) {
      try {
        return JSON.parse(saved).role || 'admin';
      } catch {
        return 'admin';
      }
    }
    return 'admin';
  });

  // Pestaña inicial segura: si el rol guardado es Líder de Asistencia, iniciar siempre en 'asistencia'
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('asistencia_dominical_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'lider_asistencia' || isLiderAsistenciaRole(parsed.role)) {
          return 'asistencia';
        }
        if (parsed.role === 'tesorero') {
          return 'tesoreria';
        }
      } catch {}
    }
    return 'asistencia';
  });

  // Estado de Autenticación de Google
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estados del Formulario de Miembros
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Estados de carga e info de Sheets
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(() => {
    const saved = getSavedSpreadsheetId();
    return saved ? `https://docs.google.com/spreadsheets/d/${saved}` : null;
  });

  // Inicializar estados (cargar de localStorage y suscribir a Firestore en tiempo real)
  useEffect(() => {
    // 1. Cargar caché local para respuesta inmediata
    const localMembers = localStorage.getItem('asistencia_dominical_members');
    if (localMembers) {
      try { setMembers(JSON.parse(localMembers)); } catch {}
    } else {
      setMembers(DEFAULT_MEMBERS);
    }

    const localAttendance = localStorage.getItem('asistencia_dominical_attendance');
    if (localAttendance) {
      try { setAttendance(JSON.parse(localAttendance)); } catch {}
    } else {
      setAttendance(DEFAULT_ATTENDANCE);
    }

    const localUsers = localStorage.getItem('asistencia_dominical_users');
    let loadedUsers: AppUser[] = DEFAULT_USERS;
    if (localUsers) {
      try {
        loadedUsers = JSON.parse(localUsers);
        setUsers(loadedUsers);
      } catch {}
    } else {
      setUsers(DEFAULT_USERS);
    }

    const localTreasury = localStorage.getItem('asistencia_dominical_treasury');
    if (localTreasury) {
      try {
        const parsed: FinancialRecord[] = JSON.parse(localTreasury);
        const cleaned = parsed.filter(r => !r.id.startsWith('fin_'));
        setFinancialRecords(cleaned);
        localStorage.setItem('asistencia_dominical_treasury', JSON.stringify(cleaned));
      } catch {
        setFinancialRecords([]);
      }
    } else {
      setFinancialRecords([]);
    }

    // 2. Suscripciones en tiempo real con Firestore
    // Cualquier cambio en celulares o computadores se sincroniza al instante en todos los dispositivos
    const unsubMembers = subscribeToMembers((cloudMembers) => {
      if (cloudMembers) {
        setMembers(cloudMembers);
        localStorage.setItem('asistencia_dominical_members', JSON.stringify(cloudMembers));
      }
    });

    const unsubAttendance = subscribeToAttendance((cloudAttendance) => {
      if (cloudAttendance) {
        setAttendance(cloudAttendance);
        localStorage.setItem('asistencia_dominical_attendance', JSON.stringify(cloudAttendance));
      }
    });

    const unsubTreasury = subscribeToTreasury((cloudTreasury) => {
      if (cloudTreasury) {
        setFinancialRecords(cloudTreasury);
        localStorage.setItem('asistencia_dominical_treasury', JSON.stringify(cloudTreasury));
      }
    });

    const unsubUsers = subscribeToUsers((cloudUsers) => {
      if (cloudUsers) {
        setUsers(cloudUsers);
        localStorage.setItem('asistencia_dominical_users', JSON.stringify(cloudUsers));
      }
    });

    // Sincronización en tiempo real de la hoja de Google Sheets para todos los dispositivos
    const unsubSheets = subscribeToSharedSpreadsheet((sharedSheetId) => {
      if (sharedSheetId) {
        localStorage.setItem('asistencia_dominical_sheet_id', sharedSheetId);
        setSheetUrl(`https://docs.google.com/spreadsheets/d/${sharedSheetId}`);
      }
    });

    // 3. Sembrar datos iniciales en la nube si Firestore o PostgreSQL están vacíos
    seedFirestoreIfEmpty(
      DEFAULT_MEMBERS,
      DEFAULT_ATTENDANCE,
      DEFAULT_FINANCIAL_RECORDS,
      DEFAULT_USERS
    );
    seedDatabaseIfEmpty(DEFAULT_MEMBERS);

    // 4. Inicializar listener de Google Auth
    const unsubAuth = initAuth(
      (googleUser, token) => {
        setUser(googleUser);
        setAccessToken(token);
        setNeedsAuth(false);

        // Asociar rol según correo del usuario logueado
        if (googleUser.email) {
          const userEmail = googleUser.email.toLowerCase();
          const match = loadedUsers.find((u) => u.email.toLowerCase() === userEmail);
          let assignedRole: AppRole = 'lider_asistencia';
          if (userEmail === 'iglesiadeldiosaltisimocenfol@gmail.com' || (match && match.role === 'admin')) {
            assignedRole = 'admin';
          } else if (match && match.active) {
            assignedRole = match.role;
          }
          const sessionData: SessionUser = {
            name: googleUser.displayName || match?.name || userEmail.split('@')[0],
            email: userEmail,
            role: assignedRole,
          };
          setActiveSessionUser(sessionData);
          setCurrentRole(assignedRole);
          localStorage.setItem('asistencia_dominical_session', JSON.stringify(sessionData));
        }

        // Cargar automáticamente de Sheets en segundo plano si está configurado
        const savedSheetId = getSavedSpreadsheetId();
        if (savedSheetId) {
          silentLoadFromSheets(savedSheetId, token || '');
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );

    return () => {
      unsubMembers();
      unsubAttendance();
      unsubTreasury();
      unsubUsers();
      unsubSheets();
      if (typeof unsubAuth === 'function') unsubAuth();
    };
  }, []);

  // Cargar datos silenciosamente al iniciar sesión
  const silentLoadFromSheets = async (sheetId: string, token: string) => {
    try {
      const data = await loadDataFromSheets(sheetId, token);
      if (data.members.length > 0) {
        setMembers(data.members);
        localStorage.setItem('asistencia_dominical_members', JSON.stringify(data.members));
      }
      if (data.attendance.length > 0) {
        setAttendance(data.attendance);
        localStorage.setItem('asistencia_dominical_attendance', JSON.stringify(data.attendance));
      }
      if (data.treasury && data.treasury.length > 0) {
        setFinancialRecords(data.treasury);
        localStorage.setItem('asistencia_dominical_treasury', JSON.stringify(data.treasury));
      }
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        localStorage.setItem('asistencia_dominical_users', JSON.stringify(data.users));
      }
    } catch (err) {
      console.warn('No se pudo cargar datos de Sheets en segundo plano:', err);
    }
  };

  // Guardar estado localmente y sincronizar con Google Sheets si está conectado
  const saveStateAndSync = async (
    newMembers: Member[], 
    newAttendance: AttendanceRecord[],
    newTreasury?: FinancialRecord[],
    newUsers?: AppUser[]
  ) => {
    setMembers(newMembers);
    setAttendance(newAttendance);
    localStorage.setItem('asistencia_dominical_members', JSON.stringify(newMembers));
    localStorage.setItem('asistencia_dominical_attendance', JSON.stringify(newAttendance));

    const treasuryToSave = newTreasury || financialRecords;
    if (newTreasury) {
      setFinancialRecords(newTreasury);
      localStorage.setItem('asistencia_dominical_treasury', JSON.stringify(newTreasury));
    }

    const usersToSave = newUsers || users;
    if (newUsers) {
      setUsers(newUsers);
      localStorage.setItem('asistencia_dominical_users', JSON.stringify(newUsers));
    }

    const savedSheetId = getSavedSpreadsheetId();
    if (user && accessToken && savedSheetId) {
      try {
        await syncMembersToSheets(savedSheetId, accessToken, newMembers);
        await syncAttendanceToSheets(savedSheetId, accessToken, newAttendance);
        if (newTreasury) {
          await syncTreasuryToSheets(savedSheetId, accessToken, treasuryToSave);
        }
        if (newUsers) {
          await syncUsersToSheets(savedSheetId, accessToken, usersToSave);
        }
      } catch (err) {
        console.warn('Error sincronizando con Sheets en segundo plano:', err);
      }
    }
  };

  // Google Login / Logout
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);

        // Identificar rol
        const userEmail = result.user.email?.toLowerCase();
        if (userEmail) {
          const match = users.find((u) => u.email.toLowerCase() === userEmail);
          if (match && match.active) {
            setCurrentRole(match.role);
          } else {
            setCurrentRole('admin');
          }
        }
        
        const savedSheetId = getSavedSpreadsheetId();
        if (savedSheetId) {
          setIsSyncing(true);
          const data = await loadDataFromSheets(savedSheetId, result.accessToken);
          if (data.members.length > 0) {
            setMembers(data.members);
            localStorage.setItem('asistencia_dominical_members', JSON.stringify(data.members));
          }
          if (data.attendance.length > 0) {
            setAttendance(data.attendance);
            localStorage.setItem('asistencia_dominical_attendance', JSON.stringify(data.attendance));
          }
          if (data.treasury && data.treasury.length > 0) {
            setFinancialRecords(data.treasury);
            localStorage.setItem('asistencia_dominical_treasury', JSON.stringify(data.treasury));
          }
          if (data.users && data.users.length > 0) {
            setUsers(data.users);
            localStorage.setItem('asistencia_dominical_users', JSON.stringify(data.users));
          }
          setIsSyncing(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setSyncError('Fallo al iniciar sesión con Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  const handleLogout = useCallback(async (dueToInactivity: boolean | any = false) => {
    const isInactive = dueToInactivity === true;
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setActiveSessionUser(null);
    localStorage.removeItem('asistencia_dominical_session');

    if (isInactive) {
      setInactivityNotice('Tu sesión se cerró automáticamente tras 10 minutos de inactividad para proteger la información de la iglesia.');
      setLogoutNotice(null);
      setSyncSuccess(null);
    } else {
      setInactivityNotice(null);
      setLogoutNotice('Has cerrado la sesión de forma segura. La aplicación web se encuentra protegida. Inicia sesión para reanudar el acceso.');
      setSyncSuccess(null);
    }
    setIsLoginModalOpen(false);
  }, []);

  // Monitoreo de inactividad: Cierre automático a los 10 minutos (600,000 ms) sin actividad
  const handleInactivityTimeout = useCallback(() => {
    handleLogout(true);
  }, [handleLogout]);

  const {
    showWarning: showInactivityWarning,
    secondsRemaining: inactivitySecondsRemaining,
    resetTimer: resetInactivityTimer,
  } = useInactivityTimeout({
    timeoutMs: 10 * 60 * 1000, // 10 minutos exactos
    warningMs: 60 * 1000,      // Mostrar aviso con cuenta regresiva en el último minuto
    isEnabled: Boolean(activeSessionUser || user),
    onTimeout: handleInactivityTimeout,
  });

  const handleLoginSuccess = (session: SessionUser) => {
    setActiveSessionUser(session);
    setCurrentRole(session.role);
    setInactivityNotice(null);
    setLogoutNotice(null);
    setIsLoginModalOpen(false);
    resetInactivityTimer();
    localStorage.setItem('asistencia_dominical_session', JSON.stringify(session));

    // Si el usuario es Líder de Asistencia, forzar inmediatamente la pestaña de Asistencia
    if (session.role === 'lider_asistencia' || isLiderAsistenciaRole(session.role)) {
      setActiveTab('asistencia');
    } else if (session.role === 'tesorero') {
      setActiveTab('tesoreria');
    } else {
      setActiveTab('dashboard');
    }

    setSyncSuccess(`¡Bienvenido, ${session.name}! Sesión iniciada como ${ROLE_INFO[session.role].label}.`);
    setTimeout(() => setSyncSuccess(null), 4000);
  };

  // Importar desde Sheets
  const handleImportFromSheets = async (skipConfirm = false) => {
    const savedSheetId = getSavedSpreadsheetId();
    if (!accessToken || !savedSheetId) return;

    if (!skipConfirm) {
      const confirmed = window.confirm(
        '¿Deseas importar los datos desde Google Sheets? Esto reemplazará miembros, asistencias, tesorería y usuarios locales con los datos de tu hoja de cálculo.'
      );
      if (!confirmed) return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);

    try {
      const data = await loadDataFromSheets(savedSheetId, accessToken);
      
      if (
        data.members.length === 0 && 
        data.attendance.length === 0 && 
        data.treasury.length === 0 &&
        data.users.length === 0
      ) {
        setSyncError('La hoja de cálculo está vacía. No se importaron registros.');
        return;
      }

      if (data.members.length > 0) {
        setMembers(data.members);
        localStorage.setItem('asistencia_dominical_members', JSON.stringify(data.members));
      }
      if (data.attendance.length > 0) {
        setAttendance(data.attendance);
        localStorage.setItem('asistencia_dominical_attendance', JSON.stringify(data.attendance));
      }
      if (data.treasury.length > 0) {
        setFinancialRecords(data.treasury);
        localStorage.setItem('asistencia_dominical_treasury', JSON.stringify(data.treasury));
      }
      if (data.users.length > 0) {
        setUsers(data.users);
        localStorage.setItem('asistencia_dominical_users', JSON.stringify(data.users));
      }

      setSyncSuccess('Se importaron con éxito los datos desde Google Sheets.');
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Error al intentar importar desde Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Guardar datos directamente en Google Sheets con retroalimentación en tiempo real
  const handleQuickSaveToSheets = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);

    try {
      let currentToken = accessToken;

      // 1. Si no hay token de Google OAuth activo, iniciar flujo de inicio de sesión con Google
      if (!currentToken) {
        setSyncSuccess('Conectando con tu cuenta de Google...');
        const result = await googleSignIn();
        if (result && result.accessToken) {
          currentToken = result.accessToken;
          setUser(result.user);
          setAccessToken(result.accessToken);
          setNeedsAuth(false);
        } else {
          setIsSyncing(false);
          setSyncError('Debes iniciar sesión con Google para sincronizar con Google Sheets.');
          return;
        }
      }

      // 2. Obtener o crear automáticamente la hoja de cálculo de la iglesia en Google Drive
      let targetSheetId = getSavedSpreadsheetId();
      if (!targetSheetId) {
        setSyncSuccess('Creando hoja "Registro de Asistencia y Tesorería Dominical" en tu Google Drive...');
        const created = await createAttendanceSpreadsheet(currentToken);
        targetSheetId = created.spreadsheetId;
        setSheetUrl(created.spreadsheetUrl);
      } else {
        setSheetUrl(`https://docs.google.com/spreadsheets/d/${targetSheetId}`);
      }

      // 3. Escribir todas las pestañas: Miembros, Asistencias, Tesorería y Usuarios
      setSyncSuccess('Guardando miembros, asistencias, tesorería y usuarios en Google Sheets...');
      await syncMembersToSheets(targetSheetId, currentToken, members);
      await syncAttendanceToSheets(targetSheetId, currentToken, attendance);
      await syncTreasuryToSheets(targetSheetId, currentToken, financialRecords);
      await syncUsersToSheets(targetSheetId, currentToken, users);

      setSyncSuccess('¡Datos guardados con éxito en Google Sheets! Tu congregación está completamente sincronizada.');
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Error al intentar guardar los datos en Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Exportar a Sheets desde la pestaña de SheetsSync
  const handleExportToSheets = async (skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmed = window.confirm(
        '¿Deseas guardar y sobrescribir los datos en Google Sheets? Se actualizarán las pestañas de Miembros, Asistencias, Tesorería y Usuarios con la información actual.'
      );
      if (!confirmed) return;
    }
    await handleQuickSaveToSheets();
  };

  // Restaurar Copia de Seguridad Completa (Miembros, Asistencias, Tesorería, Usuarios)
  const handleRestoreBackup = async (payload: {
    members: Member[];
    attendance: AttendanceRecord[];
    treasury: FinancialRecord[];
    users?: AppUser[];
    mode: 'merge' | 'replace';
  }) => {
    let finalMembers: Member[];
    let finalAttendance: AttendanceRecord[];
    let finalTreasury: FinancialRecord[];
    let finalUsers: AppUser[];

    if (payload.mode === 'replace') {
      finalMembers = payload.members.length > 0 ? payload.members : members;
      finalAttendance = payload.attendance.length > 0 ? payload.attendance : attendance;
      finalTreasury = payload.treasury.length > 0 ? payload.treasury : financialRecords;
      finalUsers = (payload.users && payload.users.length > 0) ? payload.users : users;
    } else {
      // Combinar (Merge): Actualizar existentes por ID y agregar nuevos
      const memberMap = new Map<string, Member>();
      members.forEach((m) => memberMap.set(m.id, m));
      payload.members.forEach((m) => memberMap.set(m.id, m));
      finalMembers = Array.from(memberMap.values());

      const attMap = new Map<string, AttendanceRecord>();
      attendance.forEach((a) => attMap.set(a.date, a));
      payload.attendance.forEach((a) => attMap.set(a.date, a));
      finalAttendance = Array.from(attMap.values());

      const trMap = new Map<string, FinancialRecord>();
      financialRecords.forEach((t) => trMap.set(t.id, t));
      payload.treasury.forEach((t) => trMap.set(t.id, t));
      finalTreasury = Array.from(trMap.values());

      const uMap = new Map<string, AppUser>();
      users.forEach((u) => uMap.set(u.id, u));
      (payload.users || []).forEach((u) => uMap.set(u.id, u));
      finalUsers = Array.from(uMap.values());
    }

    // 1. Actualizar estado local en React
    setMembers(finalMembers);
    setAttendance(finalAttendance);
    setFinancialRecords(finalTreasury);
    setUsers(finalUsers);

    // 2. Guardar en localStorage para disponibilidad inmediata
    localStorage.setItem('asistencia_dominical_members', JSON.stringify(finalMembers));
    localStorage.setItem('asistencia_dominical_attendance', JSON.stringify(finalAttendance));
    localStorage.setItem('asistencia_dominical_treasury', JSON.stringify(finalTreasury));
    localStorage.setItem('asistencia_dominical_users', JSON.stringify(finalUsers));

    // 3. Sincronizar en la base de datos PostgreSQL
    await restoreDataToDb({
      members: finalMembers,
      attendance: finalAttendance,
      treasury: finalTreasury,
    });

    // 4. Sincronizar en tiempo real en Firestore para todos los dispositivos
    await saveStateAndSync(finalMembers, finalAttendance, finalTreasury, finalUsers);

    // 5. Si Google Sheets está conectado, sincronizar en Google Sheets
    const currentSheetId = getSavedSpreadsheetId();
    if (currentSheetId && accessToken) {
      try {
        await syncMembersToSheets(currentSheetId, accessToken, finalMembers);
        await syncAttendanceToSheets(currentSheetId, accessToken, finalAttendance);
        await syncTreasuryToSheets(currentSheetId, accessToken, finalTreasury);
        await syncUsersToSheets(currentSheetId, accessToken, finalUsers);
      } catch (e) {
        console.warn('Advertencia al sincronizar Sheets tras restauración:', e);
      }
    }

    setSyncSuccess('¡Copia de seguridad restaurada y sincronizada en PostgreSQL, Firestore y Google Sheets!');
    setTimeout(() => setSyncSuccess(null), 5000);
  };

  // --- CRUD MIEMBROS ---
  const handleSaveMember = async (memberData: Omit<Member, 'id' | 'createdAt'> & { id?: string }) => {
    let updatedMembers = [...members];
    let memberToSave: Member;

    if (memberData.id) {
      memberToSave = {
        id: memberData.id,
        name: memberData.name,
        phone: memberData.phone,
        email: memberData.email,
        address: memberData.address,
        neighborhood: memberData.neighborhood || '',
        category: memberData.category,
        active: memberData.active,
        createdAt: members.find((m) => m.id === memberData.id)?.createdAt || new Date().toISOString().split('T')[0],
      };
      updatedMembers = members.map((m) => (m.id === memberData.id ? memberToSave : m));
    } else {
      memberToSave = {
        id: 'member_' + Date.now(),
        name: memberData.name,
        phone: memberData.phone,
        email: memberData.email,
        address: memberData.address,
        neighborhood: memberData.neighborhood || '',
        category: memberData.category,
        active: memberData.active,
        createdAt: new Date().toISOString().split('T')[0],
      };
      updatedMembers = [memberToSave, ...members];
    }

    setMembers(updatedMembers);
    setShowMemberForm(false);
    setEditingMember(null);

    try {
      await Promise.allSettled([
        saveMemberToDb(memberToSave),
        saveMemberRealtime(memberToSave),
      ]);
      await saveStateAndSync(updatedMembers, attendance);
      const isSheets = !!getSavedSpreadsheetId();
      setSyncSuccess(
        isSheets
          ? `¡Miembro "${memberToSave.name}" guardado en la base de datos (PostgreSQL), reflejado en todos los dispositivos y Google Sheets!`
          : `¡Miembro "${memberToSave.name}" guardado en la base de datos (PostgreSQL) y sincronizado al instante!`
      );
    } catch (err: any) {
      console.error(err);
      saveStateAndSync(updatedMembers, attendance);
      setSyncSuccess(`¡Miembro guardado! Sincronizando con la nube...`);
    }
    setTimeout(() => setSyncSuccess(null), 4000);
  };

  const handleDeleteMember = async (id: string) => {
    const updatedMembers = members.filter((m) => m.id !== id);
    const updatedAttendance = attendance.map((r) => ({
      ...r,
      presentIds: r.presentIds.filter((pId) => pId !== id),
    }));

    setMembers(updatedMembers);
    setAttendance(updatedAttendance);

    try {
      await Promise.allSettled([
        deleteMemberFromDb(id),
        deleteMemberRealtime(id),
      ]);
      await saveStateAndSync(updatedMembers, updatedAttendance);
      setSyncSuccess('Miembro eliminado de la base de datos y actualizado al instante en todos los dispositivos.');
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => setSyncSuccess(null), 4000);
  };

  const handleToggleActive = async (id: string) => {
    const updatedMembers = members.map((m) =>
      m.id === id ? { ...m, active: !m.active } : m
    );
    setMembers(updatedMembers);
    const target = updatedMembers.find((m) => m.id === id);
    if (target) {
      try {
        await saveMemberRealtime(target);
        await saveStateAndSync(updatedMembers, attendance);
        setSyncSuccess(`Estado de "${target.name}" actualizado en todos los dispositivos.`);
      } catch (err) {
        console.error(err);
      }
      setTimeout(() => setSyncSuccess(null), 3000);
    }
  };

  // --- ASISTENCIA ---
  const handleSaveAttendance = async (date: string, presentIds: string[]) => {
    let updatedAttendance = [...attendance];
    const index = attendance.findIndex((r) => r.date === date);

    if (index >= 0) {
      updatedAttendance[index] = { date, presentIds };
    } else {
      updatedAttendance = [...attendance, { date, presentIds }];
    }

    setAttendance(updatedAttendance);

    try {
      await Promise.allSettled([
        saveAttendanceToDb({ date, presentIds }),
        saveAttendanceRealtime({ date, presentIds }),
      ]);
      await saveStateAndSync(members, updatedAttendance);
      const isSheets = !!getSavedSpreadsheetId();
      setSyncSuccess(
        isSheets
          ? `¡Asistencia del domingo ${date} guardada en base de datos (PostgreSQL), sincronizada en todos los dispositivos y Google Sheets!`
          : `¡Asistencia del domingo ${date} guardada en base de datos (PostgreSQL) y reflejada al instante!`
      );
    } catch (err) {
      console.error(err);
      saveStateAndSync(members, updatedAttendance);
      setSyncSuccess(`¡Asistencia guardada localmente!`);
    }
    setTimeout(() => setSyncSuccess(null), 4000);
  };

  // --- USUARIOS Y ROLES (ESTRICTAMENTE EXCLUSIVO ADMINISTRADOR) ---
  const handleAddUser = async (newUserData: Omit<AppUser, 'id' | 'createdAt'>) => {
    if (activeSessionUser?.role !== 'admin') {
      alert('Operación restringida: Solo el Administrador de la congregación tiene autorización para crear usuarios y contraseñas.');
      return;
    }
    const newUser: AppUser = {
      ...newUserData,
      id: 'u_' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updatedUsers = [newUser, ...users];
    setUsers(updatedUsers);

    try {
      await saveUserRealtime(newUser);
      await saveStateAndSync(members, attendance, undefined, updatedUsers);
      setSyncSuccess(`¡Usuario "${newUser.name}" registrado con rol de ${ROLE_INFO[newUser.role].label} y sincronizado en tiempo real!`);
    } catch (err) {
      console.error(err);
      saveStateAndSync(members, attendance, undefined, updatedUsers);
    }
    setTimeout(() => setSyncSuccess(null), 4000);
  };

  const handleUpdateUser = async (id: string, updates: Partial<AppUser>) => {
    if (activeSessionUser?.role !== 'admin') {
      alert('Operación restringida: Solo el Administrador puede modificar datos de usuarios, contraseñas o roles.');
      return;
    }
    const updatedUsers = users.map((u) => (u.id === id ? { ...u, ...updates } : u));
    setUsers(updatedUsers);
    const target = updatedUsers.find((u) => u.id === id);
    if (target) {
      try {
        await saveUserRealtime(target);
        await saveStateAndSync(members, attendance, undefined, updatedUsers);
        setSyncSuccess(`Usuario "${target.name}" actualizado en todos los dispositivos.`);
      } catch (err) {
        console.error(err);
      }
      setTimeout(() => setSyncSuccess(null), 3000);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (activeSessionUser?.role !== 'admin') {
      alert('Operación restringida: Solo el Administrador puede eliminar usuarios.');
      return;
    }
    const updatedUsers = users.filter((u) => u.id !== id);
    setUsers(updatedUsers);

    try {
      await deleteUserRealtime(id);
      await saveStateAndSync(members, attendance, undefined, updatedUsers);
      setSyncSuccess('Usuario eliminado con éxito del sistema.');
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => setSyncSuccess(null), 4000);
  };

  // --- TESORERÍA (ADMIN & TESORERO) ---
  const handleAddFinancialRecord = async (newRecordData: Omit<FinancialRecord, 'id' | 'createdAt'>) => {
    const newRecord: FinancialRecord = {
      ...newRecordData,
      id: 'fin_' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updatedRecords = [newRecord, ...financialRecords];
    setFinancialRecords(updatedRecords);

    try {
      await Promise.allSettled([
        saveTreasuryToDb(newRecord),
        saveFinancialRecordRealtime(newRecord),
      ]);
      await saveStateAndSync(members, attendance, updatedRecords);
      const isSheets = !!getSavedSpreadsheetId();
      setSyncSuccess(
        isSheets
          ? `¡Movimiento de Tesorería guardado en base de datos (PostgreSQL), reflejado en todos los dispositivos y Google Sheets!`
          : `¡Movimiento de Tesorería guardado en base de datos (PostgreSQL) y reflejado al instante!`
      );
    } catch (err) {
      console.error(err);
      saveStateAndSync(members, attendance, updatedRecords);
      setSyncSuccess(`¡Movimiento guardado! Sincronizando con la nube...`);
    }
    setTimeout(() => setSyncSuccess(null), 4000);
  };

  const handleDeleteFinancialRecord = async (id: string) => {
    const updatedRecords = financialRecords.filter((r) => r.id !== id);
    setFinancialRecords(updatedRecords);

    try {
      await Promise.allSettled([
        deleteTreasuryFromDb(id),
        deleteFinancialRecordRealtime(id),
      ]);
      await saveStateAndSync(members, attendance, updatedRecords);
      setSyncSuccess('Movimiento eliminado de la base de datos y actualizado en todos los dispositivos.');
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => setSyncSuccess(null), 4000);
  };

  // Limpiar diezmos o toda la tesorería para dejar el módulo limpio
  const handleClearTreasury = async (mode: 'diezmo' | 'todos' = 'todos') => {
    try {
      setIsSyncing(true);
      await clearTreasuryRecordsRealtime(mode);

      let updatedRecords: FinancialRecord[] = [];
      if (mode === 'diezmo') {
        updatedRecords = financialRecords.filter((r) => r.type !== 'diezmo' && !r.id.startsWith('fin_'));
      } else {
        updatedRecords = [];
      }
      setFinancialRecords(updatedRecords);
      localStorage.setItem('asistencia_dominical_treasury', JSON.stringify(updatedRecords));

      // Sincronizar actualización con Google Sheets si está conectado
      const savedSheetId = getSavedSpreadsheetId();
      if (savedSheetId && accessToken) {
        await syncTreasuryToSheets(savedSheetId, accessToken, updatedRecords);
      }

      setSyncSuccess(
        mode === 'diezmo'
          ? '¡Todos los diezmos han sido eliminados! El registro está limpio para ingresar nuevos datos.'
          : '¡Todos los registros de tesorería han sido eliminados! El módulo está limpio para ingresar nuevos datos.'
      );
    } catch (err: any) {
      console.error(err);
      setSyncError('Error al limpiar registros de tesorería: ' + (err.message || ''));
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncSuccess(null), 5000);
    }
  };

  // Verifica si el rol activo o la cuenta en sesión corresponde a Líder de Asistencia
  const isLiderActive = isLiderAsistenciaRole(currentRole) || isLiderAsistenciaRole(activeSessionUser?.role);

  // Control de Acceso por Rol:
  // - Líder de Asistencia: Acceso estricto y exclusivo a Asistencia y Directorio de personas.
  //   Bajo ninguna circunstancia puede ver diezmos ni la pestaña de Estadísticas.
  // - Administrador: Acceso total.
  // - Tesorero: Tesorería, Directorio y Dashboard financiero.
  const canAccessTab = (tab: TabType): boolean => {
    if (isLiderActive || currentRole === 'lider_asistencia') {
      return tab === 'asistencia' || tab === 'directorio';
    }
    if (tab === 'usuarios' || tab === 'sheets') {
      return activeSessionUser?.role === 'admin' && currentRole === 'admin';
    }
    if (currentRole === 'admin') return true;
    if (currentRole === 'tesorero') {
      return tab === 'tesoreria' || tab === 'directorio' || tab === 'dashboard';
    }
    return false;
  };

  // Si el usuario autenticado no es Administrador, su rol activo queda fijado a su cuenta asignada
  useEffect(() => {
    if (activeSessionUser && activeSessionUser.role !== 'admin' && currentRole !== activeSessionUser.role) {
      setCurrentRole(activeSessionUser.role);
    }
  }, [activeSessionUser, currentRole]);

  // Si cambia de rol y la pestaña activa queda restringida, redirigir a una permitida
  useEffect(() => {
    if (isLiderActive || currentRole === 'lider_asistencia') {
      if (activeTab !== 'asistencia' && activeTab !== 'directorio') {
        setActiveTab('asistencia');
      }
    } else if (!canAccessTab(activeTab)) {
      if (currentRole === 'tesorero') setActiveTab('tesoreria');
      else setActiveTab('dashboard');
    }
  }, [currentRole, activeSessionUser, isLiderActive, activeTab]);

  const currentRoleConfig = ROLE_INFO[currentRole];
  const CurrentRoleIcon = currentRoleConfig.icon;

  // Si no hay sesión activa (al cerrar sesión o por inactividad de 10 min),
  // la aplicación web no queda abierta: se muestra el portal de acceso protegido y cerrado.
  if (!activeSessionUser) {
    return (
      <LoginPortal
        users={users}
        onLoginSuccess={handleLoginSuccess}
        onGoogleSignIn={handleLogin}
        isLoggingInGoogle={isLoggingIn}
        inactivityNotice={inactivityNotice}
        logoutNotice={logoutNotice}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800" id="main-app">
      {/* Barra de Navegación Superior */}
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row justify-between items-center gap-4">
          
          {/* Logo Oficial CENFOL y Nombre de la Iglesia */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
            <CenfolLogo variant="inline" size={42} lightText={true} />

            {/* Rol de Usuario (Móvil) */}
            <div className="lg:hidden flex items-center gap-1.5">
              <div 
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-900/90 border border-emerald-600/80 rounded-lg text-[10px] text-emerald-200 font-semibold"
                title="Sincronizado en tiempo real con todos los dispositivos"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                </span>
                <span>En vivo</span>
              </div>
              {activeSessionUser?.role === 'admin' ? (
                <select
                  value={currentRole}
                  onChange={(e) => {
                    const newRole = e.target.value as AppRole;
                    setCurrentRole(newRole);
                    if (newRole === 'lider_asistencia') {
                      setActiveTab('asistencia');
                    }
                  }}
                  className="text-[11px] bg-emerald-900/80 border border-emerald-600 rounded-lg px-2 py-1 text-emerald-100 font-semibold"
                  title="Modo Administrador: Previsualizar vista de rol"
                >
                  <option value="admin">👑 Vista Administrador</option>
                  <option value="tesorero">💰 Vista Tesorero</option>
                  <option value="lider_asistencia">📋 Vista Líder Asistencia</option>
                </select>
              ) : (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-900/90 border border-emerald-600/80 rounded-lg text-[11px] text-emerald-100 font-bold">
                  <CurrentRoleIcon className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{ROLE_INFO[activeSessionUser?.role || currentRole].label}</span>
                </div>
              )}
            </div>
          </div>

          {/* Menú de pestañas según permisos de rol */}
          <nav className="flex flex-wrap justify-center bg-emerald-900/60 p-1 rounded-xl border border-emerald-700/30 gap-0.5">
            {/* Estadísticas (Admin y Tesorero) */}
            {canAccessTab('dashboard') && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-100/70 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Estadísticas
              </button>
            )}

            {/* Tomar Asistencia (Admin o Líder de Asistencia) */}
            {canAccessTab('asistencia') && (
              <button
                onClick={() => setActiveTab('asistencia')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'asistencia' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-100/70 hover:text-white'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Tomar Asistencia
              </button>
            )}

            {/* Directorio de Personas */}
            <button
              onClick={() => setActiveTab('directorio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'directorio' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-100/70 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Directorio
            </button>

            {/* Tesorería y Finanzas (Admin y Tesorero) */}
            {canAccessTab('tesoreria') && (
              <button
                onClick={() => setActiveTab('tesoreria')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'tesoreria' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-100/70 hover:text-white'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                Tesorería
              </button>
            )}

            {/* Administración de Usuarios (Estrictamente Exclusivo Administrador) */}
            {activeSessionUser?.role === 'admin' && currentRole === 'admin' && (
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'usuarios' ? 'bg-purple-700 text-white shadow-sm' : 'text-purple-200/80 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Usuarios & Roles
              </button>
            )}

            {/* Google Sheets (Exclusivo Administrador) */}
            {activeSessionUser?.role === 'admin' && currentRole === 'admin' && (
              <button
                onClick={() => setActiveTab('sheets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'sheets' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-100/70 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Google Sheets
              </button>
            )}

            {/* Código HTML, CSS, JS (Exclusivo Administrador) */}
            {activeSessionUser?.role === 'admin' && currentRole === 'admin' && (
              <button
                onClick={() => setIsHtmlModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-100/80 hover:text-white hover:bg-emerald-700/60 transition-all cursor-pointer"
                title="Ver y exportar código HTML, CSS y JavaScript de producción"
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Código Web</span> (HTML/CSS/JS)
              </button>
            )}
          </nav>

          {/* Bloque de Usuario y Selector de Rol Activo */}
          <div className="flex items-center gap-2.5">
            {/* Indicador de sincronización en vivo celular / PC */}
            <div 
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/80 border border-emerald-600/70 rounded-xl text-[11px] font-semibold text-emerald-100 shadow-xs"
              title="Sincronización en tiempo real activa: los cambios realizados en el celular se actualizan de inmediato en todos los aplicativos y pantallas"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>En vivo</span>
            </div>

            {/* Indicador de Seguridad: Cierre a los 10 min de inactividad */}
            <div 
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-[10px] font-medium text-emerald-200"
              title="Por seguridad y privacidad, la sesión se cerrará automáticamente si no hay actividad durante 10 minutos"
            >
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Auto-cierre: 10 min</span>
            </div>

            {/* Selector de Rol Activo: Exclusivo Administrador o Rol Fijo para demás usuarios */}
            {activeSessionUser?.role === 'admin' ? (
              <div className="hidden lg:flex items-center bg-emerald-900/70 border border-emerald-600/60 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-[10px] text-emerald-200 font-semibold mr-1.5 flex items-center gap-1">
                  <CurrentRoleIcon className="w-3.5 h-3.5 text-emerald-300" />
                  Vista:
                </span>
                <select
                  value={currentRole}
                  onChange={(e) => {
                    const newRole = e.target.value as AppRole;
                    setCurrentRole(newRole);
                    if (newRole === 'lider_asistencia') {
                      setActiveTab('asistencia');
                    }
                  }}
                  className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                  title="Como Administrador puedes previsualizar las pantallas de otros roles"
                >
                  <option value="admin" className="text-slate-800">👑 Administrador</option>
                  <option value="tesorero" className="text-slate-800">💰 Tesorero</option>
                  <option value="lider_asistencia" className="text-slate-800">📋 Líder Asistencia</option>
                </select>
              </div>
            ) : (
              <div className="hidden lg:flex items-center bg-emerald-900/70 border border-emerald-600/60 rounded-xl px-3 py-1.5 text-xs text-white font-bold gap-1.5">
                <CurrentRoleIcon className="w-3.5 h-3.5 text-emerald-300" />
                <span>{ROLE_INFO[activeSessionUser?.role || currentRole].label}</span>
              </div>
            )}

            {/* Estado de Sesión y Botón Cerrar / Iniciar Sesión */}
            {activeSessionUser && (
              <div className="flex items-center gap-2">
                {/* Botón directo de Copia de Seguridad y Restauración */}
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer border border-emerald-500/60"
                  title="Descargar copia de seguridad en JSON o subir archivo para restaurar registros"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="hidden xl:inline">Copia & Restaurar</span>
                  <span className="xl:hidden">Copia</span>
                </button>

                {/* Botón directo Guardar en Google Sheets */}
                <button
                  onClick={handleQuickSaveToSheets}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer border border-emerald-400/60 disabled:opacity-50"
                  title="Guardar todos los registros (asistencias, miembros y diezmos) directamente en Google Sheets"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden sm:inline">Guardando...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                      <span className="hidden md:inline">Guardar en Sheets</span>
                      <span className="md:hidden">Sheets</span>
                    </>
                  )}
                </button>

                <div
                  className="flex items-center gap-2 bg-emerald-900/60 border border-emerald-600/60 px-2.5 py-1 rounded-xl text-xs text-white"
                  title={`Conectado como ${activeSessionUser.email} (${ROLE_INFO[currentRole].label})`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                    currentRole === 'admin' ? 'bg-purple-600 text-white' :
                    currentRole === 'tesorero' ? 'bg-amber-600 text-white' :
                    'bg-sky-600 text-white'
                  }`}>
                    {activeSessionUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-bold text-[11px] leading-tight max-w-[120px] truncate">
                      {activeSessionUser.name}
                    </span>
                    <span className="text-[9px] text-emerald-200">
                      {user ? 'Google + Sheets' : 'Sesión local'}
                    </span>
                  </div>
                </div>

                {/* Botón oficial de Cerrar Sesión */}
                <button
                  onClick={() => handleLogout(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700/90 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer border border-rose-500/50"
                  title="Cerrar la sesión de inmediato y bloquear la aplicación web"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Banner de Rol Activo & Permisos Actuales */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Estás navegando como:</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentRoleConfig.badgeClass}`}>
              <CurrentRoleIcon className="w-3 h-3" />
              {currentRoleConfig.label}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 text-center sm:text-right">
            {currentRole === 'admin' && '👑 Acceso total: Usuarios, Tesorería, Asistencia, Directorio y Google Sheets.'}
            {currentRole === 'tesorero' && '💰 Acceso a: Módulo de Tesorería (diezmos/ofrendas/egresos) y Directorio en modo consulta.'}
            {currentRole === 'lider_asistencia' && '📋 Acceso a: Toma de Asistencia y Directorio de personas (crear, editar y borrar). Sin acceso a diezmos.'}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Avisos de Éxito / Errores Globales */}
        {(syncSuccess || syncError) && (
          <div className="mb-6 space-y-2">
            {syncSuccess && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 text-emerald-800 p-3.5 rounded-xl text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{syncSuccess}</span>
                </div>
                {sheetUrl && (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shrink-0 text-xs shadow-xs self-start sm:self-auto"
                  >
                    <span>Abrir Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
            {syncError && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-800 p-3.5 rounded-xl text-xs shadow-sm">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{syncError}</span>
              </div>
            )}
          </div>
        )}

        {/* Sección 1: Estadísticas (Admin y Tesorero) */}
        {activeTab === 'dashboard' && (
          !isLiderActive && canAccessTab('dashboard') ? (
            <StatsDashboard
              members={members}
              attendance={attendance}
              financialRecords={financialRecords}
              canViewTithes={!isLiderActive && currentRole !== 'lider_asistencia'}
              userRole={currentRole}
              onSelectMember={(member) => {
                setActiveTab('directorio');
                setEditingMember(member);
                if (currentRole !== 'tesorero') {
                  setShowMemberForm(true);
                }
              }}
            />
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-100 text-center space-y-3">
              <Lock className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Módulo Restringido</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                El panel general de estadísticas y métricas financieras está reservado para el Administrador y Tesorero.
              </p>
            </div>
          )
        )}

        {/* Sección 2: Tomar Asistencia (Admin o Líder de Asistencia) */}
        {activeTab === 'asistencia' && (
          canAccessTab('asistencia') ? (
            <AttendanceCheck
              members={members}
              attendance={attendance}
              onSaveAttendance={handleSaveAttendance}
              onSaveToSheets={handleQuickSaveToSheets}
              isSyncingSheets={isSyncing}
            />
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-100 text-center space-y-3">
              <Lock className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Módulo Restringido</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                La toma de asistencia está asignada al Administrador o Líder de Asistencia.
              </p>
            </div>
          )
        )}

        {/* Sección 3: Directorio de Personas */}
        {activeTab === 'directorio' && (
          <div className="space-y-6">
            {showMemberForm && currentRole !== 'tesorero' ? (
              <MemberForm
                member={editingMember}
                onSave={handleSaveMember}
                onCancel={() => {
                  setShowMemberForm(false);
                  setEditingMember(null);
                }}
              />
            ) : (
              <MemberList
                members={members}
                attendance={attendance}
                onAddMemberClick={() => {
                  setEditingMember(null);
                  setShowMemberForm(true);
                }}
                onEditMember={(m) => {
                  setEditingMember(m);
                  setShowMemberForm(true);
                }}
                onDeleteMember={handleDeleteMember}
                onToggleActive={handleToggleActive}
                readOnly={currentRole === 'tesorero'}
                currentUserName={activeSessionUser?.name || user?.displayName || 'Pastor Administrador'}
                userRole={ROLE_INFO[currentRole].label}
                onSaveToSheets={handleQuickSaveToSheets}
                isSyncingSheets={isSyncing}
                onOpenBackupModal={() => setIsBackupModalOpen(true)}
              />
            )}
          </div>
        )}

        {/* Sección 4: Tesorería y Finanzas (Admin y Tesorero) */}
        {activeTab === 'tesoreria' && (
          canAccessTab('tesoreria') ? (
            <TreasuryDashboard
              records={financialRecords}
              members={members}
              currentUserName={activeSessionUser?.name || user?.displayName || (currentRole === 'admin' ? 'Pastor Administrador' : 'Hermano Tesorero')}
              onAddRecord={handleAddFinancialRecord}
              onDeleteRecord={handleDeleteFinancialRecord}
              onSaveToSheets={handleQuickSaveToSheets}
              isSyncingSheets={isSyncing}
              onClearTreasury={handleClearTreasury}
            />
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-100 text-center space-y-3">
              <Lock className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Módulo de Tesorería Reservado</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Los registros de diezmos, ofrendas y finanzas son confidenciales y solo pueden ser gestionados por el Administrador o Tesorero.
              </p>
            </div>
          )
        )}

        {/* Sección 5: Gestión de Usuarios y Roles (Exclusivo Administrador) */}
        {activeTab === 'usuarios' && (
          activeSessionUser?.role === 'admin' && currentRole === 'admin' ? (
            <UserManagement
              users={users}
              currentUserId={user?.uid || 'u_admin'}
              currentUserRole={activeSessionUser?.role || 'admin'}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-100 text-center space-y-3">
              <Lock className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Acceso Exclusivo de Administrador</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Solo el usuario con rol de Administrador puede crear o gestionar usuarios, contraseñas y roles. Los demás roles tienen restringida esta sección.
              </p>
            </div>
          )
        )}

        {/* Sección 6: Google Sheets (Exclusivo Administrador) */}
        {activeTab === 'sheets' && (
          activeSessionUser?.role === 'admin' && currentRole === 'admin' ? (
            <SheetsSync
              user={user}
              accessToken={accessToken}
              needsAuth={needsAuth}
              isLoggingIn={isLoggingIn}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onImportFromSheets={handleImportFromSheets}
              onExportToSheets={handleExportToSheets}
            />
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-100 text-center space-y-3">
              <Lock className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Configuración Reservada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                La sincronización con Google Sheets está reservada exclusivamente para el Administrador.
              </p>
            </div>
          )
        )}
      </main>

      {/* Pie de Página */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 mt-20 text-center text-xs">
        <div className="max-w-md mx-auto flex flex-col items-center gap-2">
          <CenfolLogo variant="emblem" size={38} />
          <p className="font-semibold text-slate-300">CENFOL • Iglesia del Dios Altísimo</p>
          <p className="text-[11px] text-slate-400">Registro de Asistencia Dominical y Tesorería</p>
          <p className="text-[10px] text-slate-500 font-mono mt-1">
            Sistema con roles de Administrador, Tesorero y Líder de Asistencia
          </p>
        </div>
      </footer>

      {/* Alerta flotante cuando faltan 60s o menos para el cierre por inactividad (10 minutos) */}
      {showInactivityWarning && (activeSessionUser || user) && (
        <div 
          className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border-2 border-amber-400 p-4 animate-in slide-in-from-bottom-5 duration-300"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 animate-bounce">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  ¿Sigues conectado?
                </h4>
                <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                  {inactivitySecondsRemaining}s
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Por seguridad, tu sesión se cerrará automáticamente en <strong>{inactivitySecondsRemaining} segundos</strong> si no detecta actividad (límite de 10 min).
              </p>
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetInactivityTimer}
                  className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer text-center"
                >
                  Continuar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => handleLogout(false)}
                  className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cerrar Ya
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inicio de Sesión */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setInactivityNotice(null);
        }}
        users={users}
        onLoginSuccess={handleLoginSuccess}
        onGoogleSignIn={handleLogin}
        isLoggingInGoogle={isLoggingIn}
        inactivityNotice={inactivityNotice}
      />

      {/* Modal de Código HTML, CSS y JavaScript */}
      <HtmlExportModal
        isOpen={isHtmlModalOpen}
        onClose={() => setIsHtmlModalOpen(false)}
      />

      {/* Modal de Copia de Seguridad y Restauración */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        members={members}
        attendance={attendance}
        financialRecords={financialRecords}
        users={users}
        currentUserName={activeSessionUser?.name || user?.displayName || 'Pastor Administrador'}
        onRestore={handleRestoreBackup}
      />
    </div>
  );
}
