import React from "react";

export type TipoTestigo =
  | "checkEngine"
  | "abs"
  | "airbag"
  | "presionAceite"
  | "temperatura"
  | "bateria"
  | "frenoManoDesgaste"
  | "direccionAsistida"
  | string;

interface TestigoIconProps {
  tipo: TipoTestigo;
  className?: string;
}

export default function TestigoIcon({ tipo, className = "w-7 h-7" }: TestigoIconProps) {
  switch (tipo) {
    // 1. Check Engine (MIL - Motor)
    case "checkEngine":
    case "motor":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-label="Testigo Check Engine"
        >
          {/* Silueta universal de bloque motor automotor */}
          <path d="M4 8h2V6.5h1v1.5h2V5h4v3h2.5V6.5h1v1.5h1.5a2 2 0 0 1 2 2v2.5h1.5v2.5H20v3.5a2 2 0 0 1-2 2h-3v-1.5H9V20H5a2 2 0 0 1-2-2v-4H1.5v-2.5H3v-2.5a2 2 0 0 1 2-2h-1zm1 3v5a1 1 0 0 0 1 1h2.5v-2h8v2H18a1 1 0 0 0 1-1v-5h-1a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1z" />
          <circle cx="8.5" cy="13.5" r="1.1" />
          <circle cx="12" cy="13.5" r="1.1" />
          <circle cx="15.5" cy="13.5" r="1.1" />
        </svg>
      );

    // 2. ABS (Sistema Antibloqueo de Frenos)
    case "abs":
    case "frenos":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Testigo ABS"
        >
          {/* Círculo central */}
          <circle cx="12" cy="12" r="6.5" strokeWidth="2" />
          {/* Pastillas / zapatas curvas discontinuas */}
          <path d="M3.5 8a10 10 0 0 0 0 8" strokeWidth="2.2" strokeDasharray="3 2" />
          <path d="M20.5 8a10 10 0 0 1 0 8" strokeWidth="2.2" strokeDasharray="3 2" />
          {/* Texto ABS centrado */}
          <text
            x="12"
            y="14.2"
            textAnchor="middle"
            fontSize="6.2"
            fontWeight="900"
            fill="currentColor"
            stroke="none"
            fontFamily="Arial, Helvetica, sans-serif"
            letterSpacing="-0.5"
          >
            ABS
          </text>
        </svg>
      );

    // 3. Airbag
    case "airbag":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-label="Testigo Airbag"
        >
          {/* Conductor sentado */}
          <circle cx="6.5" cy="6" r="2.5" />
          <path d="M4 11a2 2 0 0 1 2-2h1.5a2 2 0 0 1 2 2v6.5H7v3H4.5a.5.5 0 0 1-.5-.5V11z" />
          <path d="M2 6h1.2v14H2z" opacity="0.6" />
          {/* Balón de airbag inflado */}
          <circle cx="15.5" cy="12.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12.5 12.5h6M15.5 9.5v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    // 4. Presión de Aceite (Aceitera de Aladino)
    case "presionAceite":
    case "aceite":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Testigo Presión de Aceite"
        >
          {/* Pico vertedor */}
          <path d="M8 12L3 8.5v1.5l3.5 3H8" fill="currentColor" stroke="none" />
          {/* Gota cayendo del pico */}
          <path
            d="M3 14c0-.8.8-2 1.5-2s1.5 1.2 1.5 2a1.5 1.5 0 0 1-3 0z"
            fill="currentColor"
            stroke="none"
          />
          {/* Cuerpo aceitera */}
          <path
            d="M8 11h9a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z"
            fill="currentColor"
            fillOpacity="0.25"
          />
          {/* Tapa / cuello superior */}
          <path d="M10 8.5h5l.8 2.5h-6.6l.8-2.5z" fill="currentColor" stroke="none" />
          {/* Asa derecha */}
          <path d="M19 12.5h2a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5h-2" />
        </svg>
      );

    // 5. Temperatura / Agua (Termómetro en refrigerante)
    case "temperatura":
    case "agua":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Testigo Temperatura de Motor"
        >
          {/* Termómetro de columna */}
          <path
            d="M13.5 14.5V4a1.5 1.5 0 0 0-3 0v10.5a3.5 3.5 0 1 0 3 0z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <circle cx="12" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
          <path d="M12 7v7" strokeWidth="2" stroke="currentColor" />
          {/* Marcas de escala */}
          <path d="M14 6h2M14 9h2M14 12h2" strokeWidth="1.5" />
          {/* Olas de agua / refrigerante */}
          <path d="M3 18.5c1.5-.8 3-.8 4.5 0s3 .8 4.5 0" strokeWidth="1.8" />
          <path d="M3 21.5c1.5-.8 3-.8 4.5 0s3 .8 4.5 0" strokeWidth="1.8" />
        </svg>
      );

    // 6. Batería / Carga (Batería 12V con bornes y polaridad)
    case "bateria":
    case "carga":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Testigo Batería"
        >
          {/* Bornes superiores */}
          <rect x="5.5" y="4.5" width="3" height="2" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="15.5" y="4.5" width="3" height="2" rx="0.5" fill="currentColor" stroke="none" />
          {/* Carcasa de batería */}
          <rect
            x="3"
            y="6.5"
            width="18"
            height="13"
            rx="2"
            strokeWidth="2"
            fill="currentColor"
            fillOpacity="0.2"
          />
          {/* Signo positivo (+) a la izquierda */}
          <path d="M6 13h3M7.5 11.5v3" strokeWidth="2.2" strokeLinecap="round" />
          {/* Signo negativo (-) a la derecha */}
          <path d="M15 13h3" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    // 7. Pastillas Desgastadas (Testigo de desgaste de frenos)
    case "frenoManoDesgaste":
    case "frenosDesgaste":
    case "pastillas":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Testigo Desgaste de Pastillas"
        >
          {/* Disco central */}
          <circle cx="12" cy="12" r="5" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
          {/* Pastillas discontinuas desgastadas a los costados */}
          <path
            d="M4 6.5A10.5 10.5 0 0 0 3 12a10.5 10.5 0 0 0 1 5.5"
            strokeWidth="2.8"
            strokeDasharray="3 3.5"
          />
          <path
            d="M20 6.5A10.5 10.5 0 0 1 21 12a10.5 10.5 0 0 1-1 5.5"
            strokeWidth="2.8"
            strokeDasharray="3 3.5"
          />
        </svg>
      );

    // 8. Dirección Asistida (Volante EPS con signo de exclamación)
    case "direccionAsistida":
    case "eps":
    case "direccion":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Testigo Dirección Asistida"
        >
          {/* Aro del volante */}
          <circle cx="10" cy="12" r="7.5" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
          {/* Masa central */}
          <circle cx="10" cy="12" r="2.2" fill="currentColor" stroke="none" />
          {/* Rayos del volante */}
          <path d="M2.5 12h5.3M12.2 12H17.5M10 14.2V19.5" strokeWidth="2" />
          {/* Signo de exclamación al lado */}
          <path d="M20.5 7v6.5M20.5 16.5v.5" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
}
