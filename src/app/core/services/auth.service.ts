import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { environment } from '../../../environments/environment';
import { Observable, tap, firstValueFrom } from 'rxjs';
import { ApiResponse } from '../../shared/models/responses/api-response.model';
import { AuthResponse } from '../../features/auth/models/AuthResponse';
import { LoginRequest } from '../../features/auth/models/LoginRequest';
import { RegisterRequest } from '../../features/auth/models/RegisterRequest';
import { ResetPasswordRequest } from '../../features/auth/models/ResetPasswordRequest';
import { VerificationStatus } from '../../shared/enums/verification-status';
import { UserRole } from '../../shared/enums/user-role';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private socialAuthService = inject(SocialAuthService);
  private router = inject(Router);
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
    }
  }

  async checkSession(): Promise<void> {
    try {
      const res = await firstValueFrom(this.refreshToken());
      if (res.success && res.data) {
        this.isLoggedIn.set(true);
      }
    } catch (error) {
      this.handleSessionExpiration();
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
      const decodedPayload = atob(payload);
      return JSON.parse(decodedPayload);
    } catch {
      return null;
    }
  }

  getCurrentUserId(): string | null {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken) return null;

    return decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || decodedToken.sub || null;
  }

  getUserRole(): string | null {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken) return null;

    const roleClaim = decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decodedToken.role;
    return typeof roleClaim === 'string' ? roleClaim : (Array.isArray(roleClaim) && roleClaim.length > 0 ? roleClaim[0] : null);
  }

  hasRole(role: string): boolean {
    return this.getUserRole() === role;
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.Admin);
  }

  isModerator(): boolean {
    return this.hasRole(UserRole.Moderator);
  }

  isVerifiedUser(): boolean {
    return this.hasRole(UserRole.VerifiedUser);
  }

  getVerificationStatus(): VerificationStatus | undefined {
    const userData = this.currentUser();
    return userData ? userData.verificationStatus : undefined;
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
      isVerified: response.verificationStatus === VerificationStatus.Verified,
      verificationStatus: response.verificationStatus,
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
          popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl'
        }
      }).then(() => {
        this.router.navigate(['/auth']);
      });
    });
  }

  clearSession(): void {
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
      .post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, data, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res.success && res.data) this.setSession(res.data);
        }),
      );
  }

  googleLogin(data: { providerToken: string }): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<
        ApiResponse<AuthResponse>
      >(`${this.baseUrl}/google-login`, data, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res.success && res.data) this.setSession(res.data);
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
      .post<
        ApiResponse<AuthResponse>
      >(`${this.baseUrl}/refresh-token`, {}, { withCredentials: true })
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
