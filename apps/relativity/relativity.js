var Layout = require("Layout");
var layout;

var lastFix = {fix:-1,satellites:0};

// Load settings
const SETTINGS_FILE = "relativity.json";
var settings = Object.assign({
  speedOfLight: 30  // default speed of light in miles per hour
}, require('Storage').readJSON(SETTINGS_FILE, true) || {});

var speedOfLight = settings.speedOfLight;
var relativeClock = new Date(); // Second clock for relativistic time
var lastUpdateTime = new Date(); // Track when we last updated the relative clock
var currentSpeed = 0; // Current speed for time dilation calculation

function getTimeString() {
  var d = new Date();
  return require("locale").time(d, 1) + ":" + ("0" + d.getSeconds()).substr(-2);
}

function getRelativeTimeString() {
  return require("locale").time(relativeClock, 1) + ":" + ("0" + relativeClock.getSeconds()).substr(-2);
}

function reloadSettings() {
  settings = Object.assign({
    speedOfLight: 30
  }, require('Storage').readJSON(SETTINGS_FILE, true) || {});
  speedOfLight = settings.speedOfLight;
}

function calculateTimeDilation(speed) {
  // Lorentz factor: γ = 1 / sqrt(1 - v²/c²)
  // Time dilation: Δt' = Δt / γ (time runs slower for moving observer)
  
  var v = speed || 0;
  var c = speedOfLight;
  if (v >= c) {
    v = c - 1;
    let overage = v - c;
    let numNines = overage / 5;
  }
  var beta = v / c;
  var gamma = 1 / Math.sqrt(1 - beta * beta);
  return 1 / gamma; // Time dilation factor (< 1 means time runs slower)
}

function speedoImage() {
  return require("heatshrink").decompress(atob("kkdxH+ABteAAwWOECImZDQ2CAQglUD4us2fX68ymQDB1omFESWtDgIACEYYACrolPBwddmWIEZWsmVWJYgiLwXX2YcB1gdDq+BAodWGIWsEhQiDRAWBmQdEAAhGBroFC1ojMC4etERIlDAggkHNIgAWSYYjFVwNWGwgAP5KkBEYoFC1ihBagwAL5W72vKJAxpExCiDABnQ4W12vD6AHBEYxnT4YhB3ghCSIhqDe4SIP3giBM4LfFEYpiMDoQhC3fDCA7+DfBwiCAARmFAAmtEYlYagMywISHEQhEId4UyEYleqwABEZBHERQwABroZBq5rR6BGLNZKzMAAPKRZKzJr2tfaAAKxD7CfgRsD1g1GAAwME2YGDwQjFNgOzwMyCwuCwIAEBg0yHoKODEYmCcYNWCwutAAuzBgg4BCwJGEEgj7JV5r7BIwgjEWrDVCEQYkCWgYAWNYIjF/z8awQfD"));
}

function onGPS(fix) {
  if (lastFix.fix != fix.fix) {
    // if fix is different, change the layout
    if (fix.fix) {
      layout = new Layout( {
        type:"v", c: [
         {type:"txt", font:"6x8:2", label:getTimeString(), id:"time" },
         {type:"h", c: [
           {type:"img", src:speedoImage, pad:4 },
           {type:"txt", font:"35%", label:"--", fillx:true, id:"speed" },
         ]},
         {type:"txt", font:"6x8", label:"--", id:"units" },
         {type:"h", c: [
            {type:"txt", font:"6x8:2", label:getRelativeTimeString(), id:"relativetime" },
            {type:"txt", font:"6x8", pad:3, label:"Relative" }
          ]},
        ]},{lazy:true});
    } else {
      layout = new Layout( {
        type:"v", c: [
         {type:"txt", font:"6x8:2", label:getTimeString(), id:"time" },
          {type:"img", src:speedoImage, pad:4 },
          {type:"txt", font:"6x8", label:"Waiting for GPS" },
          {type:"h", c: [
            {type:"txt", font:"6x8:2", label:getRelativeTimeString(), id:"relativetime" },
            {type:"txt", font:"6x8", pad:3, label:"Relative" }
          ]},
        ]},{lazy:true});
    }
    g.clearRect(0,24,g.getWidth(),g.getHeight());
    layout.render();
  }
  lastFix = fix;

  if (fix.fix && isFinite(fix.speed)) {
    var speed = require("locale").speed(fix.speed);
    var m = speed.match(/([0-9,\.]+)(.*)/); // regex splits numbers from units
    //var txt = (fix.speed<20) ? fix.speed.toFixed(1) : Math.round(fix.speed);
    layout.speed.label = m[1];
    layout.units.label = m[2];
    
    // Update current speed for time dilation calculation
    currentSpeed = parseFloat(m[1]) || 0;
  }
  // Update time display
  if (layout.time) {
    layout.time.label = getTimeString();
  }
  // Update relative time display
  if (layout.relativetime) {
    layout.relativetime.label = getRelativeTimeString();
  }
  layout.render();
}

function updateTime() {
  var now = new Date();
  var timeDelta = now.getTime() - lastUpdateTime.getTime(); // milliseconds elapsed
  
  // Calculate time dilation factor based on current speed
  var dilationFactor = calculateTimeDilation(currentSpeed);
  
  // Advance the relative clock by the dilated time
  var relativeDelta = timeDelta * dilationFactor;
  relativeClock = new Date(relativeClock.getTime() + relativeDelta);
  
  lastUpdateTime = now;
  
  if (layout && layout.time) {
    layout.time.label = getTimeString();
  }
  if (layout && layout.relativetime) {
    layout.relativetime.label = getRelativeTimeString();
  }
  if (layout) {
    layout.render();
  }
}

// Initialize the relative clock to match current time
relativeClock = new Date();
lastUpdateTime = new Date();

g.clear();
onGPS({fix:0,satellites:0});
// onGPS({fix:1,satellites:3,speed:200}); // testing
Bangle.loadWidgets();
Bangle.drawWidgets();

// Update time every second to show seconds
setInterval(updateTime, 1000);

// Button handler for accessing settings
setWatch(function() {
  E.showPrompt('Open Settings?').then((confirmed) => {
    if (confirmed) {
      // Load and execute the settings
      var settingsCode = require("Storage").read("relativity.settings.js");
      if (settingsCode) {
        eval(settingsCode)(function() {
          // Callback when returning from settings
          reloadSettings();
          // Restart the app to apply new settings
          load();
        });
      }
    }
  });
}, BTN2, {repeat:true,edge:"falling"});

Bangle.on('GPS', onGPS);
Bangle.setGPSPower(1, "app");
