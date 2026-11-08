/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dbQueries from './src/db/queries.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ==========================================
// RUTAS API PARA EL FORMULARIO Y DIRECTORIO
// ==========================================

// Obtener lista completa de miembros desde PostgreSQL
app.get('/api/members', async (_req, res) => {
  try {
    const list = await dbQueries.getMembersFromDb();
    res.json(list);
  } catch (err: any) {
    console.error('Error in GET /api/members:', err);
    res.status(500).json({ error: err.message || 'Error al obtener miembros' });
  }
});

// Guardar o actualizar miembro desde el formulario
app.post('/api/members', async (req, res) => {
  try {
    const memberData = req.body;
    if (!memberData || !memberData.name) {
      return res.status(400).json({ error: 'El nombre del miembro es obligatorio.' });
    }
    const saved = await dbQueries.upsertMemberInDb({
      id: memberData.id || `member_${Date.now()}`,
      name: memberData.name.trim(),
      phone: memberData.phone || '',
      email: memberData.email || '',
      address: memberData.address || '',
      neighborhood: memberData.neighborhood || '',
      category: memberData.category || 'Hombres',
      active: memberData.active !== false,
      createdAt: memberData.createdAt || new Date().toISOString().split('T')[0],
    });
    res.json({ success: true, member: saved });
  } catch (err: any) {
    console.error('Error in POST /api/members:', err);
    res.status(500).json({ error: err.message || 'Error al guardar miembro en la base de datos' });
  }
});

// Eliminar miembro
app.delete('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbQueries.deleteMemberFromDb(id);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error in DELETE /api/members:', err);
    res.status(500).json({ error: err.message || 'Error al eliminar miembro' });
  }
});

// ==========================================
// RUTAS DE ASISTENCIA
// ==========================================

app.get('/api/attendance', async (_req, res) => {
  try {
    const records = await dbQueries.getAttendanceFromDb();
    res.json(records);
  } catch (err: any) {
    console.error('Error in GET /api/attendance:', err);
    res.status(500).json({ error: err.message || 'Error al obtener asistencias' });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const record = req.body;
    if (!record || !record.date) {
      return res.status(400).json({ error: 'La fecha es obligatoria' });
    }
    const saved = await dbQueries.upsertAttendanceInDb(record);
    res.json({ success: true, record: saved });
  } catch (err: any) {
    console.error('Error in POST /api/attendance:', err);
    res.status(500).json({ error: err.message || 'Error al guardar asistencia' });
  }
});

// ==========================================
// RUTAS DE TESORERÍA
// ==========================================

app.get('/api/treasury', async (_req, res) => {
  try {
    const records = await dbQueries.getFinancialRecordsFromDb();
    res.json(records);
  } catch (err: any) {
    console.error('Error in GET /api/treasury:', err);
    res.status(500).json({ error: err.message || 'Error al obtener tesorería' });
  }
});

app.post('/api/treasury', async (req, res) => {
  try {
    const record = req.body;
    if (!record || !record.id || !record.date) {
      return res.status(400).json({ error: 'El registro debe incluir id y fecha' });
    }
    const saved = await dbQueries.upsertFinancialRecordInDb(record);
    res.json({ success: true, record: saved });
  } catch (err: any) {
    console.error('Error in POST /api/treasury:', err);
    res.status(500).json({ error: err.message || 'Error al guardar registro en tesorería' });
  }
});

app.delete('/api/treasury/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbQueries.deleteFinancialRecordFromDb(id);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error in DELETE /api/treasury:', err);
    res.status(500).json({ error: err.message || 'Error al eliminar registro de tesorería' });
  }
});

// ==========================================
// RUTA DE RESTAURACIÓN / IMPORTACIÓN COMPLETA
// ==========================================
app.post('/api/restore', async (req, res) => {
  try {
    const { members: newMembers, attendance: newAttendance, treasury: newTreasury } = req.body;
    let membersCount = 0;
    let attendanceCount = 0;
    let treasuryCount = 0;

    if (Array.isArray(newMembers)) {
      for (const m of newMembers) {
        if (m && m.name) {
          await dbQueries.upsertMemberInDb(m);
          membersCount++;
        }
      }
    }

    if (Array.isArray(newAttendance)) {
      for (const a of newAttendance) {
        if (a && a.date) {
          await dbQueries.upsertAttendanceInDb(a);
          attendanceCount++;
        }
      }
    }

    if (Array.isArray(newTreasury)) {
      for (const t of newTreasury) {
        if (t && t.id && t.date) {
          await dbQueries.upsertFinancialRecordInDb(t);
          treasuryCount++;
        }
      }
    }

    res.json({
      success: true,
      restored: {
        members: membersCount,
        attendance: attendanceCount,
        treasury: treasuryCount,
      },
    });
  } catch (err: any) {
    console.error('Error in POST /api/restore:', err);
    res.status(500).json({ error: err.message || 'Error al restaurar datos en la base de datos' });
  }
});

// ==========================================
// VITE DEV SERVER / ARCHIVOS ESTÁTICOS
// ==========================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Modo Desarrollo: Integrar Vite middlewares para HMR y React
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Modo Producción: Servir archivos estáticos construidos
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
