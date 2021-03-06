import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, Routes } from '@angular/router';
import { Observable } from 'rxjs/Observable';

import { Application } from '../models';

// modules
import { DashboardModule } from '../../dashboard/dashboard.module';
import { EnergyModule } from '../../energy/energy.module';
import { ThermostatModule } from '../../thermostat/thermostat.module';
import { TopviewAlternateModule } from '../../topview-alternate/topview-alternate.module';
import { TopviewModule } from '../../topview/topview.module';

const modules = {
  'DashboardModule': DashboardModule,
  'EnergyModule': EnergyModule,
  'ThermostatModule': ThermostatModule,
  'TopviewAlternateModule': TopviewAlternateModule,
  'TopviewModule': TopviewModule
};

// services
import { AuthorizationService } from '../services/authorization.service';
import { ConfigurationService } from '../services/configuration.service';

// guards
import { LoginGuard } from '../guards/login.guard';
import { AuthGuard } from '../guards/auth.guard';

// components
import { LoginComponent } from '../components/login/login.component';
import { RegisterComponent } from '../components/register/register.component';
import { NotFoundComponent } from '../components/not-found/not-found.component';

@Injectable()
export class LoadApplicationsGuard implements CanActivate {
  constructor(private auth: AuthorizationService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
      let url = state.url;
      // always return false to halt routing with this config. load new config. redirect to target path
      return this.auth.userInitialized$.find(i => i).withLatestFrom(this.auth.user$).flatMap(([_, user]) => {
        if (user) {
          let errored = this.auth.appsLoadError$.filter(e => !!e).map(() => {
            this.router.navigate(['/login'], { queryParams: { redirectUrl: url }});
          });
          let loaded = this.auth.appsInitialized$.find(i => i).flatMap(() =>
            this.auth.applications$.map(apps => {
              let routes = createRoutes(apps);
              this.router.resetConfig(routes);
              this.router.navigateByUrl(url);
            })
          );
          return Observable.merge(errored, loaded).first().mapTo(false);

        } else {
          this.router.navigate(['/login'], { queryParams: { redirectUrl: url }});
          return Observable.of(false);
        }
      });
  }
}

function createRoutes(apps: Application[]): Routes {
  let canActivate = [ AuthGuard ]
  if (!Array.isArray(apps) || !apps.length) {
    throw new Error('invalid apps array');
  }
  let children = apps.map(({ path, moduleName }) => ({ path, loadChildren: () => modules[moduleName], canActivate }));
  return [
    {
      path: '',
      resolve: { config: ConfigurationService },
      children: [ 
        { path: '', redirectTo: children[0].path, pathMatch: 'full' },
        { path: 'login',    component: LoginComponent,    canActivate: [ LoginGuard ] },
        { path: 'register', component: RegisterComponent, canActivate: [ LoginGuard ] },
        ...children,
        { path: '**', component: NotFoundComponent }
      ]
    }
  ];
}
