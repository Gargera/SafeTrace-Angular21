import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../../shared/models/responses/api-response.model';
import { AuthResponse } from '../../features/auth/models/AuthResponse';
import { LoginRequest } from '../../features/auth/models/LoginRequest';
import { RegisterRequest } from '../../features/auth/models/RegisterRequest';
import { ResetPasswordRequest } from '../../features/auth/models/ResetPasswordRequest';
import { VerificationStatus } from '../../shared/enums/verification-status';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/Account`;

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

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  setSession(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.accessToken);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    
    const userData = {
      email: response.email,
      fName: response.fullName.split(' ')[0],
      fullName: response.fullName,
      isVerified: response.verificationStatus === VerificationStatus.Verified
    };
    
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

  register(data: RegisterRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, data).pipe(
      tap(res => { if (res.success && res.data) this.setSession(res.data); })
    );
  }

  googleLogin(providerToken: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/google-login`, { providerToken }).pipe(
      tap(res => { if (res.success && res.data) this.setSession(res.data); })
    );
  }

  facebookLogin(providerToken: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/facebook-login`, { providerToken }).pipe(
      tap(res => { if (res.success && res.data) this.setSession(res.data); })
    );
  }

  confirmEmail(email: string, otpCode: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/confirm-email?email=${encodeURIComponent(email)}&otpCode=${encodeURIComponent(otpCode)}`, {});
  }

  resendOtp(email: string, type: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/resend-otp?email=${encodeURIComponent(email)}&type=${type}`, {});
  }

  forgetPassword(email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/forget-password?email=${encodeURIComponent(email)}`, {});
  }

  resetPassword(data: ResetPasswordRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/reset-password`, data);
  }

  changePassword(data: { currentPassword: string, newPassword: string, currentRefreshToken?: string }): Observable<ApiResponse<string>> {
    const payload = { ...data, currentRefreshToken: this.getRefreshToken() };
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/change-password`, payload);
  }

  refreshToken(data: { expiredAccessToken: string, refreshToken: string }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/refresh-token`, data).pipe(
      tap(res => { if (res.success && res.data) this.setSession(res.data); })
    );
  }

  revokeToken(): Observable<ApiResponse<string>> {
    const currentRefreshToken = this.getRefreshToken();
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/revoke-token?token=${encodeURIComponent(currentRefreshToken || '')}`, {}).pipe(
      tap(() => this.clearSession())
    );
  }
}