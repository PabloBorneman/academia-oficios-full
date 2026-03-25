/* ───────────────────────── curso-detalle.component.ts (COMPLETO, 2024/2025/2026) ───────────────────────── */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CursoService } from '../../../services/curso';
import { Curso } from '../../../models/curso.model';
import { Curso2025 } from '../../../models/curso-2025.model';
// (Opcional) Si creás el modelo 2026, importalo:
// import { Curso2026 } from '../../../models/curso-2026.model';

import { Subscription } from 'rxjs';

type Estado =
  | 'inscripcion_abierta'
  | 'ultimos_cupos'
  | 'cupo_completo'
  | 'proximo'
  | 'en_curso'
  | 'finalizado';

/** ViewModel unificado para 2024/2025/2026 */
interface DetalleVM {
  id: string;
  origen: '2024' | '2025' | '2026';
  titulo: string;

  // Descripciones
  descripcion: string;            // mostrado en el HTML
  descripcion_corta?: string;     // 2025/2026: descripcion_breve
  descripcion_larga?: string;     // 2025/2026: descripcion_completa

  // Estado/fechas
  estado: Estado;
  fecha_inicio?: string;          // YYYY-MM-DD
  fecha_fin?: string;             // YYYY-MM-DD

  // Ventana de inscripción 2025/2026
  inscripcion_inicio?: string;    // YYYY-MM-DDTHH:mm (local)
  inscripcion_fin?: string;       // YYYY-MM-DDTHH:mm (local)

  // Cupos
  cupos?: number | null;

  // Sedes
  localidades: string[];
  direcciones?: string[];

  // Requisitos
  requisitos?: string;                 // 2024
  req_mayor_18?: boolean;              // 2025/2026
  req_carnet_conducir?: boolean;       // 2025/2026
  req_primaria_completa?: boolean;     // 2025/2026
  req_secundaria_completa?: boolean;   // 2025/2026
  req_otros?: string[];                // 2025/2026

  // Info académica
  actividades?: string;
  duracion_total?: string;
  frecuencia_semanal?: 1 | 2 | 3 | 'otro';
  duracion_clase_horas?: number[];
  dias_horarios?: string[];

  // Materiales
  materiales_aporta_estudiante?: string[];
  materiales_entrega_curso?: string[];

  // Inscripción
  formulario: string;
}

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-detalle.html',
  styleUrl: './curso-detalle.css',
})
export class CursoDetalle implements OnInit, OnDestroy {
  curso?: DetalleVM;
  defaultImg = 'assets/img/default-curso.png';

  private subs = new Subscription();
  private lastKey = '';

  constructor(
    private route: ActivatedRoute,
    private cursoService: CursoService,
    private viewportScroller: ViewportScroller
  ) {}

