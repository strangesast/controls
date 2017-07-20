import { Component, OnInit } from '@angular/core';
import { DataService } from '../services/data.service';
//import { routerTransition } from '../../catalog/directives/router.animations';
import { Observable } from 'rxjs';
import { tree, stratify, hierarchy, HierarchyNode } from 'd3';

@Component({
  selector: 'app-energy',
  templateUrl: './energy.component.html',
  styleUrls: ['./energy.component.less'],
  //animations: [routerTransition()]
})
export class EnergyComponent implements OnInit {
  activeNode$: Observable<HierarchyNode>;
  tree$: Observable<HierarchyNode>;

  constructor(private data: DataService) {
    let strat = stratify().id(d => d._id).parentId(d => d.parent || d.area);
    let t = tree().nodeSize([0, 1]);

    this.tree$ = Observable.combineLatest(this.data.areas$, this.data.points$).debounceTime(100).switchMap(([ areas, points ]) => {
      if (areas.length) {
        return Observable.of(t(strat([...areas, ...points])));

      } else {
        return Observable.never();
      }
    });

    this.activeNode$ = this.data.activeNode$.withLatestFrom(this.tree$).map(([ id, tree ]) => {
      let activeNode;
      if (tree) {
        tree.each(n => {
          if (n.data._id == id) {
            activeNode = n;
          }
        });
      }
      console.log('activeNode', activeNode);
      return activeNode;
    });

    this.activeNode$.subscribe();
  }

  setActiveNode(node) {
    this.data.setActiveNode(node.data._id);
  }

  ngOnInit() {
    this.data.init();
  }

  ngOnDestroy() {
    this.data.uninit();
  }
}
