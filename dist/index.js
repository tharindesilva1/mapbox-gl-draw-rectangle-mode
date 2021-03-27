"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var mapInteraction = {
  enable: function enable(ctx) {
    setTimeout(function () {
      // First check we've got a map and some context.
      if (!ctx.map || !ctx.map.doubleClickZoom || !ctx.map.dragPan || !ctx._ctx || !ctx._ctx.store || !ctx._ctx.store.getInitialConfigValue) return;
      // Now check initial state wasn't false (we leave it disabled if so)
      if (!ctx._ctx.store.getInitialConfigValue("doubleClickZoom")) return;
      ctx.map.doubleClickZoom.enable();
      ctx.map.dragPan.enable();
    }, 0);
  },
  disable: function disable(ctx) {
    setTimeout(function () {
      if (!ctx.map || !ctx.map.doubleClickZoom || !ctx.map.dragPan) return;
      // Always disable here, as it's necessary in some cases.
      ctx.map.doubleClickZoom.disable();
      ctx.map.dragPan.disable();
    }, 0);
  }
};

var DrawRectangle = {
  // When the mode starts this function will be called.
  onSetup: function onSetup(opts) {
    var rectangle = this.newFeature({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[]]
      }
    });
    this.addFeature(rectangle);
    this.clearSelectedFeatures();
    mapInteraction.disable(this);
    this.updateUIClasses({ mouse: "add" });
    this.setActionableState({
      trash: true
    });
    return {
      rectangle: rectangle
    };
  },
  // support mobile taps
  onTap: function onTap(state, e) {
    // emulate 'move mouse' to update feature coords
    if (state.startPoint) this.onMouseMove(state, e);
    // emulate onClick
    this.onClick(state, e);
  },
  onDrag: function onDrag(state, e) {
    this.updateUIClasses({ mouse: "add" });
    // on first click, save clicked point coords as startpoint for rectangle
    if (!state.startPoint) state.startPoint = [e.lngLat.lng, e.lngLat.lat];
    if (state.startPoint) {
      expandRectangle(state, e);
    }
    state.endPoint = [e.lngLat.lng, e.lngLat.lat];
  },
  onMouseUp: function onMouseUp(state, e) {
    if (state.startPoint && state.endPoint) {
      this.updateUIClasses({ mouse: "pointer" });
      this.changeMode("static");
    }
  },
  onMouseMove: function onMouseMove(state, e) {
    // if startPoint, update the feature coordinates, using the bounding box concept
    // we are simply using the startingPoint coordinates and the current Mouse Position
    // coordinates to calculate the bounding box on the fly, which will be our rectangle
    if (state.startPoint) {
      expandRectangle(state, e);
    }
  },
  // Whenever a user clicks on a key while focused on the map, it will be sent here
  onKeyUp: function onKeyUp(state, e) {
    if (e.keyCode === 27) return this.changeMode("static");
  },
  onStop: function onStop(state) {
    mapInteraction.enable(this);
    this.updateUIClasses({ mouse: "none" });
    this.activateUIButton();

    // check to see if we've deleted this feature
    if (this.getFeature(state.rectangle.id) === undefined) return;

    //remove last added coordinate
    state.rectangle.removeCoordinate("0.4");
    if (state.rectangle.isValid()) {
      this.map.fire("draw.create", {
        features: [state.rectangle.toGeoJSON()]
      });
    } else {
      this.deleteFeature([state.rectangle.id], { silent: true });
      this.changeMode("simple_select", {}, { silent: true });
    }
  },
  toDisplayFeatures: function toDisplayFeatures(state, geojson, display) {
    var isActivePolygon = geojson.properties.id === state.rectangle.id;
    geojson.properties.active = isActivePolygon ? "true" : "false";
    if (!isActivePolygon) return display(geojson);

    // Only render the rectangular polygon if it has the starting point
    if (!state.startPoint) return;
    return display(geojson);
  },
  onTrash: function onTrash(state) {
    this.deleteFeature([state.rectangle.id], { silent: true });
    this.changeMode("static");
  }
};

exports.default = DrawRectangle;


function expandRectangle(state, e) {
  state.rectangle.updateCoordinate("0.0", state.startPoint[0], state.startPoint[1]); // minX, minY - the starting point
  state.rectangle.updateCoordinate("0.1", e.lngLat.lng, state.startPoint[1]); // maxX, minY
  state.rectangle.updateCoordinate("0.2", e.lngLat.lng, e.lngLat.lat); // maxX, maxY
  state.rectangle.updateCoordinate("0.3", state.startPoint[0], e.lngLat.lat); // minX,maxY
  state.rectangle.updateCoordinate("0.4", state.startPoint[0], state.startPoint[1]);
}