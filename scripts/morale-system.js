
// scripts/morale-system.js
// Core morale logic system with retreat mechanics

// Global storage for unit morale data
// Key: Unit ID -> { currentMorale, isRetreating, lastDamageTime, recentKills, originCitadel }
var unitMoraleData = {};

// Configuration constants
const DAMAGE_THRESHOLD_SMALL = 0.005; // 0.5% damage
const DAMAGE_THRESHOLD_LARGE = 0.05;  // 5% damage
const MORALE_LOSS_SMALL_DAMAGE = -1;
const MORALE_LOSS_LARGE_DAMAGE = -10;
const MORALE_LOSS_FRIENDLY_KILLED = -5;
const MORALE_LOSS_FRIENDLY_RETREATING = -2;
const MORALE_LOSS_NUMERICAL_INFERIORITY = -1; // per second
const MORALE_LOSS_FLANK_MULTIPLIER = 2;
const MORALE_LOSS_REAR_MULTIPLIER = 4;

const MORALE_GAIN_ENEMY_KILLED = 3;
const MORALE_GAIN_ENEMY_RETREATING = 1;
const MORALE_GAIN_NO_ENEMIES = 1; // per second
const MORALE_GAIN_NUMERICAL_SUPERIORITY = 0.5; // per second
const MORALE_GAIN_MULTI_KILL = 4;

const MULTI_KILL_WINDOW = 180; // 3 seconds (60 ticks/sec * 3)
const MULTI_KILL_THRESHOLD = 2;

const CITADEL_PROXIMITY = 80; // world units
const MORALE_REGEN_AT_CITADEL = 3; // per second

const NUMERICAL_RATIO = 2.0; // 2x ratio for superiority/inferiority

// Units excluded from morale system
const EXCLUDED_UNIT_TYPES = [
    "bnb-unit-king",
    "bnb-dead",
    "bnb-dead-man",
    "bnb-dead-man-horse",
    "bnb-dead-galley"
];

// Check if unit type is excluded
function isUnitExcluded(unit) {
    if (!unit || !unit.type) return true;
    let typeName = unit.type.name;

    // Check explicit exclusions
    for (let i = 0; i < EXCLUDED_UNIT_TYPES.length; i++) {
        if (typeName === EXCLUDED_UNIT_TYPES[i]) return true;
    }

    // Also exclude if name contains "dead" or "wreck"
    if (typeName.includes("dead") || typeName.includes("wreck")) return true;

    return false;
}

// Get effective base morale with veterancy bonus
// Each veterancy level grants +5% baseMorale
function getEffectiveBaseMorale(unit, config) {
    if (!unit || !config) return config ? config.baseMorale : 0;

    let baseMorale = config.baseMorale;

    // Check for veterancy bonus from unit-history.js
    if (!global.unitHistory) {

        return baseMorale;
    }

    if (!global.unitHistory[unit.id]) {
        return baseMorale;
    }

    let veterancyLevel = global.unitHistory[unit.id].veterancyLevel || 0;

    if (veterancyLevel > 0) {
        let veterancyBonus = veterancyLevel * 0.05; // 5% per level
        baseMorale = Math.round(config.baseMorale * (1 + veterancyBonus));
    }

    return baseMorale;
}

// Initialize morale data for a unit
function initMoraleData(unit) {
    if (!unit || unitMoraleData[unit.id]) return;

    // Exclude king, corpses, dead units, wrecks
    if (isUnitExcluded(unit)) return;

    let config = global.getMoraleConfig(unit);
    if (!config) return; // Unit not eligible for morale

    // Get effective base morale with veterancy bonus
    let effectiveBaseMorale = getEffectiveBaseMorale(unit, config);

    // Get origin citadel
    let originCitadel = getOriginCitadel(unit);

    unitMoraleData[unit.id] = {
        currentMorale: effectiveBaseMorale,
        isRetreating: false,
        lastDamageTime: 0,
        recentKills: [], // Array of kill timestamps
        originCitadel: originCitadel,
        retreatEffectSpawned: false
    };


}

// Get origin citadel for retreat pathfinding
function getOriginCitadel(unit) {
    if (!unit) return null;

    let closestCitadel = null;
    let closestDist = Infinity;

    try {
        if (global.citadel_history_storage) {
            for (let key in global.citadel_history_storage) {
                let data = global.citadel_history_storage[key];
                let tile = Vars.world.tile(Math.floor(data.x), Math.floor(data.y));

                if (tile && tile.build && tile.build.team == unit.team) {
                    let dist = unit.dst(tile.build);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestCitadel = tile.build;
                    }
                }
            }
        }
    } catch (err) {
        // Fail silently
    }

    return closestCitadel;
}

