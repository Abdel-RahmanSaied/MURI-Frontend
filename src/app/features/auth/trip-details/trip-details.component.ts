import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { TripDetailService, TripApiRequest } from '../services/trip-details-service/trip-detail.service';

export interface TripFormData {
  tripType: 'one-way' | 'round-trip';
  destination: string;
  origin: string;
  arrivalTime: string;
  startDate: string;
  departureTime?: string;
  endDate?: string;
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
  isSubmitting: boolean = false;

  // Time values for custom time inputs
  private timeValues: { [key: string]: { hour: string; minute: string; ampm: string } } = {
    arrivalTime: { hour: '', minute: '', ampm: '' },
    departureTime: { hour: '', minute: '', ampm: '' }
  };

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private tripDetailService: TripDetailService
  ) {
    this.tripForm = this.fb.group({
      tripType: ['one-way', [Validators.required]],
      destination: ['', [Validators.required, Validators.minLength(2), this.noOnlySpacesValidator]],
      origin: ['', [Validators.required, Validators.minLength(2), this.noOnlySpacesValidator]],
      arrivalTime: ['', [Validators.required, this.completeTimeValidator]],
      startDate: ['', [Validators.required, this.futureDateValidator]],
      departureTime: [''],
      endDate: [''],
      numberOfSeats: [1, [Validators.required, Validators.min(1), Validators.max(8)]]
    }, { validators: [this.dateSequenceValidator, this.timeLogicValidator] });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscriptions();
    this.initializeTimeValues();
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
  // Update your form-level validators
  private dateSequenceValidator(control: AbstractControl): ValidationErrors | null {
    const tripType = control.get('tripType')?.value;
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    // Only validate if we're in round-trip mode and both dates exist
    if (tripType === 'round-trip' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Clear time part for accurate date comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (end < start) {
        return { dateSequence: true };
      }
    }

    // Clear any previous errors if validation passes
    return null;
  }
  testFormState(): void {
    console.log('=== FORM STATE TEST ===');
    console.log('Trip Type:', this.tripType);
    console.log('Form Values:', this.tripForm.value);
    console.log('Form Valid:', this.tripForm.valid);
    console.log('Form Errors:', this.tripForm.errors);
    console.log('Button Should Be Enabled:', this.isFormValid());

    // Test each field
    Object.keys(this.tripForm.controls).forEach(key => {
      const control = this.tripForm.get(key);
      console.log(`${key}:`, {
        value: control?.value,
        valid: control?.valid,
        errors: control?.errors,
        validators: control?.hasValidator?.(Validators.required)
      });
    });
  }
  private timeLogicValidator = (control: AbstractControl): ValidationErrors | null => {
    const tripType = control.get('tripType')?.value;
    const arrivalTime = control.get('arrivalTime')?.value;
    const departureTime = control.get('departureTime')?.value;
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    // Only validate if we're in round-trip mode and both times exist
    if (tripType === 'round-trip' && arrivalTime && departureTime) {
      const arrivalMinutes = this.timeToMinutes(arrivalTime);
      const departureMinutes = this.timeToMinutes(departureTime);

      // If it's the same day
      if (startDate === endDate) {
        // Allow departure to be "next day" if arrival is late (after 6 PM)
        const arrivalHour = Math.floor(arrivalMinutes / 60);

        if (arrivalHour >= 18) { // After 6 PM
          // Allow early morning departure (before 12 PM) as "next day"
          const departureHour = Math.floor(departureMinutes / 60);
          if (departureHour < 12) {
            return null; // Valid - late arrival, early next-day departure
          }
        }

        // For same day, departure should be after arrival with some gap
        if (departureMinutes <= arrivalMinutes + 30) { // 30 min minimum
          return { invalidTimeSequence: true };
        }
      }

      // Different days - no time validation needed
    }

    return null;
  }



  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Form initialization
  private initializeForm(): void {
    const today = this.formatDate(new Date());
    this.tripForm.patchValue({
      startDate: today,
      endDate: today
    });
  }

  private setupFormSubscriptions(): void {
    this.tripForm.get('tripType')?.valueChanges.subscribe((type: string) => {
      this.handleTripTypeChange(type as 'one-way' | 'round-trip');
    });

    this.tripForm.get('startDate')?.valueChanges.subscribe((startDate: string) => {
      this.handleStartDateChange(startDate);
    });
  }

  // Fix for the TypeScript index signature error - use bracket notation
  private handleTripTypeChange(type: 'one-way' | 'round-trip'): void {
    const departureTimeControl = this.tripForm.get('departureTime');
    const endDateControl = this.tripForm.get('endDate');

    if (type === 'round-trip') {
      // Set validators for round-trip
      departureTimeControl?.setValidators([Validators.required, this.completeTimeValidator]);
      endDateControl?.setValidators([Validators.required, this.futureDateValidator]);

      // Ensure endDate has a valid value if empty
      if (!endDateControl?.value) {
        const startDate = this.tripForm.get('startDate')?.value;
        endDateControl?.setValue(startDate || this.formatDate(new Date()));
      }
    } else {
      // Clear validators for one-way
      departureTimeControl?.clearValidators();
      endDateControl?.clearValidators();
      departureTimeControl?.setValue('');
      endDateControl?.setValue('');

      // Clear time values
      this.timeValues['departureTime'] = { hour: '', minute: '', ampm: '' };
    }

    // Update validity for both controls
    departureTimeControl?.updateValueAndValidity();
    endDateControl?.updateValueAndValidity();

    // Force form-level validation update
    this.tripForm.updateValueAndValidity();

    // Trigger change detection to update button state
    setTimeout(() => {
      this.tripForm.updateValueAndValidity();
    }, 0);
  }

  private handleStartDateChange(startDate: string): void {
    const endDateControl = this.tripForm.get('endDate');
    const currentReturnDate = endDateControl?.value;

    if (startDate && currentReturnDate && currentReturnDate < startDate) {
      endDateControl?.setValue(startDate);
    }
  }

  // Time handling methods
  onTimeSegmentChange(segment: 'hour' | 'minute' | 'ampm', value: string, fieldName: string): void {
    // Store the previous complete state
    const wasComplete = this.isTimeComplete(fieldName);

    this.timeValues[fieldName][segment] = value;

    if (segment === 'hour') {
      const hourNum = parseInt(value, 10);
      if (hourNum < 1 || hourNum > 12 || isNaN(hourNum)) {
        this.timeValues[fieldName][segment] = '';
      }
    } else if (segment === 'minute') {
      const minuteNum = parseInt(value, 10);
      if (minuteNum < 0 || minuteNum > 59 || isNaN(minuteNum)) {
        this.timeValues[fieldName][segment] = '';
      }
    }

    this.updateFormControlTime(fieldName);

    // If time completion state changed, force validation update
    const isComplete = this.isTimeComplete(fieldName);
    if (wasComplete !== isComplete) {
      this.forceFormValidation();
    }
  }
  private isTimeComplete(fieldName: string): boolean {
    const timeData = this.timeValues[fieldName];
    return !!(timeData.hour && timeData.minute && timeData.ampm);
  }

  // 7. Fix the time validators to be more robust
  private completeTimeValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    // If empty and not required, it's valid
    if (!value) {
      // Check if this control is required by looking at its validators
      const hasRequiredValidator = control.hasValidator && control.hasValidator(Validators.required);
      return hasRequiredValidator ? { required: true } : null;
    }

    // Validate 24-hour time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) {
      return { incompleteTime: true };
    }

    return null;
  };

  preventNumberFormatting(event: KeyboardEvent): void {
    // Allow only digits and control keys
    if (!/\d/.test(event.key) &&
      !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(event.key)) {
      event.preventDefault();
    }
  }

  onTimeKeyPress(event: KeyboardEvent, segment: 'hour' | 'minute'): void {
    const char = event.key;

    // Allow navigation and control keys
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(char)) {
      return;
    }

    // Allow only digits
    if (!/\d/.test(char)) {
      event.preventDefault();
      return;
    }

    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const newValue = currentValue + char;

    // Basic length validation
    if (newValue.length > 2) {
      event.preventDefault();
      return;
    }

    // Value range validation
    const numericValue = parseInt(newValue, 10);

    if (segment === 'hour') {
      if (numericValue > 12 || numericValue < 1) {
        event.preventDefault();
      }
    } else if (segment === 'minute') {
      if (numericValue > 59) {
        event.preventDefault();
      }
    }
  }
  onTimeBlur(segment: 'hour' | 'minute', fieldName: string): void {
    const timeData = this.timeValues[fieldName];

    if (segment === 'hour' && timeData.hour) {
      // Format only on blur, not during input
      timeData.hour = timeData.hour.padStart(2, '0');
    } else if (segment === 'minute' && timeData.minute) {
      timeData.minute = timeData.minute.padStart(2, '0');
    }

    this.updateFormControlTime(fieldName);
  }
  private convertTo24Hour(hour: string, minute: string, ampm: string): string {
    if (!hour || !minute || !ampm) {
      return '';
    }

    let hour24 = parseInt(hour, 10); // Parse the raw input
    const minuteFormatted = minute.padStart(2, '0'); // Only format minutes for the final output

    if (ampm === 'AM') {
      if (hour24 === 12) {
        hour24 = 0;
      }
    } else if (ampm === 'PM') {
      if (hour24 !== 12) {
        hour24 += 12;
      }
    }

    return `${hour24.toString().padStart(2, '0')}:${minuteFormatted}`;
  }

  private convertTo12Hour(time24: string): { hour: string; minute: string; ampm: string } {
    if (!time24) {
      return { hour: '', minute: '', ampm: '' };
    }

    const [hourStr, minuteStr] = time24.split(':');
    let hour24 = parseInt(hourStr, 10);
    const minute = minuteStr;

    let hour12: number;
    let ampm: string;

    if (hour24 === 0) {
      hour12 = 12;
      ampm = 'AM';
    } else if (hour24 < 12) {
      hour12 = hour24;
      ampm = 'AM';
    } else if (hour24 === 12) {
      hour12 = 12;
      ampm = 'PM';
    } else {
      hour12 = hour24 - 12;
      ampm = 'PM';
    }

    return {
      hour: hour12.toString(),
      minute: minute,
      ampm: ampm
    };
  }

  private updateFormControlTime(fieldName: string): void {
    const timeData = this.timeValues[fieldName];
    const time24 = this.convertTo24Hour(timeData.hour, timeData.minute, timeData.ampm);

    this.tripForm.get(fieldName)?.setValue(time24, { emitEvent: true });

    // Only mark as touched if we have a complete time
    if (time24) {
      this.tripForm.get(fieldName)?.markAsTouched();
    }

    // Update field validation
    this.tripForm.get(fieldName)?.updateValueAndValidity();

    // Important: Update form-level validation too
    this.tripForm.updateValueAndValidity();
  }


  private initializeTimeValues(): void {
    Object.keys(this.timeValues).forEach(fieldName => {
      const currentValue = this.tripForm.get(fieldName)?.value;
      if (currentValue) {
        const time12 = this.convertTo12Hour(currentValue);
        this.timeValues[fieldName] = time12;
      }
    });
  }

  getTimeValue(fieldName: string, segment: 'hour' | 'minute' | 'ampm'): string {
    return this.timeValues[fieldName]?.[segment] || '';
  }

  // Utility methods
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  get tripType(): 'one-way' | 'round-trip' {
    return this.tripForm.get('tripType')?.value || 'one-way';
  }

  setTripType(type: 'one-way' | 'round-trip'): void {
    this.tripForm.patchValue({ tripType: type });
  }

  goBack(): void {
    this.router.navigate(['/sign-up/step1']);
  }

  // Validation helper methods
  isFormValid(): boolean {
    // Don't allow submission while already submitting
    if (this.isSubmitting) {
      return false;
    }

    // Check basic form validity
    if (!this.tripForm.valid) {
      return false;
    }

    // For round-trip, check specific required fields
    if (this.tripType === 'round-trip') {
      const departureTime = this.tripForm.get('departureTime')?.value;
      const endDate = this.tripForm.get('endDate')?.value;

      if (!departureTime || !endDate) {
        return false;
      }
    }

    // Check form-level validation errors
    if (this.tripForm.errors) {
      const hasDateError = this.tripForm.errors['dateSequence'];
      const hasTimeError = this.tripForm.errors['invalidTimeSequence'];

      if (hasDateError || hasTimeError) {
        return false;
      }
    }

    return true;
  }
  private forceFormValidation(): void {
    // Mark all fields as touched to trigger validation display
    this.markFormGroupTouched(this.tripForm);

    // Update form validation
    this.tripForm.updateValueAndValidity();

    // Trigger change detection
    setTimeout(() => {
      this.tripForm.updateValueAndValidity();
    }, 0);
  }

  // Updated hasFieldError method to handle API errors
  hasFieldError(fieldName: string): boolean {
    const field = this.tripForm.get(fieldName);

    // Check for API errors first
    if (field?.errors?.['apiError']) {
      return true;
    }

    const shouldShowError = field && field.invalid && (field.dirty || field.touched || this.submitted);

    // Handle form-level errors that should appear under specific fields
    if (this.tripForm.errors) {
      if (fieldName === 'departureTime' && this.tripForm.errors['invalidTimeSequence']) {
        return true;
      }
      if (fieldName === 'endDate' && this.tripForm.errors['dateSequence']) {
        return true;
      }
    }

    // Standard field-level error checking
    if (fieldName === 'departureTime' || fieldName === 'endDate') {
      const isRoundTrip = this.tripType === 'round-trip';
      return !!(shouldShowError && isRoundTrip);
    }

    return !!shouldShowError;
  }
  onFormFieldChange(fieldName: string): void {
    const field = this.tripForm.get(fieldName);
    if (field?.errors?.['apiError']) {
      // Remove API error when user starts editing
      const errors = { ...field.errors };
      delete errors['apiError'];
      delete errors['message'];

      if (Object.keys(errors).length === 0) {
        field.setErrors(null);
      } else {
        field.setErrors(errors);
      }
    }
  }
  // Updated getFieldError method with clearer error messages
  getFieldError(fieldName: string): string | null {
    const field = this.tripForm.get(fieldName);

    if (!this.hasFieldError(fieldName)) {
      return null;
    }

    // Handle API errors first (highest priority)
    if (field?.errors?.['apiError'] && field?.errors?.['message']) {
      return field.errors['message'];
    }

    // Handle form-level errors
    if (this.tripForm.errors) {
      if (fieldName === 'endDate' && this.tripForm.errors['dateSequence']) {
        return 'تاريخ العودة يجب أن يكون بعد تاريخ البدء أو في نفس اليوم';
      }
      if (fieldName === 'departureTime' && this.tripForm.errors['invalidTimeSequence']) {
        return 'وقت المغادرة يجب أن يكون بعد وقت الوصول بـ 30 دقيقة على الأقل';
      }
    }

    // Handle individual field errors
    if (!field || !field.errors) {
      return null;
    }

    const errors = field.errors;

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
        required: 'وقت الوصول المطلوب مطلوب',
        incompleteTime: 'يرجى إدخال الساعة والدقيقة والفترة كاملة'
      },
      startDate: {
        required: 'تاريخ بدء الرحلات مطلوب',
        pastDate: 'تاريخ البدء لا يمكن أن يكون في الماضي'
      },
      departureTime: {
        required: 'وقت المغادرة مطلوب',
        incompleteTime: 'يرجى إدخال الساعة والدقيقة والفترة كاملة'
      },
      endDate: {
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

    if (formValue.tripType === 'round-trip') {
      formData.departureTime = formValue.departureTime;
      formData.endDate = formValue.endDate;
    }

    return formData;
  }

  private async submitTripDetails(data: TripFormData): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    try {
      console.log('Submitting trip details:', data);

      const apiData: TripApiRequest = this.tripDetailService.transformFormDataToApiFormat(data);
      console.log('API formatted data:', apiData);

      this.tripDetailService.submitTripRequest(apiData).subscribe({
        next: (response) => {
          console.log('Trip submission successful:', response);
          this.router.navigate(['/trip-done'], {
            state: { tripData: data, apiResponse: response }
          });
        },
        error: (error) => {
          console.error('Error submitting trip details:', error);
          this.isSubmitting = false;

          // Handle API errors and display them under specific fields
          this.handleApiError(error);
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });

    } catch (error) {
      console.error('Unexpected error:', error);
      this.isSubmitting = false;
      // alert('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    }
  }

  // New method to handle API errors and map them to form fields
  private handleApiError(error: any): void {
    if (error.status === 400 && error.error?.detail) {
      const errorMessage = error.error.detail;

      // Map specific API errors to form fields
      if (errorMessage.includes('pending subscription request')) {
        // Set custom error on numberOfSeats field
        const seatsControl = this.tripForm.get('numberOfSeats');
        seatsControl?.setErrors({
          apiError: true,
          message: 'لديك طلب اشتراك معلق بالفعل. يرجى انتظار الموافقة عليه أولاً.'
        });
        seatsControl?.markAsTouched();

        // Scroll to the field or show some indication
        this.scrollToError('numberOfSeats');
        return;
      }

      // Handle other specific API errors here
      if (errorMessage.includes('invalid destination')) {
        const destinationControl = this.tripForm.get('destination');
        destinationControl?.setErrors({
          apiError: true,
          message: 'الوجهة المحددة غير صحيحة'
        });
        destinationControl?.markAsTouched();
        return;
      }

      if (errorMessage.includes('invalid origin')) {
        const originControl = this.tripForm.get('origin');
        originControl?.setErrors({
          apiError: true,
          message: 'نقطة الانطلاق المحددة غير صحيحة'
        });
        originControl?.markAsTouched();
        return;
      }
    }

    // Fallback for unhandled errors
    // alert('حدث خطأ أثناء إرسال البيانات. يرجى المحاولة مرة أخرى.');
  }
  // Helper method to scroll to error field
  private scrollToError(fieldName: string): void {
    setTimeout(() => {
      const errorElement = document.querySelector(`[formControlName="${fieldName}"]`)?.closest('.form-field');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
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
  onSeatsInputChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  let value = input.value;
  
  // Remove any non-digit characters
  const numericValue = value.replace(/[^0-9]/g, '');
  
  // Convert to number and apply constraints
  let numberValue = parseInt(numericValue, 10);
  
  // Handle empty or invalid input
  if (isNaN(numberValue) || numericValue === '') {
    input.value = '';
    this.tripForm.get('numberOfSeats')?.setValue(null);
    return;
  }
  
  // Apply min/max constraints
  if (numberValue < 1) {
    numberValue = 1;
  } else if (numberValue > 8) {
    numberValue = 8;
  }
  
  // Update the input value and form control
  input.value = numberValue.toString();
  this.tripForm.get('numberOfSeats')?.setValue(numberValue);
  
  // Clear API errors if any
  this.onFormFieldChange('numberOfSeats');
}

// Prevent non-numeric key presses
onSeatsKeyDown(event: KeyboardEvent): void {
  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End'
  ];
  
  // Allow control keys
  if (allowedKeys.includes(event.key)) {
    return;
  }
  
  // Allow Ctrl/Cmd combinations (copy, paste, etc.)
  if (event.ctrlKey || event.metaKey) {
    return;
  }
  
  // Only allow digits
  if (!/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    return;
  }
  
  // Check if the resulting value would exceed limits
  const input = event.target as HTMLInputElement;
  const currentValue = input.value;
  const newValue = currentValue + event.key;
  const numberValue = parseInt(newValue, 10);
  
  // Prevent if it would exceed max value
  if (numberValue > 8) {
    event.preventDefault();
  }
}

// Handle paste events to filter non-numeric content
onSeatsPaste(event: ClipboardEvent): void {
  event.preventDefault();
  
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;
  
  const pastedText = clipboardData.getData('text');
  
  // Extract only digits from pasted content
  const numericValue = pastedText.replace(/[^0-9]/g, '');
  
  if (numericValue === '') return;
  
  let numberValue = parseInt(numericValue, 10);
  
  // Apply constraints
  if (numberValue < 1) {
    numberValue = 1;
  } else if (numberValue > 8) {
    numberValue = 8;
  }
  
  // Update the input and form control
  const input = event.target as HTMLInputElement;
  input.value = numberValue.toString();
  this.tripForm.get('numberOfSeats')?.setValue(numberValue);
  
  // Clear API errors if any
  this.onFormFieldChange('numberOfSeats');
}

// Optional: Add a method to increment/decrement seats with buttons
adjustSeats(increment: number): void {
  const currentValue = this.tripForm.get('numberOfSeats')?.value || 1;
  let newValue = currentValue + increment;
  
  // Apply constraints
  if (newValue < 1) newValue = 1;
  if (newValue > 8) newValue = 8;
  
  this.tripForm.get('numberOfSeats')?.setValue(newValue);
  this.onFormFieldChange('numberOfSeats');
}
}