import { RenderMode, ServerRoute } from ‘@angular/ssr’;

export const serverRoutes: ServerRoute[] = [
// Prerender all your specific routes
{
path: ‘’,
renderMode: RenderMode.Prerender
},
{
path: ‘landing’,
renderMode: RenderMode.Prerender
},
{
path: ‘signup’,
renderMode: RenderMode.Prerender
},
{
path: ‘trip-details’,
renderMode: RenderMode.Prerender
}
// Note: No wildcard route needed when prerendering specific routes
];