// Calculate angle between two units (for directional damage detection)
function getAngleBetween(source, target) {
    let dx = target.x - source.x;
    let dy = target.y - source.y;
    return Math.atan2(dy, dx) * 180 / Math.PI;
}

// Determine if damage came from rear, flank, or front
function getDamageDirection(victim, attacker) {
    if (!victim || !attacker) return "front";

    let attackAngle = getAngleBetween(victim, attacker);
    let victimRotation = victim.rotation;

    // Normalize angle difference
    let angleDiff = Math.abs(attackAngle - victimRotation);
    while (angleDiff > 180) angleDiff -= 360;
    angleDiff = Math.abs(angleDiff);

    // Rear: 135-180 degrees
    if (angleDiff > 135) return "rear";
    // Flank: 45-135 degrees
    if (angleDiff > 45) return "flank";
    // Front: 0-45 degrees
    return "front";
}

// Apply morale change
function changeMorale(unit, amount, reason) {
    if (!unit || !unitMoraleData[unit.id]) return;

    let data = unitMoraleData[unit.id];
    let config = global.getMoraleConfig(unit);
    if (!config) return;

    // Get effective max morale with veterancy bonus
    let maxMorale = getEffectiveBaseMorale(unit, config);

    let oldMorale = data.currentMorale;

    // Don't spam morale changes when already at limit
    if (amount > 0 && oldMorale >= maxMorale) return;
    if (amount < 0 && oldMorale <= 0) return;

    // Don't allow going over max or under min after the change
    let newMorale = oldMorale + amount;
    if (newMorale > maxMorale) newMorale = maxMorale;
    if (newMorale < 0) newMorale = 0;

    data.currentMorale = newMorale;





    // Check retreat threshold
    if (!data.isRetreating && data.currentMorale < config.retreatThreshold) {
        enterRetreatMode(unit);
    } else if (data.isRetreating && data.currentMorale > config.retreatThreshold) {
        exitRetreatMode(unit);
    }
}

// Enter retreat mode
function enterRetreatMode(unit) {
    if (!unit || !unitMoraleData[unit.id]) return;

    let data = unitMoraleData[unit.id];
    data.isRetreating = true;
    data.retreatEffectSpawned = false;

    // Clear any player commands so unit automatically paths to citadel
    // Use duck-typing to check for clearCommands method (handles CommandAI)
    let ai = unit.controller();
    if (ai && ai.clearCommands) {
        ai.clearCommands();
        // print("[BnB-Morale-DEBUG] Cleared commands for unit " + unit.id);
    }

    // Speed boost logic moved to update loop (moveAt scaling)
    data.originalSpeed = unit.type.speed; // Just track it for reference if needed



    // Spawn retreat effect
    if (!data.retreatEffectSpawned) {
        spawnRetreatEffect(unit);
        data.retreatEffectSpawned = true;
    }
}

// Exit retreat mode
function exitRetreatMode(unit) {
    if (!unit || !unitMoraleData[unit.id]) return;

    let data = unitMoraleData[unit.id];
    data.isRetreating = false;
    data.retreatEffectSpawned = false;


}

// Spawn retreat particle effect
function spawnRetreatEffect(unit) {
    if (!unit) return;

    try {
        // Create retreat effect
        let effect = new Effect(180, e => {
            Draw.z(140.1);
            Draw.color(Color.white);

            let size = 2; // Constant size as requested (sizeFrom: 2, sizeTo: 2)

            // Fade out
            Draw.alpha(1 - e.fin());

            // Float up 24 world units (3 blocks) over lifetime
            let offsetY = e.fin() * 24;

            Draw.rect(
                Core.atlas.find("bnb-retreat"),
                e.x,
                e.y + offsetY,
                size * 8, // Mindustry region drawing usually expects world units * 8 or ppx
                size * 8,
                0 // baseRotation
            );

            Draw.reset();
        });

        effect.at(unit.x, unit.y);
    } catch (err) {
        print("[BnB-Morale] Error spawning retreat effect: " + err);
    }
}

// Count nearby units (for numerical superiority/inferiority)
function countNearbyUnits(unit, radius) {
    if (!unit) return { friendlies: 0, enemies: 0 };

    let friendlies = 1; // Include the unit itself
    let enemies = 0;

    Groups.unit.each(u => {
        if (u == unit || !u.isValid()) return;

        // Skip excluded units (dead, corpses, king, wrecks)
        if (isUnitExcluded(u)) return;

        let dist = unit.dst(u);
        if (dist <= radius) {
            if (u.team == unit.team) {
                friendlies++;
            } else {
                enemies++;
            }
        }
    });

    return { friendlies: friendlies, enemies: enemies };
}

