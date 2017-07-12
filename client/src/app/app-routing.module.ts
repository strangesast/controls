import { NgModule, Injectable } from '@angular/core';
import { Routes, Route, PreloadingStrategy, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable()
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  preloadedModules: string[] = [];

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (route.data && route.data['preload']) {
      this.preloadedModules.push(route.path);
      console.log('Preloaded: ' + route.path);

      return load();

    } else {
      return Observable.of(null);

    }
  }
}

import { ConfigurationService } from './services/configuration.service';
import { LogInComponent, RegisterComponent, NotFoundComponent } from './components';
import { DummyComponent } from './components/dummy/dummy.component';
import { AuthGuard, DefaultAppGuard } from './guards';

/*
const routes: Routes = [
  {
    path: '',
    resolve: {
      configuration: ConfigurationService
    },
    children: [
      { path: 'login', component: LogInComponent },
      { path: 'register', component: RegisterComponent },
      {
        path: 'dashboard',
        loadChildren: 'app/modules/dashboard/dashboard.module#DashboardModule',
        canLoad: [AuthGuard]
      },
      {
        path: 'topview',
        loadChildren: 'app/modules/topview/topview.module#TopviewModule',
        canLoad: [AuthGuard]
      },
      {
        path: 'energy-profile',
        loadChildren: 'app/modules/energy/energy.module#EnergyModule',
        canLoad: [AuthGuard]
      },
      {
        path: 'thermostat',
        loadChildren: 'app/modules/thermostat/thermostat.module#ThermostatModule',
        canLoad: [AuthGuard]
      },
      // {
      //   path: '<path>',
      //   loadChildren: '<module_path>,
      //   data: { preload: true }
      // }
      { path: '', component: DummyComponent, canActivate: [AuthGuard, DefaultAppGuard] },
      { path: '**', component: NotFoundComponent }
    ]
  }
];
*/

const routes: Routes = [
  {
    path: '',
    resolve: { config: ConfigurationService },
    canActivateChild: [ AuthGuard ],
    children: []
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes) //, { preloadingStrategy: SelectivePreloadingStrategy })
  ],
  exports: [
    RouterModule
  ],
  providers: [
    ConfigurationService,
    SelectivePreloadingStrategy
  ]
})
export class AppRoutingModule {}