// scripts/main.js

// Define SystemCursor to avoid ReferenceError
const SystemCursor = Packages.arc.graphics.Cursor.SystemCursor;

Events.on(ClientLoadEvent, e => {
    print("[BnB] Mod script loaded. STARTING MERGED LOGIC...");

    // =========================================================
    // PART 1: TEAM ICONS (Restored from Backup)
    // =========================================================
    // --- TEAM ICONS LOGIC ---
    let startUnicode = 0xF950;
    const replacements = [
        { team: Team.sharded, name: "bnb-sharded", sprite: "team-sharded" },
        { team: Team.crux, name: "bnb-crux", sprite: "team-crux" },
        { team: Team.malis, name: "bnb-malis", sprite: "team-malis" },
        { team: Team.green, name: "bnb-green", sprite: "team-green" },
        { team: Team.blue, name: "bnb-blue", sprite: "team-blue" }
    ];

    replacements.forEach((entry, index) => {
        let regionName = "bnb-" + entry.sprite;
        let region = Core.atlas.find(regionName);
        let unicode = startUnicode + index;

        if (region.found()) {
            try {
                Fonts.registerIcon(entry.name, regionName, unicode, region);
                entry.team.emoji = String.fromCharCode(unicode);
                print("[BnB] Replaced team emoji: " + entry.team.name);
            } catch (err) {
                print("[BnB] Error processing " + entry.team.name + ": " + err);
            }
        }
    });

    // =========================================================
    // PART 2: THE CURSOR (AGGRESSIVE HARDWARE RESET + TIMER)
    // =========================================================
    try {
        const mod = Vars.mods.getMod("bnb");
        const cursorsFolder = mod.root.child("sprites").child("cursors");
        const mainCursorFile = cursorsFolder.child("bnb-cursor.png");

        if (mainCursorFile.exists()) {
            // Load Pixmap directly (Robust)
            const pixmap = new Pixmap(mainCursorFile);
            const mainCursor = Core.graphics.newCursor(pixmap, 32, 32); // Centered hotspot assumption

            // 1. Force override UI fields
            Vars.ui.drillCursor = mainCursor;
            Vars.ui.unloadCursor = mainCursor;
            Vars.ui.targetCursor = mainCursor;
            Vars.ui.repairCursor = mainCursor;

            // 2. The Enforcer Function
            const forceCursor = () => {
                Core.graphics.cursor(mainCursor);
            };

            // 3. Trigger Bombardment
            // Run at start of frame
            Events.run(Trigger.update, forceCursor);
            // Run mid-frame
            Events.run(Trigger.draw, forceCursor);
            // Run end-frame
            Events.run(Trigger.postDraw, forceCursor);
            // Run after UI draw
            Events.run(Trigger.uiDrawEnd, forceCursor);

            // 4. Asynchronous Timer (The Flicker Killer)
            // Re-apply every 10ms to catch any gaps between frames
            Timer.schedule(forceCursor, 0, 0.01);

            // Map Load Backup
            Events.on(EventType.WorldLoadEvent, e => {
                Timer.schedule(forceCursor, 0.1);
                // Re-start timer cycle just in case
                Timer.schedule(forceCursor, 0, 0.01);
            });

            print("[BnB] AGGRESSIVE CURSOR MODE ACTIVE. Timers firing.");

        } else {
            print("[BnB] Error: 'bnb-cursor.png' not found!");
        }

    } catch (err) {
        print("[BnB] CURSOR ERROR: " + err);
    }

    // =========================================================
    // PART 3: MAIN MENU BACKGROUND REPLACEMENT
    // =========================================================
    try {
        const mod = Vars.mods.getMod("bnb");
        const mmFile = mod.root.child("sprites").child("main-menu.png");

        if (mmFile.exists()) {
            print("[BnB] Loading Main Menu background...");
            const tex = new Texture(new Pixmap(mmFile));
            const region = new TextureRegion(tex);
            const bgImage = new Image(region);
            bgImage.setFillParent(true);
            bgImage.setScaling(Scaling.fill);
            bgImage.touchable = Touchable.disabled; // Don't block clicks

            // Swap in the UI
            if (Vars.ui.menuGroup.getChildren().size > 0) {
                // The wrapper WidgetGroup created by MenuFragment is the 1st child
                const wrapper = Vars.ui.menuGroup.getChildren().get(0);

                // The Background Element (renderer) is usually the 1st child of the wrapper
                if (wrapper.getChildren().size > 0) {
                    const oldBg = wrapper.getChildren().get(0);

                    // Safety check: Don't replace if already an image (reload protection)
                    // But we might want to replace if updating texture?
                    // Let's replace only if it's NOT our image (or force it).

                    if (oldBg instanceof Image) {
                        // Likely ours from previous reload
                        oldBg.remove();
                    } else {
                        // Likely the original Renderer element
                        oldBg.remove();
                    }

                    // Add new background at index 0 (Behind everything else)
                    wrapper.addChildAt(0, bgImage);
                    bgImage.toBack(); // Double ensure logic

                    print("[BnB] Main Menu Background replaced successfully.");
                }
            }
        } else {
            print("[BnB] Warning: sprites/main-menu.png not found.");
        }
    } catch (e) {
        print("[BnB] MENU BG ERROR: " + e);
    }
});
