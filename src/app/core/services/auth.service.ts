import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly userDataKey = 'user_data';

  isLoggedIn = signal<boolean>(this.hasToken());
  currentUser = signal<any>(this.getUserData());

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private getUserData(): any {
    const data = localStorage.getItem(this.userDataKey);
    return data ? JSON.parse(data) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setSession(token: string, refreshToken: string, userData: any): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
    localStorage.setItem(this.userDataKey, JSON.stringify(userData));

    this.isLoggedIn.set(true);
    this.currentUser.set(userData);
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userDataKey);

    this.isLoggedIn.set(false);
    this.currentUser.set(null);
  }
}