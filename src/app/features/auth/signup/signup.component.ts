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

      email: ['', [Validators.required, Validators.email, emailWithDotValidator(), emailNoArabicValidator()]],

      first_name: [
        '',
        [Validators.required, Validators.pattern(/^\p{L}[\p{L}\s]*$/u),Validators.minLength(2)] 
      ],
      second_name: [
        '',
        [Validators.required, Validators.pattern(/^\p{L}[\p{L}\s]*$/u),Validators.minLength(2)] 
      ],
      last_name: [
        '',
        [Validators.required, Validators.pattern(/^\p{L}[\p{L}\s]*$/u),Validators.minLength(2)] 
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
      profile_pic: ['',],
      terms: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator for password confirmation
passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirm_password');

  if (!password || !confirmPassword) {
    return null;
  }

  if (password.value !== confirmPassword.value) {
    // Passwords don't match - set error
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    // Passwords match - clear the mismatch error but preserve other errors
    const errors = confirmPassword.errors;
    if (errors) {
      delete errors['passwordMismatch'];
      // If no other errors remain, set errors to null
      confirmPassword.setErrors(Object.keys(errors).length === 0 ? null : errors);
    }
    return null;
  }
}



  // File upload methods
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const profilePicControl = this.SignupForm.get('profile_pic');

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Mark as touched so error messages will show
      profilePicControl?.markAsTouched();

      // Validate file type
      if (!this.isValidImageType(file)) {
        profilePicControl?.setErrors({ invalidFileType: true });
        // Clear the selected file
        this.selectedFile = null;
        this.profileImageUrl = null;
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 3 * 1024 * 1024) {
        profilePicControl?.setErrors({ maxSize: true });
        // Clear the selected file
        this.selectedFile = null;
        this.profileImageUrl = null;
        return;
      }

      // If validation passes, proceed with file handling
      this.selectedFile = file;
      profilePicControl?.setValue(file);
      profilePicControl?.setErrors(null);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileImageUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // No file selected
      profilePicControl?.markAsTouched();
      this.selectedFile = null;
      this.profileImageUrl = null;
      profilePicControl?.setValue('');
    }
  }

  // Also update your isValidImageType method to be more comprehensive
  private isValidImageType(file: File): boolean {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];

    console.log('File type:', file.type); // Debug log
    return validTypes.includes(file.type);
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const allowedChars = /[0-9]/;
    if (!allowedChars.test(event.key)) {
      event.preventDefault();
    }
  }
  // New method to handle input event (catches autofill, typing, and programmatic changes)
  sanitizeIdentityNumber(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Remove all non-numeric characters
    const cleanedValue = value.replace(/[^0-9]/g, '');

    // Limit to 10 digits
    const finalValue = cleanedValue.substring(0, 10);

    // Update the input value if it was changed
    if (value !== finalValue) {
      input.value = finalValue;
      // Update the form control
      this.SignupForm.get('identity_number')?.setValue(finalValue);
      // Trigger validation
      this.SignupForm.get('identity_number')?.updateValueAndValidity();
    }
  }

  // Handle paste events
  onIdentityPaste(event: ClipboardEvent) {
    event.preventDefault();

    // Get the pasted data
    const pastedData = event.clipboardData?.getData('text') || '';

    // Clean the pasted data (remove non-numeric characters)
    const cleanedData = pastedData.replace(/[^0-9]/g, '').substring(0, 10);

    // Update the form control
    this.SignupForm.get('identity_number')?.setValue(cleanedData);

    // Update the input element
    const input = event.target as HTMLInputElement;
    input.value = cleanedData;
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

    const requiredFields = ['email', 'first_name', 'last_name', 'phone', 'password', 'identity_number', 'nationality'];
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
        this.handleSignupError(error);
        console.log('fne : ', error.error.first_name[0])
      }
    });
  }

  private handleSignupError(error: any) {
    this.isLoading = false;

    // Clear all previous server errors first
    this.clearServerErrors();

    console.error('Signup error details:', error);

    let errorsObject = null;

    // Determine the structure of the error response
    if (error.error) {
      // Case 1: {errors: {birth_date: "User must be at least 3 years old."}}
      if (error.error.errors && typeof error.error.errors === 'object') {
        errorsObject = error.error.errors;
        console.log('Server validation errors (nested):', errorsObject);
      }
      // Case 2: {first_name: ["Must be at least 2 characters long."], last_name: [...]}
      else if (this.hasFieldErrors(error.error)) {
        errorsObject = error.error;
        console.log('Server validation errors (direct):', errorsObject);
      }
      // Case 3: General error with detail message
      else if (error.error.detail) {
        console.error('General error:', error.error.detail);
        // You can show a toast or general error message here
        return;
      }
    }

    // Process field-specific errors if found
    if (errorsObject) {
      Object.keys(errorsObject).forEach(field => {
        const fieldErrors = errorsObject[field];
        const errorMessage = this.extractErrorMessage(fieldErrors);

        if (errorMessage) {
          this.setFieldServerError(field, errorMessage);
        }
      });
    } else {
      // Generic error handling for unexpected formats
      console.error('Unexpected error format:', error);
      // You can show a general error message here
    }
  }

  // Helper method to check if error object contains field errors
  private hasFieldErrors(errorObj: any): boolean {
    if (!errorObj || typeof errorObj !== 'object') return false;

    // Check if the object has keys that look like form field names
    const keys = Object.keys(errorObj);
    const formFields = [
      'email', 'first_name', 'second_name', 'last_name', 'phone',
      'password', 'identity_number', 'birth_date', 'nationality',
      'profile_pic', 'profile_picture'
    ];

    // If any key matches our form fields, it's likely field errors
    return keys.some(key => formFields.includes(key));
  }

  // Enhanced helper method to extract error message from different formats
  private extractErrorMessage(fieldError: any): string {
    if (Array.isArray(fieldError)) {
      // Handle arrays: ["Must be at least 2 characters long."] or [{detail: "error"}]
      if (fieldError.length > 0) {
        const firstError = fieldError[0];
        if (typeof firstError === 'string') {
          return firstError;
        } else if (firstError && typeof firstError === 'object') {
          return firstError.detail || firstError.message || 'Invalid value';
        }
      }
    } else if (typeof fieldError === 'string') {
      // Handle direct strings: "User must be at least 3 years old."
      return fieldError;
    } else if (fieldError && typeof fieldError === 'object') {
      // Handle objects: {detail: "error message"}
      return fieldError.detail || fieldError.message || 'Invalid value';
    }

    return 'Invalid value';
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