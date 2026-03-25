/* ───────────────────────────── home.component.ts ───────────────────────────── */

import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Slider } from '../../../components/slider/slider';

import { CursoService } from '../../../services/curso';
import { Curso } from '../../../models/curso.model';
import { Curso2025 } from '../../../models/curso-2025.model';

type Estado =
  | 'inscripcion_abierta'
  | 'ultimos_cupos'
  | 'cupo_completo'
  | 'proximo'
  | 'en_curso'
  | 'finalizado';

type Origen = '2024' | '2025' | '2026';

// shape mínimo para 2026 (viene del JSON server-side)
type Curso2026 = {
  id: string;
  slug?: string;
  titulo: string;

  descripcion_breve?: string;
  descripcion_completa?: string;
  actividades?: string;

  fecha_inicio?: string; // YYYY-MM-DD
  localidades?: string[];

  formulario?: string;
  imagen?: string;

  estado?: Estado | 'abierto';

  cupos?: number | null;

  // puede venir YYYY-MM-DD o YYYY-MM-DDTHH:mm o con segundos
  inscripcion_inicio?: string;
  inscripcion_fin?: string;
};

export interface HomeCursoCard {
  id: number | string;
  titulo: string;
  descripcion: string;
  imagen?: string;
  estado: Estado;
  fecha_inicio: string;
  localidades?: string[];
  localidad_principal?: string;
  origen: Origen;
  formulario: string;
  slug?: string; // ✅ nuevo (solo 2026 por ahora)

