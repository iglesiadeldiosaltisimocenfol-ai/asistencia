/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, AttendanceRecord, FinancialRecord, AppUser } from './types';
import { saveSharedSpreadsheetIdRealtime } from './realtimeService';

export interface SheetsSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

// Obtener el ID de la hoja guardado en localStorage o compartido
export const getSavedSpreadsheetId = (): string | null => {
  return localStorage.getItem('asistencia_dominical_sheet_id');
};

// Guardar el ID de la hoja en localStorage y en Firestore compartido
export const saveSpreadsheetId = (id: string) => {
  localStorage.setItem('asistencia_dominical_sheet_id', id);
  saveSharedSpreadsheetIdRealtime(id);
};

// Eliminar el ID de la hoja vinculada
export const disconnectSpreadsheet = () => {
  localStorage.removeItem('asistencia_dominical_sheet_id');
  saveSharedSpreadsheetIdRealtime(null);
};

/**
 * Crea una nueva hoja de cálculo en Google Sheets con pestañas para Miembros, Asistencias, Tesorería y Usuarios
 */
export const createAttendanceSpreadsheet = async (accessToken: string): Promise<SheetsSyncResult> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'Registro de Asistencia y Tesorería Dominical',
      },
      sheets: [
        {
          properties: {
            title: 'Miembros',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Asistencias',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Tesorería',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Usuarios',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error creating spreadsheet:', errText);
    throw new Error('No se pudo crear la hoja de cálculo en Google Drive.');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl;

  // Inicializar las cabeceras en las hojas
  await initializeSheetHeaders(spreadsheetId, accessToken);

  saveSpreadsheetId(spreadsheetId);

  return { spreadsheetId, spreadsheetUrl };
};

/**
 * Inicializa las cabeceras de las columnas en la hoja de cálculo recién creada
 */
const initializeSheetHeaders = async (spreadsheetId: string, accessToken: string) => {
  const updateData = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Miembros!A1:H1',
        values: [
          [
            'ID de Miembro',
            'Nombre Completo',
            'Celular',
            'Dirección',
            'Correo Electrónico',
            'Categoría (Género/Edad)',
            'Estado',
            'Fecha Registro',
          ],
        ],
      },
      {
        range: 'Asistencias!A1:B1',
        values: [['Fecha (Domingo)', 'IDs de Asistentes (Separados por coma)']],
      },
      {
        range: 'Tesorería!A1:H1',
        values: [
          [
            'ID Transacción',
            'Fecha',
            'Tipo',
            'Monto ($ COP)',
            'Concepto / Descripción',
            'Miembro Aportante',
            'Método de Pago',
            'Registrado Por',
          ],
        ],
      },
      {
        range: 'Usuarios!A1:F1',
        values: [
          [
            'ID Usuario',
            'Nombre Completo',
            'Correo Electrónico',
            'Celular',
            'Rol Asignado',
            'Estado',
          ],
        ],
      },
    ],
  };

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error writing headers:', errText);
    throw new Error('Error al inicializar las columnas en Google Sheets.');
  }
};

/**
 * Guarda todos los miembros en la pestaña "Miembros"
 */
export const syncMembersToSheets = async (
  spreadsheetId: string,
  accessToken: string,
  members: Member[]
): Promise<void> => {
  // Primero limpiamos los datos antiguos (excepto la cabecera) para evitar filas fantasmas si la lista disminuyó
  await clearSheetRange(spreadsheetId, accessToken, 'Miembros!A2:H1000');

  const rows = members.map((m) => [
    m.id || '',
    m.name || '',
    m.phone || '',
    m.email || '',
    m.address || '',
    m.category || 'Hombres',
    m.active ? 'Activo' : 'Inactivo',
    m.createdAt || '',
  ]);

  if (rows.length === 0) return;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Miembros!A2:H${rows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error syncing members:', errText);
    throw new Error('No se pudo guardar la lista de miembros en Google Sheets.');
  }
};

/**
 * Guarda todos los registros de asistencia en la pestaña "Asistencias"
 */
export const syncAttendanceToSheets = async (
  spreadsheetId: string,
  accessToken: string,
  records: AttendanceRecord[]
): Promise<void> => {
  await clearSheetRange(spreadsheetId, accessToken, 'Asistencias!A2:B1000');

  const rows = records.map((r) => [r.date || '', Array.isArray(r.presentIds) ? r.presentIds.join(',') : '']);

  if (rows.length === 0) return;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Asistencias!A2:B${rows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error syncing attendance:', errText);
    throw new Error('No se pudo guardar la asistencia en Google Sheets.');
  }
};

/**
 * Guarda todos los registros de tesorería en la pestaña "Tesorería"
 */
