import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  // Clonamos cada petición que sale de Angular y le pegamos la etiqueta "withCredentials"
  // Esto hace que el navegador incluya la cookie 'accessToken' en el viaje.
  const authReq = req.clone({
    withCredentials: true
  });

  return next(authReq);
};