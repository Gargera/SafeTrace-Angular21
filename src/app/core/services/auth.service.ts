import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { environment } from '../../../environments/environment';
import { Observable, tap, firstValueFrom } from 'rxjs';
import { ApiResponse } from '../../shared/models/responses/api-response.model';
import { AuthResponse } from '../../features/auth/models/responses/AuthResponse';
import { LoginRequest } from '../../features/auth/models/requests/LoginRequest';
import { RegisterRequest } from '../../features/auth/models/requests/RegisterRequest';
import { ResetPasswordRequest } from '../../features/auth/models/requests/ResetPasswordRequest';
import { VerificationStatus } from '../../shared/enums/verification-status';
import { LocationTrackingService } from './LocationTracking.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private socialAuthService = inject(SocialAuthService);
  private router = inject(Router);
  private readonly baseUrl = `${environment.baseUrl}/api/Account`;
  private locationTrackingService = inject(LocationTrackingService);
  private accessToken: string | null = null;
  private readonly userDataKey = 'user_data';

  isLoggedIn = signal<boolean>(false);
  currentUser = signal<any>(null);

  constructor() {
    const userData = this.getUserData();
    if (userData) {
      this.currentUser.set(userData);
      this.isLoggedIn.set(true);
    }
  }

  async checkSession(): Promise<void> {
    const expirationStr = this.getRefreshTokenExpiration();
    if (expirationStr) {
      const expDate = new Date(expirationStr);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        this.clearSession();
        return;
      }
    }

    if (!this.getUserData()) {
      return;
    }

    try {
      const res = await firstValueFrom(this.refreshToken());
      if (res.success && res.data) {
        this.isLoggedIn.set(true);
      }
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        this.handleSessionExpiration();
      }
    }
  }

  private getUserData(): any {
    const data = localStorage.getItem(this.userDataKey);
    return data ? JSON.parse(data) : null;
  }

  private getDecodedToken(): any | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(decodedPayload);
    } catch {
      return null;
    }
  }

  getCurrentUserId(): string | null {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken) return null;

    return (
      decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      decodedToken.sub ||
      null
    );
  }

  getVerificationStatus(): VerificationStatus | undefined {
    const userData = this.currentUser();
    return userData ? userData.verificationStatus : undefined;
  }

  getUserRole(): string | null {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken) return null;

    const roleClaim =
      decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      decodedToken.role;
    return typeof roleClaim === 'string'
      ? roleClaim
      : Array.isArray(roleClaim) && roleClaim.length > 0
        ? roleClaim[0]
        : null;
  }

  hasPermission(permission: string): boolean {
    const userData = this.currentUser();
    if (!userData || !userData.permissions) return false;
    return userData.permissions.includes(permission);
  }

  getToken(): string | null {
    return this.accessToken;
  }

  getRefreshTokenExpiration(): string | null {
    return localStorage.getItem('refreshTokenExpiration');
  }

  async getValidAccessTokenSignalR(): Promise<string | null> {
    const token = this.getToken();

    if (!token) {
      return null;
    }

    const decoded = this.getDecodedToken();

    if (!decoded?.exp) {
      return token;
    }

    const expirationTime = decoded.exp * 1000;

    // لو باقي أقل من دقيقة، اعمل refresh
    if (expirationTime - Date.now() < 60_000) {
      try {
        const response = await firstValueFrom(this.refreshToken());

        if (response.success && response.data) {
          return response.data.accessToken;
        }

        return null;
      } catch {
        return null;
      }
    }

    return token;
  }

  setSession(response: AuthResponse): void {
    this.accessToken = response.accessToken;

    const userData = {
      email: response.email,
      fName: response.fullName.split(' ')[0],
      fullName: response.fullName,
      profileImage: response.profileImage || null,
      isVerified: response.verificationStatus === VerificationStatus.Verified,
      verificationStatus: response.verificationStatus,
      permissions: response.permissions || [],
    };

    localStorage.setItem(this.userDataKey, JSON.stringify(userData));
    if (response.refreshTokenExpiration) {
      localStorage.setItem('refreshTokenExpiration', response.refreshTokenExpiration.toString());
    }
    this.isLoggedIn.set(true);
    this.currentUser.set(userData);
  }

  handleSessionExpiration(): void {
    if (!this.isLoggedIn()) return; // Already cleared

    this.clearSession();

    import('sweetalert2').then((SwalModule) => {
      const Swal = SwalModule.default;
      Swal.fire({
        title: 'انتهت الجلسة',
        text: 'تم تسجيل الخروج لانتهاء الجلسة أو كإجراء أمني، يرجى تسجيل الدخول من جديد.',
        icon: 'warning',
        confirmButtonText: 'تسجيل الدخول',
        confirmButtonColor: '#091426',
        allowOutsideClick: false,
        customClass: {
          popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl',
        },
      }).then(() => {
        this.router.navigate(['/auth']);
      });
    });
  }

  clearSession(): void {
    this.locationTrackingService.stopTrackingLocation();

    this.accessToken = null;
    localStorage.removeItem(this.userDataKey);
    localStorage.removeItem('refreshTokenExpiration');
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.signOutSocialProviders();
  }

  private signOutSocialProviders(): void {
    void this.socialAuthService.signOut().catch(() => undefined);
  }

  register(data: RegisterRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this.setSession(res.data);

            // ابدأ تتبع الموقع
            this.locationTrackingService.startTrackingLocation();
          }
        }),
      );
  }

  googleLogin(data: { providerToken: string }): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.baseUrl}/google-login`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this.setSession(res.data);
            this.locationTrackingService.startTrackingLocation();
          }
        }),
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

  changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/change-password`, data, {
      withCredentials: true,
    });
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(
        `${this.baseUrl}/refresh-token`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap((res) => {
          if (res.success && res.data) this.setSession(res.data);
        }),
      );
  }

  revokeToken(): Observable<ApiResponse<string>> {
    return this.http
      .post<ApiResponse<string>>(`${this.baseUrl}/revoke-token`, {}, { withCredentials: true })
      .pipe(tap(() => this.clearSession()));
  }
}
