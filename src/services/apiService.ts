/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, AttendanceRecord, FinancialRecord } from '../types';

/**
 * Guarda o actualiza un miembro en la base de datos PostgreSQL (equivalente Supabase / Cloud SQL)
 */
export async function saveMemberToDb(member: Member): Promise<void> {
  try {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Advertencia al guardar miembro en BD:', err);
    }
  } catch (err) {
    console.warn('Error de red al guardar en base de datos PostgreSQL:', err);
  }
}

/**
 * Obtiene los miembros almacenados en la base de datos PostgreSQL
 */
export async function fetchMembersFromDb(): Promise<Member[] | null> {
  try {
    const res = await fetch('/api/members');
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return null;
  } catch (err) {
    console.warn('Error al consultar miembros desde base de datos PostgreSQL:', err);
    return null;
  }
}

export async function seedDatabaseIfEmpty(initialMembers: Member[]): Promise<void> {
  try {
    const existing = await fetchMembersFromDb();
    if (existing && existing.length === 0) {
      for (const m of initialMembers) {
        await saveMemberToDb(m);
      }
    }
  } catch (err) {
    console.warn('Error al sembrar datos en BD:', err);
  }
}

/**
 * Elimina un miembro en la base de datos PostgreSQL
 */
export async function deleteMemberFromDb(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/members/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.warn('No se pudo eliminar en BD PostgreSQL');
    }
  } catch (err) {
    console.warn('Error al eliminar en base de datos PostgreSQL:', err);
  }
}

/**
 * Guarda un registro de asistencia en PostgreSQL
 */
export async function saveAttendanceToDb(record: AttendanceRecord): Promise<void> {
  try {
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch (err) {
    console.warn('Error al guardar asistencia en PostgreSQL:', err);
  }
}

/**
 * Obtiene las asistencias desde PostgreSQL
 */
export async function fetchAttendanceFromDb(): Promise<AttendanceRecord[] | null> {
  try {
    const res = await fetch('/api/attendance');
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.warn('Error al consultar asistencias en PostgreSQL:', err);
    return null;
  }
}

/**
 * Guarda un registro de tesorería en PostgreSQL
 */
export async function saveTreasuryToDb(record: FinancialRecord): Promise<void> {
  try {
    await fetch('/api/treasury', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch (err) {
    console.warn('Error al guardar tesorería en PostgreSQL:', err);
  }
}

/**
 * Elimina un registro de tesorería en PostgreSQL
 */
export async function deleteTreasuryFromDb(id: string): Promise<void> {
  try {
    await fetch(`/api/treasury/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Error al eliminar de tesorería en PostgreSQL:', err);
  }
}

/**
 * Obtiene los registros de tesorería desde PostgreSQL
 */
export async function fetchTreasuryFromDb(): Promise<FinancialRecord[] | null> {
  try {
    const res = await fetch('/api/treasury');
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.warn('Error al consultar tesorería en PostgreSQL:', err);
    return null;
  }
}
