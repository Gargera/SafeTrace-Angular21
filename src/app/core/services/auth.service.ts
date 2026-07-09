import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { Observable, tap, firstValueFrom } from 'rxjs';
import { ApiResponse } from '../../shared/models/responses/api-response.model';
import { AuthResponse } from '../../features/auth/models/AuthResponse';
import { LoginRequest } from '../../features/auth/models/LoginRequest';
import { RegisterRequest } from '../../features/auth/models/RegisterRequest';
import { ResetPasswordRequest } from '../../features/auth/models/ResetPasswordRequest';
import { VerificationStatus } from '../../shared/enums/verification-status';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/Account`;

  private accessToken: string | null = null;
  private readonly userDataKey = 'user_data';

  isLoggedIn = signal<boolean>(false);
  currentUser = signal<any>(null);

  constructor() {
    const userData = this.getUserData();
    if (userData) {
      this.currentUser.set(userData);
      this.isLoggedIn.set(true);
      
      this.refreshToken().subscribe({
        error: () => this.clearSession()
      });
    }
  }

  async checkSession(): Promise<void> {
    try {
      const res = await firstValueFrom(this.refreshToken());
      if (res.success && res.data) {
        this.isLoggedIn.set(true);
      }
    } catch (error) {
      this.clearSession();
    }
  }

  private getUserData(): any {
    const data = localStorage.getItem(this.userDataKey);
    return data ? JSON.parse(data) : null;
  }

  getToken(): string | null {
    return this.accessToken;
  }

  getRefreshTokenExpiration(): string | null {
    return localStorage.getItem('refreshTokenExpiration');
  }

  setSession(response: AuthResponse): void {
    this.accessToken = response.accessToken;
    
    const userData = {
      email: response.email,
      fName: response.fullName.split(' ')[0],
      fullName: response.fullName,
      profileImage: response.profileImage || null,
      isVerified: response.verificationStatus === VerificationStatus.Verified
    };

    localStorage.setItem(this.userDataKey, JSON.stringify(userData));
    if (response.refreshTokenExpiration) {
      localStorage.setItem('refreshTokenExpiration', response.refreshTokenExpiration.toString());
    }
    this.isLoggedIn.set(true);
    this.currentUser.set(userData);
  }

  clearSession(): void {
    this.accessToken = null;
    localStorage.removeItem(this.userDataKey);
    localStorage.removeItem('refreshTokenExpiration');
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
  }

  register(data: RegisterRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, data, { withCredentials: true }).pipe(
      tap(res => { if (res.success && res.data) this.setSession(res.data); })
    );
  }

  googleLogin(data: { providerToken: string }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/google-login`, data, { withCredentials: true }).pipe(
      tap(res => { if (res.success && res.data) this.setSession(res.data); })
    );
  }

  facebookLogin(data: { providerToken: string }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/facebook-login`, data, { withCredentials: true }).pipe(
      tap(res => { if (res.success && res.data) this.setSession(res.data); })
    );
  }

  confirmEmail(email: string, otpCode: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.baseUrl}/confirm-email?email=${encodeURIComponent(email)}&otpCode=${encodeURIComponent(otpCode)}`,
      {},
    );
  }

  resendOtp(email: string, type: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.baseUrl}/resend-otp?email=${encodeURIComponent(email)}&type=${type}`,
      {},
    );
  }

  forgetPassword(email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.baseUrl}/forget-password?email=${encodeURIComponent(email)}`,
      {},
    );
  }

  resetPassword(data: ResetPasswordRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/reset-password`, data);
  }

  changePassword(data: { currentPassword: string, newPassword: string }): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/change-password`, data, { withCredentials: true });
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/refresh-token`, {}, { withCredentials: true }).pipe(
      tap(res => { if (res.success && res.data) this.setSession(res.data); })
    );
  }

  revokeToken(): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/revoke-token`, {}, { withCredentials: true }).pipe(
      tap(() => this.clearSession())
    );
  }
}
