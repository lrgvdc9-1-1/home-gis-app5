import { Component, OnInit,Input, Output, EventEmitter, ViewChild,ElementRef } from '@angular/core';
import { EsriLoaderService } from 'angular-esri-loader';
import {AppService} from "../app.service";
import { GeolocationService } from '../geolocation.service';

var _self = this;

@Component({
  selector: 'app-esri-map',
  templateUrl: './esri-map.component.html',
  styleUrls: ['./esri-map.component.css']
})


export class EsriMapComponent implements OnInit {

  // =-=-=-= OUTPUT VARIABLES =-=-=--=
  @Input() layer: string = null;
  @Input() zoom: any = null;
  @Output() onMapLoaded = new EventEmitter<boolean>();

  @ViewChild("map") mapObj: ElementRef;

  map: any = null;
  isAlive: boolean = true;
  // URLS .....
  mapflexUrl: string = "https://gis.lrgvdc911.org/arcgis/rest/services/Dynamic/MapFlex2/MapServer";
  wmsurl: string = "https://txgi.tnris.org/login/path/contour-camera-poetic-poem/wms";
  wmtsurl: string = 'https://txgi.tnris.org/login/path/contour-camera-poetic-poem/wmts';

  // Reusable layers ....
  simpleLayer: any = null;
  baseLayer: any = null;
  wmsLayer: any = null;

  // Geometry Objects
  circleClass: any = null;
  pointClass: any = null;

  // Symbol Objects
  symbolClass: any = null;
  locationSmb: any = null;
  symbolLineOne: any = null;

  // Graphic Object
  graphicClass: any = null;
  graphic: any = null;
  // Dojo Objects
  Lang: any = null;
  Fx: any = null;

  // Array Objects....
  emsArr = [];
  lawArr = [];
  fireArr = [];
  
  // ..keep track mouse clicks..
  keepTrack: any = {fire: null, ems: null, law: null};

  constructor(private esriLoader: EsriLoaderService, private _appService: AppService, private geo:GeolocationService) { 
    var _self = this;

  }

  ngOnInit() {
    //Zoom geometry..
    this._appService.geometry.takeWhile(() => this.isAlive).subscribe(value => {

         this.onZoom(value);
  });

  this.createMap();


 
  }
  // =-=-=-= DETECT CHANGES =-=--=-=--=-
  ngOnChanges() {
    if(this.layer) {
      switch (this.layer) {
        case "base":
          // this.map.removeLayer(this.wmsLayer);
          // this.map.removeLayer(this.simpleLayer);
          // this.map.addLayer(this.baseLayer);
          this.baseLayer.show();
          this.wmsLayer.hide();
          this.simpleLayer.hide();

          break;
        case "aerial":
           console.log(this.wmsLayer);
           this.baseLayer.hide();

           //this.map.removeLayer(this.baseLayer);
           //this.map.addLayer(this.wmsLayer);
           //this.map.addLayer(this.simpleLayer);
           this.wmsLayer.show();
          //  this.wmsLayer.show();

           this.simpleLayer.show();
          //  this.wmsLayer.refresh();
          //  this.wmsLayer.refresh();


           break;
        default:
          break;
      }
    }

    if(this.zoom) {

      if(this.zoom.hasOwnProperty("originalObject")){
          let geom = JSON.parse(this.zoom.originalObject.geometry);
          switch (geom.type) {
            case "Point":
              this.pointClass.setX(geom.coordinates[0]);
              this.pointClass.setY(geom.coordinates[1]);
              this.onZoom(this.pointClass);
              break;

            default:
              break;
          }
      }
    }
  }


