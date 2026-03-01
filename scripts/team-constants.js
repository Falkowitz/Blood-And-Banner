// faction names
var TEAM_NAMES = {};
TEAM_NAMES[Team.crux.id] = "Redwyn";
TEAM_NAMES[Team.blue.id] = "Valdier";
TEAM_NAMES[Team.green.id] = "Turqis";
TEAM_NAMES[Team.sharded.id] = "Hispalis";
TEAM_NAMES[Team.malis.id] = "Basilaeum";
TEAM_NAMES[Team.derelict.id] = "Neutral";

// UI hex color strings
var TEAM_COLORS_STRING = {};
TEAM_COLORS_STRING[Team.blue.id] = "[#6c87fd]";
TEAM_COLORS_STRING[Team.crux.id] = "[#f25555]";
TEAM_COLORS_STRING[Team.green.id] = "[#54d67d]";
TEAM_COLORS_STRING[Team.sharded.id] = "[#ffd37f]";
TEAM_COLORS_STRING[Team.malis.id] = "[#a27ce5]";
TEAM_COLORS_STRING[Team.derelict.id] = "[lightgray]";

// Color objects
var TEAM_COLORS = {};
TEAM_COLORS[Team.blue.id] = Color.valueOf("6c87fd");
TEAM_COLORS[Team.crux.id] = Color.valueOf("f25555");
TEAM_COLORS[Team.green.id] = Color.valueOf("54d67d");
TEAM_COLORS[Team.sharded.id] = Color.valueOf("ffd37f");
TEAM_COLORS[Team.malis.id] = Color.valueOf("a27ce5");
TEAM_COLORS[Team.derelict.id] = Color.valueOf("c1c1c1");

// unit type name -> category (infantry/cavalry/siege)
// used by sound-manager and blood-effect
var UNIT_CATEGORIES = {};

// infantry
UNIT_CATEGORIES["bnb-unit-swordsmen"] = "infantry";
UNIT_CATEGORIES["bnb-unit-spearmen"] = "infantry";
UNIT_CATEGORIES["bnb-unit-shieldmen"] = "infantry";
UNIT_CATEGORIES["bnb-unit-shield"] = "infantry";
UNIT_CATEGORIES["bnb-unit-bowmen"] = "infantry";
UNIT_CATEGORIES["bnb-unit-fire-bowmen"] = "infantry";
UNIT_CATEGORIES["bnb-unit-musketmen"] = "infantry";
UNIT_CATEGORIES["bnb-unit-militiamen"] = "infantry";

// cavalry (colonels ride horses)
UNIT_CATEGORIES["bnb-unit-cavalrymen"] = "cavalry";
UNIT_CATEGORIES["bnb-unit-cuirassiers"] = "cavalry";
UNIT_CATEGORIES["bnb-unit-lancers"] = "cavalry";
UNIT_CATEGORIES["bnb-unit-attack-colonel"] = "cavalry";
UNIT_CATEGORIES["bnb-unit-defence-colonel"] = "cavalry";
UNIT_CATEGORIES["bnb-unit-maneuver-colonel"] = "cavalry";
UNIT_CATEGORIES["bnb-unit-universal-colonel"] = "cavalry";

// siege
UNIT_CATEGORIES["bnb-unit-siege-ballista"] = "siege";
UNIT_CATEGORIES["bnb-unit-siege-catapult"] = "siege";

global.TEAM_NAMES = TEAM_NAMES;
global.TEAM_COLORS_STRING = TEAM_COLORS_STRING;
global.TEAM_COLORS = TEAM_COLORS;
global.UNIT_CATEGORIES = UNIT_CATEGORIES;
