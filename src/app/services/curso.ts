import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { Curso } from '../models/curso.model';
import { Curso2025 } from '../models/curso-2025.model';
import { Curso2026 } from '../models/curso-2026.model';

@Injectable({
  providedIn: 'root',
})
export class CursoService {
  // 2024 (assets)
  private readonly url2024 = 'assets/cursos_personalizados.json';

  // 2025 (assets)
  private readonly url2025 = 'assets/cursos_2025.json';

  // 2026 (backend)
  private readonly url2026 = '/api/courses/2026';

  constructor(private http: HttpClient) {}

  /* =========================
     2024
     ========================= */

  getCursos2024(): Observable<Curso[]> {
    return this.http.get<Curso[]>(this.url2024);
  }

  getCurso2024(id: number): Observable<Curso | undefined> {
    return this.getCursos2024().pipe(
      map((cursos) => (cursos || []).find((c) => c.id === id))
    );
  }

  // compat (por si tu app llama a estos)
  getCursos(): Observable<Curso[]> {
    return this.getCursos2024();
  }

  getCurso(id: number): Observable<Curso | undefined> {
    return this.getCurso2024(id);
  }

  /* =========================
     2025
     ========================= */

  getCursos2025(): Observable<Curso2025[]> {
    return this.http.get<Curso2025[]>(this.url2025);
  }

  getCurso2025(id: number): Observable<Curso2025 | undefined> {
    return this.getCursos2025().pipe(
      map((cursos) => (cursos || []).find((c) => c.id === id))
    );
  }

  /* =========================
     2026 (backend)
     ========================= */

  /** Lista completa 2026 */
  getCursos2026(): Observable<Curso2026[]> {
    return this.http.get<Curso2026[]>(this.url2026);
  }

  /**
   * Detalle 2026 (preferido):
   * - Si tu backend tiene GET /api/courses/2026/:id → lo usamos.
   * - Si no lo tenés todavía, podés comentar este método y usar el fallback de abajo.
   */
  getCurso2026(id: string): Observable<Curso2026> {
    const target = encodeURIComponent(String(id).trim());
    return this.http.get<Curso2026>(`${this.url2026}/${target}`);
  }

  /**
   * Fallback alternativo (si NO tenés endpoint de detalle):
   * Busca el curso dentro del listado completo.
   *
   * Si querés usar ESTE en vez del de arriba:
   * 1) Comentá el getCurso2026() de arriba
   * 2) Descomentá este
   */
  /*
  getCurso2026(id: string): Observable<Curso2026 | undefined> {
    const target = String(id).trim();
    return this.getCursos2026().pipe(
      map((cursos) => (cursos || []).find((c) => String(c.id) === target))
    );
  }
  */

  /* =========================
     API unificada por año
     ========================= */

  getCursosByYear(year: '2024'): Observable<Curso[]>;
  getCursosByYear(year: '2025'): Observable<Curso2025[]>;
  getCursosByYear(year: '2026'): Observable<Curso2026[]>;
  getCursosByYear(year: '2024' | '2025' | '2026'): Observable<any[]> {
    if (year === '2024') return this.getCursos2024();
    if (year === '2025') return this.getCursos2025();
    return this.getCursos2026();
  }
}
