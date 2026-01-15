// scripts/cursor.js

Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");
        const cursorsFolder = mod.root.child("sprites").child("cursors");
        const mainCursorFile = cursorsFolder.child("bnb-cursor.png");

        if (mainCursorFile.exists()) {
            const pixmap = new Pixmap(mainCursorFile);
            const mainCursor = Core.graphics.newCursor(pixmap, 32, 32);

            Vars.ui.drillCursor = mainCursor;
            Vars.ui.unloadCursor = mainCursor;
            Vars.ui.targetCursor = mainCursor;
            Vars.ui.repairCursor = mainCursor;

            const forceCursor = () => {
                Core.graphics.cursor(mainCursor);
            };

            Events.run(Trigger.update, forceCursor);
            Events.run(Trigger.draw, forceCursor);
            Events.run(Trigger.postDraw, forceCursor);
            Events.run(Trigger.uiDrawEnd, forceCursor);
            Timer.schedule(forceCursor, 0, 0.01);

            Events.on(EventType.WorldLoadEvent, e => {
                Timer.schedule(forceCursor, 0.1);
                Timer.schedule(forceCursor, 0, 0.01);
            });

            print("[BnB] AGGRESSIVE CURSOR MODE ACTIVE. Timers firing.");

        } else {
            print("[BnB] Error: 'bnb-cursor.png' not found!");
        }

    } catch (err) {
        print("[BnB] CURSOR ERROR: " + err);
    }
});
