import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

export interface TripFormData {
  tripType: 'one-way' | 'round-trip';
  destination: string;
  origin: string;
  arrivalTime: string;
  startDate: string;
  departureTime?: string;
  returnDate?: string;
  numberOfSeats: number;
}

@Component({
  selector: 'app-trip-details',
  templateUrl: './trip-details.component.html',
  styleUrls: ['./trip-details.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule]
})
export class TripDetailsComponent implements OnInit {
  tripForm!: FormGroup;
  submitted: boolean = false;

  constructor(
    private router: Router,
    private fb: FormBuilder
  ) {
    this.tripForm = this.fb.group({
      tripType: ['one-way', [Validators.required]],
      destination: ['', [Validators.required, Validators.minLength(2), this.noOnlySpacesValidator]],
      origin: ['', [Validators.required, Validators.minLength(2), this.noOnlySpacesValidator]],
      arrivalTime: ['', [Validators.required]],
      startDate: ['', [Validators.required, this.futureDateValidator]],
      departureTime: [''],
      returnDate: [''],
      numberOfSeats: [1, [Validators.required, Validators.min(1), Validators.max(8)]]
    }, { validators: [this.dateSequenceValidator] }); // Removed returnTripValidator from here
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscriptions();
  }

  // Custom Validators
  private noOnlySpacesValidator(control: AbstractControl): ValidationErrors | null {
    if (control.value && control.value.trim().length === 0) {
      return { onlySpaces: true };
    }
    return null;
  }

  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (control.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(control.value);

      if (selectedDate < today) {
        return { pastDate: true };
      }
    }
    return null;
  }

  // Form-level validators
  private dateSequenceValidator(control: AbstractControl): ValidationErrors | null {
    const tripType = control.get('tripType')?.value;
    const startDate = control.get('startDate')?.value;
    const returnDate = control.get('returnDate')?.value;

    if (tripType === 'round-trip' && startDate && returnDate) {
      if (new Date(returnDate) < new Date(startDate)) {
        return { dateSequence: true };
      }
    }

    return null;
  }

  // Form initialization
  private initializeForm(): void {
    const today = this.formatDate(new Date());

    this.tripForm.patchValue({
      startDate: today,
      returnDate: today
    });
  }

  private setupFormSubscriptions(): void {
    // Watch for trip type changes
    this.tripForm.get('tripType')?.valueChanges.subscribe((type: string) => {
      this.handleTripTypeChange(type as 'one-way' | 'round-trip');
    });

    // Watch for start date changes to update minimum return date
    this.tripForm.get('startDate')?.valueChanges.subscribe((startDate: string) => {
      this.handleStartDateChange(startDate);
    });
  }

  private handleTripTypeChange(type: 'one-way' | 'round-trip'): void {
    const departureTimeControl = this.tripForm.get('departureTime');
    const returnDateControl = this.tripForm.get('returnDate');

    if (type === 'round-trip') {
      // Add validators for return trip
      departureTimeControl?.setValidators([Validators.required]);
      returnDateControl?.setValidators([Validators.required, this.futureDateValidator]);
    } else {
      // Clear validators and values for one-way trip
      departureTimeControl?.clearValidators();
      returnDateControl?.clearValidators();
      departureTimeControl?.setValue('');
      returnDateControl?.setValue('');

      // Clear the touched and dirty state when switching to one-way
      departureTimeControl?.markAsUntouched();
      departureTimeControl?.markAsPristine();
      returnDateControl?.markAsUntouched();
      returnDateControl?.markAsPristine();
    }

    departureTimeControl?.updateValueAndValidity();
    returnDateControl?.updateValueAndValidity();

    // Don't revalidate the entire form here to avoid triggering form-level validators
  }

  private handleStartDateChange(startDate: string): void {
    const returnDateControl = this.tripForm.get('returnDate');
    const currentReturnDate = returnDateControl?.value;

    // If return date is before start date, update it
    if (startDate && currentReturnDate && currentReturnDate < startDate) {
      returnDateControl?.setValue(startDate);
    }
  }

  // Utility methods
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Getter for trip type
  get tripType(): 'one-way' | 'round-trip' {
    return this.tripForm.get('tripType')?.value || 'one-way';
  }

  // Public methods for template
  setTripType(type: 'one-way' | 'round-trip'): void {
    this.tripForm.patchValue({ tripType: type });
  }

  goBack(): void {
    this.router.navigate(['/sign-up/step1']);
  }

  // Validation helper methods
  isFormValid(): boolean {
    return this.tripForm.valid;
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.tripForm.get(fieldName);
    const shouldShowError = field && field.invalid && (field.dirty || field.touched || this.submitted);
    if (fieldName === 'departureTime' || fieldName === 'returnDate') {
      const isRoundTrip = this.tripType === 'round-trip';
      return !!(shouldShowError && isRoundTrip);
    }

    return !!shouldShowError;
  }

  getFieldError(fieldName: string): string | null {
    const field = this.tripForm.get(fieldName);

    // Only return error messages if the field should show an error
    if (!this.hasFieldError(fieldName)) {
      return null;
    }

    if (!field || !field.errors) {
      return null;
    }

    const errors = field.errors;

    // Check for form-level date sequence error for return date
    if (fieldName === 'returnDate' && this.tripForm.errors?.['dateSequence']) {
      return 'تاريخ العودة يجب أن يكون بعد تاريخ البدء أو في نفس اليوم';
    }

    // Arabic error messages for field-level errors
    const errorMessages: { [key: string]: { [key: string]: string } } = {
      destination: {
        required: 'الوجهة مطلوبة',
        minlength: 'يجب أن تحتوي الوجهة على حرفين على الأقل',
        onlySpaces: 'الوجهة لا يمكن أن تحتوي على مسافات فقط'
      },
      origin: {
        required: 'نقطة الانطلاق مطلوبة',
        minlength: 'يجب أن تحتوي نقطة الانطلاق على حرفين على الأقل',
        onlySpaces: 'نقطة الانطلاق لا يمكن أن تحتوي على مسافات فقط'
      },
      arrivalTime: {
        required: 'وقت الوصول المطلوب مطلوب'
      },
      startDate: {
        required: 'تاريخ بدء الرحلات مطلوب',
        pastDate: 'تاريخ البدء لا يمكن أن يكون في الماضي'
      },
      departureTime: {
        required: 'وقت المغادرة مطلوب'
      },
      returnDate: {
        required: 'تاريخ العودة مطلوب',
        pastDate: 'تاريخ العودة لا يمكن أن يكون في الماضي'
      },
      numberOfSeats: {
        required: 'عدد المقاعد مطلوب',
        min: 'عدد المقاعد يجب أن يكون 1 على الأقل',
        max: 'عدد المقاعد لا يمكن أن يتجاوز 8'
      }
    };

    const fieldErrors = errorMessages[fieldName];
    if (fieldErrors) {
      for (const errorType in errors) {
        if (fieldErrors[errorType]) {
          return fieldErrors[errorType];
        }
      }
    }

    return 'هناك خطأ في هذا الحقل';
  }

  // Seats control methods
  incrementSeats(): void {
    const currentValue = this.tripForm.get('numberOfSeats')?.value || 1;
    if (currentValue < 8) {
      this.tripForm.patchValue({ numberOfSeats: currentValue + 1 });
    }
  }

  decrementSeats(): void {
    const currentValue = this.tripForm.get('numberOfSeats')?.value || 1;
    if (currentValue > 1) {
      this.tripForm.patchValue({ numberOfSeats: currentValue - 1 });
    }
  }

  // Date helper methods
  getTodayDate(): string {
    return this.formatDate(new Date());
  }

  getMinReturnDate(): string {
    const startDate = this.tripForm.get('startDate')?.value;
    return startDate || this.getTodayDate();
  }

  // Form submission
  onSubmit(): void {
    this.submitted = true;

    // Trigger form validation
    this.tripForm.updateValueAndValidity();

    if (this.tripForm.invalid) {
      console.log('Form is invalid');
      this.markFormGroupTouched(this.tripForm);
      return;
    }

    const formData = this.getFormData();
    this.submitTripDetails(formData);
  }

  private getFormData(): TripFormData {
    const formValue = this.tripForm.value;
    const formData: TripFormData = {
      tripType: formValue.tripType,
      destination: formValue.destination.trim(),
      origin: formValue.origin.trim(),
      arrivalTime: formValue.arrivalTime,
      startDate: formValue.startDate,
      numberOfSeats: formValue.numberOfSeats
    };

    // Add return trip data if applicable
    if (formValue.tripType === 'round-trip') {
      formData.departureTime = formValue.departureTime;
      formData.returnDate = formValue.returnDate;
    }

    return formData;
  }

  private async submitTripDetails(data: TripFormData): Promise<void> {
    try {
      console.log('Submitting trip details:', data);
      this.router.navigate(['/trip-done'], {
        state: { tripData: data }
      });

    } catch (error) {
      console.error('Error submitting trip details:', error);
      // Handle error (show toast, etc.)
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}