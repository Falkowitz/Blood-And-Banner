
// scripts/morale-config.js
// Unified morale configuration for all combat units

// Morale configuration structure:
// {
//     baseMorale: Starting morale value
//     retreatThreshold: Morale level at which unit retreats
//     moraleRadius: Detection radius for nearby events (in world units)
// }

const MORALE_CONFIG = {
    "bnb-unit-spearmen": {
        baseMorale: 100,
        retreatThreshold: 30,
        moraleRadius: 64
    },
    "bnb-unit-swordsmen": {
        baseMorale: 100,
        retreatThreshold: 30,
        moraleRadius: 64
    },
    "bnb-unit-bowmen": {
        baseMorale: 80,
        retreatThreshold: 25,
        moraleRadius: 72
    },
    "bnb-unit-fire-bowmen": {
        baseMorale: 85,
        retreatThreshold: 25,
        moraleRadius: 72
    },
    "bnb-unit-cavalrymen": {
        baseMorale: 110,
        retreatThreshold: 35,
        moraleRadius: 80
    },
    "bnb-unit-cuirassiers": {
        baseMorale: 120,
        retreatThreshold: 40,
        moraleRadius: 80
    },
    "bnb-unit-lancers": {
        baseMorale: 115,
        retreatThreshold: 35,
        moraleRadius: 80
    },
    "bnb-unit-shieldmen": {
        baseMorale: 130,
        retreatThreshold: 45,
        moraleRadius: 64
    },
    "bnb-unit-militiamen": {
        baseMorale: 60,
        retreatThreshold: 20,
        moraleRadius: 56
    },
    "bnb-unit-attack-colonel": {
        baseMorale: 150,
        retreatThreshold: 50,
        moraleRadius: 96
    },
    "bnb-unit-defence-colonel": {
        baseMorale: 160,
        retreatThreshold: 55,
        moraleRadius: 96
    },
    "bnb-unit-maneuver-colonel": {
        baseMorale: 140,
        retreatThreshold: 45,
        moraleRadius: 96
    },
    "bnb-unit-universal-colonel": {
        baseMorale: 155,
        retreatThreshold: 50,
        moraleRadius: 96
    },
    "bnb-unit-siege-catapult": {
        baseMorale: 70,
        retreatThreshold: 20,
        moraleRadius: 48
    },
    "bnb-unit-siege-ballista": {
        baseMorale: 75,
        retreatThreshold: 20,
        moraleRadius: 48
    },
    "bnb-unit-ship-galley": {
        baseMorale: 90,
        retreatThreshold: 30,
        moraleRadius: 80
    },
    "bnb-unit-musketmen": {
        baseMorale: 95,
        retreatThreshold: 30,
        moraleRadius: 64
    },
    "bnb-unit-shield": {
        baseMorale: 130,
        retreatThreshold: 45,
        moraleRadius: 64
    }
};

// Helper function to get morale config for a unit
function getMoraleConfig(unit) {
    if (!unit || !unit.type) return null;

    let config = MORALE_CONFIG[unit.type.name];

    if (!config) {
        // print("[BnB-Morale] No morale config for: " + unit.type.name);
        return null;
    }

    return config;
}

// Export globally
global.MORALE_CONFIG = MORALE_CONFIG;
global.getMoraleConfig = getMoraleConfig;

print("[BnB] Morale Configuration loaded.");