  createMap() {
      let _self = this;
      this.esriLoader.loadModules(['esri/map', "esri/Color", "esri/config", "esri/graphic",
      'esri/layers/ArcGISDynamicMapServiceLayer','esri/layers/WMTSLayer','esri/layers/WMTSLayerInfo', 'esri/layers/WMSLayer',"esri/geometry/Circle",
       "esri/geometry/Point", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol","esri/tasks/query", "esri/tasks/QueryTask", "dojo/_base/lang",
       "dojox/gfx/fx",]).then((
         [Map,Color, esriConfig, Graphic,
        ArcGISDynamicMapServiceLayer,WMTSLayer, WMTSLayerInfo, WMSLayer, Circle, Point, SimpleMarkerSymbol, SimpleLineSymbol, Query , QueryTask, lang, fx]) => {

        esriConfig.defaults.io.proxyUrl = "https://gis.lrgvdc911.org/DotNet/proxy.ashx?";

        this.graphicClass = Graphic;
        this.circleClass = Circle;
        this.pointClass = new Point();

        this.Lang = lang;
        this.Fx = fx;

        this.locationSmb = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 14,
          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
          new Color([1,1,1]), 3),
          new Color([220,20,60])); // Change the color to crimson from blueish...

          this.symbolLineOne = new SimpleLineSymbol({
            "type": "esriSLS",
            "style": "esriSLSSolid",
            "color": [33, 150, 243],
            "width": 2
          });

        // create the map at the DOM element in this component
        this.map = new Map(this.mapObj.nativeElement, {
          center: [-98.181790, 26.407308],
          slider: false,
          zoom: 9
        });



        // provide listeners to map functions ....
        this.map.on("load", function() {

           _self.autoRecenter();
           _self.wmsLayer.hide();

           const accuracy = { enableHighAccuracy: true }; 
          _self.geo.getLocation(accuracy).subscribe( function(position) {
            
            _self.pointClass.setX(position.coords.longitude);
            _self.pointClass.setY(position.coords.latitude);
            _self.onZoom(_self.pointClass);
            console.log(position);
     
          }, function(error) {  } );

        })

        // Listen when all layers are added
        this.map.on('layers-add-result', function(evt) {

            console.log(_self.wmsLayer.visible);

            _self.wmsLayer.hide();
            setTimeout(() => {
              _self.onMapLoaded.emit(true);
            }, 500);


        });

        // create base layers plus imagery layers...
        this.baseLayer = new ArcGISDynamicMapServiceLayer(this.mapflexUrl);


        //this.baseLayer.setVisibleLayers();
        // create wms layer imagery from google
        let layerInfo = new WMTSLayerInfo({ identifier: "texas", tileMatrixSet: '0to20', format: 'png'});
        let options = {serviceMode: 'KVP',visible:'false', layerInfo: layerInfo};

        this.wmsLayer = new WMTSLayer(this.wmtsurl, options); //new WMSLayer(this.wmsurl, {visible: false, format: "png",


        this.simpleLayer = new ArcGISDynamicMapServiceLayer(this.mapflexUrl, {visible: false, visibleLayers: [32, 0]});
        this.simpleLayer.setVisibleLayers([32, 0, 8, 10, 3]);
        // add layer...
        this.map.addLayers([this.wmsLayer,this.baseLayer,  this.simpleLayer]);
        //this.map.addLayer(this.wmsLayer);
        // this.map.addLayer(this.wmsLayer);
        // this.map.addLayer(this.simpleLayer);

        // =-=-=-=-= DOWNLOAD SOME INFORMATION TO USE FROM ARC GIS SERVER =-=-=-=-=-=
        let queryTaskEms = new QueryTask("https://gis.lrgvdc911.org/arcgis/rest/services/Dynamic/RESPONDERS_POLYGON_DYNAMIC/MapServer/0");
        let queryTaskFire = new QueryTask("https://gis.lrgvdc911.org/arcgis/rest/services/Dynamic/RESPONDERS_POLYGON_DYNAMIC/MapServer/1");
        let queryTaskLaw = new QueryTask("https://gis.lrgvdc911.org/arcgis/rest/services/Dynamic/RESPONDERS_POLYGON_DYNAMIC/MapServer/2");

        // =-=-=-=-= SETUP QUERY PARAMS  =-=-=-=-=-=-=
        let queryPara = new Query();
        queryPara.returnGeometry = true;
        queryPara.outFields = ["servicenumber", "dispname"];
        queryPara.where     = "1=1";
        queryPara.outSpatialReference = this.map.spatialReference;

        // -=-=-=-=-=-=-= DOWNLOAD QUERY TASK FIRE =-=-=-=-=-=-=
        queryTaskFire.execute(queryPara, function(evt){
          _self.fireArr = evt.features;
      }, function(error){

        setTimeout(function() {
            queryTaskFire.execute(queryPara, function(evt){
            _self.fireArr = evt.features;
         });
        }, 1000);

      });

      queryTaskEms.execute(queryPara, function(evt){
        _self.emsArr = evt.features;
      }, function(error){

        setTimeout(function() {
            queryTaskEms.execute(queryPara, function(evt){
            _self.emsArr = evt.features;
          })
        }, 1000);

      });

      queryTaskLaw.execute(queryPara, function(evt){
           _self.lawArr = evt.features;
      }, function(error){

          setTimeout(function() {
              queryTaskLaw.execute(queryPara, function(evt){
              _self.lawArr = evt.features;
           })
          }, 1000);

      });

      // =-=-=-=- MAP MOUSE LISTENER =-=-=-=-=-=-=-=-=

      this.map.on("mouse-move", function(evt){

        if(document.getElementById('medical') !== null){
          let point = evt.mapPoint;

          // Check that fire information is available
          if(_self.keepTrack.fire) {
            // if available does the current point is in a polygon...
            if(!_self.keepTrack.fire.contains(point)) {
              _self.fireArr.forEach(element => {
                if(element.geometry.contains(point)) {
                  document.getElementById("fire").innerHTML = element.attributes.dispname;
                  document.getElementById("firephone").innerHTML = element.attributes.servicenumber;
                  _self.keepTrack.fire = element.geometry;
                  return;
                }
              });
            }
            // Check that ems information is available
            if(_self.keepTrack.ems) {
              // if available does the current point is in a polygon...
              if(!_self.keepTrack.ems.contains(point) ) {
                _self.emsArr.forEach(element => {
                  if(element.geometry.contains(point)) {
                    document.getElementById("medical").innerHTML = element.attributes.dispname;
                    document.getElementById("medicalphone").innerHTML = element.attributes.servicenumber;
                    _self.keepTrack.ems= element.geometry;
                    return;
                  }

              });
              }
            }
            // Check that law information is there
            if(_self.keepTrack.law) {
                //If available does the current point is in a polygon..
              if(!_self.keepTrack.law.contains(point)) {
                _self.lawArr.forEach(element => {
                  if(element.geometry.contains(point)) {
                    document.getElementById("law").innerHTML = element.attributes.dispname;
                    document.getElementById("lawphone").innerHTML = element.attributes.servicenumber;
                    _self.keepTrack.law = element.geometry;
                    return;
                  }
                });
              }
            }
          }else {

            // Check if ems arr is any data to loop..
              if(_self.emsArr) {
                _self.emsArr.forEach(element => {
                    if(element.geometry.contains(point)) {
                      document.getElementById("medical").innerHTML = element.attributes.dispname;
                      document.getElementById("medicalphone").innerHTML = element.attributes.servicenumber;
                      _self.keepTrack.ems= element.geometry;
                      return;
                    }

                });
              }
              // Check if fire arr is any data to loop
              if(_self.fireArr) {
                _self.fireArr.forEach(element => {
                  if(element.geometry.contains(point)) {
                    document.getElementById("fire").innerHTML = element.attributes.dispname;
                    document.getElementById("firephone").innerHTML = element.attributes.servicenumber;
                    _self.keepTrack.fire = element.geometry;
                    return;
                  }
                });
              }

              // Check if law arr is any data to loop
              if(_self.lawArr) {
                _self.lawArr.forEach(element => {
                  if(element.geometry.contains(point)) {
                    document.getElementById("law").innerHTML = element.attributes.dispname;
                    document.getElementById("lawphone").innerHTML = element.attributes.servicenumber;
                    _self.keepTrack.law = element.geometry;
                    return;
                  }
                });
              }
           }

        }



      });


    })
 }

 // On Current Location