// Replaced Timer.schedule with Events.run(Trigger.update) to fix unit iteration concurrency bugs
let lastMoraleUpdate = 0;

Events.run(Trigger.update, () => {
    if (Vars.state.isPaused()) return;

    // Run approximately every second (60 ticks)
    if (Time.time - lastMoraleUpdate < 60) return;
    lastMoraleUpdate = Time.time;

    // Run nested retreat panic check every 2 seconds (every 2nd update)
    let checkRetreatPanic = (Time.time % 120 < 2);

    // Use copy() to create a snapshot array to avoid iterator issues
    let unitArray = Groups.unit.copy(new Seq());
    let size = unitArray.size;

    for (let i = 0; i < size; i++) {
        let u = unitArray.get(i);
        if (!u || !u.isValid()) continue;

        // 1. Initialize morale for new units (merged from old separate timer)
        if (!unitMoraleData[u.id]) {
            // Only initialize if proper type and not spawned by core (player units)
            if (!u.spawnedByCore && u.type.name.indexOf("unit-") >= 0) {
                initMoraleData(u);
            }
            // If still no data (failed init or invalid type), skip
            if (!unitMoraleData[u.id]) continue;
        }

        let config = global.getMoraleConfig(u);
        if (!config) continue;
        let data = unitMoraleData[u.id];
        let counts = countNearbyUnits(u, config.moraleRadius);

        // No enemies nearby bonus (EXCLUDE RETREATING UNITS)
        if (counts.enemies == 0 && !data.isRetreating) {
            changeMorale(u, MORALE_GAIN_NO_ENEMIES, "no enemies nearby");
        }

        // Numerical superiority/inferiority
        if (counts.enemies > 0) {
            let ratio = counts.friendlies / counts.enemies;

            if (ratio >= NUMERICAL_RATIO) {
                // Numerical superiority
                changeMorale(u, MORALE_GAIN_NUMERICAL_SUPERIORITY, "numerical superiority");
            } else if (ratio <= (1 / NUMERICAL_RATIO)) {
                // Numerical inferiority
                changeMorale(u, MORALE_LOSS_NUMERICAL_INFERIORITY, "numerical inferiority");
            }
        }

        // Retreat morale regeneration at citadel
        if (data.isRetreating && data.originCitadel && data.originCitadel.isValid()) {
            let dist = u.dst(data.originCitadel);
            if (dist <= CITADEL_PROXIMITY) {
                changeMorale(u, MORALE_REGEN_AT_CITADEL, "citadel refuge");
            }
        }

        // Panic from nearby retreating units (Logic merged from old Timer)
        if (checkRetreatPanic) {
            Groups.unit.each(other => {
                if (!unitMoraleData[other.id] || other == u) return;

                // Skip excluded units
                if (isUnitExcluded(other)) return;

                let dist = u.dst(other);
                if (dist > config.moraleRadius) return;

                let otherData = unitMoraleData[other.id];

                if (otherData.isRetreating) {
                    // Friendly retreating
                    if (u.team == other.team) {
                        changeMorale(u, MORALE_LOSS_FRIENDLY_RETREATING, "friendly retreating");
                    }
                    // Enemy retreating
                    else {
                        changeMorale(u, MORALE_GAIN_ENEMY_RETREATING, "enemy retreating");
                    }
                }
            });
        }
    }
});

// Handle unit damage events
Events.on(UnitDamageEvent, e => {
    let unit = e.unit;
    let bullet = e.bullet;

    // Skip if unit or bullet is undefined
    if (!unit || !bullet) return;

    // Get damage from the bullet (it's a property, not a function)
    let damage = bullet.damage;
    if (!damage || damage <= 0) return;



    if (!unitMoraleData[unit.id]) {
        initMoraleData(unit);
        return;
    }

    let config = global.getMoraleConfig(unit);
    if (!config) return;

    // Calculate damage percentage
    let damagePercent = damage / unit.maxHealth;



    // Determine attacker for directional damage
    let attacker = null;
    if (bullet.owner && bullet.owner instanceof Unit) {
        attacker = bullet.owner;
    }

    // Calculate morale loss from damage
    let baseLoss = 0;
    if (damagePercent >= DAMAGE_THRESHOLD_LARGE) {
        baseLoss = MORALE_LOSS_LARGE_DAMAGE;
    } else if (damagePercent >= DAMAGE_THRESHOLD_SMALL) {
        baseLoss = MORALE_LOSS_SMALL_DAMAGE;
    }

    // Apply directional multiplier
    if (baseLoss < 0 && attacker) {
        let direction = getDamageDirection(unit, attacker);

        if (direction == "rear") {
            baseLoss *= MORALE_LOSS_REAR_MULTIPLIER;
        } else if (direction == "flank") {
            baseLoss *= MORALE_LOSS_FLANK_MULTIPLIER;
        }
    }

    if (baseLoss != 0) {
        changeMorale(unit, baseLoss, "damage taken");

    }
});

