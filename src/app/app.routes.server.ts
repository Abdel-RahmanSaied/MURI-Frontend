
import { RenderMode, ServerRoute } from ‘@angular/ssr’;

export const serverRoutes: ServerRoute[] = [
// Prerender static pages that don’t require user data
{
path: ‘’,
renderMode: RenderMode.Prerender
},
{
path: ‘landing’,
renderMode: RenderMode.Prerender
},

// Use Server-Side Rendering for dynamic/authenticated pages
{
path: ‘signup’,
renderMode: RenderMode.Server
},
{
path: ‘trip-details’,
renderMode: RenderMode.Server
},

// Fallback for any other routes - use SSR for flexibility
{
path: ‘**’,
renderMode: RenderMode.Server
}
];