test() {
  console.log("RUN TEST");
}
 onCurrentLocation(location:any) {
    console.log(location);
    var lat = location.coords.latitude;
    var lng = location.coords.longitude;
    console.log(lat);
    console.log(lng);
    _self.test();
    
 } 


// .... On Zoom Based on geometry ...
 onZoom(geometry) {
    if(geometry.type == "point")
    {
      let circle = this.circleClass(geometry, {"radius": 180});
      this.map.centerAt(geometry, 15);
      this.map.setExtent(circle.getExtent());
      let _self = this;
      this.graphic = this.graphicClass(geometry, _self.locationSmb)
      _self.map.graphics.clear();
      _self.map.graphics.add(this.graphic);

      setTimeout(this.Lang.partial(function(animateMe) {

        var shape = animateMe.getDojoShape();
        _self.Fx.animateStroke({
          shape: shape,
          duration: 1000,
          color: { start: "#0658c4", end: shape.strokeStyle.color },
          width: { start: 25, end: shape.strokeStyle.width }
        }).play();

      }, _self.graphic), 800);


    }else {
      let _self = this;
      this.map.setExtent(geometry.getExtent());
      this.graphic = this.graphicClass(geometry, this.symbolLineOne);
      this.map.graphics.clear();
      this.map.graphics.add(this.graphic);

       setTimeout(this.Lang.partial(function(animateMe) {

                  var shape = animateMe.getDojoShape();
                  _self.Fx.animateStroke({
                    shape: shape,
                    duration: 500,
                    color: { start: "#0658c4", end: shape.strokeStyle.color },
                    width: { start: 20, end: shape.strokeStyle.width }
                  }).play();
                  _self.Fx.animateStroke({
                    shape: shape,
                    duration: 300,
                    color: { start: "#0658c4", end: shape.strokeStyle.color },
                    width: { start: 3, end: shape.strokeStyle.width }
                  }).play();
                  _self.Fx.animateStroke({
                    shape: shape,
                    duration: 300,
                    color: { start: "#0658c4", end: shape.strokeStyle.color },
                    width: { start: 4, end: shape.strokeStyle.width }
                  }).play();

        }, _self.graphic), 800);


    }


  }
  autoRecenter() {
    var resizeDelay = 100;
    let _self = this;
    this.map.on("resize", function(object) {
       _self.map.__resizeCenter = _self.map.extent.getCenter();

       setTimeout(function() {
              _self.map.centerAt(_self.map.__resizeCenter);

          }, resizeDelay);

    });
  }

}
