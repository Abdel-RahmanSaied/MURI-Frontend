import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { SignupComponent } from './features/auth/signup/signup.component'
import { TripDetailsComponent } from './features/auth/trip-details/trip-details.component'
import { AboutUsComponent } from './features/landing/about-us/about-us.component'
// import { PrivacyComponent } from './features/landing/about-us/about-us.component'
// import { AboutUsComponent } from './features/landing/about-us/about-us.component'

export const routes: Routes = [
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  { path: 'landing', component: LandingComponent },
  { path: 'signup', component: SignupComponent},
  { path: 'trip-details', component: TripDetailsComponent},
  { path: 'aboutUs', component: AboutUsComponent},
  { path: '**', redirectTo: 'landing' }
];