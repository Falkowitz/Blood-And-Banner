// Shared constants for team names and colors

// Team Names (Faction Names)
var TEAM_NAMES = {};
TEAM_NAMES[Team.crux.id] = "Redwyn";
TEAM_NAMES[Team.blue.id] = "Valdier";
TEAM_NAMES[Team.green.id] = "Turqis";
TEAM_NAMES[Team.sharded.id] = "Hispalis";
TEAM_NAMES[Team.malis.id] = "Basilaeum";
TEAM_NAMES[Team.derelict.id] = "Neutral";

// Team Colors (UI hex strings)
var TEAM_COLORS_STRING = {};
TEAM_COLORS_STRING[Team.blue.id] = "[#6c87fd]";
TEAM_COLORS_STRING[Team.crux.id] = "[#f25555]";
TEAM_COLORS_STRING[Team.green.id] = "[#54d67d]";
TEAM_COLORS_STRING[Team.sharded.id] = "[#ffd37f]";
TEAM_COLORS_STRING[Team.malis.id] = "[#a27ce5]";
TEAM_COLORS_STRING[Team.derelict.id] = "[lightgray]";

// Team Colors (Color objects)
var TEAM_COLORS = {};
TEAM_COLORS[Team.blue.id] = Color.valueOf("6c87fd");
TEAM_COLORS[Team.crux.id] = Color.valueOf("f25555");
TEAM_COLORS[Team.green.id] = Color.valueOf("54d67d");
TEAM_COLORS[Team.sharded.id] = Color.valueOf("ffd37f");
TEAM_COLORS[Team.malis.id] = Color.valueOf("a27ce5");
TEAM_COLORS[Team.derelict.id] = Color.valueOf("c1c1c1");

// Export to global scope for easy access
global.TEAM_NAMES = TEAM_NAMES;
global.TEAM_COLORS_STRING = TEAM_COLORS_STRING;
global.TEAM_COLORS = TEAM_COLORS;

print("[BnB] Team Constants loaded.");
