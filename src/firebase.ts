/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Test Firestore connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Conexión con Firestore en tiempo real establecida exitosamente.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Verificando conexión de Firestore (cliente fuera de línea).');
    }
  }
}
testConnection();

const provider = new GoogleAuthProvider();
// Añadir scopes necesarios para Google Sheets y Drive
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Forzar selección de cuenta para facilitar el cambio de usuarios
provider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory and sessionStorage.
let cachedAccessToken: string | null = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cenfol_google_access_token') : null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken && typeof sessionStorage !== 'undefined') {
        cachedAccessToken = sessionStorage.getItem('cenfol_google_access_token');
      }
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('cenfol_google_access_token');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cenfol_google_access_token', credential.accessToken);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error al iniciar sesión:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const emailSignIn = async (email: string, password: string): Promise<User | null> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken && typeof sessionStorage !== 'undefined') {
    cachedAccessToken = sessionStorage.getItem('cenfol_google_access_token');
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('cenfol_google_access_token');
  }
};
