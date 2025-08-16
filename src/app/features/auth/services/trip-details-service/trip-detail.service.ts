import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment as env } from '../../../../../environments/environment.prod';
import { SignupService } from '../signup-services/signup.service';
export interface WeekSchedule {
  sunday?: DaySchedule;
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
}

export interface DaySchedule {
  departure_time: string;
  return_time?: string;
}

export interface TripApiRequest {
  is_round_trip: boolean;
  start_date: string;
  end_date: string;
  seat_count: number;
  home_location_address: string;
  destination_address: string;
  week_schedule: WeekSchedule;
}

export interface TripApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class TripDetailService {

  private readonly baseUrl = env.APIURL;
  private readonly apiUrl = `${this.baseUrl}/api/subscription/client-request/`;
  selectedLanguage = 'ar';

  constructor(
    private http: HttpClient,
    private signupService: SignupService
  ) { }

  private getHeaders(): HttpHeaders {
    const userLang = localStorage.getItem('selectedLanguage') || 'en';
    return new HttpHeaders({
      Authorization: `Bearer ${this.signupService.getToken()}`,
      'Accept-Language': userLang,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });
  }
  /**
   * Submit trip details to the API
   * @param tripData - The trip data to submit
   * @returns Observable of the API response
   */
  submitTripRequest(tripData: TripApiRequest): Observable<TripApiResponse> {
    const headers = new HttpHeaders({
      
    });

    return this.http.post<TripApiResponse>(this.apiUrl, tripData, { headers :this.getHeaders() });
  }

  /**
   * Transform form data to API format
   * @param formData - Form data from the component
   * @returns Transformed data for API
   */
  transformFormDataToApiFormat(formData: any): TripApiRequest {
    const isRoundTrip = formData.tripType === 'round-trip';
    
    // Create week schedule with same times for all working days
    const weekSchedule: WeekSchedule = {};
    const workingDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
    
    workingDays.forEach(day => {
      const daySchedule: DaySchedule = {
        departure_time: formData.arrivalTime
      };
      
      // Add return time only if it's a round trip
      if (isRoundTrip && formData.departureTime) {
        daySchedule.return_time = formData.departureTime;
      }
      
      weekSchedule[day as keyof WeekSchedule] = daySchedule;
    });

    return {
      is_round_trip: isRoundTrip,
      start_date: formData.startDate,
      end_date: formData.endDate || formData.startDate, // Use start date if no end date
      seat_count: formData.numberOfSeats,
      home_location_address: formData.origin.trim(),
      destination_address: formData.destination.trim(),
      week_schedule: weekSchedule
    };
  }
}