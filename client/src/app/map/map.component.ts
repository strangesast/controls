import { ViewChild, Component, OnInit, ElementRef } from '@angular/core';
import { GenericComponent } from '../generic/generic.component';
import * as d3 from 'd3';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.less']
})
export class MapComponent extends GenericComponent implements OnInit {
  @ViewChild('graph') host: ElementRef;

  ngOnInit() {
    let element = this.host.nativeElement;

    var pi = Math.PI,
        tau = 2 * pi;
    
    var width = Math.max(960, window.innerWidth),
        height = Math.max(500, window.innerHeight);
    
    // Initialize the projection to fit the world in a 1×1 square centered at the origin.
    var projection = d3.geoMercator()
        .scale(1 / tau)
        .translate([0, 0]);
    
    var path = d3.geoPath()
        .projection(projection);
    
    var tile = d3.tile()
        .size([width, height]);
    
    var zoom = d3.zoom()
        .scaleExtent([1 << 20, 1 << 23])
        .on("zoom", zoomed);
    
    var map = d3.select("body").append("div")
        .attr("class", "map")
        .style("width", width + "px")
        .style("height", height + "px")
        .on("mousemove", mousemoved);
    
    var layer = map.append("div")
        .attr("class", "layer");
    
    var info = map.append("div")
        .attr("class", "info");
    
    // Compute the projected initial center.
    var center = projection([-74.0064, 40.7142]);
    
    // Apply a zoom transform equivalent to projection.{scale,translate,center}.
    map .call(zoom)
        .call(zoom.transform, d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(1 << 20)
            .translate(-center[0], -center[1]));
    
    function zoomed() {
      var transform = d3.event.transform;
    
      var tiles = tile
          .scale(transform.k)
          .translate([transform.x, transform.y])
          ();
    
      projection
          .scale(transform.k / tau)
          .translate([transform.x, transform.y]);
    
      var image = layer
          .style("transform", stringify(tiles.scale, tiles.translate))
        .selectAll(".tile")
        .data(tiles, function(d) { return d; });
    
      image.exit()
          .each(function(d) { this._xhr.abort(); })
          .remove();
    
      image.enter().append("svg")
          .attr("class", "tile")
          .style("left", function(d) { return d[0] * 256 + "px"; })
          .style("top", function(d) { return d[1] * 256 + "px"; })
          .each(function(d) { this._xhr = render(d, this); });
    }
    
    function render(d, node) {
      return d3.json("https://vector.mapzen.com/osm/roads/" + d[2] + "/" + d[0] + "/" + d[1] + ".json?api_key=vector-tiles-LM25tq4", function(error, json) {
        if (error) throw error;
        var k = Math.pow(2, d[2]) * 256; // size of the world in pixels
    
        d3.select(node).selectAll("path")
          .data(json.features.sort(function(a, b) { return a.properties.sort_key - b.properties.sort_key; }))
          .enter().append("path")
            .attr("class", function(d) { return d.properties.kind; })
            .attr("d", d3.geoPath()
                .projection(d3.geoMercator()
                    .scale(k / tau)
                    .translate([k / 2 - d[0] * 256, k / 2 - d[1] * 256])
                    .precision(0)));
      });
    }
    
    function stringify(scale, translate) {
      var k = scale / 256, r = scale % 1 ? Number : Math.round;
      return "matrix3d(" + [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, r(translate[0] * scale), r(translate[1] * scale), 0, 1 ] + ")";
    }
    
    function mousemoved() {
      info.text(formatLocation(projection.invert(d3.mouse(this)), d3.zoomTransform(this).k));
    }
    
    function formatLocation(p, k) {
      var format = d3.format("." + Math.floor(Math.log(k) / 2 - 2) + "f");
      return (p[1] < 0 ? format(-p[1]) + "°S" : format(p[1]) + "°N") + " "
           + (p[0] < 0 ? format(-p[0]) + "°W" : format(p[0]) + "°E");
    }
  }

}
