import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { SignupService } from '../services/signup-services/signup.service'
import { ReactiveFormsModule } from '@angular/forms';
import { NgxIntlTelInputModule } from 'ngx-intl-tel-input';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http'; // Add this import
import {
  SearchCountryField,
  CountryISO,
  PhoneNumberFormat,
} from 'ngx-intl-tel-input';
import { nationalities } from '../../../shared/jsons/nationalities.json'
import {
  containsLetter,
  noSpacesAllowed,
  emailWithDotValidator,
  validatePhoneNumber,
  specialCharacter,
  containsNumber,
  noSpaceAllowed,
  emailNoArabicValidator
} from '../../../shared/validators'

@Component({
  selector: 'app-signup',
  imports: [
    ReactiveFormsModule,
    NgxIntlTelInputModule,
    HttpClientModule
  ],
  templateUrl: './signup.component.html',
  standalone: true,
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  isLoading: boolean = false;

  separateDialCode = true;
  SearchCountryField = SearchCountryField;
  CountryISO = CountryISO;
  PhoneNumberFormat = PhoneNumberFormat;
  preferredCountries: CountryISO[] = [CountryISO.SaudiArabia];
  e164Number: string = '';
  SignupForm!: FormGroup;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  submitted: boolean = false;
  profileImageUrl: string | null = null;
  selectedFile: File | null = null;
  nationalities = nationalities
  constructor(
    private fb: FormBuilder,
    private signupService: SignupService,
    private router: Router
  ) {
    this.SignupForm = this.fb.group({
      username: [
        '',
        [Validators.required, Validators.pattern(/^[\p{L}\p{N}\s]*$/u)] // Accepts letters and spaces from any language
      ],
      email: ['', [Validators.required, Validators.email, emailWithDotValidator(), emailNoArabicValidator()]],

      first_name: [
        '',
        [Validators.required, Validators.pattern(/^\p{L}[\p{L}\s]*$/u)] // Accepts letters and spaces from any language
      ],
      second_name: [
        '',
        [Validators.required, Validators.pattern(/^\p{L}[\p{L}\s]*$/u)] // Accepts letters and spaces from any language
      ],
      last_name: [
        '',
        [Validators.required, Validators.pattern(/^\p{L}[\p{L}\s]*$/u)] // Accepts letters and spaces from any language
      ],
      phone: ['', [Validators.required, validatePhoneNumber]],
      password: ['', [Validators.required, Validators.minLength(8),
        specialCharacter,
        containsNumber,
        noSpaceAllowed,
        containsLetter]],
      confirm_password: ['', [Validators.required, Validators.minLength(8)]],
      identity_number: [
        '',
        [Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(/^[0-9]+$/), // Only numbers allowed
          noSpacesAllowed,]
      ],
      birth_date: ['', Validators.required],
      nationality: ['', Validators.required],
      // profile_pic: ['',],
      terms: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator for password confirmation
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirm_password');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }



    return null;
  }



  // File upload methods
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!this.isValidImageType(file)) {
        this.SignupForm.get('profile_pic')?.setErrors({ invalidFileType: true });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.SignupForm.get('profile_pic')?.setErrors({ maxSize: true });
        return;
      }

      this.selectedFile = file;
      this.SignupForm.get('profile_pic')?.setValue(file);
      this.SignupForm.get('profile_pic')?.setErrors(null);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileImageUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  private isValidImageType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const allowedChars = /[0-9]/;
    if (!allowedChars.test(event.key)) {
      event.preventDefault();
    }
  }

  signup() {
    this.submitted = true;

    // Update password match validation
    this.SignupForm.updateValueAndValidity();

    if (this.SignupForm.invalid) {
      console.log('❌ Form is invalid - showing detailed validation errors:');
      this.markFormGroupTouched(this.SignupForm);
      return;
    }

    // Start loading state
    this.isLoading = true;

    // Create FormData for file upload
    const formData = new FormData();

    // Add all form fields to FormData
    Object.keys(this.SignupForm.value).forEach(key => {
      const value = this.SignupForm.value[key];

      if (key === 'profile_pic' && this.selectedFile) {
        // Add the actual file, not the form control value
        formData.append('profile_picture', this.selectedFile, this.selectedFile.name);
      } else if (key === 'phone') {
        // Skip phone here - we'll handle it separately below
        return;
      } else if (key !== 'profile_pic' && key !== 'confirm_password' && key !== 'terms') {
        // Skip confirm_password and terms as they're not needed by API
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value.toString());
        }
      }
    });

    // Handle phone number properly (extract the e164Number from ngx-intl-tel-input)
    const phoneValue = this.SignupForm.get('phone')?.value;
    if (phoneValue && phoneValue.e164Number) {
      formData.append('phone', phoneValue.e164Number);
    } else if (typeof phoneValue === 'string') {
      // Fallback if it's already a string
      formData.append('phone', phoneValue);
    } else {
      console.error('❌ Phone value is invalid:', phoneValue);
    }

    // Log the data being sent (remove in production)
    console.log('📋 Form values before processing:', this.SignupForm.value);
    console.log('📤 Sending signup data:');
    for (let [key, value] of formData.entries()) {
      if (key === 'password') {
        console.log(key + ': [HIDDEN]');
      } else if (value instanceof File) {
        console.log(key + ': File -', value.name, `(${value.size} bytes)`);
      } else {
        console.log(key + ':', value);
      }
    }

    const requiredFields = ['username', 'email', 'first_name', 'last_name', 'phone', 'password', 'identity_number', 'nationality'];
    const missingFields = requiredFields.filter(field => !formData.has(field));
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
    }

    // Call the signup service
    this.signupService.signup(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('✅ Signup successful:', response);

        this.router.navigate(['/trip-details']);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Signup failed:', error);

        // Handle different error scenarios
        this.handleSignupError(error);
      }
    });
  }

  private handleSignupError(error: any) {
    this.isLoading = false;

    // Handle specific password error messages from server
    if (error.error && error.error.detail) {
      if (error.error.detail.includes('Password must contain at least one digit')) {
        this.SignupForm.get('password')?.setErrors({ serverError: 'Password must contain at least one digit' });
      }
      if (error.error.detail.includes("Password must contain at least one special character.")) {
        this.SignupForm.get('password')?.setErrors({ serverError: "Password must contain at least one special character." });
      }
      if (error.error.detail.includes("Password must contain at least one letter.")) {
        this.SignupForm.get('password')?.setErrors({ serverError: "Password must contain at least one letter." });
      }
    }

    console.error('Signup error:', error);

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

      // Handle specific field errors with custom logic
      if (error.error.errors.email) {
        this.SignupForm.get('email')?.setErrors({
          serverError: error.error.errors.email[0].detail || error.error.errors.email[0]
        });
      }

      if (error.error.errors.phone) {
        this.SignupForm.get('phone')?.setErrors({
          serverError: error.error.errors.phone[0].detail || error.error.errors.phone[0]
        });
      }

      if (error.error.errors.username) {
        this.SignupForm.get('username')?.setErrors({
          serverError: error.error.errors.username[0].detail || error.error.errors.username[0]
        });
      }

      if (error.error.errors.first_name) {
        this.SignupForm.get('first_name')?.setErrors({
          serverError: error.error.errors.first_name[0].detail || error.error.errors.first_name[0]
        });
      }

      if (error.error.errors.second_name) {
        this.SignupForm.get('second_name')?.setErrors({
          serverError: error.error.errors.second_name[0].detail || error.error.errors.second_name[0]
        });
      }

      if (error.error.errors.last_name) {
        this.SignupForm.get('last_name')?.setErrors({
          serverError: error.error.errors.last_name[0].detail || error.error.errors.last_name[0]
        });
      }

      if (error.error.errors.password) {
        this.SignupForm.get('password')?.setErrors({
          serverError: error.error.errors.password[0].detail || error.error.errors.password[0]
        });
      }

      if (error.error.errors.identity_number) {
        this.SignupForm.get('identity_number')?.setErrors({
          serverError: error.error.errors.identity_number[0].detail || error.error.errors.identity_number[0]
        });
      }

      if (error.error.errors.birth_date) {
        this.SignupForm.get('birth_date')?.setErrors({
          serverError: error.error.errors.birth_date[0].detail || error.error.errors.birth_date[0]
        });
      }

      if (error.error.errors.nationality) {
        this.SignupForm.get('nationality')?.setErrors({
          serverError: error.error.errors.nationality[0].detail || error.error.errors.nationality[0]
        });
      }

      if (error.error.errors.profile_pic || error.error.errors.profile_picture) {
        const profileError = error.error.errors.profile_pic || error.error.errors.profile_picture;
        this.SignupForm.get('profile_pic')?.setErrors({
          serverError: profileError[0].detail || profileError[0]
        });
      }

    } else {
      // Generic error handling
      let errorMessage = 'An error occurred during signup. Please try again.';

      if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Handle specific HTTP status codes
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid data provided. Please check your information.';
          break;
        case 409:
          errorMessage = 'An account with this email or username already exists.';
          break;
        case 422:
          errorMessage = 'Validation error. Please check your input.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          console.error('Unhandled error status:', error.status);
      }

    }
  }
  private clearServerErrors() {
    Object.keys(this.SignupForm.controls).forEach(key => {
      const control = this.SignupForm.get(key);
      if (control && control.errors && control.errors['serverError']) {
        const errors = { ...control.errors };
        delete errors['serverError'];

        // If no other errors, set to null, otherwise keep other errors
        const hasOtherErrors = Object.keys(errors).length > 0;
        control.setErrors(hasOtherErrors ? errors : null);
      }
    });
  }
  private setFieldServerError(fieldName: string, errorMessage: string) {
    const control = this.SignupForm.get(fieldName);
    if (control) {
      const currentErrors = control.errors || {};
      control.setErrors({ ...currentErrors, serverError: errorMessage });
    }
  }
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}