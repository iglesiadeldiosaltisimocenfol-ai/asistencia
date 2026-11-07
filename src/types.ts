/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MemberCategory = 'Hombres' | 'Mujeres' | 'Niños' | 'Niñas';

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  category: MemberCategory;
  active: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  date: string; // Formato YYYY-MM-DD (los domingos)
  presentIds: string[]; // IDs de miembros que asistieron
}

// Roles de la aplicación
export type AppRole = 'admin' | 'tesorero' | 'lider_asistencia';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AppRole;
  password?: string; // Contraseña para inicio de sesión directo
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

// Módulo de Tesorería para el rol Tesorero y Administrador
export type TransactionType = 'diezmo' | 'ofrenda' | 'donacion' | 'gasto';
export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Datafono' | 'Otro';

export interface FinancialRecord {
  id: string;
  date: string; // Formato YYYY-MM-DD
  type: TransactionType;
  amount: number;
  description: string;
  memberId?: string; // Vinculado a un miembro para diezmos o donaciones
  memberName?: string;
  paymentMethod: PaymentMethod;
  registeredBy: string; // Nombre del usuario que registró
  createdAt: string;
}

