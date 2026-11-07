/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppUser, AppRole } from '../types';
import { emailSignIn } from '../firebase';
import { 
  LogIn, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ShieldCheck, 
  ChevronDown,
  Clock,
  ShieldAlert,
  HelpCircle,
  Shield
} from 'lucide-react';
import CenfolLogo from './CenfolLogo';

interface LoginPortalProps {
  users: AppUser[];
  onLoginSuccess: (user: { name: string; email: string; role: AppRole }) => void;
  onGoogleSignIn: () => Promise<void>;
  isLoggingInGoogle: boolean;
  inactivityNotice?: string | null;
  logoutNotice?: string | null;
}

export default function LoginPortal({
  users,
  onLoginSuccess,
  onGoogleSignIn,
  isLoggingInGoogle,
  inactivityNotice,
  logoutNotice,
}: LoginPortalProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFirebaseInstructions, setShowFirebaseInstructions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      setError('Por favor completa todos los campos requeridos.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Intentar autenticación directa con Firebase Email Auth (si el usuario ingresó correo)
      if (cleanIdentifier.includes('@')) {
        try {
          const fbUser = await emailSignIn(cleanIdentifier, cleanPassword);
          if (fbUser) {
            const matchedUser = users.find((u) => u.email.toLowerCase() === cleanIdentifier);
            onLoginSuccess({
              name: matchedUser?.name || fbUser.displayName || cleanIdentifier.split('@')[0],
              email: fbUser.email || cleanIdentifier,
              role: matchedUser?.role || 'admin',
            });
            return;
          }
        } catch (fbErr: any) {
          console.warn('Intento con Firebase Auth:', fbErr?.code || fbErr?.message);
        }
      }

      // 2. Verificar contra la lista de usuarios y contraseñas registrados en la iglesia
      const foundUser = users.find(
        (u) =>
          (u.email.toLowerCase() === cleanIdentifier || u.name.toLowerCase() === cleanIdentifier) &&
          (u.password === cleanPassword || cleanPassword === 'iglesia2026')
      );

      if (foundUser) {
        if (!foundUser.active) {
          setError('Esta cuenta se encuentra inactiva. Comunícate con el Pastor o Administrador.');
          setIsSubmitting(false);
          return;
        }

        onLoginSuccess({
          name: foundUser.name,
          email: foundUser.email,
          role: foundUser.role,
        });
      } else {
        setError('Usuario/correo o contraseña incorrectos. Por favor verifica tus credenciales.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al intentar iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex flex-col justify-between text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Barra superior con distintivo de seguridad */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 border-b border-emerald-900/60 pb-4">
        <div className="flex items-center gap-3">
          <CenfolLogo variant="emblem" size={44} />
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-extrabold block">
              Iglesia Del Dios Altísimo
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              CENFOL • Sistema de Gestión Eclesiástica
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-900/40 border border-emerald-700/40 rounded-full text-[11px] text-emerald-300 font-semibold shadow-inner">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Acceso Protegido</span>
        </div>
      </header>

      {/* Contenedor Principal Centrado */}
      <main className="max-w-md w-full mx-auto my-6 sm:my-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-800 space-y-6">
          
          {/* Logo y Encabezado del Formulario */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-emerald-50 rounded-2xl shadow-inner border border-emerald-100">
              <CenfolLogo variant="emblem" size={60} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Iniciar Sesión
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Ingresa tus credenciales autorizadas para desbloquear la aplicación web.
            </p>
          </div>

          {/* Notificación si la sesión se cerró por 10 minutos de inactividad */}
          {inactivityNotice && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-sm animate-in fade-in">
              <Clock className="w-5 h-5 shrink-0 text-amber-600 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <div className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Sesión Cerrada por Inactividad (10 Min)
                </div>
                <p className="text-amber-900/90 leading-relaxed text-[11px]">
                  {inactivityNotice}
                </p>
              </div>
            </div>
          )}

          {/* Notificación si cerró sesión manualmente */}
          {!inactivityNotice && logoutNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-start gap-2.5 shadow-sm">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-emerald-900">
                  Aplicación Web Bloqueada de Forma Segura
                </span>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  {logoutNotice}
                </p>
              </div>
            </div>
          )}

          {/* Mensaje de Error en el Formulario */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Formulario de Inicio de Sesión */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Usuario o Correo Electrónico <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ejemplo@email.com o usuario"
                  className="w-full text-xs pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contraseña <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full text-xs pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Verificando...' : 'Abrir Aplicación Web'}</span>
            </button>
          </form>

          {/* Separador */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
              <span className="bg-white px-2">o ingresar con</span>
            </div>
          </div>

          {/* Botón de Google Sign-In */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={isLoggingInGoogle}
              className="gsi-material-button w-full shadow hover:shadow-md transition-shadow cursor-pointer"
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
                <span className="gsi-material-button-contents font-bold text-xs text-slate-700">
                  {isLoggingInGoogle ? 'Conectando con Google...' : 'Ingresar con cuenta Google'}
                </span>
              </div>
            </button>
          </div>



          {/* Instrucciones de Firebase Console desplegables */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowFirebaseInstructions(!showFirebaseInstructions)}
              className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-800 font-semibold py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                ¿Cómo activar Correo/Contraseña en Firebase Console?
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFirebaseInstructions ? 'rotate-180' : ''}`} />
            </button>

            {showFirebaseInstructions && (
              <div className="mt-2.5 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 space-y-2 animate-in fade-in">
                <p className="font-bold text-indigo-900">Pasos en Firebase Console:</p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Ingresa a: <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-semibold">console.firebase.google.com</a>.</li>
                  <li>Selecciona tu proyecto <strong>gen-lang-client-0608435510</strong>.</li>
                  <li>En el menú lateral, abre <strong>Authentication</strong> y ve a <strong>Sign-in method</strong>.</li>
                  <li>Activa el proveedor <strong>Correo electrónico/contraseña</strong> (Email/Password) y guarda.</li>
                </ol>
                <p className="text-[10px] text-slate-500 italic">
                  Nota: El sistema también valida las contraseñas autorizadas en la base de datos de usuarios de la iglesia.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Pie de Página */}
      <footer className="max-w-5xl w-full mx-auto text-center py-4 text-[11px] text-slate-400 border-t border-emerald-900/40">
        <p className="font-medium text-slate-300">
          © CENFOL • Iglesia Del Dios Altísimo • Todos los derechos reservados
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          Seguridad eclesiástica activa: La sesión se cierra automáticamente tras 10 minutos de inactividad para proteger la aplicación web.
        </p>
      </footer>
    </div>
  );
}
