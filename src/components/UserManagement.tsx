/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppUser, AppRole } from '../types';
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Coins, 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  HelpCircle,
  Lock,
  Mail,
  Phone,
  UserCheck,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';

interface UserManagementProps {
  users: AppUser[];
  currentUserId?: string;
  currentUserRole?: AppRole;
  onAddUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => void;
  onUpdateUser: (id: string, updates: Partial<AppUser>) => void;
  onDeleteUser: (id: string) => void;
}

export const ROLE_INFO: Record<AppRole, { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  admin: {
    label: 'Administrador',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: ShieldCheck,
    description: 'Control total del sistema: puede ver y crear usuarios, configurar roles, gestionar tesorería, asistencia y sincronización con Google Sheets.',
  },
  tesorero: {
    label: 'Tesorero',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Coins,
    description: 'Gestión financiera de la iglesia: registro de diezmos, ofrendas dominicales, donaciones y egresos. Consulta de directorio para vinculación.',
  },
  lider_asistencia: {
    label: 'Líder de Asistencia',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: ClipboardCheck,
    description: 'Toma y control de asistencia dominical, administración completa del directorio (crear, editar y borrar personas) y alertas de inasistencias. Sin acceso a diezmos ni finanzas.',
  },
};

export default function UserManagement({
  users,
  currentUserId,
  currentUserRole = 'admin',
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: UserManagementProps) {
  const isAdmin = currentUserRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AppRole>('lider_asistencia');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    if (!isAdmin) {
      alert('Solo el usuario Administrador tiene autorización para crear nuevos usuarios y contraseñas.');
      return;
    }
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('lider_asistencia');
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: AppUser) => {
    if (!isAdmin) {
      alert('Solo el usuario Administrador tiene autorización para modificar usuarios, contraseñas o roles.');
      return;
    }
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || '');
    setPassword(user.password || '');
    setRole(user.role);
    setActive(user.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAdmin) {
      setFormError('Acceso denegado: Solo el Administrador tiene autorización para registrar o modificar usuarios.');
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName) {
      setFormError('El nombre completo es requerido.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // Check duplicate email (if adding or updating to a different email)
    const duplicate = users.find(
      (u) => u.email.toLowerCase() === cleanEmail && (!editingUser || u.id !== editingUser.id)
    );
    if (duplicate) {
      setFormError('Ya existe un usuario registrado con este correo electrónico.');
      return;
    }

    if (editingUser) {
      onUpdateUser(editingUser.id, {
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim(),
        password: cleanPassword,
        role,
        active,
      });
    } else {
      onAddUser({
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim(),
        password: cleanPassword,
        role,
        active,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (user: AppUser) => {
    if (!isAdmin) {
      alert('Solo el Administrador tiene autorización para eliminar usuarios.');
      return;
    }

    if (user.id === currentUserId) {
      alert('No puedes eliminar tu propio usuario en sesión activa.');
      return;
    }

    const confirmed = window.confirm(
      `¿Está seguro de eliminar al usuario "${user.name}" (${ROLE_INFO[user.role].label})? Perderá el acceso asignado al sistema.`
    );
    if (confirmed) {
      onDeleteUser(user.id);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    const matchesRole = selectedRoleFilter === 'Todos' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6" id="user-management-section">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Administración de Usuarios y Roles</h2>
              <p className="text-xs text-slate-500">
                Gestiona los accesos del equipo pastoral: Administradores, Tesoreros y Líderes de Asistencia
              </p>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Crear Nuevo Usuario
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Creación Exclusiva de Administrador</span>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-950">
              Permisos Restringidos por Rol ({ROLE_INFO[currentUserRole]?.label || currentUserRole})
            </p>
            <p className="text-amber-900/90 leading-relaxed text-[11px]">
              La creación de usuarios, asignación de roles y configuración de contraseñas está reservada exclusivamente para el <strong>Administrador</strong>. Los demás roles no tienen autorización para dar de alta ni modificar cuentas.
            </p>
          </div>
        </div>
      )}

      {/* Permissions Matrix Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-slate-50 to-indigo-50 border border-purple-100 rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-600" />
          Matriz de Permisos por Rol
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Admin */}
          <div className="bg-white/80 p-3.5 rounded-lg border border-purple-100 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Administrador</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {ROLE_INFO.admin.description}
            </p>
            <div className="text-[10px] text-purple-700 font-semibold bg-purple-50 p-1.5 rounded">
              ✓ Ver/Crear Usuarios • ✓ Tesorería • ✓ Asistencia • ✓ Sheets
            </div>
          </div>

          {/* Tesorero */}
          <div className="bg-white/80 p-3.5 rounded-lg border border-amber-100 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Tesorero</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {ROLE_INFO.tesorero.description}
            </p>
            <div className="text-[10px] text-amber-700 font-semibold bg-amber-50 p-1.5 rounded">
              ✓ Diezmos/Ofrendas • ✓ Gastos/Egresos • ✓ Directorio (Consulta)
            </div>
          </div>

          {/* Líder de Asistencia */}
          <div className="bg-white/80 p-3.5 rounded-lg border border-sky-100 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sky-900">
              <ClipboardCheck className="w-4 h-4 text-sky-600" />
              <span>Líder de Asistencia</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {ROLE_INFO.lider_asistencia.description}
            </p>
            <div className="text-[10px] text-sky-700 font-semibold bg-sky-50 p-1.5 rounded">
              ✓ Tomar Asistencia • ✓ Gestión Directorio • ✓ Alertas de Faltas
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, correo o celular..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filtrar por rol:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="Todos">Todos los roles ({users.length})</option>
            <option value="admin">Administradores ({users.filter((u) => u.role === 'admin').length})</option>
            <option value="tesorero">Tesoreros ({users.filter((u) => u.role === 'tesorero').length})</option>
            <option value="lider_asistencia">Líderes de Asistencia ({users.filter((u) => u.role === 'lider_asistencia').length})</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Rol Asignado</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Fecha Alta</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-xs">No se encontraron usuarios registrados.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLE_INFO[user.role];
                  const RoleIcon = roleConfig.icon;
                  const isCurrent = user.id === currentUserId;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            user.role === 'admin' ? 'bg-purple-600 text-white' :
                            user.role === 'tesorero' ? 'bg-amber-600 text-white' :
                            'bg-sky-600 text-white'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-300" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {user.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{user.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No registrado</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${roleConfig.badgeClass}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <button
                            onClick={() => onUpdateUser(user.id, { active: !user.active })}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                              user.active
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            }`}
                            title="Haga clic para alternar estado"
                          >
                            {user.active ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Activo
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Inactivo
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              user.active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {user.active ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Activo
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Inactivo
                              </>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {user.createdAt}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-purple-700 rounded-lg transition-colors cursor-pointer"
                              title="Editar usuario o rol"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={isCurrent}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isCurrent
                                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                                  : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer'
                              }`}
                              title={isCurrent ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Solo Administrador</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {editingUser ? 'Editar Usuario y Permisos' : 'Crear Nuevo Usuario'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingUser
                    ? 'Modifica los datos personales o el rol asignado a este colaborador.'
                    : 'Registra un nuevo miembro del equipo pastoral con su rol correspondiente.'}
                </p>
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

            <form onSubmit={handleSave} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pastor Carlos Méndez, Diaconisa Martha..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Correo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico (Google / Cuenta) *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Este correo servirá para vincular su inicio de sesión mediante Google.
                </p>
              </div>

              {/* Celular */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono / Celular (Opcional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 300 123 4567"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Contraseña de acceso */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña de Acceso * (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña de acceso"
                    className="w-full text-xs pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Permite al usuario iniciar sesión directamente con su correo o usuario y esta contraseña.
                </p>
              </div>

              {/* Selección de Rol */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rol Asignado *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {/* Administrador */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      role === 'admin'
                        ? 'border-purple-500 bg-purple-50/60 ring-1 ring-purple-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value="admin"
                      checked={role === 'admin'}
                      onChange={() => setRole('admin')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        Administrador
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Puede ver y crear usuarios, configurar roles, tesorería completa, asistencia y sincronización con Sheets.
                      </p>
                    </div>
                  </label>

                  {/* Tesorero */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      role === 'tesorero'
                        ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value="tesorero"
                      checked={role === 'tesorero'}
                      onChange={() => setRole('tesorero')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        Tesorero
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Gestión financiera exclusiva: diezmos, ofrendas dominicales, gastos y reportes de tesorería.
                      </p>
                    </div>
                  </label>

                  {/* Líder de Asistencia */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      role === 'lider_asistencia'
                        ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value="lider_asistencia"
                      checked={role === 'lider_asistencia'}
                      onChange={() => setRole('lider_asistencia')}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <ClipboardCheck className="w-3.5 h-3.5 text-sky-600" />
                        Líder de Asistencia
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Toma la asistencia cada domingo, registra personas en el directorio y revisa alertas de inasistencias.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Estado Activo */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Usuario Activo con Acceso Habilitado</span>
                </label>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {editingUser ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
