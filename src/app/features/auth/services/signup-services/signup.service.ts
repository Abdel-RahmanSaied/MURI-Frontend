import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment as env } from '../../../../../environments/environment.prod';
import { CookieService } from 'ngx-cookie-service';

interface TokenPayload {
  exp?: number;
  [key: string]: any;
}

export interface SignupResponse {
  access_token: string;
  success: boolean;
  message: string;
  user_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignupService {
  private readonly baseUrl: string = env.APIURL;
  private readonly apiUrl: string = `${this.baseUrl}/api/clients/users/`;
  private readonly TOKEN_KEY: string = 'admin_access_token';
  private readonly DEFAULT_LANGUAGE: string = 'ar';
  private selectedLanguage: string = 'ar';

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {}

  /**
   * Handles user signup with form data
   */
  signup(formData: FormData): Observable<SignupResponse> {
    this.cleanFormData(formData);
    this.normalizeFormData(formData);

    return this.http.post<SignupResponse>(this.apiUrl, formData, {
      headers: this.getSecurityHeaders(),
      reportProgress: false
    }).pipe(
      tap(response => this.handleSignupSuccess(response)),
      catchError(error => this.handleSignupError(error))
    );
  }

  /**
   * Cleans form data by removing unnecessary fields
   */
  private cleanFormData(formData: FormData): void {
    ['confirm_password', 'terms'].forEach(field => formData.delete(field));
  }

  /**
   * Normalizes and sanitizes form data
   */
  private normalizeFormData(formData: FormData): void {
    const textFields = ['email', 'first_name', 'second_name', 'last_name', 'nationality'];
    
    textFields.forEach(field => {
      const value = formData.get(field);
      if (typeof value === 'string') {
        formData.set(field, this.sanitizeInput(value.trim()));
      }
    });

    const email = formData.get('email');
    if (typeof email === 'string') {
      formData.set('email', email.toLowerCase().trim());
    }
  }

  /**
   * Returns security headers for HTTP requests
   */
  private getSecurityHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
      'Accept-Language': this.selectedLanguage || this.DEFAULT_LANGUAGE
    });
  }

  /**
   * Handles successful signup response
   */
  private handleSignupSuccess(response: SignupResponse): void {
    if (response?.access_token) {
      this.storeAuthData(response);
    }
  }

  /**
   * Handles signup errors
   */
  private handleSignupError(error: HttpErrorResponse): Observable<never> {
    console.error('Signup error:', error);
      return throwError(() => error);

    const userMessage = error.error?.message || 'Signup failed. Please try again.';
    return throwError(() => new Error(userMessage));
  }

  /**
   * Securely stores authentication data
   */
  private storeAuthData(response: SignupResponse): void {
    try {
      const token = response.access_token;
      
      this.cookieService.set(
        this.TOKEN_KEY,
        token,
        undefined,
        '/',
        undefined,
        true,
        'Strict'
      );
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }

  /**
   * Extracts expiration date from JWT token
   */
  private getTokenExpiration(token: string): Date | undefined {
    try {
      const payload: TokenPayload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? new Date(payload.exp * 1000) : undefined;
    } catch (error) {
      console.warn('Token parsing error:', error);
      return undefined;
    }
  }

  /**
   * Retrieves stored authentication token
   */
  getToken(): string | null {
    try {
      return this.cookieService.get(this.TOKEN_KEY) || null;
    } catch (error) {
      console.error('Token retrieval error:', error);
      return null;
    }
  }

  /**
   * Sanitizes user input to prevent XSS
   */
  private sanitizeInput(input: string): string {
    return input
      .replace(/[<>"'`]/g, '') // Remove HTML tags and quotes
      .replace(/javascript:/gi, '') // Remove JS protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/\s+/g, ' '); // Normalize whitespace
  }
}