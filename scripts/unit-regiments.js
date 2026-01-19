
// scripts/unit-regiments.js

// Global storage for ordinal tracking
// Key: "CitadelName_UnitType" or "TeamName_UnitType" -> Integer Count
var regimentCounts = {};

// Map of Unit ID -> Assigned Name
var unitRegimentNames = {};

// Cache active citadels to avoid iterating Groups.build too often
var activeCitadels = [];

// Configuration
const CITADEL_SCAN_INTERVAL = 3; // Seconds
const MAX_NAMING_DIST = 400 * 8; // 400 tiles
const FONT_SCALE = 0.13;
const FONT_OFFSET_Y = 2;

const REGIMENT_NAMES = {
    "unit-spearmen": "Spear",
    "unit-swordsmen": "Sword",
    "unit-bowmen": "Bow",
    "unit-fire-bowmen": "Fire Bow",
    "unit-cavalrymen": "L. Cavalry",
    "unit-cuirassiers": "H. Cavalry",
    "unit-lancers": "S. Cavalry",
    "unit-shieldmen": "Shield",
    "unit-militiamen": "Militia",
    "unit-attack-colonel": "Attack Col.",
    "unit-defence-colonel": "Defence Col.",
    "unit-maneuver-colonel": "Maneuver Col.",
    "unit-universal-colonel": "Universal Col.",
    "unit-siege-catapult": "Mangonel",
    "unit-siege-ballista": "Ballista",
    "unit-ship-galley": "Galley",
    "unit-musketmen": "Musket"
};

// --- Logic ---

function scanCitadels() {
    activeCitadels = [];
    Groups.build.each(b => {
        if (b.block.name.includes("citadel")) {
            activeCitadels.push(b);
        }
    });
    // print("[BnB] Scanned Citadels: " + activeCitadels.length);
}

