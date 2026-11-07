/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Member, AttendanceRecord, FinancialRecord, AppUser } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Info/Warning: ', JSON.stringify(errInfo));
}

// ==========================================
// 1. SUSCRIPCIONES EN TIEMPO REAL (onSnapshot)
// ==========================================

/**
 * Escucha cambios en tiempo real en la colección de miembros.
 * Cualquier cambio hecho en un celular se refleja de inmediato en todos los demás dispositivos.
 */
export const subscribeToMembers = (
  onData: (members: Member[]) => void,
  onError?: (err: any) => void
): Unsubscribe => {
  const path = 'members';
  const colRef = collection(db, path);
  
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Member[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Member;
        list.push({ ...data, id: docSnap.id });
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
};

/**
 * Escucha cambios en tiempo real en los registros de asistencia.
 */
export const subscribeToAttendance = (
  onData: (records: AttendanceRecord[]) => void,
  onError?: (err: any) => void
): Unsubscribe => {
  const path = 'attendance';
  const colRef = collection(db, path);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AttendanceRecord;
        list.push({
          date: data.date || docSnap.id,
          presentIds: Array.isArray(data.presentIds) ? data.presentIds : [],
        });
      });
      // Ordenar por fecha descendente
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
};

/**
 * Escucha movimientos de tesorería (diezmos, ofrendas, gastos) en tiempo real.
 */
export const subscribeToTreasury = (
  onData: (records: FinancialRecord[]) => void,
  onError?: (err: any) => void
): Unsubscribe => {
  const path = 'treasury';
  const colRef = collection(db, path);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: FinancialRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FinancialRecord;
        list.push({ ...data, id: docSnap.id });
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
};

/**
 * Escucha cambios en la lista de usuarios y roles autorizados en tiempo real.
 */
export const subscribeToUsers = (
  onData: (users: AppUser[]) => void,
  onError?: (err: any) => void
): Unsubscribe => {
  const path = 'users';
  const colRef = collection(db, path);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AppUser;
        list.push({ ...data, id: docSnap.id });
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
};

/**
 * Limpia cualquier campo con valor `undefined` antes de guardar en Firestore,
 * evitando que la base de datos rechace la escritura por campos opcionales.
 */
export function sanitizeData<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

// ==========================================
// 2. OPERACIONES DE ESCRITURA EN TIEMPO REAL
// ==========================================

