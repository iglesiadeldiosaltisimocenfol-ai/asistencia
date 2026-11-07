/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Member, MemberCategory } from '../types';
import { UserPlus, Save, X, RotateCcw } from 'lucide-react';

interface MemberFormProps {
  member?: Member | null; // Si está presente, es modo edición
  onSave: (memberData: Omit<Member, 'id' | 'createdAt'> & { id?: string }) => void;
  onCancel: () => void;
}

export default function MemberForm({ member, onSave, onCancel }: MemberFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<MemberCategory>('Hombres');
  const [active, setActive] = useState(true);

  // Cargar datos si es modo edición
  useEffect(() => {
    if (member) {
      setName(member.name);
      setPhone(member.phone);
      setAddress(member.address);
      setEmail(member.email);
      setCategory(member.category);
      setActive(member.active);
    } else {
      // Limpiar form para nuevo miembro
      setName('');
      setPhone('');
      setAddress('');
      setEmail('');
      setCategory('Hombres');
      setActive(true);
    }
  }, [member]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: member?.id,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      email: email.trim(),
      category,
      active,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6" id="member-form">
      <div className="flex justify-between items-center pb-4 border-b border-slate-50">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            {member ? 'Editar Miembro' : 'Registrar Nuevo Miembro'}
          </h3>
          <p className="text-xs text-slate-400">Complete los datos personales del asistente</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre completo */}
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Nombre Completo *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan Pérez Gómez"
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Celular */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Celular / Teléfono</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 3001234567"
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Correo Electrónico */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Correo Electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ej: juan.perez@correo.com"
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Dirección */}
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Dirección Residencial</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Calle 45 # 12-34 Barrio El Recreo"
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Categoría / Grupo */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Categoría (Asistencia)</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MemberCategory)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          >
            <option value="Hombres">Hombres</option>
            <option value="Mujeres">Mujeres</option>
            <option value="Niños">Niños (Niños varones)</option>
            <option value="Niñas">Niñas (Niñas hembras)</option>
          </select>
        </div>

        {/* Estado (Activo/Inactivo) */}
        <div className="space-y-1.5 flex flex-col justify-end">
          <div className="flex items-center gap-2 py-2.5">
            <input
              type="checkbox"
              id="active-member"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 accent-emerald-600"
            />
            <label htmlFor="active-member" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
              Miembro Activo
            </label>
          </div>
          <span className="text-[10px] text-slate-400">
            Los miembros inactivos no aparecerán en la toma de asistencia dominical.
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          {member ? 'Guardar Cambios' : 'Registrar Miembro'}
        </button>
      </div>
    </form>
  );
}