function getRegimentName(unit) {
    if (unitRegimentNames[unit.id]) return unitRegimentNames[unit.id];

    // Exclude King unit
    if (unit.type.name.includes("king")) return "";

    // Find closest friendly citadel
    let closest = null;
    let minDst = MAX_NAMING_DIST;

    for (let c of activeCitadels) {
        if (c.team != unit.team) continue;
        let dst = unit.dst(c);
        if (dst < minDst) {
            minDst = dst;
            closest = c;
        }
    }

    let sourceName = "";

    if (closest) {
        // Look up citadel name
        // Key format from citadel-names.js: Math.floor(x) + "," + Math.floor(y)
        // NOTE: citadel-names.js uses TILE coordinates for keys? 
        // Let's verify: "let key = x + "," + y;" where x = tile.x.
        // Yes.
        let key = Math.floor(closest.tile.x) + "," + Math.floor(closest.tile.y);

        // global.citadel_history_storage should be available now
        if (global.citadel_history_storage && global.citadel_history_storage[key]) {
            let data = global.citadel_history_storage[key];
            // Use current team's name for it
            sourceName = data.history[unit.team.id] || "The Citadel";
        } else {
            sourceName = "The Citadel";
        }
    } else {
        // Fallback to Team Name
        sourceName = global.TEAM_NAMES[unit.team.id] || capitalize(unit.team.name);
    }

    // Determine clean unit type name
    let typeName = unit.type.name;

    // Strip mod prefix if present for lookup (e.g. "bnb-unit-spearmen" -> "unit-spearmen")
    let lookupName = typeName;
    if (lookupName.includes("bnb-")) lookupName = lookupName.replace("bnb-", "");

    // Verify unit type name
    // print("[BnB-DEBUG] Unit Type: " + unit.type.name + " | Lookup: " + lookupName);

    // Use Mapping if available
    if (REGIMENT_NAMES[lookupName]) {
        typeName = REGIMENT_NAMES[lookupName];
    } else if (REGIMENT_NAMES[typeName]) {
        typeName = REGIMENT_NAMES[typeName];
    } else {
        // Fallback cleanup
        if (typeName.includes("unit-")) {
            typeName = typeName.replace("unit-", "");
        }
        if (typeName.includes("bnb-")) {
            typeName = typeName.replace("bnb-", "");
        }
        typeName = capitalize(typeName);
    }

    // Get Ordinal
    let countKey = sourceName + "_" + typeName;
    if (!regimentCounts[countKey]) regimentCounts[countKey] = 0;
    regimentCounts[countKey]++;
    let ord = getOrdinal(regimentCounts[countKey]);

    // Construct Name
    // Construct Name
    let suffix = " Battalion";
    let link = "'s ";

    // Colonels dont get Battalion or 's
    if (typeName.includes("Col.")) {
        suffix = "";
        link = " ";
    }

    // Ships use "Squadron"?
    if (typeName == "Galley") {
        suffix = " Squadron";
    }

    // Artillery uses "Battery"?
    if (typeName == "Mangonel" || typeName == "Ballista") {
        suffix = " Battery";
    }

    let finalName = sourceName + link + ord + " " + typeName + suffix;

    if (sourceName == "The Citadel") {
        finalName = ord + " " + typeName + suffix;
    }

    // Fallback: trim extra spaces
    finalName = finalName.trim().replace("  ", " ");

    unitRegimentNames[unit.id] = finalName;
    return finalName;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function getOrdinal(n) {
    let s = ["th", "st", "nd", "rd"];
    let v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// --- Timers & Events ---

// Periodic Citadel Scan
Timer.schedule(() => {
    scanCitadels();
}, 0, CITADEL_SCAN_INTERVAL);

const EXCLUDED_TYPES = ["unit-king", "dead", "dead-man", "dead-man-horse", "dead-galley"];

// Periodic Naming Scan (Check units)
Timer.schedule(() => {
    Groups.unit.each(u => {
        // Filter for our mod units (poly/mono/mega shouldn't get prestige names)
        if (!unitRegimentNames[u.id] && u.type.name.includes("unit-") && !u.spawnedByCore) {
            // Check exclusion
            let isExcluded = false;
            for (var i = 0; i < EXCLUDED_TYPES.length; i++) {
                if (u.type.name === EXCLUDED_TYPES[i]) isExcluded = true;
            }

            if (!isExcluded) getRegimentName(u);
        }
    });
}, 0, 1);

// Draw Loop
Events.run(Trigger.draw, () => {
    if (!Vars.ui.hudfrag.shown) return;

    Groups.unit.each(u => {
        // Safe hover check
        let isHovered = u.within(Core.input.mouseWorld().x, Core.input.mouseWorld().y, u.hitSize * 0.6);

        if (isHovered && unitRegimentNames[u.id]) {
            let name = unitRegimentNames[u.id];

            // Draw logic
            let font = Fonts.def;

            // Position BELOW unit
            let gx = u.x;
            let gy = u.y - 6; // Adjusted offset (1 tile = 8px)

            Draw.z(Layer.flyingUnit + 1);

            font.setColor(u.team.color);

            // Text Rendering Fixes
            let oldScaleX = font.getData().scaleX;
            let oldScaleY = font.getData().scaleY;

            font.getData().setScale(0.15); // Scale 0.17 for smaller text
            font.setUseIntegerPositions(false); // Enable sub-pixel rendering for smoothness

            font.draw(name, gx, gy, Align.center);

            // Reset
            font.setUseIntegerPositions(true); // Restore default
            font.getData().setScale(oldScaleX, oldScaleY);
            font.setColor(Color.white);
        }
    });
});

// Helper for GlyphLayout pooling (standard Rhino/Java interop)
var Get_GlyphLayout_Prov = new Prov({
    get: function () { return new GlyphLayout(); }
});

// Export globally for unit history system
global.unitRegimentNames = unitRegimentNames;

print("[BnB] Regiment Naming System Loaded.");

