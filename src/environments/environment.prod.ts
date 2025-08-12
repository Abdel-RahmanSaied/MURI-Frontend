// export const environment = {
//   production: true,
//   APIURL: "https://api.muri.sa",
//   my_Space : false
// };
// src/environments/environment.ts
export const environment = {
  production: false,
  APIURL: "https://api.muri.sa",
  appName: 'موري Admin Panel',
  version: '1.0.0',
  security: {
    // Secure token handling
    useHttpOnlyCookies: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
    refreshThreshold: 5 * 60 * 1000, // Refresh token 5 minutes before expiry
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes lockout

    // CSRF Protection
    enableCSRFProtection: true,
    csrfHeaderName: 'X-CSRF-Token',

    // Content Security Policy
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://your-api-domain.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },

    // Secure Headers
    secureHeaders: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  },
  features: {
    rememberMe: false, // Disabled for security with httpOnly cookies
    autoRefreshToken: true,
    sessionValidation: true, // Validate session with server periodically
    secureLogout: true // Clear all client-side data on logout
  }
};

// src/environments/environment.prod.ts
export const environmentProd = {
  production: true,
  APIURL: "https://api.muri.sa",
  appName: 'موري Admin Panel',
  version: '1.0.0',
  security: {
    // Enhanced security for production
    useHttpOnlyCookies: true,
    sessionTimeout: 15 * 60 * 1000, // 15 minutes in production
    refreshThreshold: 2 * 60 * 1000, // Refresh token 2 minutes before expiry
    maxLoginAttempts: 3, // Stricter in production
    lockoutDuration: 30 * 60 * 1000, // Longer lockout in production

    // CSRF Protection
    enableCSRFProtection: true,
    csrfHeaderName: 'X-CSRF-Token',

    // Strict Content Security Policy for production
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://your-production-api-domain.com"],
      connectSrc: ["'self'", "https://your-production-api-domain.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },

    // Enhanced Secure Headers
    secureHeaders: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'"
    }
  },
  features: {
    rememberMe: false, // Always disabled in production
    autoRefreshToken: true,
    sessionValidation: true,
    secureLogout: true
  }
};