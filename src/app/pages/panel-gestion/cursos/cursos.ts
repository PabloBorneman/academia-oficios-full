import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AdminCoursesService,
  AdminCurso,
  AdminCursoPayload,
} from '../../../services/admin-courses';
import { AuthService } from '../../../services/auth';

type Estado =
  | 'inscripcion_abierta'
  | 'ultimos_cupos'
  | 'cupo_completo'
  | 'proximo'
  | 'en_curso'
  | 'finalizado';

type CursoForm = {
  id: string | null;

  // slug no se muestra, pero se conserva
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

  duracion_clase_horas_csv: string; // ej: "3,4"
  dias_horarios_text: string;       // 1 por línea
  localidades_text: string;         // 1 por línea
  direcciones_text: string;         // 1 por línea

  req_mayor_18: boolean;
  req_carnet_conducir: boolean;
  req_primaria_completa: boolean;
  req_secundaria_completa: boolean;
  req_otros_text: string;           // 1 por línea

  mat_aporta_text: string;          // 1 por línea
  mat_entrega_text: string;         // 1 por línea

  formulario: string;
  imagen: string;                   // ruta/url (ej: /uploads/...)

  estado: Estado | 'abierto';        // aceptamos legacy para no romper

  // ✅ ahora soporta:
  // - YYYY-MM-DD
  // - YYYY-MM-DDTHH:mm   (como 2025)
  inscripcion_inicio: string;
  inscripcion_fin: string;

  cupos_input: any;                 // puede venir string/number
};

type PreviewCard = {
  titulo: string;
  descripcion: string;
  imagen?: string;
  estado: Estado;
  fecha_inicio?: string;
  cupos?: number | null;
  inscripcion_inicio?: string;
  inscripcion_fin?: string;
};

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cursos.html',
  styleUrls: ['./cursos.css'],
})
export class CursosComponent implements OnInit {
  cursos: AdminCurso[] = [];

  loadingList = false;
  saving = false;
  uploadingImage = false;
  error = '';

  editing = false;

  // ✅ “Ver” desde listado (sin tocar el form)
  previewCurso: AdminCurso | null = null;

  form: CursoForm = this.emptyForm();

  // ✅ IMPORTANTE: usar el mismo naming que Home/back
  estados: Estado[] = [
    'inscripcion_abierta',
    'ultimos_cupos',
    'proximo',
    'cupo_completo',
    'en_curso',
    'finalizado',
  ];