  // UI meta
  cupos?: number | null;
  inscripcion_inicio?: string; // normalizado "YYYY-MM-DDTHH:mm"
  inscripcion_fin?: string; // normalizado "YYYY-MM-DDTHH:mm"
}

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  imports: [CommonModule, FormsModule, RouterLink, Slider],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private static introShown = false;
  showIntroModal = false;

  cursosCards: HomeCursoCard[] = [];
  localidadSeleccionada = '';
  localidadesUnicas: string[] = [];

  selectedYear: Origen = '2026';

  loading = false;

  eagerCount = 6;

  // ✅ aviso temporal para 2026
  ocultarCursos2026 = true;
  mensajeAvisoCursos2026 = 'Los cursos salen mañana a las 8:00 de la mañana.';
  mostrarModalAviso2026 = false;

  private resizeObs!: ResizeObserver;
  private domObs?: MutationObserver;

  constructor(private cursoService: CursoService) {
    if (!HomeComponent.introShown) {
      this.showIntroModal = true;
      HomeComponent.introShown = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeIntroModal(): void {
    this.showIntroModal = false;
    document.body.style.overflow = '';
    setTimeout(() => {
      const chatBtn = document.querySelector('.chat-toggle-button') as HTMLElement;
      if (chatBtn) chatBtn.click();
    }, 200);
    requestAnimationFrame(() => this.throttledUpdateScrollBtnPos());
  }

  // ✅ helpers para el aviso 2026
  get mostrarBloqueAviso2026(): boolean {
    return this.selectedYear === '2026' && this.ocultarCursos2026;
  }

  abrirAvisoCursos2026(): void {
    this.mostrarModalAviso2026 = true;
  }

  cerrarAvisoCursos2026(): void {
    this.mostrarModalAviso2026 = false;
  }

  // ───────────────────────── helpers/throttle/settle ─────────────────────────

  // ✅ FIX: throttle sin crash (el error de lastArgs null)
  private throttle<T extends (...args: any[]) => void>(fn: T, wait = 120) {
    let last = 0;
    let timer: any = null;
    let lastArgs: any[] | null = null;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      lastArgs = args;

      if (now - last >= wait) {
        last = now;
        const a = lastArgs;
        lastArgs = null;
        if (a) fn(...(a as any[]));
        return;
      }

      if (!timer) {
        const remaining = wait - (now - last);
        timer = setTimeout(() => {
          last = Date.now();
          const a = lastArgs;
          lastArgs = null;
          timer = null;
          if (a) fn(...(a as any[]));
        }, Math.max(16, remaining));
      }
    };
  }

  private afterSettled(cb: () => void) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  // ───────────────────────── posicionamiento del botón ───────────────────────

  private updateScrollBtnPos = (): void => {
    const btn = document.getElementById('scrollTopBtn') as HTMLElement | null;
    const container = document.querySelector('.container') as HTMLElement | null;
    if (!btn || !container) return;

    const rect = container.getBoundingClientRect();
    const btnW = btn.offsetWidth || 48;
    const minPad = 16;

    const gutterLeft = Math.max(rect.left, 0);
    const idealLeft = Math.max((gutterLeft - btnW) / 2, minPad);

    if (gutterLeft > btnW + minPad) {
      btn.style.left = `${idealLeft}px`;
      btn.style.right = 'auto';
    } else {
      btn.style.left = 'auto';
      btn.style.right = `${minPad}px`;
    }
  };

  private throttledUpdateScrollBtnPos = this.throttle(
    this.updateScrollBtnPos.bind(this),
    120
  );

  // ───────────────────────── lifecycle ───────────────────────────────────────

  ngOnInit(): void {
    this.setYear('2026');
  }

  private boundOnScroll = () => {
    const btn = document.getElementById('scrollTopBtn');
    if (btn) btn.classList.toggle('visible', window.scrollY > 300);
    this.throttledUpdateScrollBtnPos();
  };

  private boundOnResize = () => {
    this.throttledUpdateScrollBtnPos();
  };

  ngAfterViewInit(): void {
    this.afterSettled(() => this.throttledUpdateScrollBtnPos());

    const container = document.querySelector('.container') as HTMLElement | null;

    if (container && 'ResizeObserver' in window) {
      this.resizeObs = new ResizeObserver(() => this.throttledUpdateScrollBtnPos());
      this.resizeObs.observe(container);
    }

    this.domObs = new MutationObserver(() =>
      this.afterSettled(() => this.throttledUpdateScrollBtnPos())
    );
    this.domObs.observe(container ?? document.body, { childList: true, subtree: true });

    const scope = container ?? document;
    const imgs = scope.querySelectorAll('img');
    imgs.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', () => this.throttledUpdateScrollBtnPos(), {
          once: true,
        });
      }
    });

    window.addEventListener('scroll', this.boundOnScroll, { passive: true });
    window.addEventListener('resize', this.boundOnResize);
    window.addEventListener('load', () => this.throttledUpdateScrollBtnPos(), {
      once: true,
    });
  }

  ngOnDestroy(): void {
    if (this.resizeObs) this.resizeObs.disconnect();
    if (this.domObs) this.domObs.disconnect();
    window.removeEventListener('scroll', this.boundOnScroll);
    window.removeEventListener('resize', this.boundOnResize);
  }

  // ───────────────────────── fechas: normalización + formato ─────────────────

  /**
   * ✅ Normaliza a "YYYY-MM-DDTHH:mm" (como 2025)
   * - "2026-02-18" -> "2026-02-18T00:00"
   * - "2026-02-18T14:00:33" -> "2026-02-18T14:00"
   * - "2026-02-18T14:00Z" -> "2026-02-18T14:00"
   */
  private normalizeDateTimeLocal(value?: string | null): string | undefined {
    if (!value) return undefined;
    const v = String(value).trim();
    if (!v) return undefined;

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00`;

    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(v);
    if (m) return `${m[1]}T${m[2]}:${m[3]}`;

    // soporta "YYYY-MM-DD HH:mm"
    const m2 = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/.exec(v);
    if (m2) return `${m2[1]}T${m2[2]}:${m2[3]}`;

    // si viene con segundos: cortamos
    const m3 = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(v);
    if (m3) return m3[1];

    return undefined;
  }

  /**
   * ✅ Formatea:
   * - "YYYY-MM-DD" -> "dd/MM/yyyy"
   * - "YYYY-MM-DDTHH:mm" -> "dd/MM/yyyy, HH:mm"
   */
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

  // Fecha ISO (date o datetime) -> timestamp local (sin bug UTC)
  private parseIsoLocalDate(iso?: string | null): number {
    if (!iso) return NaN;
    const base = String(iso).trim().split('T')[0];

    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(base);
    if (!m) return NaN;
    const y = +m[1],
      mm = +m[2] - 1,
      d = +m[3];
    return new Date(y, mm, d, 0, 0, 0, 0).getTime();
  }

  private todayLocal(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  }

  getFechaPrefix(fechaIso?: string | null): string {
    const t = this.parseIsoLocalDate(fechaIso);
    if (Number.isNaN(t)) return 'Sin fecha confirmada';
    const today = this.todayLocal();
    return today < t ? 'Comienza' : 'Comenzó';
  }

  // ───────────────────────── data load ───────────────────────────────────────

  private loadCursos2024(): void {
    this.loading = true;
    this.mostrarModalAviso2026 = false;

    this.cursoService.getCursos().subscribe({
      next: (cursos: Curso[]) => {
        const cards = (cursos ?? []).map((c) => this.mapCurso2024ToCard(c));
        this.applyCards(cards);
      },
      error: (err) => {
        console.error('Error cargando cursos 2024:', err);
        this.applyCards([]);
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  private loadCursos2025(): void {
    this.loading = true;
    this.mostrarModalAviso2026 = false;

    const svc: any = this.cursoService as any;

    const handleData = (lista: Curso2025[] | undefined | null) => {
      const cards = (lista ?? []).map((c) => this.mapCurso2025ToCard(c));
      this.applyCards(cards);
      this.loading = false;
    };

    if (typeof svc.getCursos2025 === 'function') {
      svc.getCursos2025().subscribe({
        next: (cursos: Curso2025[]) => handleData(cursos),
        error: (err: any) => {
          console.error('Error cargando cursos 2025 (servicio):', err);
          handleData([]);
        },
      });
    } else {
      fetch('assets/cursos_2025.json')
        .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
        .then((data: Curso2025[]) => handleData(data))
        .catch((err) => {
          console.error('Error cargando cursos 2025 (assets):', err);
          handleData([]);
        });
    }
  }

  // ✅ 2026 desde API del backend (público)
  private loadCursos2026(): void {
    this.loading = true;
    const svc: any = this.cursoService as any;

    const handleData = (lista: Curso2026[] | undefined | null) => {
      const cards = (lista ?? []).map((c) => this.mapCurso2026ToCard(c));
      this.applyCards(cards);
      this.loading = false;
    };

    // si algún día agregás método en CursoService, lo usa
    if (typeof svc.getCursos2026 === 'function') {
      svc.getCursos2026().subscribe({
        next: (cursos: Curso2026[]) => handleData(cursos),
        error: (err: any) => {
          console.error('Error cargando cursos 2026 (servicio):', err);
          handleData([]);
        },
      });
      return;
    }

    // fallback directo (proxy /api -> backend)
    fetch('/api/courses/2026')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Curso2026[]) => handleData(data))
      .catch((err) => {
        console.error('Error cargando cursos 2026 (/api/courses/2026):', err);
        handleData([]);
      });
  }

  // ✅ recarga siempre (así al apretar el año vuelve a pedir)
  setYear(y: Origen): void {
    this.selectedYear = y;
    this.localidadesUnicas = [];
    this.localidadSeleccionada = '';

    // ✅ bloqueo temporal solo para 2026
    if (y === '2026' && this.ocultarCursos2026) {
      this.cursosCards = [];
      this.loading = false;
      this.mostrarModalAviso2026 = false;

      requestAnimationFrame(() => {
        this.throttledUpdateScrollBtnPos();
        setTimeout(() => this.throttledUpdateScrollBtnPos(), 120);
      });

      return;
    }

    if (y === '2024') this.loadCursos2024();
    else if (y === '2025') this.loadCursos2025();
    else this.loadCursos2026();
  }

  cursosFiltrados(): HomeCursoCard[] {
    if (!this.localidadSeleccionada) return this.cursosCards;
    return this.cursosCards.filter((c) =>
      (c.localidades ?? []).includes(this.localidadSeleccionada)
    );
  }

  openForm(url: string): void {
    window.open(url, '_blank');
  }

  // ───────────────────────── estados ─────────────────────────────────────────

  private normalizeEstadoValue(v: any): Estado {
    const s = String(v ?? '').trim().toLowerCase();
    if (s === 'abierto') return 'inscripcion_abierta';
    if (s === 'inscripcion_abierta') return 'inscripcion_abierta';
    if (s === 'ultimos_cupos') return 'ultimos_cupos';
    if (s === 'cupo_completo') return 'cupo_completo';
    if (s === 'en_curso') return 'en_curso';
    if (s === 'finalizado') return 'finalizado';
    return 'proximo';
  }

  getEstadoTexto(estado: Estado): string {
    return (
      {
        inscripcion_abierta: 'Inscripción abierta',
        ultimos_cupos: '¡Últimos cupos disponibles!',
        cupo_completo: 'Cupo completo',
        en_curso: 'Cursando',
        finalizado: 'Finalizado',
        proximo: 'Disponible próximamente',
      }[estado] ?? ''
    );
  }

  getEstadoClase(estado: Estado): string {
    const claseBase =
      estado === 'cupo_completo'
        ? 'en_curso'
        : estado === 'ultimos_cupos'
        ? 'inscripcion_abierta'
        : estado;

    return `estado-${claseBase}`;
  }

  onScroll(e: Event): void {
    const el = e.target as HTMLElement;
    el.classList.toggle('scrolled', el.scrollTop > 0);
  }

  resetScroll(evt: MouseEvent): void {
    const desc = (evt.currentTarget as HTMLElement).querySelector(
      '.curso-descripcion'
    ) as HTMLElement;
    if (desc) desc.scrollTop = 0;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ───────────────────────── mapping ─────────────────────────────────────────

  private mapCurso2024ToCard(c: Curso): HomeCursoCard {
    const locs = Array.isArray((c as any).localidades) ? (c as any).localidades : [];
    return {
      id: (c as any).id,
      titulo: (c as any).titulo,
      descripcion: (c as any).descripcion ?? '',
      imagen: (c as any).imagen || undefined,
      estado: this.normalizeEstadoValue((c as any).estado),
      fecha_inicio: (c as any).fecha_inicio ?? '',
      localidades: locs,
      localidad_principal: locs[0],
      origen: '2024',
      formulario: (c as any).formulario,
      cupos: undefined,
      inscripcion_inicio: undefined,
      inscripcion_fin: undefined,
    };
  }

  private mapCurso2025ToCard(c: Curso2025): HomeCursoCard {
    const locs = Array.isArray((c as any).localidades) ? (c as any).localidades : [];
    return {
      id: (c as any).id,
      titulo: (c as any).titulo,
      descripcion: (c as any).descripcion_breve ?? '',
      imagen: (c as any).imagen || undefined,
      estado: this.normalizeEstadoValue((c as any).estado),
      fecha_inicio: (c as any).fecha_inicio ?? '',
      localidades: locs,
      localidad_principal: locs[0],
      origen: '2025',
      formulario: (c as any).formulario,
      cupos: (c as any).cupos ?? null,
      inscripcion_inicio: this.normalizeDateTimeLocal((c as any).inscripcion_inicio) ?? undefined,
      inscripcion_fin: this.normalizeDateTimeLocal((c as any).inscripcion_fin) ?? undefined,
    };
  }

  private mapCurso2026ToCard(c: Curso2026): HomeCursoCard {
    const locs = Array.isArray(c.localidades) ? c.localidades : [];
    const descripcion =
      (c.descripcion_breve ?? '').trim() ||
      (c.descripcion_completa ?? '').trim() ||
      (c.actividades ?? '').trim() ||
      '';

    return {
      id: c.id,
      titulo: c.titulo ?? '',
      descripcion,
      imagen: c.imagen || undefined,
      estado: this.normalizeEstadoValue(c.estado),
      fecha_inicio: c.fecha_inicio ?? '',
      localidades: locs,
      localidad_principal: locs[0],
      origen: '2026',
      slug: c.slug,
      formulario: c.formulario ?? '',
      cupos: typeof c.cupos === 'number' ? c.cupos : (c.cupos ?? null),
      inscripcion_inicio: this.normalizeDateTimeLocal(c.inscripcion_inicio) ?? undefined,
      inscripcion_fin: this.normalizeDateTimeLocal(c.inscripcion_fin) ?? undefined,
    };
  }

  // ───────────────────────── sorting/apply ───────────────────────────────────

  private compareIdDesc(aId: any, bId: any): number {
    const aNum = typeof aId === 'number' ? aId : Number.NaN;
    const bNum = typeof bId === 'number' ? bId : Number.NaN;
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return bNum - aNum;
    return String(bId).localeCompare(String(aId)); // desc
  }

  private applyCards(cards: HomeCursoCard[]): void {
    const todas = cards.flatMap((c) => c.localidades ?? []);
    this.localidadesUnicas = [...new Set(todas)].sort();

    this.cursosCards = cards.sort((a, b) => {
      const eo = this.getEstadoOrden(a.estado) - this.getEstadoOrden(b.estado);
      if (eo !== 0) return eo;
      return this.compareIdDesc(a.id, b.id);
    });

    requestAnimationFrame(() => {
      this.throttledUpdateScrollBtnPos();
      setTimeout(() => this.throttledUpdateScrollBtnPos(), 120);
    });
  }

  private getEstadoOrden(estado: Estado): number {
    switch (estado) {
      case 'inscripcion_abierta':
        return 0;
      case 'ultimos_cupos':
        return 1;
      case 'proximo':
        return 2;
      case 'cupo_completo':
        return 3;
      case 'en_curso':
        return 4;
      case 'finalizado':
        return 5;
      default:
        return 99;
    }
  }

  trackById(index: number, item: { id: number | string; origen?: Origen }): string | number {
    return item?.origen ? `${item.origen}-${item.id}` : item.id;
  }

  // ───────────────────────── cupos + meta inscripción ─────────────────────────

  getCuposTexto(card: HomeCursoCard): string | null {
    if (typeof card.cupos === 'number' && Number.isFinite(card.cupos) && card.cupos > 0) {
      return `Cupos: ${Math.floor(card.cupos)}`;
    }
    return null;
  }

  private shouldShowInicio(estado: Estado): boolean {
    return (
      estado === 'proximo' ||
      estado === 'inscripcion_abierta' ||
      estado === 'ultimos_cupos'
    );
  }

  getInscripcionMeta(card: HomeCursoCard): { show: boolean; label: string; iso?: string } {
    const mostrarInicio = this.shouldShowInicio(card.estado);
    const iso = (mostrarInicio ? card.inscripcion_inicio : card.inscripcion_fin) ?? undefined;

    const norm = this.normalizeDateTimeLocal(iso ?? null);
    if (!norm) return { show: false, label: '' };

    const label = mostrarInicio ? 'Apertura' : 'Cierre';
    return { show: true, label, iso: norm };
  }
}