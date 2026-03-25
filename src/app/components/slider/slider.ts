import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CursoService } from '../../services/curso';
import { Curso2025 } from '../../models/curso-2025.model';

type Estado = 'inscripcion_abierta' | 'proximo' | 'en_curso' | 'finalizado';

type SlidePI = {
  tipo: 'pi';
  imagenDesktop: string;
  imagenMobile: string;
  imagen: string;     // activa según viewport
  link: boolean;      // true si tiene url
  url?: string;       // URL específica por slide
};

type SlideCurso = {
  tipo: 'curso';
  id: number;
  titulo: string;
  descripcion: string;
  imagen?: string;
  estado: Estado;
  fecha_inicio: string;
};

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './slider.html',
  styleUrls: ['./slider.css'],
})
export class Slider implements OnInit, OnDestroy {
  cursosProximos: Array<SlidePI | SlideCurso> = [];
  currentIndex = 0;
  autoSlideInterval: any;

  // UI responsive
  isMobile = false;

  // ✅ Orden requerido: 5 → 4 → 1 → 2 → 3
  private portalImgsDesktop = [
    'assets/img/portal/portal_5.webp',
    'assets/img/portal/portal_4.webp',
    'assets/img/portal/portal_1.webp',
    'assets/img/portal/portal_2.webp',
    'assets/img/portal/portal_3.webp',
  ];

  private portalImgsMobile = [
    'assets/img/portal/portal_celu_5.webp',
    'assets/img/portal/portal_celu_4.webp',
    'assets/img/portal/portal_celu_1.webp',
    'assets/img/portal/portal_celu_2.webp',
    'assets/img/portal/portal_celu_3.webp',
  ];

  // ✅ URLs alineadas al MISMO orden de arriba
  // portal_5 y portal_4 YA NO REDIRIGEN
  private portalUrls: Array<string | undefined> = [
    undefined,                       // portal_5
    undefined,                       // portal_4
    'https://empleopi.jujuy.gob.ar', // portal_1
    undefined,                       // portal_2
    undefined,                       // portal_3
  ];

  private onResize = () => {
    const prev = this.isMobile;
    this.checkScreenSize();
    if (prev !== this.isMobile) {
      this.updatePortalImagesForViewport();
    }
  };

  constructor(private cursoService: CursoService) {}

  ngOnInit(): void {
    this.checkScreenSize();
    window.addEventListener('resize', this.onResize);

    this.cursoService.getCursos2025().subscribe({
      next: (cursos: Curso2025[]) => {
        const proximosOrdenados = cursos
          .filter((c) => c.estado === 'proximo')
          .sort((a, b) => this.safeDate(a.fecha_inicio) - this.safeDate(b.fecha_inicio));

        this.cursosProximos = this.buildSlides(proximosOrdenados);

        // ✅ Si hay cursos, el slide 0 es curso, el 1 es el primer portal (ahora portal_5)
        // Si NO hay cursos, el slide 0 ya es portal_5.
        this.currentIndex =
          this.cursosProximos.length > 1 && this.cursosProximos[0].tipo === 'curso' ? 1 : 0;

        if (this.cursosProximos.length) this.startAutoSlide();
      },
      error: (err) => console.error('Error cargando cursos 2025:', err),
    });
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
    window.removeEventListener('resize', this.onResize);
  }

  // ── Arma el carrusel intercalado (curso ↔ portal)
  private buildSlides(proximos: Curso2025[]): Array<SlidePI | SlideCurso> {
    const slides: Array<SlidePI | SlideCurso> = [];

    const makePortal = (i: number): SlidePI => {
      const idx = i % this.portalImgsDesktop.length;

      const imgD = this.portalImgsDesktop[idx];
      const imgM = this.portalImgsMobile[idx];

      const url = this.portalUrls[idx];
      const link = !!url;

      return {
        tipo: 'pi',
        imagenDesktop: imgD,
        imagenMobile: imgM,
        imagen: this.isMobile ? imgM : imgD,
        link,
        url,
      };
    };

    if (proximos.length === 0) {
      for (let i = 0; i < this.portalImgsDesktop.length; i++) {
        slides.push(makePortal(i));
      }
      return slides;
    }

    const maxLen = Math.max(proximos.length, this.portalImgsDesktop.length);
    for (let i = 0; i < maxLen; i++) {
      const c = proximos[i % proximos.length];
      slides.push({
        tipo: 'curso',
        id: c.id,
        titulo: c.titulo,
        descripcion: c.descripcion_breve ?? '',
        imagen: c.imagen,
        estado: c.estado as Estado,
        fecha_inicio: c.fecha_inicio ?? '',
      });

      slides.push(makePortal(i));
    }

    return slides;
  }

  private updatePortalImagesForViewport(): void {
    for (const s of this.cursosProximos) {
      if (s.tipo === 'pi') {
        s.imagen = this.isMobile ? s.imagenMobile : s.imagenDesktop;
      }
    }
  }

  // ── Navegación
  startAutoSlide(): void {
    this.stopAutoSlide();
    this.autoSlideInterval = setInterval(() => this.next(), 5000);
  }

  stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = null;
    }
  }

  next(): void {
    if (this.cursosProximos.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.cursosProximos.length;
    }
  }

  prev(): void {
    if (this.cursosProximos.length > 0) {
      this.currentIndex =
        (this.currentIndex - 1 + this.cursosProximos.length) % this.cursosProximos.length;
    }
  }

  getSlideClass(index: number): string {
    return index === this.currentIndex ? 'slide active' : 'slide';
  }

  // ── Util
  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 1024;
  }

  private safeDate(iso: string | undefined | null): number {
    if (!iso) return Number.POSITIVE_INFINITY;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  }
}