export const saveMemberRealtime = async (member: Member): Promise<void> => {
  const path = `members/${member.id}`;
  try {
    const docRef = doc(db, 'members', member.id);
    await setDoc(docRef, sanitizeData(member), { merge: true });
    console.log(`[Firestore] Miembro ${member.id} guardado en tiempo real.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const deleteMemberRealtime = async (memberId: string): Promise<void> => {
  const path = `members/${memberId}`;
  try {
    const docRef = doc(db, 'members', memberId);
    await deleteDoc(docRef);
    console.log(`[Firestore] Miembro ${memberId} eliminado.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

export const saveAttendanceRealtime = async (record: AttendanceRecord): Promise<void> => {
  const path = `attendance/${record.date}`;
  try {
    const docRef = doc(db, 'attendance', record.date);
    await setDoc(docRef, sanitizeData(record), { merge: true });
    console.log(`[Firestore] Asistencia del ${record.date} guardada en tiempo real.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const saveFinancialRecordRealtime = async (record: FinancialRecord): Promise<void> => {
  const path = `treasury/${record.id}`;
  try {
    const docRef = doc(db, 'treasury', record.id);
    await setDoc(docRef, sanitizeData(record), { merge: true });
    console.log(`[Firestore] Movimiento de tesorería ${record.id} guardado en tiempo real.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const deleteFinancialRecordRealtime = async (recordId: string): Promise<void> => {
  const path = `treasury/${recordId}`;
  try {
    const docRef = doc(db, 'treasury', recordId);
    await deleteDoc(docRef);
    console.log(`[Firestore] Movimiento ${recordId} eliminado.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

/**
 * Elimina registros de tesorería de Firestore en tiempo real.
 * Si type === 'diezmo', solo elimina los diezmos.
 * Si type === 'todos', elimina todos los movimientos de tesorería.
 */
export const clearTreasuryRecordsRealtime = async (onlyType: 'diezmo' | 'todos' = 'todos'): Promise<void> => {
  const path = 'treasury';
  try {
    const colRef = collection(db, path);
    const snap = await getDocs(colRef);
    const deletes: Promise<void>[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as FinancialRecord;
      if (onlyType === 'todos' || data.type === 'diezmo' || docSnap.id.startsWith('fin_')) {
        deletes.push(deleteDoc(doc(db, path, docSnap.id)));
      }
    });
    await Promise.all(deletes);
    console.log(`[Firestore] Registros de tesorería eliminados con éxito (${onlyType}).`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

export const saveUserRealtime = async (user: AppUser): Promise<void> => {
  const path = `users/${user.id}`;
  try {
    const docRef = doc(db, 'users', user.id);
    await setDoc(docRef, sanitizeData(user), { merge: true });
    console.log(`[Firestore] Usuario ${user.id} guardado en tiempo real.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const deleteUserRealtime = async (userId: string): Promise<void> => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef);
    console.log(`[Firestore] Usuario ${userId} eliminado.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

/**
 * Guarda el ID de la hoja de cálculo de Google Sheets en Firestore
 * para que todos los dispositivos de la iglesia (computadores y celulares)
 * compartan la misma hoja automáticamente.
 */
export const saveSharedSpreadsheetIdRealtime = async (sheetId: string | null): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', 'sheets');
    if (sheetId) {
      await setDoc(docRef, { spreadsheetId: sheetId, updatedAt: new Date().toISOString() }, { merge: true });
    } else {
      await deleteDoc(docRef);
    }
  } catch (err) {
    console.warn('No se pudo guardar la configuración de Sheets en Firestore:', err);
  }
};

/**
 * Escucha en tiempo real la hoja de cálculo de Google Sheets vinculada.
 */
export const subscribeToSharedSpreadsheet = (
  onData: (sheetId: string | null) => void
): Unsubscribe => {
  const docRef = doc(db, 'settings', 'sheets');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onData(data?.spreadsheetId || null);
    } else {
      onData(null);
    }
  }, (err) => {
    console.warn('Aviso: suscripción de sheets settings:', err);
  });
};

// ==========================================
// 3. SEMILLERO INICIAL (Solo si está vacío)
// ==========================================
export const seedFirestoreIfEmpty = async (
  defaultMembers: Member[],
  defaultAttendance: AttendanceRecord[],
  defaultTreasury: FinancialRecord[],
  defaultUsers: AppUser[]
) => {
  try {
    // 1. Miembros
    const membersSnap = await getDocs(collection(db, 'members'));
    if (membersSnap.empty && defaultMembers.length > 0) {
      console.log('Inicializando miembros en Firestore...');
      for (const m of defaultMembers) {
        await setDoc(doc(db, 'members', m.id), sanitizeData(m));
      }
    }

    // 2. Asistencias
    const attendanceSnap = await getDocs(collection(db, 'attendance'));
    if (attendanceSnap.empty && defaultAttendance.length > 0) {
      console.log('Inicializando registros de asistencia en Firestore...');
      for (const a of defaultAttendance) {
        await setDoc(doc(db, 'attendance', a.date), sanitizeData(a));
      }
    }

    // 3. Tesorería: Purgar datos de prueba fin_ y dejar limpio para datos reales
    const treasurySnap = await getDocs(collection(db, 'treasury'));
    if (!treasurySnap.empty) {
      const demoDeletes: Promise<void>[] = [];
      treasurySnap.forEach((docSnap) => {
        if (docSnap.id.startsWith('fin_')) {
          demoDeletes.push(deleteDoc(doc(db, 'treasury', docSnap.id)));
        }
      });
      if (demoDeletes.length > 0) {
        await Promise.all(demoDeletes);
        console.log('[Firestore] Registros de prueba (fin_*) de tesorería eliminados.');
      }
    } else if (defaultTreasury.length > 0) {
      console.log('Inicializando tesorería en Firestore...');
      for (const t of defaultTreasury) {
        await setDoc(doc(db, 'treasury', t.id), sanitizeData(t));
      }
    }

    // 4. Usuarios
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty && defaultUsers.length > 0) {
      console.log('Inicializando usuarios en Firestore...');
      for (const u of defaultUsers) {
        await setDoc(doc(db, 'users', u.id), sanitizeData(u));
      }
    }
  } catch (err) {
    console.warn('Aviso al verificar o sembrar datos iniciales en Firestore:', err);
  }
};
