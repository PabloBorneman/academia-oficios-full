import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

type LoginResponse = {
  token: string;
  token_type: 'Bearer';
  expires_in: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'admin_token';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/api/auth/login', { username, password })
      .pipe(tap((r) => localStorage.setItem(this.TOKEN_KEY, r.token)));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private decodeJwtPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payloadPart = parts[1];
      const base64 = payloadPart
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(payloadPart.length / 4) * 4, '=');

      const json = atob(base64);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  isTokenExpired(token?: string, skewSeconds = 30): boolean {
    const t = token ?? this.getToken();
    if (!t) return true;

    const payload = this.decodeJwtPayload(t);
    const exp = payload?.exp;

    // Si no es JWT o no trae exp, por seguridad lo tratamos como vencido
    if (!exp || typeof exp !== 'number') return true;

    const nowSec = Math.floor(Date.now() / 1000);
    return nowSec >= exp - skewSeconds;
  }

  isLogged(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }
}
