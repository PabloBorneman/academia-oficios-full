export interface Curso2026 {
  id: string;

  slug?: string;
  titulo: string;

  descripcion_breve?: string;
  descripcion_completa?: string;

  actividades?: string;
  duracion_total?: string;

  fecha_inicio?: string;          // YYYY-MM-DD
  fecha_fin?: string;             // YYYY-MM-DD

  inscripcion_inicio?: string;    // YYYY-MM-DDTHH:mm
  inscripcion_fin?: string;       // YYYY-MM-DDTHH:mm

  frecuencia_semanal?: 1 | 2 | 3 | 'otro';
  duracion_clase_horas?: number[];
  dias_horarios?: string[];

  localidades?: string[];
  direcciones?: string[];

  requisitos?: {
    mayor_18?: boolean;
    carnet_conducir?: boolean;
    primaria_completa?: boolean;
    secundaria_completa?: boolean;
    otros?: string[];
  };

  materiales?: {
    aporta_estudiante?: string[];
    entrega_curso?: string[];
  };

  formulario?: string;
  imagen?: string;

  cupos?: number | null;

  estado?:
    | 'inscripcion_abierta'
    | 'ultimos_cupos'
    | 'cupo_completo'
    | 'proximo'
    | 'en_curso'
    | 'finalizado';
}
