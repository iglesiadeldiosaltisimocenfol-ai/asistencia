/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CenfolLogoProps {
  variant?: 'emblem' | 'full' | 'inline';
  size?: number | string;
  className?: string;
  showText?: boolean;
  lightText?: boolean;
}

export default function CenfolLogo({
  variant = 'inline',
  size = 40,
  className = '',
  showText = true,
  lightText = false,
}: CenfolLogoProps) {
  // SVG del Emblema oficial CENFOL (Paloma en vuelo con ala azul, cuerpo plateado y pluma carmesí)
  const EmblemSvg = ({ dimension = 44 }: { dimension?: number | string }) => (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Fondo blanco circular */}
      <circle cx="100" cy="100" r="92" fill="#FFFFFF" />
      
      {/* Anillo exterior gris característico */}
      <circle
        cx="100"
        cy="100"
        r="88"
        stroke="#8C98A4"
        strokeWidth="3.2"
        fill="none"
      />

      {/* Pluma inferior / cola en rojo carmesí / borgoña (#832034) */}
      <path
        d="M 98 152 
           C 88 155, 78 157, 72 153 
           C 74 148, 80 142, 92 136 
           C 96 142, 98 148, 98 152 Z"
        fill="#832034"
      />

      {/* Ala principal grande en Azul Marino / Pizarra Oscuro (#283747) */}
      <path
        d="M 94 136 
           C 82 124, 62 98, 56 68 
           C 51 44, 58 24, 82 14 
           C 87 28, 92 46, 88 64 
           C 84 80, 77 92, 85 108 
           C 92 120, 102 128, 105 136 
           C 101 137, 97 137, 94 136 Z"
        fill="#283747"
      />

      {/* Cuerpo y cabeza de la paloma mirando hacia la derecha en Gris Plateado (#9AA5B1) */}
      <path
        d="M 103 136 
           C 114 128, 126 112, 124 94 
           C 122 80, 116 74, 118 64 
           C 122 60, 128 62, 134 69 
           C 130 78, 128 88, 128 98 
           C 128 116, 118 138, 98 150 
           C 102 145, 104 140, 103 136 Z"
        fill="#9AA5B1"
      />
    </svg>
  );

  if (variant === 'emblem') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <EmblemSvg dimension={size} />
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`inline-flex flex-col items-center text-center ${className}`}>
        <EmblemSvg dimension={typeof size === 'number' ? size : 80} />
        {showText && (
          <div className="mt-2.5 flex flex-col items-center">
            <span
              className={`font-black tracking-[0.2em] text-lg sm:text-xl uppercase leading-none font-sans ${
                lightText ? 'text-white' : 'text-slate-600'
              }`}
            >
              CENFOL
            </span>
            <span
              className={`font-semibold tracking-[0.14em] text-[10px] sm:text-[11px] uppercase mt-1 leading-tight ${
                lightText ? 'text-emerald-100/90' : 'text-slate-500'
              }`}
            >
              IGLESIA DEL
            </span>
            <span
              className={`font-bold tracking-[0.14em] text-[10px] sm:text-[11px] uppercase leading-tight ${
                lightText ? 'text-emerald-100' : 'text-slate-600'
              }`}
            >
              DIOS ALTÍSIMO
            </span>
          </div>
        )}
      </div>
    );
  }

  // Variant 'inline' (por defecto, para el header)
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="shadow-xs rounded-full p-0.5 bg-white border border-emerald-600/30 shrink-0">
        <EmblemSvg dimension={size} />
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span
            className={`font-extrabold tracking-wider text-sm uppercase ${
              lightText ? 'text-white' : 'text-slate-800'
            }`}
          >
            CENFOL
          </span>
          <span
            className={`text-[9.5px] font-semibold tracking-wider uppercase ${
              lightText ? 'text-emerald-100/90' : 'text-slate-500'
            }`}
          >
            Iglesia del Dios Altísimo
          </span>
        </div>
      )}
    </div>
  );
}
