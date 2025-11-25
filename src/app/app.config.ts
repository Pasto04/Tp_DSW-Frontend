import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
// 1. Importamos 'withInterceptors' y tu interceptor nuevo
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), 
    provideClientHydration(), 
    // 2. Aquí "enchufamos" el interceptor junto con withFetch
    provideHttpClient(
      withFetch(), 
      withInterceptors([credentialsInterceptor])
    ), 
    provideAnimations()
  ]
};
