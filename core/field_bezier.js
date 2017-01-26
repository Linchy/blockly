'use strict';

goog.provide('Blockly.FieldBezier');

goog.require('Blockly.Field');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.style');
goog.require('goog.ui.ColorPicker');


/**
 * Class for a  input field.
 * @param {string} colour The initial colour in '#rrggbb' format.
 * @param {Function=} opt_validator A function that is executed when a new
 *     colour is selected.  Its sole argument is the new colour value.  Its
 *     return value becomes the selected colour, unless it is undefined, in
 *     which case the new colour stands, or it is null, in which case the change
 *     is aborted.
 * @extends {Blockly.Field}
 * @constructor
 */
Blockly.FieldBezier = function (args, opt_validator) {
  this.args = this.createArgsObj(args);
  this.valueDiv = Blockly.createHtmlElement('div', {}, null);
  Blockly.FieldBezier.superClass_.constructor.call(this, '', opt_validator);
  this.setText(Blockly.Field.NBSP + Blockly.Field.NBSP + Blockly.Field.NBSP);
  this.eventTimeout = false;
};
goog.inherits(Blockly.FieldBezier, Blockly.Field);

Blockly.FieldBezier.prototype.createArgsObj = function (argsStr) {
  var argObj = {};

  if (typeof argsStr == "string" || argsStr instanceof String)
  {
    var argsSpl = argsStr.split(';');

    argsSpl.forEach(function(argPairStr) {
      var keyValueSpl = argPairStr.split(':');
      argObj[keyValueSpl[0]] = (keyValueSpl.length == 1 ? true : keyValueSpl[1]);
    }, this);
  }

  return argObj;
};

/**
 * Install this field on a block.
 */
Blockly.FieldBezier.prototype.init = function () {
  Blockly.FieldBezier.superClass_.init.call(this);
  this.borderRect_.style['fillOpacity'] = 1;
  this.setValue(this.getValue());
};

Blockly.FieldBezier.SharedCanvas = null;

/**
 * Mouse cursor style when over the hotspot that initiates the editor.
 */
Blockly.FieldBezier.prototype.CURSOR = 'default';

/**
 * Close the colour picker if this input is being deleted.
 */
Blockly.FieldBezier.prototype.dispose = function () {
  Blockly.WidgetDiv.hideIfOwner(this);
  Blockly.FieldBezier.superClass_.dispose.call(this);
};

/**
 * Return the current colour.
 * @return {string} Current colour in '#rrggbb' format.
 */
Blockly.FieldBezier.prototype.getValue = function () {
  return this.valueDiv.getAttribute('points');
};

/**
 * Set the colour.
 * @param {string} colour The new colour in '#rrggbb' format.
 */
Blockly.FieldBezier.prototype.setValue = function (pointsJson) {
  this.valueDiv.setAttribute('points', pointsJson);
};

/**
 * Get the text from this field.  Used when the block is collapsed.
 * @return {string} Current text.
 */
Blockly.FieldBezier.prototype.getText = function () {
  /*var colour = this.colour_;
  // Try to use #rgb format if possible, rather than #rrggbb.
  var m = colour.match(/^#(.)\1(.)\2(.)\3$/);
  if (m) {
    colour = '#' + m[1] + m[2] + m[3];
  }*/
  return 'getText';
};

/**
 * Create a palette under the colour field.
 * @private
 */
