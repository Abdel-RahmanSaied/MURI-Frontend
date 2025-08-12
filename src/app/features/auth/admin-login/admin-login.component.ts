import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AdminLoginService, LoginRequest } from '../services/admin-login/admin-login.service';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-login',
  imports: [
    ReactiveFormsModule,
  ],
  templateUrl: './admin-login.component.html',
  standalone: true,
  styleUrls: ['./admin-login.component.scss'],

})
export class AdminLoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  emailFocused = false;
  passwordFocused = false;
  submitted = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private adminLoginService: AdminLoginService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    // this.checkIfAlreadyLoggedIn();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize reactive form with validation
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        this.emailWithDotValidator(),
        this.emailNoArabicValidator()
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.specialCharacter,
        this.containsNumber,
        this.noSpaceAllowed,
        this.containsLetter
      ]]
    });
  }

  /**
   * Check if user is already authenticated
   */
  private checkIfAlreadyLoggedIn(): void {
    if (this.adminLoginService.isAuthenticated()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.valid && !this.isLoading) {
      this.performLogin();
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Perform login operation
   */
  private performLogin(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.clearServerErrors();

    const credentials: LoginRequest = {
      email: this.loginForm.get('email')?.value.trim(),
      password: this.loginForm.get('password')?.value
    };

    this.adminLoginService.login(credentials)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Login successful:', response.user_data);
          this.handleSuccessfulLogin(response.user_data.user_type);
        },
        error: (error) => {
          console.error('❌ Login failed:', error);
          this.handleLoginError(error);
        }
      });
  }

  /**
   * Handle successful login
   */
  private handleSuccessfulLogin(userType: string): void {
    // Navigate based on user type
    if (userType === 'super admin' || userType === 'admin') {
      // this.router.navigate(['/admin/dashboard']);
    } else {
      this.errorMessage = 'غير مصرح لك بالوصول إلى لوحة الإدارة';
      this.adminLoginService.logout();
    }
  }

  /**
   * Handle login error similar to signup component
   */
  private handleLoginError(error: any): void {
    this.isLoading = false;

    // Handle field-specific validation errors from server
    if (error.error && error.error.errors) {
      // Clear all previous server errors first
      this.clearServerErrors();

      // Handle each field error
      Object.keys(error.error.errors).forEach(field => {
        const fieldErrors = error.error.errors[field];
        if (fieldErrors && fieldErrors.length > 0) {
          const errorMessage = fieldErrors[0].detail || fieldErrors[0];
          this.setFieldServerError(field, errorMessage);
        }
      });

      // Handle specific field errors
      if (error.error.errors.email) {
        this.loginForm.get('email')?.setErrors({
          serverError: error.error.errors.email[0].detail || error.error.errors.email[0]
        });
      }

      if (error.error.errors.password) {
        this.loginForm.get('password')?.setErrors({
          serverError: error.error.errors.password[0].detail || error.error.errors.password[0]
        });
      }

    } else {
      // Handle different HTTP status codes
      if (error.status === 401) {
        this.errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (error.status === 403) {
        this.errorMessage = 'غير مصرح لك بالوصول إلى لوحة الإدارة';
      } else if (error.status === 422) {
        this.errorMessage = 'بيانات غير صحيحة. يرجى التحقق من المعلومات المدخلة';
      } else if (error.status === 500) {
        this.errorMessage = 'خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً';
      } else if (error.status === 0) {
        this.errorMessage = 'خطأ في الاتصال بالخادم';
      } else {
        this.errorMessage = 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى';
      }
    }
  }

  /**
   * Clear all server errors from form controls
   */
  private clearServerErrors(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control && control.errors && control.errors['serverError']) {
        const errors = { ...control.errors };
        delete errors['serverError'];

        // If no other errors, set to null, otherwise keep other errors
        const hasOtherErrors = Object.keys(errors).length > 0;
        control.setErrors(hasOtherErrors ? errors : null);
      }
    });
  }

  /**
   * Set server error for specific field
   */
  private setFieldServerError(fieldName: string, errorMessage: string): void {
    const control = this.loginForm.get(fieldName);
    if (control) {
      const currentErrors = control.errors || {};
      control.setErrors({ ...currentErrors, serverError: errorMessage });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }


  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched();
      }
    });
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (field?.hasError('serverError')) {
      return field.errors?.['serverError'];
    }

    if (field?.hasError('required')) {
      return fieldName === 'email' ? 'البريد الإلكتروني مطلوب' : 'كلمة المرور مطلوبة';
    }

    if (field?.hasError('email')) {
      return 'يرجى إدخال بريد إلكتروني صحيح';
    }

    if (field?.hasError('emailDot')) {
      return 'البريد الإلكتروني يجب أن يحتوي على نقطة';
    }

    if (field?.hasError('emailNoArabic')) {
      return 'البريد الإلكتروني لا يجب أن يحتوي على أحرف عربية';
    }

    if (field?.hasError('minlength')) {
      return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    }

    if (field?.hasError('specialCharacter')) {
      return 'كلمة المرور يجب أن تحتوي على رمز خاص';
    }

    if (field?.hasError('containsNumber')) {
      return 'كلمة المرور يجب أن تحتوي على رقم';
    }

    if (field?.hasError('noSpaceAllowed')) {
      return 'كلمة المرور لا يجب أن تحتوي على مسافات';
    }

    if (field?.hasError('containsLetter')) {
      return 'كلمة المرور يجب أن تحتوي على أحرف';
    }

    return '';
  }

  /**
   * Check if field has error and is touched or submitted
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.invalid && (field?.touched || this.submitted));
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorMessage = '';
  }

  // Custom Validators - Same as signup component

  /**
   * Email with dot validator
   */
  emailWithDotValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const email = control.value;
      if (!email) return null;

      // Check if the email contains '@' and a '.' after '@'
      const atIndex = email.indexOf('@');
      const dotAfterAt = email.indexOf('.', atIndex);

      // Ensure there is an '@' and that there is a '.' after '@'
      if (atIndex === -1 || dotAfterAt === -1) {
        return { emailDot: true };
      }

      return null;
    };
  }

  /**
   * Email no Arabic validator
   */
  emailNoArabicValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const email = control.value;
      if (!email) return null;

      // Check for Arabic characters
      const arabicRegex = /[\u0600-\u06FF]/;
      if (arabicRegex.test(email)) {
        return { emailNoArabic: true };
      }

      return null;
    };
  }

  /**
   * Contains letter validator
   */
  containsLetter(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const letterRegex = /\p{L}/u;
    return letterRegex.test(password) ? null : { containsLetter: true };
  }

  /**
   * Special character validator
   */
  specialCharacter(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const specialCharacterRegex = /[!@#$%^&*(),.?":{}|<>_~]/;
    return specialCharacterRegex.test(password) ? null : { specialCharacter: true };
  }

  /**
   * Contains number validator
   */
  containsNumber(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const numberRegex = /\d/;
    return numberRegex.test(password) ? null : { containsNumber: true };
  }

  /**
   * No space allowed validator
   */
  noSpaceAllowed(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const hasSpace = /\s/;
    return hasSpace.test(password) ? { noSpaceAllowed: true } : null;
  }
}