export const syncTreasuryToSheets = async (
  spreadsheetId: string,
  accessToken: string,
  records: FinancialRecord[]
): Promise<void> => {
  await clearSheetRange(spreadsheetId, accessToken, 'Tesorería!A2:H1000');

  const rows = records.map((r) => [
    r.id || '',
    r.date || '',
    r.type || '',
    r.amount || 0,
    r.description || '',
    r.memberName || 'General',
    r.paymentMethod || 'Efectivo',
    r.registeredBy || 'Admin',
  ]);

  if (rows.length === 0) return;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Tesorería!A2:H${rows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error syncing treasury:', errText);
    throw new Error('No se pudo guardar la tesorería en Google Sheets.');
  }
};

/**
 * Guarda los usuarios de la aplicación en la pestaña "Usuarios"
 */
export const syncUsersToSheets = async (
  spreadsheetId: string,
  accessToken: string,
  users: AppUser[]
): Promise<void> => {
  await clearSheetRange(spreadsheetId, accessToken, 'Usuarios!A2:F1000');

  const rows = users.map((u) => [
    u.id,
    u.name,
    u.email,
    u.phone || '',
    u.role,
    u.active ? 'Activo' : 'Inactivo',
  ]);

  if (rows.length === 0) return;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Usuarios!A2:F${rows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error syncing users:', errText);
    throw new Error('No se pudo guardar la lista de usuarios en Google Sheets.');
  }
};

/**
 * Limpia un rango de celdas específico en Google Sheets
 */
const clearSheetRange = async (spreadsheetId: string, accessToken: string, range: string) => {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    // Si la hoja no existe o falla por otro motivo lo registramos, pero continuamos
    console.warn(`No se pudo limpiar el rango ${range}, puede que esté vacío.`);
  }
};

/**
 * Carga todos los datos desde Google Sheets para reemplazar o inicializar el estado local
 */
export const loadDataFromSheets = async (
  spreadsheetId: string,
  accessToken: string
): Promise<{
  members: Member[];
  attendance: AttendanceRecord[];
  treasury: FinancialRecord[];
  users: AppUser[];
}> => {
  // 1. Cargar pestaña de Miembros
  const resMembers = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Miembros!A2:H1000`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  let members: Member[] = [];
  if (resMembers.ok) {
    const data = await resMembers.json();
    if (data.values && Array.isArray(data.values)) {
      members = data.values.map((row: any[]) => ({
        id: row[0] || '',
        name: row[1] || '',
        phone: row[2] || '',
        email: row[4] || '',
        address: row[3] || '',
        category: (row[5] as any) || 'Hombres',
        active: row[6] === 'Activo' || row[6] === 'Sí' || !row[6],
        createdAt: row[7] || new Date().toISOString().split('T')[0],
      })).filter((m) => m.id && m.name);
    }
  }

  // 2. Cargar pestaña de Asistencias
  const resAttendance = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Asistencias!A2:B1000`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  let attendance: AttendanceRecord[] = [];
  if (resAttendance.ok) {
    const data = await resAttendance.json();
    if (data.values && Array.isArray(data.values)) {
      attendance = data.values.map((row: any[]) => ({
        date: row[0] || '',
        presentIds: row[1] ? row[1].split(',').filter(Boolean) : [],
      })).filter((r) => r.date);
    }
  }

  // 3. Cargar pestaña de Tesorería (si existe)
  let treasury: FinancialRecord[] = [];
  try {
    const resTreasury = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Tesorería!A2:H1000')}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (resTreasury.ok) {
      const data = await resTreasury.json();
      if (data.values && Array.isArray(data.values)) {
        treasury = data.values.map((row: any[]) => ({
          id: row[0] || 'fin_' + Math.random(),
          date: row[1] || new Date().toISOString().split('T')[0],
          type: (row[2] as any) || 'ofrenda',
          amount: parseFloat(row[3]) || 0,
          description: row[4] || '',
          memberName: row[5] === 'General' ? undefined : row[5],
          paymentMethod: (row[6] as any) || 'Efectivo',
          registeredBy: row[7] || 'Tesorero',
          createdAt: row[1] || new Date().toISOString().split('T')[0],
        })).filter((t) => t.amount > 0);
      }
    }
  } catch (err) {
    console.warn('Pestaña Tesorería no disponible en Sheets aún:', err);
  }

  // 4. Cargar pestaña de Usuarios (si existe)
  let users: AppUser[] = [];
  try {
    const resUsers = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Usuarios!A2:F1000`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (resUsers.ok) {
      const data = await resUsers.json();
      if (data.values && Array.isArray(data.values)) {
        users = data.values.map((row: any[]) => ({
          id: row[0] || 'u_' + Math.random(),
          name: row[1] || '',
          email: row[2] || '',
          phone: row[3] || '',
          role: (row[4] as any) || 'lider_asistencia',
          active: row[5] === 'Activo' || !row[5],
          createdAt: new Date().toISOString().split('T')[0],
        })).filter((u) => u.name && u.email);
      }
    }
  } catch (err) {
    console.warn('Pestaña Usuarios no disponible en Sheets aún:', err);
  }

  return { members, attendance, treasury, users };
};
