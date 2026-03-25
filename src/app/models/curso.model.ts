export interface Curso {
  id: number;
  titulo: string;
  descripcion: string;
  imagen: string;
  localidades: string[];
  formulario: string;
  fecha_inicio: string;
  estado: 'inscripcion_abierta' | 'proximo' | 'en_curso' | 'finalizado';
  requisitos: string;
}
