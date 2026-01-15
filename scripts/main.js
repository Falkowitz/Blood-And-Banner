// scripts/main.js
var global = (function () { return this; })();

//i cant code for shit this is all done by AI

/**
 * Blood & Banner - Main Entry Point
 * This script loads all modular sub-scripts.
 */

// Note: Most Mindustry/Arc classes (like Touchable, Styles, Label, Table) 
// are already imported as globals by the game. Use them directly.

require("team-icons");
require("cursor");
require("menu-bg");
require("music");
require("casualties");
require("citadel-names");
require("production-timers");
require("frontline-ui");
// capture-notifications is now integrated into citadel-names.js

print("[BnB] All modular scripts loaded successfully.");
