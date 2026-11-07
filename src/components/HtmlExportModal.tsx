/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Code2, 
  FileCode2, 
  Palette, 
  FileSpreadsheet, 
  Download, 
  Copy, 
  Check, 
  Globe, 
  Server, 
  Terminal, 
  Layers, 
  FolderCheck,
  ExternalLink
} from 'lucide-react';

interface HtmlExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HtmlExportModal({ isOpen, onClose }: HtmlExportModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'html' | 'hosting'>('info');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const sampleHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/cenfol-logo.svg" />
    <title>CENFOL - Registro de Asistencia y Tesorería Dominical</title>
    <!-- Estilos compilados (Tailwind CSS) -->
    <link rel="stylesheet" href="/assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <!-- Lógica de la aplicación (JavaScript ES Modules) -->
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 3000);
  };

  const downloadIndexHtml = () => {
    const blob = new Blob([sampleHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden text-slate-800 my-8">
        
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/20">
              <Code2 className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Código HTML, CSS y JavaScript</h2>
              <p className="text-xs text-emerald-200">
                Estructura compilada lista para producción y alojamiento web
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer text-emerald-100 hover:text-white"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Navegación del Modal */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'info'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Archivos y Estructura</span>
          </button>

          <button
            onClick={() => setActiveTab('html')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'html'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Plantilla HTML5</span>
          </button>

          <button
            onClick={() => setActiveTab('hosting')}
            className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'hosting'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Cómo Publicar en la Web</span>
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {activeTab === 'info' && (
            <div className="space-y-5 text-xs text-slate-600">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
                <FolderCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-emerald-900 text-sm block">
                    ¡Esta aplicación se compila en código 100% estándar HTML, CSS y JS!
                  </span>
                  <p className="text-emerald-800 leading-relaxed">
                    Al ejecutar el comando de compilación (<code>npm run build</code>), Vite empaqueta todos los módulos, componentes y librerías en la carpeta <strong>/dist/</strong> en tres formatos nativos de la web:
                  </p>
                </div>
              </div>

              {/* Grid de los 3 Archivos Clave */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* HTML */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                    <FileCode2 className="w-4 h-4" />
                    <span>HTML5</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-800 font-semibold bg-white p-2 rounded-lg border border-slate-200">
                    dist/index.html
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Página web principal que inicializa el DOM, fuentes tipográficas y el contenedor principal <code>&lt;div id="root"&gt;</code>.
                  </p>
                </div>

                {/* CSS */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                    <Palette className="w-4 h-4" />
                    <span>CSS3</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-800 font-semibold bg-white p-2 rounded-lg border border-slate-200">
                    dist/assets/index.css
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Hojas de estilo optimizadas de Tailwind CSS con el diseño visual, colores institucionales de CENFOL y tipografías.
                  </p>
                </div>

                {/* JS */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                    <Code2 className="w-4 h-4" />
                    <span>JavaScript (ES)</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-800 font-semibold bg-white p-2 rounded-lg border border-slate-200">
                    dist/assets/index.js
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Lógica interactiva completa: registro dominical, tesorería, sincronización con Firebase Firestore en vivo y Google Sheets.
                  </p>
                </div>
              </div>

              {/* Beneficios */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  ¿Por qué se desarrolla en React + TypeScript y se exporta a HTML/CSS/JS?
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                  <li><strong>Sincronización en tiempo real:</strong> Permite que cuando marques asistencia en un celular, se actualice al milisegundo en las computadoras sin necesidad de recargar la página.</li>
                  <li><strong>Conexión segura con Google Sheets:</strong> Manejo de tokens OAuth directos con la API de Google Drive/Sheets.</li>
                  <li><strong>Generación de reportes PDF y Excel:</strong> Crea informes dominicales descargables con logotipo oficial de la iglesia.</li>
                  <li><strong>Compilación instantánea:</strong> El compilador produce automáticamente el código HTML, CSS y JS minimizado y ultra-rápido.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'html' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Código fuente del archivo <code>index.html</code> de producción:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(sampleHtml, 'html')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    {copied === 'html' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied === 'html' ? '¡Copiado!' : 'Copiar Código'}</span>
                  </button>
                  <button
                    onClick={downloadIndexHtml}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar index.html</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed border border-slate-800">
                  <code>{sampleHtml}</code>
                </pre>
              </div>

              <p className="text-[11px] text-slate-500">
                Este archivo hace referencia al paquete de estilos y al bundle JavaScript compilado en <code>/assets/</code>.
              </p>
            </div>
          )}

          {activeTab === 'hosting' && (
            <div className="space-y-4 text-xs text-slate-600">
              <span className="font-bold text-slate-800 text-sm block">
                ¿Dónde y cómo puedes publicar estos archivos HTML, CSS y JS?
              </span>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                  <Server className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800">1. Servidor Web Tradicional o Hosting Compartido (cPanel / Apache / Nginx)</span>
                    <p className="text-[11px] text-slate-600">
                      Sube todos los archivos dentro de la carpeta <code>dist/</code> (el <code>index.html</code> y la subcarpeta <code>assets/</code>) a tu carpeta <code>public_html</code> o raíz del dominio.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                  <Globe className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800">2. Firebase Hosting (Recomendado y Gratuito)</span>
                    <p className="text-[11px] text-slate-600">
                      Como la aplicación ya está vinculada a tu proyecto de Firebase, puedes ejecutar <code>firebase deploy --only hosting</code> y tu app quedará en un dominio <code>.web.app</code> con SSL gratis.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                  <Terminal className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800">3. GitHub Pages, Vercel o Netlify</span>
                    <p className="text-[11px] text-slate-600">
                      Arrastra la carpeta <code>dist/</code> a Netlify o vincula tu repositorio de GitHub para despliegue automático con cada cambio.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie de Página del Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 text-[11px]">
            CENFOL • Iglesia Del Dios Altísimo • Sistema Web
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
