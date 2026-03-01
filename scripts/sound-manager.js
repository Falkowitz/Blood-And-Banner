// plays category-based sounds when selecting/commanding units
// dominant category in selection determines which sound plays
Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");

        const UNIT_CATEGORIES = global.UNIT_CATEGORIES;

        const loadCommandSound = (filename) => {
            try {
                let fi = mod.root.child("sounds").child("command").child(filename);
                if (fi.exists()) {
                    let snd = new Sound(fi);
                    return snd;
                } else {
                    return null;
                }
            } catch (err) {
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

        let prevSelectionSize = 0;

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

        // only play on selection growth (not deselection)
        Events.run(Trigger.unitCommandChange, () => {
            try {
                if (!Vars.state.isGame()) return;

                let input = Vars.control.input;
                let units = input.selectedUnits;
                let currentSize = units.size;

                if (currentSize <= 0 || currentSize <= prevSelectionSize) {
                    prevSelectionSize = currentSize;
                    return;
                }

                prevSelectionSize = currentSize;

                let category = getDominantCategory(units);
                if (!category) {
                    return;
                }

                let sound = CATEGORY_SOUNDS[category];
                if (sound) {
                    let pitch = 0.9 + Math.random() * 0.2;
                    sound.play(1.0, pitch, 0);
                }
            } catch (err) { }
        });

        // move order sound
        Events.run(Trigger.unitCommandPosition, () => {
            try {
                if (!Vars.state.isGame()) return;
                if (orderMoveSound) {
                    let pitch = 0.9 + Math.random() * 0.2;
                    orderMoveSound.play(1.0, pitch, 0);
                }
            } catch (err) { }
        });

        // attack order sound
        Events.run(Trigger.unitCommandAttack, () => {
            try {
                if (!Vars.state.isGame()) return;
                if (orderAttackSound) {
                    let pitch = 0.9 + Math.random() * 0.2;
                    orderAttackSound.play(1.0, pitch, 0);
                }
            } catch (err) { }
        });

        Events.on(EventType.ResetEvent, ev => {
            prevSelectionSize = 0;
        });

    } catch (e) { }
});
