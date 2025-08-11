import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment as env } from '../../../../../environments/environment.prod';

// Define interfaces for better type safety
export interface SignupResponse {
  success: boolean;
  message: string;
  user_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignupService {
  private readonly baseUrl = env.APIURL;
  private readonly apiUrl = `${this.baseUrl}/api/clients/users/`;
  selectedLanguage = 'ar'
  constructor(private http: HttpClient) { }

 
  signup(formData: FormData): Observable<SignupResponse> {
    
    formData.delete('confirm_password');
    formData.delete('terms'); 
    
    const textFields = ['username', 'email', 'first_name', 'second_name', 'last_name', 'nationality'];
    textFields.forEach(field => {
      const value = formData.get(field) as string;
      if (value) {
        formData.set(field, this.sanitizeInput(value));
      }
    });

    // Convert email to lowercase for consistency
    const email = formData.get('email') as string;
    if (email) {
      formData.set('email', email.toLowerCase());
    }

    // Set secure headers
    const headers = new HttpHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
      'Accept-Language': this.selectedLanguage
    });

    return this.http.post<SignupResponse>(this.apiUrl, formData, { 
      headers,
      observe: 'body',
      reportProgress: false
    });
  }


  private sanitizeInput(input: string): string {
    return input.trim()
      .replace(/[<>]/g, '') // Remove basic HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }
}