  constructor(
    private api: AdminCoursesService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get formTitle(): string {
    return this.editing ? 'Editar curso' : 'Crear curso';
  }

  // ==========================
  // Helpers básicos
  // ==========================
  private emptyForm(): CursoForm {
    return {
      id: null,
      slug: '',
      titulo: '',

      descripcion_breve: '',
      descripcion_completa: '',

      actividades: '',
      duracion_total: '',

      fecha_inicio: '',
      fecha_inicio_legible: '',
      fecha_fin: '',
      fecha_fin_legible: '',

      frecuencia_semanal: 'otro',

      duracion_clase_horas_csv: '',
      dias_horarios_text: '',
      localidades_text: '',
      direcciones_text: '',

      req_mayor_18: false,
      req_carnet_conducir: false,
      req_primaria_completa: false,
      req_secundaria_completa: false,
      req_otros_text: '',

      mat_aporta_text: '',
      mat_entrega_text: '',

      formulario: '',
      imagen: '',

      estado: 'proximo',
      inscripcion_inicio: '',
      inscripcion_fin: '',

      cupos_input: '',
    };
  }

  private clean(v: any): string {
    return String(v ?? '').trim();
  }

  private slugify(text: string): string {
    return (text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80);
  }

  private linesToArray(text: string): string[] {
    return (text ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private arrayToLines(arr?: string[]): string {
    return Array.isArray(arr) ? arr.join('\n') : '';
  }

  private csvToNumberArray(text: string): number[] {
    return (text ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
  }

  private numberArrayToCsv(arr?: number[]): string {
    return Array.isArray(arr) ? arr.join(',') : '';
  }

  private toNullableNumber(v: any): number | null {
    const t = this.clean(v);
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  // ==========================
  // ✅ NUEVO: Normalizar datetime-local
  // - "2026-02-18" -> "2026-02-18T00:00"
  // - "2026-02-18T14:00:33" -> "2026-02-18T14:00"
  // - "2026-02-18T14:00Z" -> "2026-02-18T14:00"
  // ==========================
  private normalizeDateTimeLocal(value?: string | null): string {
    if (!value) return '';
    const v = String(value).trim();
    if (!v) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00`;

    const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(v);
    if (m) return m[1];

    return v;
  }

  // ==========================
  // ✅ FIX del error: normalizar estados (abierto -> inscripcion_abierta)
  // ==========================
  private normalizeEstadoValue(v: any): Estado {
    const s = this.clean(v).toLowerCase();

    if (s === 'abierto') return 'inscripcion_abierta';
    if (s === 'inscripcion_abierta') return 'inscripcion_abierta';
    if (s === 'ultimos_cupos') return 'ultimos_cupos';
    if (s === 'cupo_completo') return 'cupo_completo';
    if (s === 'en_curso') return 'en_curso';
    if (s === 'finalizado') return 'finalizado';
    return 'proximo';
  }

  // ==========================
  // Helpers UI (igual idea que Home)
  // ==========================
  getEstadoTexto(estado: Estado | 'abierto'): string {
    const e = this.normalizeEstadoValue(estado);
    switch (e) {
      case 'inscripcion_abierta':
        return 'Inscripción abierta';
      case 'ultimos_cupos':
        return '¡Últimos cupos disponibles!';
      case 'cupo_completo':
        return 'Cupo completo';
      case 'en_curso':
        return 'Cursando';
      case 'finalizado':
        return 'Finalizado';
      case 'proximo':
      default:
        return 'Disponible próximamente';
    }
  }

  getEstadoClase(estado: Estado | 'abierto'): string {
    const e = this.normalizeEstadoValue(estado);

    // mismo “truco” que Home
    const claseBase =
      e === 'cupo_completo'
        ? 'en_curso'
        : e === 'ultimos_cupos'
        ? 'inscripcion_abierta'
        : e;

    return `estado-${claseBase}`;
  }

  // Fecha ISO YYYY-MM-DD -> timestamp local (sin bug UTC)
  private parseIsoLocalDate(iso?: string | null): number {
    if (!iso) return NaN;

    // ✅ si viene "YYYY-MM-DDTHH:mm", tomamos solo la fecha
    const base = iso.trim().split('T')[0];

    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(base);
    if (!m) return NaN;

    const y = +m[1],
      mm = +m[2] - 1,
      d = +m[3];
    return new Date(y, mm, d, 0, 0, 0, 0).getTime();
  }

  private todayLocal(): number {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    ).getTime();
  }

  getFechaPrefix(fechaIso?: string | null): string {
    const t = this.parseIsoLocalDate(fechaIso);
    if (Number.isNaN(t)) return 'Sin fecha confirmada';
    const today = this.todayLocal();
    return today < t ? 'Comienza' : 'Comenzó';
  }

  // ✅ Ahora muestra hora si existe: "dd/MM/yyyy, HH:mm"
  formatDDMMYYYY(value?: string | null): string {
    if (!value) return '';
    const v = String(value).trim();
    if (!v) return '';

    const [datePart, timePartRaw] = v.split('T');

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!m) return '';

    const ddmmyyyy = `${m[3]}/${m[2]}/${m[1]}`;

    if (timePartRaw) {
      const hhmm = timePartRaw.slice(0, 5);
      if (/^\d{2}:\d{2}$/.test(hhmm)) return `${ddmmyyyy}, ${hhmm}`;
    }

    return ddmmyyyy;
  }

  getCuposTextoFromValue(cupos: number | null | undefined): string | null {
    if (typeof cupos === 'number' && Number.isFinite(cupos) && cupos > 0) {
      return `Cupos: ${Math.floor(cupos)}`;
    }
    return null;
  }

  // ==========================
  // Map curso -> form
  // ==========================
  private toForm(c: AdminCurso): CursoForm {
    const req = (c as any).requisitos ?? {};
    const mat = (c as any).materiales ?? {};

    const freq =
      (c as any).frecuencia_semanal === 'otro' || typeof (c as any).frecuencia_semanal === 'number'
        ? (c as any).frecuencia_semanal
        : 'otro';

    const titulo = c.titulo ?? '';

    return {
      ...this.emptyForm(),
      id: c.id ?? null,

      slug: (c as any).slug ?? this.slugify(titulo),

      titulo,

      descripcion_breve: (c as any).descripcion_breve ?? '',
      descripcion_completa: (c as any).descripcion_completa ?? '',

      actividades: (c as any).actividades ?? '',
      duracion_total: (c as any).duracion_total ?? '',

      fecha_inicio: (c as any).fecha_inicio ?? '',
      fecha_inicio_legible: (c as any).fecha_inicio_legible ?? '',
      fecha_fin: (c as any).fecha_fin ?? '',
      fecha_fin_legible: (c as any).fecha_fin_legible ?? '',

      frecuencia_semanal: freq,

      duracion_clase_horas_csv: this.numberArrayToCsv((c as any).duracion_clase_horas),
      dias_horarios_text: this.arrayToLines((c as any).dias_horarios),
      localidades_text: this.arrayToLines((c as any).localidades),
      direcciones_text: this.arrayToLines((c as any).direcciones),

      req_mayor_18: !!req.mayor_18,
      req_carnet_conducir: !!req.carnet_conducir,
      req_primaria_completa: !!req.primaria_completa,
      req_secundaria_completa: !!req.secundaria_completa,
      req_otros_text: this.arrayToLines(req.otros),

      mat_aporta_text: this.arrayToLines(mat.aporta_estudiante),
      mat_entrega_text: this.arrayToLines(mat.entrega_curso),

      formulario: (c as any).formulario ?? '',
      imagen: (c as any).imagen ?? '',

      estado: ((c as any).estado as any) ?? 'proximo',

      // ✅ NORMALIZADO PARA datetime-local
      inscripcion_inicio: this.normalizeDateTimeLocal((c as any).inscripcion_inicio ?? ''),
      inscripcion_fin: this.normalizeDateTimeLocal((c as any).inscripcion_fin ?? ''),

      cupos_input:
        (c as any).cupos === null || typeof (c as any).cupos === 'undefined' ? '' : String((c as any).cupos),
    };
  }

  // ==========================
  // Preview (form o “Ver” listado)
  // ==========================
  private buildPreviewFromForm(): PreviewCard {
    const titulo = this.clean(this.form.titulo) || '(Sin título)';
    const estado = this.normalizeEstadoValue(this.form.estado);
    const imagen = this.clean(this.form.imagen) || undefined;

    const descripcion =
      this.clean(this.form.descripcion_breve) ||
      this.clean(this.form.descripcion_completa) ||
      this.clean(this.form.actividades) ||
      '—';

    return {
      titulo,
      descripcion,
      imagen,
      estado,
      fecha_inicio: this.clean(this.form.fecha_inicio) || '',
      cupos: this.toNullableNumber(this.form.cupos_input),

      // ✅ preview muestra hora si existe
      inscripcion_inicio: this.clean(this.form.inscripcion_inicio) || '',
      inscripcion_fin: this.clean(this.form.inscripcion_fin) || '',
    };
  }

  private buildPreviewFromCurso(c: AdminCurso): PreviewCard {
    const estado = this.normalizeEstadoValue((c as any).estado);

    return {
      titulo: c.titulo || '(Sin título)',
      descripcion:
        this.clean((c as any).descripcion_breve) ||
        this.clean((c as any).descripcion_completa) ||
        this.clean((c as any).actividades) ||
        '—',
      imagen: this.clean((c as any).imagen) || undefined,
      estado,
      fecha_inicio: this.clean((c as any).fecha_inicio) || '',
      cupos: typeof (c as any).cupos === 'number' ? (c as any).cupos : null,

      // ✅ si viene con hora se muestra con hora
      inscripcion_inicio: this.clean((c as any).inscripcion_inicio) || '',
      inscripcion_fin: this.clean((c as any).inscripcion_fin) || '',
    };
  }

  get previewCard(): PreviewCard {
    return this.previewCurso
      ? this.buildPreviewFromCurso(this.previewCurso)
      : this.buildPreviewFromForm();
  }

  scrollToPreview(): void {
    const el = document.getElementById('cardPreview');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ==========================
  // Actions
  // ==========================
  load(): void {
    this.error = '';
    this.loadingList = true;

    this.api.list().subscribe({
      next: (data) => {
        this.cursos = Array.isArray(data) ? data : [];
        this.loadingList = false;
      },
      error: () => {
        this.loadingList = false;
        this.error = 'No se pudo cargar la lista de cursos.';
      },
    });
  }

  newCurso(): void {
    this.error = '';
    this.previewCurso = null; // vuelve a preview del form
    this.editing = false;
    this.form = this.emptyForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  edit(c: AdminCurso): void {
    this.error = '';
    this.previewCurso = null; // preview desde el form mientras editás
    this.editing = true;
    this.form = this.toForm(c);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ✅ tercer botón “Ver” (no toca el form)
  view(c: AdminCurso): void {
    this.previewCurso = c;
    this.scrollToPreview();
  }

  clearView(): void {
    this.previewCurso = null;
  }

  cancelEdit(): void {
    this.newCurso();
  }

  // ==========================
  // Upload imagen
  // ==========================
  onImageFileChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.error = '';
    this.previewCurso = null; // preview del form (porque cambia la imagen)

    this.uploadingImage = true;
    this.api.uploadImage(file).subscribe({
      next: (r) => {
        this.form.imagen = (r as any)?.path || '';
        this.uploadingImage = false;
        input.value = '';
      },
      error: () => {
        this.uploadingImage = false;
        this.error = 'No se pudo subir la imagen.';
      },
    });
  }

  clearImage(): void {
    this.form.imagen = '';
    this.previewCurso = null;
  }

  // ==========================
  // Guardar
  // ==========================
  save(): void {
    this.error = '';

    const titulo = this.clean(this.form.titulo);
    if (!titulo) {
      this.error = 'El título es obligatorio.';
      return;
    }

    const slug = this.clean(this.form.slug) || this.slugify(titulo);

    // ✅ normalizamos antes de armar payload
    this.form.inscripcion_inicio = this.normalizeDateTimeLocal(this.form.inscripcion_inicio);
    this.form.inscripcion_fin = this.normalizeDateTimeLocal(this.form.inscripcion_fin);

    const payload: AdminCursoPayload = {
      slug,
      titulo,

      descripcion_breve: this.clean(this.form.descripcion_breve),
      descripcion_completa: this.clean(this.form.descripcion_completa),

      actividades: this.clean(this.form.actividades),
      duracion_total: this.clean(this.form.duracion_total),

      fecha_inicio: this.clean(this.form.fecha_inicio),
      fecha_inicio_legible: this.clean(this.form.fecha_inicio_legible),
      fecha_fin: this.clean(this.form.fecha_fin),
      fecha_fin_legible: this.clean(this.form.fecha_fin_legible),

      frecuencia_semanal: this.form.frecuencia_semanal,

      duracion_clase_horas: this.csvToNumberArray(this.form.duracion_clase_horas_csv),
      dias_horarios: this.linesToArray(this.form.dias_horarios_text),

      localidades: this.linesToArray(this.form.localidades_text),
      direcciones: this.linesToArray(this.form.direcciones_text),

      requisitos: {
        mayor_18: !!this.form.req_mayor_18,
        carnet_conducir: !!this.form.req_carnet_conducir,
        primaria_completa: !!this.form.req_primaria_completa,
        secundaria_completa: !!this.form.req_secundaria_completa,
        otros: this.linesToArray(this.form.req_otros_text),
      },

      materiales: {
        aporta_estudiante: this.linesToArray(this.form.mat_aporta_text),
        entrega_curso: this.linesToArray(this.form.mat_entrega_text),
      },

      formulario: this.clean(this.form.formulario),
      imagen: this.clean(this.form.imagen),

      // ✅ normalizamos para que nunca salga “abierto”
      estado: this.normalizeEstadoValue(this.form.estado),

      // ✅ ahora puede ir con hora "YYYY-MM-DDTHH:mm"
      inscripcion_inicio: this.clean(this.form.inscripcion_inicio),
      inscripcion_fin: this.clean(this.form.inscripcion_fin),

      cupos: this.toNullableNumber(this.form.cupos_input),
    } as any;

    this.saving = true;

    // EDIT
    if (this.form.id) {
      const id = this.form.id;
      this.api.update(id, payload).subscribe({
        next: (updated) => {
          this.saving = false;

          // ✅ deja una preview del guardado
          this.previewCurso = updated;

          this.editing = false;
          this.form = this.emptyForm();

          this.load();
          this.scrollToPreview();
        },
        error: () => {
          this.saving = false;
          this.error = 'No se pudo actualizar el curso.';
        },
      });
      return;
    }

    // CREATE
    this.api.create(payload).subscribe({
      next: (created) => {
        this.saving = false;

        // ✅ preview del recién creado
        this.previewCurso = created;

        this.editing = false;
        this.form = this.emptyForm();

        this.load();
        this.scrollToPreview();
      },
      error: () => {
        this.saving = false;
        this.error = 'No se pudo crear el curso.';
      },
    });
  }

  remove(c: AdminCurso): void {
    this.error = '';

    const ok = confirm(`¿Eliminar "${c.titulo}"?`);
    if (!ok) return;

    this.api.remove(c.id).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'No se pudo eliminar el curso.';
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/panel-gestion/login');
  }
}
