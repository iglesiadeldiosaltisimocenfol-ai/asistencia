/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './index.ts';
import { members, attendance, financialRecords, users } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import type { Member, AttendanceRecord, FinancialRecord, AppUser } from '../types.ts';

// ==========================================
// OPERACIONES DE MIEMBROS (DIRECTORIO)
// ==========================================

export async function getMembersFromDb(): Promise<Member[]> {
  try {
    const rows = await db.select().from(members).orderBy(members.name);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || '',
      email: r.email || '',
      address: r.address || '',
      neighborhood: r.neighborhood || '',
      category: r.category as any,
      active: r.active,
      createdAt: r.createdAt || '',
    }));
  } catch (error) {
    console.error('Error fetching members from DB:', error);
    throw new Error('No se pudo obtener la lista de miembros de la base de datos.', { cause: error });
  }
}

export async function upsertMemberInDb(m: Member): Promise<Member> {
  try {
    await db.insert(members)
      .values({
        id: m.id,
        name: m.name,
        phone: m.phone || '',
        email: m.email || '',
        address: m.address || '',
        neighborhood: m.neighborhood || '',
        category: m.category,
        active: m.active,
        createdAt: m.createdAt || new Date().toISOString().split('T')[0],
      })
      .onConflictDoUpdate({
        target: members.id,
        set: {
          name: m.name,
          phone: m.phone || '',
          email: m.email || '',
          address: m.address || '',
          neighborhood: m.neighborhood || '',
          category: m.category,
          active: m.active,
        },
      });

    return m;
  } catch (error) {
    console.error('Error upserting member in DB:', error);
    throw new Error('No se pudo guardar el miembro en la base de datos.', { cause: error });
  }
}

export async function deleteMemberFromDb(id: string): Promise<boolean> {
  try {
    await db.delete(members).where(eq(members.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting member from DB:', error);
    throw new Error('No se pudo eliminar el miembro de la base de datos.', { cause: error });
  }
}

// ==========================================
// OPERACIONES DE ASISTENCIA
// ==========================================

export async function getAttendanceFromDb(): Promise<AttendanceRecord[]> {
  try {
    const rows = await db.select().from(attendance).orderBy(desc(attendance.date));
    return rows.map((r) => ({
      date: r.date,
      presentIds: (() => {
        try {
          return JSON.parse(r.presentIds);
        } catch {
          return r.presentIds ? r.presentIds.split(',').filter(Boolean) : [];
        }
      })(),
    }));
  } catch (error) {
    console.error('Error fetching attendance from DB:', error);
    throw new Error('No se pudo obtener el registro de asistencia de la base de datos.', { cause: error });
  }
}

export async function upsertAttendanceInDb(record: AttendanceRecord): Promise<AttendanceRecord> {
  try {
    const presentIdsStr = JSON.stringify(record.presentIds || []);
    await db.insert(attendance)
      .values({
        date: record.date,
        presentIds: presentIdsStr,
      })
      .onConflictDoUpdate({
        target: attendance.date,
        set: {
          presentIds: presentIdsStr,
        },
      });

    return record;
  } catch (error) {
    console.error('Error upserting attendance in DB:', error);
    throw new Error('No se pudo guardar la asistencia en la base de datos.', { cause: error });
  }
}

// ==========================================
// OPERACIONES DE TESORERÍA
// ==========================================

export async function getFinancialRecordsFromDb(): Promise<FinancialRecord[]> {
  try {
    const rows = await db.select().from(financialRecords).orderBy(desc(financialRecords.date));
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      type: r.type as any,
      amount: r.amount,
      description: r.description,
      memberName: r.memberName || undefined,
      paymentMethod: r.paymentMethod as any,
      registeredBy: r.registeredBy,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching treasury records from DB:', error);
    throw new Error('No se pudieron obtener los registros de tesorería de la base de datos.', { cause: error });
  }
}

export async function upsertFinancialRecordInDb(record: FinancialRecord): Promise<FinancialRecord> {
  try {
    await db.insert(financialRecords)
      .values({
        id: record.id,
        date: record.date,
        type: record.type,
        amount: Math.round(record.amount),
        description: record.description || '',
        memberName: record.memberName || null,
        paymentMethod: record.paymentMethod || 'Efectivo',
        registeredBy: record.registeredBy || '',
        createdAt: record.createdAt || record.date,
      })
      .onConflictDoUpdate({
        target: financialRecords.id,
        set: {
          date: record.date,
          type: record.type,
          amount: Math.round(record.amount),
          description: record.description || '',
          memberName: record.memberName || null,
          paymentMethod: record.paymentMethod || 'Efectivo',
          registeredBy: record.registeredBy || '',
        },
      });

    return record;
  } catch (error) {
    console.error('Error upserting financial record in DB:', error);
    throw new Error('No se pudo guardar el registro financiero en la base de datos.', { cause: error });
  }
}

export async function deleteFinancialRecordFromDb(id: string): Promise<boolean> {
  try {
    await db.delete(financialRecords).where(eq(financialRecords.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting financial record from DB:', error);
    throw new Error('No se pudo eliminar el registro de tesorería de la base de datos.', { cause: error });
  }
}