// Handle unit deaths (morale effects on nearby units)
Events.on(UnitDestroyEvent, e => {
    let deadUnit = e.unit;

    // Don't process deaths of excluded units (corpses, dead, wrecks, king)
    if (isUnitExcluded(deadUnit)) {
        // Still clean up morale data if it exists
        if (unitMoraleData[deadUnit.id]) {
            delete unitMoraleData[deadUnit.id];
        }
        return;
    }

    // Track multi-kills for attacker (if applicable)
    // This is handled in damage events already

    // Affect morale of nearby units
    Groups.unit.each(u => {
        if (!unitMoraleData[u.id]) return;

        let config = global.getMoraleConfig(u);
        if (!config) return;

        let dist = u.dst(deadUnit);
        if (dist > config.moraleRadius) return;

        // Friendly killed nearby
        if (u.team == deadUnit.team) {
            changeMorale(u, MORALE_LOSS_FRIENDLY_KILLED, "friendly killed");
        }
        // Enemy killed nearby
        else {
            changeMorale(u, MORALE_GAIN_ENEMY_KILLED, "enemy killed");

            // Track multi-kill
            let data = unitMoraleData[u.id];
            data.recentKills.push(Time.time);

            // Clean old kills
            data.recentKills = data.recentKills.filter(t => Time.time - t < MULTI_KILL_WINDOW);

            // Multi-kill bonus
            if (data.recentKills.length >= MULTI_KILL_THRESHOLD) {
                changeMorale(u, MORALE_GAIN_MULTI_KILL, "multi-kill bonus");
                data.recentKills = []; // Reset
            }
        }
    });

    // Clean up morale data
    if (unitMoraleData[deadUnit.id]) {
        delete unitMoraleData[deadUnit.id];
    }
});

// Update loop for retreat behavior
Events.run(Trigger.update, () => {
    Groups.unit.each(u => {
        if (!unitMoraleData[u.id]) return;

        let data = unitMoraleData[u.id];

        if (data.isRetreating) {
            // Disable weapons (cease fire)
            if (u.isShooting) {
                u.isShooting = false;
            }

            // Continuously clear commands to prevent AI/Player override during retreat
            let ai = u.controller();
            if (ai && ai.clearCommands) {
                // Check if queue is not empty to avoid spamming the method call needlessly?
                // Actually CommandAI.clearCommands() is cheap, just list clear + nulling fields.
                // However, we only need to do it if there IS a command.
                // But there's no easy "hasCommands()" check exposed in JS necessarily without reflection?
                // Safest to just call it. It prevents "flickering" of commands.
                ai.clearCommands();
            }

            // Pathfind to citadel
            if (data.originCitadel && data.originCitadel.isValid()) {
                let citadel = data.originCitadel;

                // Move command toward citadel with speed boost
                if (u.dst(citadel) > CITADEL_PROXIMITY) {
                    // Calculate vector to citadel
                    let vec = Tmp.v1.set(citadel.x - u.x, citadel.y - u.y).nor();
                    // Apply speed boost (1.5x base speed)
                    // We use type.speed directly on the vector scaling to avoid modifying the unit type
                    u.moveAt(vec.scl(u.type.speed * 1.5));

                    // Face the citadel direction
                    u.rotation = vec.angle();
                } else {
                    // At citadel: Stop moving (prevent wandering off)
                    u.vel.set(0, 0);
                    // Optionally force position to stay within radius? 
                    // For now, zero velocity should keep them relatively put unless pushed
                }
            }



            // Spawn retreat effect periodically
            if (Time.time % 60 == 0 && !data.retreatEffectSpawned) {
                spawnRetreatEffect(u);
                data.retreatEffectSpawned = true;
            }

            if (Time.time % 60 == 30) {
                data.retreatEffectSpawned = false;
            }
        }
    });
});


// Export globally
global.unitMoraleData = unitMoraleData;
global.getEffectiveBaseMorale = getEffectiveBaseMorale;

print("[BnB] Morale System loaded.");
