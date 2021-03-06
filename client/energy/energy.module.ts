import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { HttpModule } from '@angular/http';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GraphService } from './services/graph.service';

import { EnergyComponent } from './components/energy.component';
import { MapComponent } from './components/map/map.component';
import { DataService } from './services/data.service';
import { GraphComponent } from './components/graph/graph.component';
import { TreeListComponent } from './components/tree-list/tree-list.component';
import { HeatmapComponent } from './components/heatmap/heatmap.component';
import { PieComponent } from './components/pie/pie.component';
import { SankeyComponent } from './components/sankey/sankey.component';

import { effects } from './effects';
import { reducers } from './reducers';

const routes: Routes = [
  {
    path: '',
    component: EnergyComponent
  }
];


@NgModule({
  imports: [
    CommonModule,
    HttpModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    EffectsModule.forFeature(effects),
    StoreModule.forFeature('energy', reducers)
  ],
  declarations: [
    EnergyComponent,
    MapComponent,
    GraphComponent,
    TreeListComponent,
    HeatmapComponent,
    PieComponent,
    SankeyComponent
  ],
  bootstrap: [ EnergyComponent ],
  providers: [ DataService, GraphService ]
})
export class EnergyModule { }
