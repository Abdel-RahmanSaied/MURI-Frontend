import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { SignupService } from '../services/signup-services/signup.service'
import { ReactiveFormsModule } from '@angular/forms';
import { NgxIntlTelInputModule } from 'ngx-intl-tel-input';
import { Router } from '@angular/router';
import {
  SearchCountryField,
  CountryISO,
  PhoneNumberFormat,
} from 'ngx-intl-tel-input';
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
  imports: [ReactiveFormsModule, NgxIntlTelInputModule],
  templateUrl: './signup.component.html',
  standalone: true,
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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

  constructor(
    private fb: FormBuilder,
    private signupService: SignupService,
    private router: Router
  ) {
    this.SignupForm = this.fb.group({
      profile_pic: ['', [Validators.required]],
      first_name: [
        '',
        [Validators.required, Validators.pattern(/^\p{L}[\p{L}\s]*$/u)] // Accepts letters and spaces from any language
      ],
      second_name: [
        '',
        [Validators.required, Validators.pattern(/^\p{L}[\p{L}\s]*$/u)] // Accepts letters and spaces from any language
      ],
      family_name: [
        '',
        [Validators.required, Validators.pattern(/^\p{L}[\p{L}\s]*$/u)] // Accepts letters and spaces from any language
      ],
      email: ['', [Validators.required, Validators.email, emailWithDotValidator(), emailNoArabicValidator()]],
      birth_date: ['', Validators.required],
      national_id: [
        '',
        [Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(/^[0-9]+$/), // Only numbers allowed
          noSpacesAllowed,]
      ],
      phone: ['', [Validators.required, validatePhoneNumber]],
      password: ['', [Validators.required, Validators.minLength(8),
        specialCharacter,
        containsNumber,
        noSpaceAllowed,
        containsLetter]],
      confirm_password: ['', [Validators.required, Validators.minLength(8)]],
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

    // if (confirmPassword?.hasError('passwordMismatch')) {
    //   delete confirmPassword.errors['passwordMismatch'];
    //   confirmPassword.updateValueAndValidity({ onlySelf: true });
    // }

    return null;
  }

  // Method to get all invalid fields and their errors
  private getFormValidationErrors() {
    const formErrors: any = {};
    
    Object.keys(this.SignupForm.controls).forEach(key => {
      const controlErrors: ValidationErrors | null = this.SignupForm.get(key)!.errors;
      if (controlErrors) {
        formErrors[key] = controlErrors;
      }
    });
    
    // Also check for form-level errors
    if (this.SignupForm.errors) {
      formErrors['_formLevelErrors'] = this.SignupForm.errors;
    }
    
    return formErrors;
  }

  // Method to print detailed validation information
  private printValidationDebugInfo() {
    console.log('🚫 FORM VALIDATION FAILED');
    console.log('===========================');
    
    const formErrors = this.getFormValidationErrors();
    
    if (Object.keys(formErrors).length === 0) {
      console.log('⚠️ Form is marked as invalid but no specific errors found');
      return;
    }

    Object.keys(formErrors).forEach(fieldName => {
      if (fieldName === '_formLevelErrors') {
        console.log(`🔴 Form Level Errors:`, formErrors[fieldName]);
        return;
      }

      const control = this.SignupForm.get(fieldName);
      const fieldErrors = formErrors[fieldName];
      const fieldValue = control?.value;

      console.log(`\n🔍 Field: ${fieldName}`);
      console.log(`   Current Value: "${fieldValue}"`);
      console.log(`   Value Type: ${typeof fieldValue}`);
      console.log(`   Is Empty: ${!fieldValue || fieldValue === ''}`);
      console.log(`   Touched: ${control?.touched}`);
      console.log(`   Dirty: ${control?.dirty}`);
      console.log(`   Errors:`, fieldErrors);

      // Provide detailed error explanations
      Object.keys(fieldErrors).forEach(errorType => {
        const errorValue = fieldErrors[errorType];
        console.log(`     ❌ ${errorType}:`, this.getErrorExplanation(fieldName, errorType, errorValue, fieldValue));
      });
    });

    console.log('\n📊 Form Status Summary:');
    console.log(`   Valid: ${this.SignupForm.valid}`);
    console.log(`   Invalid: ${this.SignupForm.invalid}`);
    console.log(`   Touched: ${this.SignupForm.touched}`);
    console.log(`   Dirty: ${this.SignupForm.dirty}`);
    console.log(`   Submitted: ${this.submitted}`);
    console.log('===========================');
  }

  // Method to provide human-readable error explanations
  private getErrorExplanation(fieldName: string, errorType: string, errorValue: any, fieldValue: any): string {
    const explanations: { [key: string]: { [key: string]: string } } = {
      profile_pic: {
        required: 'Profile picture is required but no file was selected',
        invalidFileType: 'The selected file is not a valid image type (jpg, png, gif, webp)',
        maxSize: 'The selected file exceeds the 5MB size limit'
      },
      first_name: {
        required: 'First name is required but field is empty',
        pattern: 'First name contains invalid characters (only letters and spaces allowed)'
      },
      second_name: {
        required: 'Second name is required but field is empty',
        pattern: 'Second name contains invalid characters (only letters and spaces allowed)'
      },
      family_name: {
        required: 'Family name is required but field is empty',
        pattern: 'Family name contains invalid characters (only letters and spaces allowed)'
      },
      email: {
        required: 'Email is required but field is empty',
        email: 'Email format is invalid',
        emailWithDot: 'Email must contain a dot (.)',
        emailNoArabic: 'Email cannot contain Arabic characters'
      },
      birth_date: {
        required: 'Birth date is required but not selected'
      },
      national_id: {
        required: 'National ID is required but field is empty',
        minlength: `National ID must be exactly 10 digits (current: ${fieldValue?.length || 0})`,
        maxlength: `National ID must be exactly 10 digits (current: ${fieldValue?.length || 0})`,
        pattern: 'National ID must contain only numbers',
        noSpacesAllowed: 'National ID cannot contain spaces'
      },
      phone: {
        required: 'Phone number is required but field is empty',
        validatePhoneNumber: 'Phone number format is invalid'
      },
      password: {
        required: 'Password is required but field is empty',
        minlength: `Password must be at least 8 characters (current: ${fieldValue?.length || 0})`,
        specialCharacter: 'Password must contain at least one special character',
        containsNumber: 'Password must contain at least one number',
        noSpaceAllowed: 'Password cannot contain spaces',
        containsLetter: 'Password must contain at least one letter'
      },
      confirm_password: {
        required: 'Confirm password is required but field is empty',
        minlength: `Confirm password must be at least 8 characters (current: ${fieldValue?.length || 0})`,
        passwordMismatch: 'Passwords do not match'
      },
      terms: {
        required: 'You must accept the terms and conditions'
      }
    };

    const fieldExplanations = explanations[fieldName];
    if (fieldExplanations && fieldExplanations[errorType]) {
      return fieldExplanations[errorType];
    }

    return `${errorType} validation failed with value: ${JSON.stringify(errorValue)}`;
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
      this.printValidationDebugInfo();
      this.markFormGroupTouched(this.SignupForm);
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();

    // Add all form fields to FormData
    Object.keys(this.SignupForm.value).forEach(key => {
      if (key === 'profile_pic' && this.selectedFile) {
        formData.append(key, this.selectedFile);
      } else if (key !== 'profile_pic') {
        formData.append(key, this.SignupForm.value[key]);
      }
    });

    console.log('✅ Form is valid:', this.SignupForm.value);
    console.log('📁 Selected file:', this.selectedFile);
    this.router.navigate(['/trip-details']);
    // Call your signup service with formData
    // this.signupService.signup(formData).subscribe(...)
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