  ngOnInit(): void {
    this.loadFromRoute();
    this.subs.add(this.route.params.subscribe(() => this.loadFromRoute()));
    this.subs.add(this.route.queryParams.subscribe(() => this.loadFromRoute()));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /** Lee la URL actual y carga el curso correspondiente */
  private loadFromRoute(): void {
    this.viewportScroller.scrollToPosition([0, 0]);

    const idRaw = (this.route.snapshot.paramMap.get('id') || '').trim();

    const yearFromParam = this.route.snapshot.paramMap.get('year') as
      | '2024'
      | '2025'
      | '2026'
      | null;

    const yearFromQuery = this.route.snapshot.queryParamMap.get('y') as
      | '2024'
      | '2025'
      | '2026'
      | null;

    const key = `${idRaw}|${yearFromParam ?? yearFromQuery ?? 'auto'}`;

    if (!idRaw || key === this.lastKey) return;
    this.lastKey = key;

    // 1) Año explícito
    if (yearFromParam === '2024' || yearFromParam === '2025' || yearFromParam === '2026') {
      this.loadByYear(idRaw, yearFromParam);
      return;
    }

    // 2) Año por query
    if (yearFromQuery === '2024' || yearFromQuery === '2025' || yearFromQuery === '2026') {
      this.loadByYear(idRaw, yearFromQuery);
      return;
    }

    // 3) AUTO:
    // - si NO es número, asumimos 2026 (id string)
    if (!Number.isFinite(Number(idRaw))) {
      this.load2026ById(idRaw);
      return;
    }

    // - si es número: fallback viejo (2025 si está, si no 2024)
    this.try2025Then2024(Number(idRaw));
  }

  /* =========================== Carga por año =========================== */

  private loadByYear(idRaw: string, year: '2024' | '2025' | '2026'): void {
    if (year === '2026') {
      this.load2026ById(idRaw);
      return;
    }

    const id = Number(idRaw);
    if (!Number.isFinite(id)) {
      this.curso = undefined;
      return;
    }

    if (year === '2024') this.load2024ById(id);
    else this.load2025ById(id);
  }

  private load2024ById(id: number): void {
    this.cursoService.getCursos2024().subscribe({
      next: (lista: Curso[]) => {
        const found = (lista || []).find((c) => c.id === id);
        this.curso = found ? this.map2024ToVM(found) : undefined;
      },
      error: (err) => {
        console.error('Error cargando detalle 2024:', err);
        this.curso = undefined;
      },
    });
  }

  private load2025ById(id: number): void {
    this.cursoService.getCursos2025().subscribe({
      next: (lista: Curso2025[]) => {
        const found = (lista || []).find((c) => c.id === id);
        this.curso = found ? this.map2025ToVM(found) : undefined;
      },
      error: (err) => {
        console.error('Error cargando detalle 2025:', err);
        this.curso = undefined;
      },
    });
  }

  /** ✅ 2026: desde API pública (service) */
  private load2026ById(idOrSlug: string): void {
    const svc: any = this.cursoService as any;

    // Si todavía no agregaste el método, no revienta: muestra undefined con warning
    if (typeof svc.getCurso2026 !== 'function') {
      console.warn('Falta implementar CursoService.getCurso2026(id) para 2026');
      this.curso = undefined;
      return;
    }

    svc.getCurso2026(idOrSlug).subscribe({
      next: (c: any) => {
        this.curso = c ? this.map2026ToVM(c) : undefined;
      },
      error: (err: any) => {
        console.error('Error cargando detalle 2026:', err);
        this.curso = undefined;
      },
    });
  }

  private async try2025Then2024(id: number): Promise<void> {
    const curso2025 = await this.find2025(id).catch(() => null);
    if (curso2025) {
      this.curso = this.map2025ToVM(curso2025);
      return;
    }

    this.cursoService.getCursos2024().subscribe({
      next: (lista: Curso[]) => {
        const found = (lista || []).find((c) => c.id === id);
        this.curso = found ? this.map2024ToVM(found) : undefined;
      },
      error: (err) => {
        console.error('Error cargando detalle 2024 (fallback):', err);
        this.curso = undefined;
      },
    });
  }

  private find2025(id: number): Promise<Curso2025 | null> {
    return new Promise((resolve) => {
      this.cursoService.getCursos2025().subscribe({
        next: (lista: Curso2025[]) => resolve((lista || []).find((c) => c.id === id) || null),
        error: () => resolve(null),
      });
    });
  }

  /* =========================== Mapeos =========================== */

  private map2024ToVM(c: Curso): DetalleVM {
    return {
      id: String(c.id),
      origen: '2024',
      titulo: c.titulo,

      descripcion: c.descripcion ?? '',
      descripcion_corta: c.descripcion ?? '',
      descripcion_larga: c.descripcion ?? '',

      estado: c.estado as Estado,
      fecha_inicio: c.fecha_inicio ?? '',

      localidades: Array.isArray(c.localidades) ? c.localidades : [],
      requisitos: c.requisitos || '',

      formulario: c.formulario,
    };
  }

  private map2025ToVM(c: Curso2025): DetalleVM {
    const descBreve = c.descripcion_breve ?? '';
    const descLarga = c.descripcion_completa ?? descBreve;

    return {
      id: String(c.id),
      origen: '2025',
      titulo: c.titulo,

      descripcion: descLarga || descBreve || '',
      descripcion_corta: descBreve || '',
      descripcion_larga: descLarga || '',

      estado: c.estado as Estado,
      fecha_inicio: c.fecha_inicio ?? '',
      fecha_fin: c.fecha_fin,

      inscripcion_inicio: c.inscripcion_inicio ?? undefined,
      inscripcion_fin: c.inscripcion_fin ?? undefined,
      cupos: typeof c.cupos === 'number' ? c.cupos : null,

      localidades: Array.isArray(c.localidades) ? c.localidades : [],
      direcciones: Array.isArray(c.direcciones) ? c.direcciones : undefined,

      req_mayor_18: !!c.requisitos?.mayor_18,
      req_carnet_conducir: !!c.requisitos?.carnet_conducir,
      req_primaria_completa: !!c.requisitos?.primaria_completa,
      req_secundaria_completa: !!c.requisitos?.secundaria_completa,
      req_otros: Array.isArray(c.requisitos?.otros) ? c.requisitos!.otros : undefined,

      actividades: c.actividades,
      duracion_total: c.duracion_total,
      frecuencia_semanal: c.frecuencia_semanal,
      duracion_clase_horas: Array.isArray(c.duracion_clase_horas) ? c.duracion_clase_horas : undefined,
      dias_horarios: Array.isArray(c.dias_horarios) ? c.dias_horarios : undefined,

      materiales_aporta_estudiante: Array.isArray(c.materiales?.aporta_estudiante)
        ? c.materiales!.aporta_estudiante
        : undefined,
      materiales_entrega_curso: Array.isArray(c.materiales?.entrega_curso)
        ? c.materiales!.entrega_curso
        : undefined,

      formulario: c.formulario,
    };
  }

  private map2026ToVM(c: any): DetalleVM {
    const descBreve = c.descripcion_breve ?? '';
    const descLarga = c.descripcion_completa ?? descBreve;

    return {
      id: String(c.id ?? ''),
      origen: '2026',
      titulo: c.titulo ?? '',

      descripcion: descLarga || descBreve || '',
      descripcion_corta: descBreve || '',
      descripcion_larga: descLarga || '',

      estado: (c.estado as Estado) ?? 'proximo',
      fecha_inicio: c.fecha_inicio ?? '',
      fecha_fin: c.fecha_fin,

      inscripcion_inicio: c.inscripcion_inicio ?? undefined,
      inscripcion_fin: c.inscripcion_fin ?? undefined,
      cupos: typeof c.cupos === 'number' ? c.cupos : (c.cupos ?? null),

      localidades: Array.isArray(c.localidades) ? c.localidades : [],
      direcciones: Array.isArray(c.direcciones) ? c.direcciones : undefined,

      req_mayor_18: !!c.requisitos?.mayor_18,
      req_carnet_conducir: !!c.requisitos?.carnet_conducir,
      req_primaria_completa: !!c.requisitos?.primaria_completa,
      req_secundaria_completa: !!c.requisitos?.secundaria_completa,
      req_otros: Array.isArray(c.requisitos?.otros) ? c.requisitos.otros : undefined,

      actividades: c.actividades,
      duracion_total: c.duracion_total,
      frecuencia_semanal: c.frecuencia_semanal,
      duracion_clase_horas: Array.isArray(c.duracion_clase_horas) ? c.duracion_clase_horas : undefined,
      dias_horarios: Array.isArray(c.dias_horarios) ? c.dias_horarios : undefined,

      materiales_aporta_estudiante: Array.isArray(c.materiales?.aporta_estudiante)
        ? c.materiales.aporta_estudiante
        : undefined,
      materiales_entrega_curso: Array.isArray(c.materiales?.entrega_curso)
        ? c.materiales.entrega_curso
        : undefined,

      formulario: c.formulario || '',
    };
  }

  /* =========================== Utilidades usadas por el HTML =========================== */

  openForm(url: string): void {
    if (!url) return;
    window.open(url, '_blank');
  }

  onImgError(ev: Event): void {
    (ev.target as HTMLImageElement).src = this.defaultImg;
  }

  getEstadoTexto(estado: string): string {
    return (
      {
        inscripcion_abierta: 'Inscripción abierta',
        ultimos_cupos: '¡Últimos cupos disponibles!',
        cupo_completo: 'Cupo completo',
        en_curso: 'Cursando',
        finalizado: 'Finalizado',
        proximo: 'Disponible próximamente',
      } as any
    )[estado] || '';
  }

  getEstadoClase(estado: string): string {
    const claseBase =
      estado === 'cupo_completo'
        ? 'en_curso'
        : estado === 'ultimos_cupos'
        ? 'inscripcion_abierta'
        : estado;

    return `estado-${claseBase}`;
  }

  /* =========================== HELPERS FECHAS/META =========================== */

  private parseIsoLocal(iso?: string | null): number {
    if (!iso) return NaN;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((iso ?? '').trim());
    if (!m) return NaN;
    const y = +m[1], mm = +m[2] - 1, d = +m[3];
    return new Date(y, mm, d, 0, 0, 0, 0).getTime();
  }

  private todayLocal(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  }

  getFechaPrefix(fechaIso?: string | null): 'Comienza' | 'Comenzó' | 'Sin fecha confirmada' {
    const t = this.parseIsoLocal(fechaIso);
    if (Number.isNaN(t)) return 'Sin fecha confirmada';
    return this.todayLocal() < t ? 'Comienza' : 'Comenzó';
  }

  parseIsoLocalDateTime(iso?: string | null): number {
    if (!iso) return NaN;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso.trim());
    if (!m) return NaN;
    const y = +m[1], mm = +m[2] - 1, d = +m[3], hh = +m[4], mi = +m[5];
    return new Date(y, mm, d, hh, mi, 0, 0).getTime();
  }