Blockly.FieldBezier.prototype.showEditor_ = function () {
  Blockly.WidgetDiv.show(this, this.sourceBlock_.RTL,
    Blockly.FieldBezier.widgetDispose_);

  // Position the palette to line up with the field.
  // Record windowSize and scrollOffset before adding the palette.
  var windowSize = goog.dom.getViewportSize();
  var scrollOffset = goog.style.getViewportPageOffset(document);
  var xy = this.getAbsoluteXY_();
  var borderBBox = this.getScaledBBox_();
  var div = Blockly.WidgetDiv.DIV;

  //div.style.width = "800px";
  // div.style.height = "400px";

  var container = Blockly.createHtmlElement('div', {
    "style": "width:auto; height:auto; background-color:whitesmoke; border-style: solid; border-width: 1px; padding: 5px"
  }, div);

  //container.innerHTML = '<object type="text/html" style="width:100%; height:100%;" data="file:///C:/Git/GoogleBlockly/curvesjs/src/index.html"></object>';
  container.innerHTML = `
    <style>
      .fill {
        width: 100%;
        height: 100%;
      }
      .curveEditor {
        font-family: 'Arial', serif;
      }
      .grid {
        border: solid black 1px;
        margin: 5px;
      }
    </style>
    <div class="curveEditor fill">
      ${this.args.closedSurfaceOnly || this.args.curveOnly ? "" : '<input id="toggleCloseLoopCheckbox" type="checkbox" checked onchange="this.curve.ToggleCloseLoop(this.checked)">Close Loop</input><br />'}
      <div class="fill">
        Scale: <input id="scaleTextbox" type="text" oninput="this.curve.SetScale(this.value)" value="1.0"></input>
        <input id="increaseScaleBtn" type="button" onclick="this.increaseScale()" value="+"></input>
        <input id="decreaseScaleBtn" type="button" onclick="this.decreaseScale()" value="-"></input>
        Mouse: <span></span>
        <br />
        <canvas class="grid" width="800" height="800"></canvas>
        <br />
        Marker Data: <input id="markerDataTextbox" type="text" onKeyUp="this.curve.MarkerDataOnChange(this.value)">
      </div>
    </div>`;

  //if (Blockly.FieldBezier.SharedCanvas == null) {

  var self = this;
  setTimeout(function () {

    var toggleCloseLoopCheckbox = container.querySelector('#toggleCloseLoopCheckbox');
    var scaleTextbox = container.querySelector('#scaleTextbox');
    var increaseScaleBtn = container.querySelector('#increaseScaleBtn');
    var decreaseScaleBtn = container.querySelector('#decreaseScaleBtn');
    var markerDataTextbox = container.querySelector('#markerDataTextbox');

    var ctx = container.querySelector('canvas').getContext("2d");
    var span = container.querySelector('span');

    var curve = new Curve(ctx, self.valueDiv, self.getValue(), self.args, markerDataTextbox);
    curve.setPointStyle('#222', 8);
    curve.setLineStyle('#f5663F', 2);

    if (toggleCloseLoopCheckbox)
      toggleCloseLoopCheckbox.curve = curve;
    if (scaleTextbox)
      scaleTextbox.curve = curve;
    if (markerDataTextbox)
      markerDataTextbox.curve = curve;

    increaseScaleBtn.increaseScale = function() {
      scaleTextbox.value = parseFloat(scaleTextbox.value) * 2;
      curve.SetScale(scaleTextbox.value);
    }

    decreaseScaleBtn.decreaseScale = function() {
      scaleTextbox.value = parseFloat(scaleTextbox.value) / 2;
      curve.SetScale(scaleTextbox.value);
    }

    curve.on('mousemove', function () {
      span.innerHTML = 'X: ' + this.mouseX + ', Y: ' + this.mouseY;
    });

    curve.on('drag', function () {
      //console.log('point is being dragged');
      self.RaiseChangeEvent(this);
    });

    curve.on('newpoint', function () {
      //console.log('point has been created');
      self.RaiseChangeEvent(this);
    });

    curve.on('removepoint', function () {
      //console.log('point has beed removed');
      self.RaiseChangeEvent(this);
    });

    curve.on('togglecontrol', function () {
      //console.log('toggled controlpoints');
      self.RaiseChangeEvent(this);
    });

    //   };


    //   //Blockly.FieldBezier.SharedCanvas = canvas;     
    //}

    //picker.render(div);
    //picker.setSelectedColor(this.getValue());

    // Record paletteSize after adding the palette.
    var paletteSize = goog.style.getSize(div);
    //var paletteSize = {width: container.style.width, height: container.style.height }; // goog.style.getSize(div);

    // Flip the palette vertically if off the bottom.
    if (xy.y + paletteSize.height + borderBBox.height >=
      windowSize.height + scrollOffset.y) {
      xy.y -= paletteSize.height - 1;
    } else {
      xy.y += borderBBox.height - 1;
    }
    if (self.sourceBlock_.RTL) {
      xy.x += borderBBox.width;
      xy.x -= paletteSize.width;
      // Don't go offscreen left.
      if (xy.x < scrollOffset.x) {
        xy.x = scrollOffset.x;
      }
    } else {
      // Don't go offscreen right.
      if (xy.x > windowSize.width + scrollOffset.x - paletteSize.width) {
        xy.x = windowSize.width + scrollOffset.x - paletteSize.width;
      }
    }

    // Configure event handler.
    /* var thisField = this;
     Blockly.FieldBezier.changeEventKey_ = goog.events.listen(picker,
         goog.ui.ColorPicker.EventType.CHANGE,
         function(event) {
           var colour = event.target.getSelectedColor() || '#000000';
           Blockly.WidgetDiv.hide();
           if (thisField.sourceBlock_) {
             // Call any validation function, and allow it to override.
             colour = thisField.callValidator(colour);
           }
           if (colour !== null) {
             thisField.setValue(colour);
           }
         });*/

    Blockly.WidgetDiv.position(xy.x, xy.y, windowSize, scrollOffset, self.sourceBlock_.RTL);
  }, 10);
};

Blockly.FieldBezier.prototype.RaiseChangeEvent = function (curve) {
  // only raise events every 1/10 of a second
  if (!this.eventTimeout) {
    var self = this;
    self.eventTimeout = true;
    setTimeout(function () {
      self.eventTimeout = false;
      Blockly.Events.fire(new Blockly.Events.Change(self.sourceBlock_, 'field', self.name, '', curve.getPointsJson()));
    }, 100);
  }
};

/**
 * Hide the colour palette.
 * @private
 */
Blockly.FieldBezier.widgetDispose_ = function () {
  if (Blockly.FieldBezier.changeEventKey_) {
    goog.events.unlistenByKey(Blockly.FieldBezier.changeEventKey_);
  }
};
