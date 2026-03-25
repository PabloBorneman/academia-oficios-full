export interface Curso2025 {
  id: number;
  titulo: string;                               // obligatorio
  descripcion_breve: string;                    // 1–2 líneas (tarjeta)
  descripcion_completa: string;                 // descripción larga
  actividades: string;                          // "¿Qué se va a hacer?"
  duracion_total: string;                       // ej: "2 meses"

  fecha_inicio: string;                         // formato ISO YYYY-MM-DD (fecha de cursada)
  fecha_fin?: string;                           // opcional, YYYY-MM-DD

  // ⬇️ NUEVOS CAMPOS (fechas/horas de inscripción + cupos)
  inscripcion_inicio?: string;                  // ISO 8601 local: "YYYY-MM-DDTHH:mm" (ej: "2025-09-20T08:30")
  inscripcion_fin?: string;                     // ISO 8601 local: "YYYY-MM-DDTHH:mm"
  cupos?: number;                               // capacidad total (personas que se pueden inscribir)

  frecuencia_semanal: 1 | 2 | 3 | 'otro';       // cantidad de clases por semana
  duracion_clase_horas: number[];               // ej: [2] o [3, 4]
  dias_horarios?: string[];                     // opcional, ej: ["Lunes 14–16"]
  localidades: string[];                        // solo el nombre
  direcciones?: string[];                       // direcciones completas

  requisitos: {
    mayor_18?: boolean;
    carnet_conducir?: boolean;
    primaria_completa?: boolean;
    secundaria_completa?: boolean;
    otros?: string[];                           // texto libre
  };

  materiales: {
    aporta_estudiante: string[];
    entrega_curso: string[];
  };

  formulario: string;                           // link de inscripción
  imagen?: string;                              // ruta/URL opcional

  estado:
    | 'inscripcion_abierta'
    | 'ultimos_cupos'        // NUEVO: "Últimos cupos disponibles"
    | 'cupo_completo'        // NUEVO: "Cupo completo"
    | 'proximo'
    | 'en_curso'
    | 'finalizado';
}
