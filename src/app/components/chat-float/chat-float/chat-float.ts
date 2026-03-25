/* =========================================================
 * chat-float.ts – Chatbot Camila
 * SPA links + AUTOSCROLL fiable (ViewChild + AfterViewChecked)
 * + GA4/GTM: evento chat_message_send (sin texto del usuario)
 * ========================================================= */

import {
  Component,
  AfterViewInit,
  AfterViewChecked,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-chat-float',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-float.html',
  styleUrls: ['./chat-float.css']
})
export class ChatFloatComponent implements AfterViewInit, AfterViewChecked, OnDestroy {
  /* ---------- UI ---------- */
  chatVisible = false;
  userMessage = '';
  mostrarModal = true;

  /* ---------- conversación ---------- */
  private readonly sessionId: string;
  messages: { from: 'user' | 'bot'; text: string; html?: SafeHtml }[] = [];

  /* ---------- refs / estado autoscroll ---------- */
  @ViewChild('msgContainer', { static: false }) private msgContainerRef?: ElementRef<HTMLDivElement>;
  private prevCount = 0;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {
    // ID de sesión persistente por navegador
    const KEY = 'chat-session-id';
    const stored = localStorage.getItem(KEY);
    this.sessionId = stored ?? uuid();
    if (!stored) localStorage.setItem(KEY, this.sessionId);
  }

  /* ===== Ciclo de vida ===== */
  ngAfterViewInit() {
    // Ajuste inicial por si ya hay historial
    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    // Si cambió la cantidad de mensajes, bajar al final
    if (this.prevCount !== this.messages.length) {
      this.prevCount = this.messages.length;
      this.scrollToBottom();
    }
  }

  ngOnDestroy() {
    // sin listeners manuales que limpiar
  }

  /* ===== UI ===== */
  toggleChat() {
    this.chatVisible = !this.chatVisible;
    if (this.chatVisible) {
      // esperar a que aparezca el panel y recién scrollear
      setTimeout(() => this.scrollToBottom(), 0);
    }
  }

  cerrarModal() {
    this.mostrarModal = false;
    setTimeout(() => this.scrollToBottom(), 0);
  }

  /* ===== Envío ===== */
  sendMessage() {
    const message = this.userMessage.trim();
    if (!message) return;

    // 1) agrega mensaje del usuario
    this.messages.push({ from: 'user', text: message });

    // ---- GA4/GTM: track de envío (cuenta Enter y Click) ----
    // No enviamos el texto del usuario; sólo metadatos seguros.
    this.trackChatSend(message.length);

    this.userMessage = '';

    // 2) se completará el scroll en AfterViewChecked
    setTimeout(() => this.scrollToBottom(), 0);

    // 3) POST al backend
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-session-id': this.sessionId
    });

    this.http
      .post<{ message: string }>('/api/chat', { message }, { headers })
      .subscribe({
        next: (res) => {
          const html = this.sanitizer.bypassSecurityTrustHtml(res.message);
          this.messages.push({ from: 'bot', text: res.message, html });
          setTimeout(() => this.scrollToBottom(), 0);
        },
        error: () => {
          this.messages.push({
            from: 'bot',
            text: 'Hubo un error al conectar con el asistente.'
          });
          setTimeout(() => this.scrollToBottom(), 0);
        }
      });
  }

  /* ===== Util ===== */
  sanitize(raw: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }

  /**
   * Intercepta links internos a /curso/... para navegación SPA.
   */
  onMessageClick(ev: MouseEvent) {
    if (ev.defaultPrevented || ev.button !== 0) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    if (anchor.target === '_blank') return;

    const url = new URL(anchor.href, window.location.origin);
    const sameOrigin = url.origin === window.location.origin;
    const isDetalleCurso = sameOrigin && url.pathname.startsWith('/curso/');
    if (!isDetalleCurso) return;

    ev.preventDefault();
    this.router.navigateByUrl(url.pathname + url.search);
    setTimeout(() => this.scrollToBottom(), 0);
  }

  /* ============== AUTOSCROLL núcleo ============== */
  private scrollToBottom() {
    const el = this.msgContainerRef?.nativeElement;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  }

  /* ============== GA4/GTM tracking ============== */
  private trackChatSend(length: number) {
    try {
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({
        event: 'chat_message_send',
        chat_source: 'camila',          // etiqueta del origen del chat
        message_length: length,         // NO enviamos el texto
        session_id: this.sessionId,     // útil para análisis (opcional)
        page_location: window.location.href
      });
    } catch {
      // si algo falla en tracking, no rompe el flujo del chat
    }
  }
}
