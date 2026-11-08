/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pgTable, text, serial, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

// Tabla de Usuarios del Sistema (Vinculada con Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabla del Directorio de Miembros (Congregación CENFOL)
export const members = pgTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  address: text('address').notNull().default(''),
  neighborhood: text('neighborhood').notNull().default(''),
  category: text('category').notNull().default('Hombres'),
  active: boolean('active').notNull().default(true),
  createdAt: text('created_at').notNull().default(''),
});

// Tabla de Asistencia Dominical
export const attendance = pgTable('attendance', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  presentIds: text('present_ids').notNull().default('[]'), // JSON array de IDs
});

// Tabla de Tesorería (Diezmos, Ofrendas, Egresos)
export const financialRecords = pgTable('financial_records', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  type: text('type').notNull().default('ofrenda'), // diezmo | ofrenda | pro_templo | mision | otro
  amount: integer('amount').notNull().default(0),
  description: text('description').notNull().default(''),
  memberName: text('member_name'),
  paymentMethod: text('payment_method').notNull().default('Efectivo'),
  registeredBy: text('registered_by').notNull().default(''),
  createdAt: text('created_at').notNull().default(''),
});
