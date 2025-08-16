import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminLoginService } from './admin-login.service';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private loginAttempts: number = 0;
  private lockoutEndTime: number = 0;
  private fingerprintId: string = '';
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private lastActivity: number = Date.now();

  constructor(
    private http: HttpClient,
    private adminLoginService: AdminLoginService
  ) {
    this.generateFingerprint();
    this.initializeLocalSecurity();
  }

  /**
   * Initialize local security features only
   */
  private initializeLocalSecurity(): void {
    this.startActivityMonitoring();
    this.loadStoredAttempts();
  }

  /**
   * Load stored login attempts from localStorage
   */
  private loadStoredAttempts(): void {
    try {
      const stored = localStorage.getItem('login_attempts');
      const lockout = localStorage.getItem('lockout_end');
      
      if (stored) {
        this.loginAttempts = parseInt(stored, 10) || 0;
      }
      
      if (lockout) {
        this.lockoutEndTime = parseInt(lockout, 10) || 0;
      }
    } catch (error) {
      console.warn('Could not load stored security data:', error);
    }
  }

  /**
   * Save login attempts to localStorage
   */
  private saveAttempts(): void {
    try {
      localStorage.setItem('login_attempts', this.loginAttempts.toString());
      localStorage.setItem('lockout_end', this.lockoutEndTime.toString());
    } catch (error) {
      console.warn('Could not save security data:', error);
    }
  }

  /**
   * Check if security features are enabled (always true for local)
   */
  isSecurityEnabled(): boolean {
    return true;
  }

  /**
   * Get login attempts count
   */
  getLoginAttempts(): number {
    return this.loginAttempts;
  }

  /**
   * Generate browser fingerprint for additional security
   */
  private generateFingerprint(): void {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Browser fingerprint', 2, 2);
      }

      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvas: canvas.toDataURL(),
        timestamp: Date.now()
      };

      this.fingerprintId = btoa(JSON.stringify(fingerprint));
    } catch (error) {
      console.warn('Could not generate fingerprint:', error);
      this.fingerprintId = 'fallback-' + Date.now();
    }
  }

  /**
   * Start local activity monitoring
   */
  private startActivityMonitoring(): void {
    // Reset activity timer on user interaction
    const resetActivity = () => {
      this.lastActivity = Date.now();
    };

    // Monitor user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, resetActivity, { passive: true });
    });

    // Check activity every minute
    setInterval(() => {
      if (Date.now() - this.lastActivity > this.SESSION_TIMEOUT) {
        console.warn('Session timeout due to inactivity');
        this.adminLoginService.forceLogout();
      }
    }, 60 * 1000);

    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab became hidden - start stricter timeout
        setTimeout(() => {
          if (document.hidden && this.adminLoginService.isAuthenticated()) {
            console.warn('Session timeout due to tab being hidden');
            this.adminLoginService.forceLogout();
          }
        }, this.SESSION_TIMEOUT / 2); // Half the normal timeout when hidden
      } else {
        // Tab became visible - reset activity
        resetActivity();
      }
    });
  }

  /**
   * Local secure login (just calls AdminLoginService)
   */
  secureLogin(credentials: any): Observable<any> {
    // Check if user is locked out
    if (this.isLockedOut()) {
      const remainingTime = Math.ceil((this.lockoutEndTime - Date.now()) / 1000 / 60);
      throw new Error(`الحساب مقفل. حاول مرة أخرى بعد ${remainingTime} دقيقة`);
    }

    // Just call the standard login
    return this.adminLoginService.login(credentials);
  }

  /**
   * Handle failed login attempt
   */
  handleFailedLogin(): void {
    this.loginAttempts++;
    
    if (this.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      this.lockoutEndTime = Date.now() + this.LOCKOUT_DURATION;
      console.warn(`Account locked for ${this.LOCKOUT_DURATION / 1000 / 60} minutes`);
    }

    this.saveAttempts();
    this.logSecurityEvent('LOGIN_FAILURE', { attempts: this.loginAttempts });
  }

  /**
   * Handle successful login
   */
  handleSuccessfulLogin(): void {
    this.loginAttempts = 0;
    this.lockoutEndTime = 0;
    this.saveAttempts();
    this.logSecurityEvent('LOGIN_SUCCESS', { timestamp: new Date().toISOString() });
  }

  /**
   * Check if user is currently locked out
   */
  isLockedOut(): boolean {
    const isLocked = Date.now() < this.lockoutEndTime;
    
    // Clean up expired lockout
    if (!isLocked && this.lockoutEndTime > 0) {
      this.lockoutEndTime = 0;
      this.loginAttempts = 0;
      this.saveAttempts();
    }
    
    return isLocked;
  }

  /**
   * Get remaining lockout time in minutes
   */
  getRemainingLockoutTime(): number {
    if (!this.isLockedOut()) return 0;
    return Math.ceil((this.lockoutEndTime - Date.now()) / 1000 / 60);
  }

  /**
   * Local security event logging (only to console)
   */
  logSecurityEvent(event: string, details?: any): void {
    const securityLog = {
      event,
      details,
      timestamp: new Date().toISOString(),
      fingerprint: this.fingerprintId,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Only log locally - no API calls
    console.log('🔒 Security Event:', securityLog);
  }

  /**
   * Sanitize input to prevent XSS
   */
  sanitizeInput(input: string): string {
    if (!input) return input;
    
    // Remove potentially dangerous HTML tags and scripts
    const dangerous = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const cleanInput = input
      .replace(dangerous, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
    
    return cleanInput;
  }

  /**
   * Monitor window activity
   */
  monitorWindowActivity(): void {
    // Activity monitoring is already started in initializeLocalSecurity
    console.log('🔒 Window activity monitoring started');
  }

  /**
   * Prevent multiple browser sessions
   */
  preventMultipleSessions(): void {
    try {
      const sessionId = this.generateSessionId();
      sessionStorage.setItem('admin_session_id', sessionId);

      // Use BroadcastChannel if available
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('admin_session');
        
        channel.addEventListener('message', (event) => {
          if (event.data.type === 'NEW_SESSION' && event.data.sessionId !== sessionId) {
            alert('تم تسجيل دخول من جلسة أخرى. سيتم تسجيل خروجك من هذه الجلسة.');
            this.adminLoginService.forceLogout();
          }
        });

        // Announce new session
        channel.postMessage({
          type: 'NEW_SESSION',
          sessionId: sessionId,
          timestamp: Date.now()
        });

        console.log('🔒 Multiple session prevention activated');
      }
    } catch (error) {
      console.warn('Multiple session prevention not available:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    try {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Fallback for older browsers
      return 'session_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
    }
  }

  /**
   * Detect suspicious patterns locally
   */
  detectSuspiciousActivity(): boolean {
    // Check for rapid login attempts
    if (this.loginAttempts > 2) {
      this.logSecurityEvent('SUSPICIOUS_ACTIVITY', { 
        reason: 'Multiple rapid login attempts',
        attempts: this.loginAttempts 
      });
      return true;
    }

    // Check for browser fingerprint changes
    const storedFingerprint = sessionStorage.getItem('browser_fingerprint');
    if (storedFingerprint && storedFingerprint !== this.fingerprintId) {
      this.logSecurityEvent('SUSPICIOUS_ACTIVITY', { 
        reason: 'Browser fingerprint changed',
        oldFingerprint: storedFingerprint,
        newFingerprint: this.fingerprintId
      });
      return true;
    }

    return false;
  }

  /**
   * Clear all security data
   */
  clearSecurityData(): void {
    this.loginAttempts = 0;
    this.lockoutEndTime = 0;
    
    // Clear stored data
    try {
      localStorage.removeItem('login_attempts');
      localStorage.removeItem('lockout_end');
      sessionStorage.removeItem('admin_session_id');
      sessionStorage.removeItem('browser_fingerprint');
    } catch (error) {
      console.warn('Could not clear security data:', error);
    }

    console.log('🔒 Security data cleared');
  }

  /**
   * Get security status (local implementation)
   */
  getSecurityStatus(): any {
    return {
      isEnabled: true,
      loginAttempts: this.loginAttempts,
      isLockedOut: this.isLockedOut(),
      remainingLockoutTime: this.getRemainingLockoutTime(),
      lastActivity: new Date(this.lastActivity).toISOString(),
      fingerprint: this.fingerprintId.substring(0, 10) + '...' // Only show partial for security
    };
  }

  /**
   * Clean up security service
   */
  ngOnDestroy(): void {
    this.clearSecurityData();
  }
}