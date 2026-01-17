// scripts/blood-effect.js

/**
 * Blood Effect System
 * Spawns blood splatters when organic/human units take damage.
 */

// Configuration
global.organicUnits = new Set(); // Set of unit type names that bleed
global.bloodEffectDelay = 1.0; // Minimum seconds between blood spawns per unit (prevents clutter)

// Corpse spawning configuration
global.infantryUnits = new Set(); // Units that spawn dead-man corpses
global.cavalryUnits = new Set(); // Units that spawn dead-man-horse corpses
global.corpseSpawnDelay = 1.0; // Minimum seconds between corpse spawns per unit
global.corpseSpawnAmount = 2; // Number of corpses to spawn per event

// Registry to track last blood spawn time per unit ID
var lastBloodTime = {};
// Registry to track last corpse spawn time per unit ID
var lastCorpseTime = {};

/**
 * Register a unit type as organic (capable of bleeding)
 * @param {string} unitTypeName - The name of the unit type (e.g., "unit-swordsman")
 */
global.registerOrganicUnit = function (unitTypeName) {
    global.organicUnits.add(unitTypeName);
};

/**
 * Register a unit type as infantry (spawns dead-man)
 * @param {string} unitTypeName - The name of the unit type
 */
global.registerInfantryUnit = function (unitTypeName) {
    global.infantryUnits.add(unitTypeName);
    // Also register as organic so it bleeds
    global.registerOrganicUnit(unitTypeName);
};

/**
 * Register a unit type as cavalry (spawns dead-man-horse)
 * @param {string} unitTypeName - The name of the unit type
 */
global.registerCavalryUnit = function (unitTypeName) {
    global.cavalryUnits.add(unitTypeName);
    // Also register as organic so it bleeds
    global.registerOrganicUnit(unitTypeName);
};

// Create the blood splatter effect
// Lifetime: 60 seconds (3600 ticks at 60fps)
const bloodEffect = new Effect(3600, e => {
    // Set drawing layer to below units, above floor
    Draw.z(Layer.debris);

    // Set color and fade out over time
    Draw.color(Color.valueOf("880808"));
    Draw.alpha(1.0 - e.fin(Interp.fade));

    // Draw the blood sprite with random rotation (passed via e.rotation)
    Draw.rect("bnb-blood", e.x, e.y, e.rotation);

    // Reset drawing state
    Draw.reset();
});


// Event listener for unit damage
Events.on(UnitDamageEvent, e => {
    if (!e.unit) return;

    // Check if this unit type is registered as organic
    if (!global.organicUnits.has(e.unit.type.name)) return;



    // Throttle blood spawns using configurable delay
    let now = Time.time; // Game time in ticks
    let lastTime = lastBloodTime[e.unit.id] || 0;
    let delayTicks = global.bloodEffectDelay * 60; // Convert seconds to ticks

    if (now - lastTime < delayTicks) {
        return; // Too soon since last blood effect
    }

    // Update last blood spawn time
    lastBloodTime[e.unit.id] = now;

    // Add random offset (±5 world units = ±0.6 tiles) for natural scatter
    let offsetX = Mathf.range(5);
    let offsetY = Mathf.range(5);
    let bloodX = e.unit.x + offsetX;
    let bloodY = e.unit.y + offsetY;

    // Spawn blood effect with random rotation (0-360 degrees)
    let rotation = Mathf.random(360);

    bloodEffect.at(bloodX, bloodY, rotation);

    // --- Corpse Spawning Logic ---
    let spawnCorpses = false;
    let corpseUnitName = null;

    if (global.infantryUnits.has(e.unit.type.name)) {
        spawnCorpses = true;
        corpseUnitName = "bnb-dead-man";
    } else if (global.cavalryUnits.has(e.unit.type.name)) {
        spawnCorpses = true;
        corpseUnitName = "bnb-dead-man-horse";
    }

    if (spawnCorpses && corpseUnitName) {
        let lastCTime = lastCorpseTime[e.unit.id] || 0;
        let corpseDelayTicks = global.corpseSpawnDelay * 60;

        if (now - lastCTime >= corpseDelayTicks) {
            lastCorpseTime[e.unit.id] = now;
            let corpseType = Vars.content.getByName(ContentType.unit, corpseUnitName);

            if (corpseType) {
                // Spawn configured amount of corpses
                for (let i = 0; i < global.corpseSpawnAmount; i++) {
                    let cOffsetX = Mathf.range(5);
                    let cOffsetY = Mathf.range(5);
                    let cX = e.unit.x + cOffsetX;
                    let cY = e.unit.y + cOffsetY;

                    // Spawn death ability usually spawns units, but we can spawn them directly
                    // However, creating units directly is safer to use UnitType.create(team)
                    // But these are likely dummy units or simple ones.

                    // Let's use Tmp.v1 for position if needed, but create() sets position usually
                    let corpse = corpseType.create(e.unit.team);
                    if (corpse) {
                        corpse.set(cX, cY);
                        corpse.rotation = Mathf.random(360);
                        corpse.add();
                    }
                }
            } else {
                // print("[BnB Blood] Error: Corpse unit type '" + corpseUnitName + "' not found.");
            }
        }
    }
});

// Cleanup tracking data when unit is destroyed
Events.on(UnitDestroyEvent, e => {
    if (e.unit) {
        if (lastBloodTime[e.unit.id]) delete lastBloodTime[e.unit.id];
        if (lastCorpseTime[e.unit.id]) delete lastCorpseTime[e.unit.id];
    }
});

// ===== CONFIGURATION =====
// Configure blood spawn delay (in seconds)
// Lower values = more blood, higher values = less clutter
global.bloodEffectDelay = 1.0; // Default: 1 second between blood spawns per unit

// Register organic/human units that bleed
// Add all your infantry, cavalry, and other biological units here

// Medieval Era Units
// Medieval Era Units
// Infantry (spawns dead-man)
global.registerInfantryUnit("bnb-unit-swordsmen");
global.registerInfantryUnit("bnb-unit-spearmen");
global.registerInfantryUnit("bnb-unit-bowmen");
global.registerInfantryUnit("bnb-unit-shieldmen");
global.registerInfantryUnit("bnb-unit-militiamen");

// Cavalry (spawns dead-man-horse)
global.registerCavalryUnit("bnb-unit-cavalrymen");
global.registerCavalryUnit("bnb-unit-cuirassiers");
global.registerCavalryUnit("bnb-unit-lancers");

// Colonels (Assuming most are infantry-based for now, or use organic if no corpse desired)
global.registerInfantryUnit("bnb-unit-attack-colonel");
global.registerInfantryUnit("bnb-unit-defence-colonel");
global.registerInfantryUnit("bnb-unit-maneuver-colonel");
global.registerInfantryUnit("bnb-unit-universal-colonel");

// Napoleonic Era Units (uncomment as needed)
// global.registerOrganicUnit("unit-musketeer");
// global.registerOrganicUnit("unit-cavalry-napoleon");
// global.registerOrganicUnit("unit-artillery-crew");

// WW1 Era Units (uncomment as needed)
// global.registerOrganicUnit("unit-rifleman");
// global.registerOrganicUnit("unit-machine-gunner");
// global.registerOrganicUnit("unit-tank-crew");

print("[BnB] Blood Effect system loaded.");
