// scripts/sound-manager.js

/**
 * Sound Manager — Command Mode Selection & Order Sounds
 *
 * Plays category-based audio when units are selected/commanded in RTS mode.
 * Categories: infantry, cavalry, siege.
 * On multi-select, only the dominant category's sound plays (no clutter).
 *
 * To add a new unit: add its full name (with mod prefix) to UNIT_CATEGORIES below.
 * To add a new category: add a new sound entry in CATEGORY_SOUNDS and map units to it.
 */

Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");

        // ========== UNIT → CATEGORY MAP (defined in team-constants.js) ==========
        const UNIT_CATEGORIES = global.UNIT_CATEGORIES;

        // ========== LOAD SOUNDS ==========
        const loadCommandSound = (filename) => {
            try {
                let fi = mod.root.child("sounds").child("command").child(filename);
                if (fi.exists()) {
                    let snd = new Sound(fi);
                    print("[BnB Sound] Loaded command sound: " + filename);
                    return snd;
                } else {
                    print("[BnB Sound] WARNING: Sound file not found: sounds/command/" + filename);
                    return null;
                }
            } catch (err) {
                print("[BnB Sound] ERROR loading sound " + filename + ": " + err);
                return null;
            }
        };

        const CATEGORY_SOUNDS = {
            "infantry": loadCommandSound("infantry-select.ogg"),
            "cavalry": loadCommandSound("cavalry-select.ogg"),
            "siege": loadCommandSound("siege-select.ogg"),
        };

        const orderMoveSound = loadCommandSound("order-move.ogg");
        const orderAttackSound = loadCommandSound("order-attack.ogg");

        // ========== STATE ==========
        let prevSelectionSize = 0;  // Track previous selection count to detect changes

        // ========== HELPER: determine dominant category ==========
        const getDominantCategory = (units) => {
            let counts = {};
            for (let i = 0; i < units.size; i++) {
                let unit = units.get(i);
                if (!unit || !unit.type) continue;
                let category = UNIT_CATEGORIES[unit.type.name];
                if (category) {
                    counts[category] = (counts[category] || 0) + 1;
                }
            }

            let bestCategory = null;
            let bestCount = 0;
            for (let cat in counts) {
                if (counts[cat] > bestCount) {
                    bestCount = counts[cat];
                    bestCategory = cat;
                }
            }
            return bestCategory;
        };

        // ========== SELECTION SOUND (fires on every selection change) ==========
        Events.run(Trigger.unitCommandChange, () => {
            try {
                if (!Vars.state.isGame()) return;

                let input = Vars.control.input;
                let units = input.selectedUnits;
                let currentSize = units.size;

                // Only play sound when selection grows (new units added)
                // Skip when units are deselected or selection is cleared
                if (currentSize <= 0 || currentSize <= prevSelectionSize) {
                    prevSelectionSize = currentSize;
                    return;
                }

                prevSelectionSize = currentSize;

                let category = getDominantCategory(units);
                if (!category) {
                    print("[BnB Sound] No category found for selected units");
                    return;
                }

                let sound = CATEGORY_SOUNDS[category];
                if (sound) {
                    let pitch = 0.9 + Math.random() * 0.2; // slight variation
                    sound.play(1.0, pitch, 0);
                    print("[BnB Sound] Played " + category + "-select (units: " + currentSize + ", pitch: " + pitch.toFixed(2) + ")");
                }
            } catch (err) {
                print("[BnB Sound] Selection listener error: " + err);
            }
        });

        // ========== ORDER SOUNDS ==========
        Events.run(Trigger.unitCommandPosition, () => {
            try {
                if (!Vars.state.isGame()) return;
                if (orderMoveSound) {
                    let pitch = 0.9 + Math.random() * 0.2;
                    orderMoveSound.play(1.0, pitch, 0);
                    print("[BnB Sound] Played order-move");
                }
            } catch (err) {
                print("[BnB Sound] Move order error: " + err);
            }
        });

        Events.run(Trigger.unitCommandAttack, () => {
            try {
                if (!Vars.state.isGame()) return;
                if (orderAttackSound) {
                    let pitch = 0.9 + Math.random() * 0.2;
                    orderAttackSound.play(1.0, pitch, 0);
                    print("[BnB Sound] Played order-attack");
                }
            } catch (err) {
                print("[BnB Sound] Attack order error: " + err);
            }
        });

        // ========== RESET on game exit ==========
        Events.on(EventType.ResetEvent, ev => {
            prevSelectionSize = 0;
        });

        print("[BnB Sound] Sound manager initialized. " +
            Object.keys(UNIT_CATEGORIES).length + " units mapped across " +
            Object.keys(CATEGORY_SOUNDS).length + " categories.");

    } catch (e) {
        print("[BnB Sound] CRITICAL FAILURE: " + e);
    }
});
