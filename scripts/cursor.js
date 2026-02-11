// scripts/cursor.js

Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");
        const cursorsDir = mod.root.child("sprites").child("cursors");

        const loadCursor = (filename) => {
            let file = cursorsDir.child(filename);
            if (!file.exists()) return null;
            let pm = new Pixmap(file);
            return Core.graphics.newCursor(pm, pm.width / 2, pm.height / 2);
        };

        // Set game specific cursors
        let drill = loadCursor("bnb-drill.png");
        if (drill) Vars.ui.drillCursor = drill;

        let unload = loadCursor("bnb-unload.png");
        if (unload) Vars.ui.unloadCursor = unload;

        let target = loadCursor("bnb-target.png");
        if (target) Vars.ui.targetCursor = target;

        let repair = loadCursor("bnb-repair.png");
        if (repair) Vars.ui.repairCursor = repair;

        // Override system cursors (arrow, hand, ibeam)
        let main = loadCursor("bnb-cursor.png");
        let hand = loadCursor("bnb-hand.png");
        let ibeam = loadCursor("bnb-ibeam.png");

        if (main) Graphics.Cursor.SystemCursor.arrow.set(main);
        if (hand) Graphics.Cursor.SystemCursor.hand.set(hand);
        if (ibeam) Graphics.Cursor.SystemCursor.ibeam.set(ibeam);

        print("[BnB] Cursors initialized via SystemCursor.set()");

    } catch (err) {
        print("[BnB] Cursor system error: " + err);
    }
});
