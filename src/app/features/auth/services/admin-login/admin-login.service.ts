import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/enviroment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserData {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  profile_picture: string;
  is_active: boolean;
  is_staff: boolean;
  email_verified: boolean;
  user_type: string;
  nationality: string;
  birth_date: string;
}

export interface LoginResponse {
  user_data: UserData;
  access_token: string;
  refresh_token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminLoginService {
  private readonly baseUrl = environment.APIURL;
  private readonly TOKEN_KEY = 'admin_access_token';
  private readonly REFRESH_TOKEN_KEY = 'admin_refresh_token';
  private readonly USER_DATA_KEY = 'admin_user_data';
  
  private currentUserSubject = new BehaviorSubject<UserData | null>(this.getUserData());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}


  /**
   * Login admin user
   * @param credentials Login credentials
   * @returns Observable of login response
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const loginUrl = `${this.baseUrl}/api/admin/login/`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<LoginResponse>(loginUrl, credentials, { headers }).pipe(
      tap(response => {
        this.storeAuthData(response);
        this.currentUserSubject.next(response.user_data);
      })
    );
  }

  /**
   * Logout user and clear stored data
   */
  logout(): void {
    this.clearAuthData();
    this.currentUserSubject.next(null);
  }

  /**
   * Get current access token
   * @returns Access token or null
   */
  getAccessToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Get current refresh token
   * @returns Refresh token or null
   */
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  /**
   * Get stored user data
   * @returns User data or null
   */
  getUserData(): UserData | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userData = localStorage.getItem(this.USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  /**
   * Check if user is authenticated
   * @returns Boolean indicating authentication status
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return tokenPayload.exp > currentTime;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Get authorization headers for API calls
   * @returns HttpHeaders with authorization
   */
  getAuthHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  /**
   * Store authentication data securely
   * @param response Login response containing tokens and user data
   */
  private storeAuthData(response: LoginResponse): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(this.TOKEN_KEY, response.access_token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
        localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(response.user_data));
      } catch (error) {
        console.error('Error storing auth data:', error);
      }
    }
  }

  /**
   * Clear all stored authentication data
   */
  private clearAuthData(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_DATA_KEY);
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns Observable of new login response
   */
  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const refreshUrl = `${this.baseUrl}/api/admin/token/refresh/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<LoginResponse>(refreshUrl, { refresh: refreshToken }, { headers }).pipe(
      tap(response => {
        this.storeAuthData(response);
        this.currentUserSubject.next(response.user_data);
      })
    );
  }
}