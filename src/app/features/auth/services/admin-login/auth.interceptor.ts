import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AdminLoginService } from './admin-login.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private useSecureMode = true;

  constructor(
    private adminLoginService: AdminLoginService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip interceptor for login and public requests
    if (this.isPublicRequest(request)) {
      return next.handle(request);
    }

    // Try secure headers first, fallback to basic
    const enhancedRequest = this.addAuthHeaders(request);
    
    return next.handle(enhancedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle CORS errors gracefully
        if (error.status === 0 && error.statusText === 'Unknown Error') {
          console.warn('CORS error detected, falling back to basic mode');
          this.useSecureMode = false;
          // Retry with basic headers
          const basicRequest = this.addBasicHeaders(request);
          return next.handle(basicRequest);
        }

        if (error.status === 401 && !this.isAuthRequest(request)) {
          return this.handle401Error(enhancedRequest, next);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Add authentication headers (secure or basic)
   */
  private addAuthHeaders(request: HttpRequest<any>): HttpRequest<any> {
    const token = this.adminLoginService.getAccessToken();
    
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add secure headers if in secure mode
    if (this.useSecureMode) {
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    return request.clone({
      setHeaders: headers,
      withCredentials: this.useSecureMode
    });
  }

  /**
   * Add basic headers (fallback mode)
   */
  private addBasicHeaders(request: HttpRequest<any>): HttpRequest<any> {
    const token = this.adminLoginService.getAccessToken();
    
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return request.clone({
      setHeaders: headers,
      withCredentials: false // Disable credentials for basic mode
    });
  }

  /**
   * Handle 401 unauthorized error
   */
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      // Try to refresh token
      return this.adminLoginService.refreshToken().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response);
          
          // Retry the original request with new token
          const authRequest = this.addAuthHeaders(request);
          return next.handle(authRequest);
        }),
        catchError((error) => {
          this.isRefreshing = false;
          console.warn('Token refresh failed:', error);
          this.handleAuthFailure();
          return throwError(() => error);
        })
      );
    } else {
      // Wait for refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => {
          const authRequest = this.addAuthHeaders(request);
          return next.handle(authRequest);
        })
      );
    }
  }

  /**
   * Handle authentication failure
   */
  private handleAuthFailure(): void {
    console.warn('Authentication failed, redirecting to login');
    this.adminLoginService.forceLogout();
    
    // Only redirect if not already on login page
    if (!this.router.url.includes('/login')) {
      this.router.navigate(['/admin/login']);
    }
  }

  /**
   * Check if request is for public endpoints
   */
  private isPublicRequest(request: HttpRequest<any>): boolean {
    const publicEndpoints = [
      '/login',
      '/register', 
      '/forgot-password',
      '/reset-password',
      '/public',
      '/health',
      '/version'
    ];
    
    return publicEndpoints.some(endpoint => 
      request.url.includes(endpoint)
    );
  }

  /**
   * Check if request is an authentication request
   */
  private isAuthRequest(request: HttpRequest<any>): boolean {
    const authEndpoints = [
      '/login',
      '/logout',
      '/refresh',
      '/validate-session',
      '/security-log'
    ];
    
    return authEndpoints.some(endpoint => 
      request.url.includes(endpoint)
    );
  }
}

// Standard HTTP Interceptor Provider for Angular
export const authInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true
};

// Import this for the provider
import { HTTP_INTERCEPTORS } from '@angular/common/http';