  private hasValidDateTime(iso?: string | null): boolean {
    return !Number.isNaN(this.parseIsoLocalDateTime(iso));
  }

  private hasValidDate(iso?: string | null): boolean {
    return !Number.isNaN(this.parseIsoLocal(iso));
  }

  /* =========================== BANDERAS PARA RENDER =========================== */

  showBoxComienza(): boolean {
    if (!this.curso) return false;
    return this.hasValidDate(this.curso.fecha_inicio) && this.hasValidDateTime(this.curso.inscripcion_inicio);
  }

  showBoxFinaliza(): boolean {
    if (!this.curso) return false;
    return this.hasValidDate(this.curso.fecha_fin) && this.hasValidDateTime(this.curso.inscripcion_fin);
  }

  showBlockCupos(): boolean {
    if (!this.curso) return false;
    return typeof this.curso.cupos === 'number' && Number.isFinite(this.curso.cupos) && this.curso.cupos > 0;
  }

  getCuposTextoDetalle(): string | null {
    return this.showBlockCupos()
      ? `Cupos máximos disponibles para este curso: ${Math.floor(this.curso!.cupos as number)}`
      : null;
  }

  shouldShowInicio(estado: Estado): boolean {
    return estado === 'proximo' || estado === 'inscripcion_abierta' || estado === 'ultimos_cupos';
  }

  getInscripcionMeta(): { show: boolean; label: 'Apertura' | 'Cierre'; iso?: string } {
    if (!this.curso) return { show: false, label: 'Apertura' };
    const usarInicio = this.shouldShowInicio(this.curso.estado);
    const iso = usarInicio ? this.curso.inscripcion_inicio : this.curso.inscripcion_fin;
    if (!iso || !this.hasValidDateTime(iso)) return { show: false, label: 'Apertura' };
    return { show: true, label: usarInicio ? 'Apertura' : 'Cierre', iso };
  }
}
