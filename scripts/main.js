// scripts/main.js
var global = (function () { return this; })();

//i cant code for shit this is all done by AI

/**
 * Blood & Banner - Main Entry Point
 * This script loads all modular sub-scripts.
 */

// Note: Most Mindustry/Arc classes (like Touchable, Styles, Label, Table) 
// are already imported as globals by the game. Use them directly.

// Load shared constants first
require("team-constants");

require("team-icons");
require("cursor");
require("menu-bg");
require("music");
require("casualties");
require("citadel-names");
require("capture-notifications");
require("production-timers");
require("frontline-ui");
// capture-notifications is now in its own separate module
require("unit-regiments");
require("blood-effect");
require("unit-history");

print("[BnB] All modular scripts loaded successfully.");
