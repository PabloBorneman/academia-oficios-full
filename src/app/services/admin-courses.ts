import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AdminCurso = {
  id: string;

  slug?: string;
  titulo: string;

  descripcion_breve?: string;
  descripcion_completa?: string;

  actividades?: string;
  duracion_total?: string;

  fecha_inicio?: string;
  fecha_inicio_legible?: string;
  fecha_fin?: string;
  fecha_fin_legible?: string;

  frecuencia_semanal?: number | 'otro';
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

  estado?: string;
  inscripcion_inicio?: string;
  inscripcion_fin?: string;

  cupos?: number | null;
};

export type AdminCursoPayload = {
  slug: string;
  titulo: string;

  descripcion_breve: string;
  descripcion_completa: string;

  actividades: string;
  duracion_total: string;

  fecha_inicio: string;
  fecha_inicio_legible: string;
  fecha_fin: string;
  fecha_fin_legible: string;

  frecuencia_semanal: number | 'otro';
  duracion_clase_horas: number[];
  dias_horarios: string[];

  localidades: string[];
  direcciones: string[];

  requisitos: {
    mayor_18: boolean;
    carnet_conducir: boolean;
    primaria_completa: boolean;
    secundaria_completa: boolean;
    otros: string[];
  };

  materiales: {
    aporta_estudiante: string[];
    entrega_curso: string[];
  };

  formulario: string;
  imagen: string;

  estado: string;
  inscripcion_inicio: string;
  inscripcion_fin: string;

  cupos: number | null;
};

@Injectable({ providedIn: 'root' })
export class AdminCoursesService {
  private readonly baseUrl = '/api/admin/courses';

  constructor(private http: HttpClient) {}

  list(): Observable<AdminCurso[]> {
    return this.http.get<AdminCurso[]>(this.baseUrl);
  }

  get(id: string): Observable<AdminCurso> {
    return this.http.get<AdminCurso>(`${this.baseUrl}/${id}`);
  }

  create(payload: AdminCursoPayload): Observable<AdminCurso> {
    return this.http.post<AdminCurso>(this.baseUrl, payload);
  }

  update(id: string, payload: AdminCursoPayload): Observable<AdminCurso> {
    return this.http.put<AdminCurso>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ✅ SUBIR IMAGEN (FormData)
  uploadImage(file: File): Observable<{ path: string }> {
    const fd = new FormData();
    fd.append('image', file, file.name);
    return this.http.post<{ path: string }>('/api/admin/uploads', fd);
  }
}
