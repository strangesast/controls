import { Injectable } from '@angular/core';
import { Route } from '@angular/router';
import {
  Router,
  CanLoad,
  CanActivate,
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { AuthorizationService } from '../services/authorization.service';

@Injectable()
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private authorization: AuthorizationService, private router: Router) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    let url = state.url;

    let loggedIn$ = this.authorization.loggedIn$.first();

    return loggedIn$.map(loggedIn => {
      if (!loggedIn) {
        console.log('logged in? (authguard)', loggedIn, url);
        this.router.navigate(['/login'], { queryParams: { redirectUrl: url }});
        return false;
      }
      return true;
    });
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.canActivate(route, state);
  }
}
