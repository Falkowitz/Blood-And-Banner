// scripts/main.js

//i cant code for shit everything here is made by AI

// Define SystemCursor to avoid ReferenceError
const SystemCursor = Packages.arc.graphics.Cursor.SystemCursor;
const State = Packages.mindustry.core.GameState.State;

Events.on(ClientLoadEvent, e => {
    print("[BnB] Mod script loaded. STARTING MERGED LOGIC...");

    // =========================================================
    // PART 1: TEAM ICONS (Restored from Backup)
    // =========================================================
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

    // =========================================================
    // PART 3: MAIN MENU BACKGROUND (RANDOMIZED)
    // =========================================================
    try {
        const mod = Vars.mods.getMod("bnb");
        const spritesRoot = mod.root.child("sprites");

        // 1. DISCOVER BACKGROUNDS
        let backgrounds = [];

        // Check main-menu.png (Default/Legacy)
        let legacy = spritesRoot.child("main-menu.png");
        if (legacy.exists()) backgrounds.push(legacy);

        // Check main-menu1.png, main-menu2.png, ...
        let index = 1;
        while (true) {
            let f = spritesRoot.child("main-menu" + index + ".png");
            if (f.exists()) {
                backgrounds.push(f);
                index++;
            } else {
                break; // Stop at first missing number
            }
        }

        print("[BnB] Found " + backgrounds.length + " menu backgrounds.");

        if (backgrounds.length > 0) {

            // 2. DEFINE SWAP FUNCTION
            const randomizeBackground = () => {
                try {
                    // Pick random file
                    const bgFile = backgrounds[Math.floor(Math.random() * backgrounds.length)];
                    print("[BnB] Applying background: " + bgFile.name());

                    // Load Texture
                    const tex = new Texture(new Pixmap(bgFile));
                    const region = new TextureRegion(tex);

                    // Find or Create Background Element
                    if (Vars.ui.menuGroup.getChildren().size > 0) {
                        const wrapper = Vars.ui.menuGroup.getChildren().get(0);

                        if (wrapper.getChildren().size > 0) {
                            const firstChild = wrapper.getChildren().get(0);

                            if (firstChild.name == "bnb-bg" && firstChild instanceof Image) {
                                // Already has our background -> Just update Drawable
                                firstChild.setDrawable(region);
                                // Also update scaling just in case
                                firstChild.setScaling(Scaling.fill);
                            } else {
                                // Replace old renderer
                                if (!(firstChild instanceof Image) || firstChild.name != "bnb-bg") {
                                    // Remove the old one if it's the renderer or a plain image from before
                                    firstChild.remove();
                                }

                                const bgImage = new Image(region);
                                bgImage.name = "bnb-bg"; // Tag it
                                bgImage.setFillParent(true);
                                bgImage.setScaling(Scaling.fill);
                                bgImage.touchable = Touchable.disabled;
                                wrapper.addChildAt(0, bgImage);
                                bgImage.toBack();
                            }
                        }
                    }
                } catch (err) {
                    print("[BnB] BG Swap Error: " + err);
                }
            };

            // 3. APPLY ON START
            randomizeBackground();

            // 4. APPLY ON MENU RETURN
            Events.on(StateChangeEvent, e => {
                if (e.to == State.menu) {
                    randomizeBackground();
                }
            });

        } else {
            print("[BnB] Warning: No 'main-menu*.png' files found.");
        }
    } catch (e) {
        print("[BnB] MENU BG ERROR: " + e);
    }
    // =========================================================
    // PART 4: CUSTOM MENU MUSIC PLAYLIST
    // =========================================================
    try {
        const mod = Vars.mods.getMod("bnb");
        // Note: Mindustry usually loads music from "music/" automatically if defined in mod.hjson,
        // but for manual control we look for specific files in the mod zip/folder.
        // We look in "music/main menu/" as requested.
        const musicFolder = mod.root.child("music").child("main menu");

        // 1. DISCOVER MUSIC TRACKS
        let musicTracks = [];

        // Check main-menu1.ogg, main-menu2.ogg, ...
        let mIndex = 1;
        while (true) {
            let f = musicFolder.child("main-menu" + mIndex + ".ogg");
            if (f.exists()) {
                // Load as Music object
                // We shouldn't load *all* into memory at once if they are huge, 
                // but Music objects in Arc streams from disk usually.
                try {
                    let track = new Music(f);
                    musicTracks.push(track);
                    print("[BnB] Loaded music track: " + f.name());
                } catch (err) {
                    print("[BnB] Failed to load track: " + f.name() + " - " + err);
                }
                mIndex++;
            } else {
                break; // Stop at first missing number
            }
        }

        print("[BnB] Found " + musicTracks.length + " custom menu tracks.");

        if (musicTracks.length > 0) {
            // Track our music locally to avoid field issues
            let currentBnbTrack = null;
            let lastBnbTrackIndex = -1;

            // Helper to inspect EVERYTHING once to find the real music fields
            let fieldsPrinted = false;
            const printSoundFields = () => {
                if (fieldsPrinted) return;
                fieldsPrinted = true;
                try {
                    print("[BnB] DEBUG: Inspecting Vars.control.sound...");
                    let clazz = Vars.control.sound.getClass();

                    print("[BnB] DEBUG: FIELDS:");
                    let fields = clazz.getDeclaredFields();
                    for (let i = 0; i < fields.length; i++) {
                        try {
                            fields[i].setAccessible(true);
                            print("[BnB]  - " + fields[i].getName() + " (Type: " + fields[i].getType().getSimpleName() + ")");
                        } catch (e) { }
                    }

                    print("[BnB] DEBUG: METHODS:");
                    let methods = clazz.getDeclaredMethods();
                    for (let i = 0; i < methods.length; i++) {
                        print("[BnB]  - " + methods[i].getName() + "()");
                    }
                } catch (e) {
                    print("[BnB] DEBUG: Failed to inspect sound controller: " + e);
                }
            };

            // Helper to safe-get menuMusic
            const getMenuMusic = () => {
                try {
                    return Vars.control.sound.menuMusic;
                } catch (e) {
                    try {
                        return Reflect.get(Vars.control.sound, "menuMusic");
                    } catch (ex) {
                        printSoundFields(); // Print fields to find the real name
                        return null; // Fail gracefully
                    }
                }
            };

            // Helper to safe-set menuMusic
            const setMenuMusic = (track) => {
                try {
                    Vars.control.sound.menuMusic = track;
                } catch (e) {
                    try {
                        Reflect.set(Vars.control.sound, "menuMusic", track);
                    } catch (ex) {
                        // Suppress
                    }
                }
            };

            // 2. PLAY FUNCTION
            const playRandomMusic = () => {
                try {
                    if (musicTracks.length === 0) return;

                    // Stop current custom if playing
                    if (currentBnbTrack != null) {
                        currentBnbTrack.stop();
                    }

                    // Also try to stop vanilla if we can find it
                    let vanilla = getMenuMusic();
                    if (vanilla != null && vanilla != currentBnbTrack) {
                        try { vanilla.stop(); } catch (e) { }
                    }

                    // Pick random (don't repeat last if possible)
                    let index = Math.floor(Math.random() * musicTracks.length);
                    if (musicTracks.length > 1 && index === lastBnbTrackIndex) {
                        index = (index + 1) % musicTracks.length;
                    }
                    lastBnbTrackIndex = index;
                    let nextTrack = musicTracks[index];

                    // Set as official menu music so the game doesn't try to override it easily
                    setMenuMusic(nextTrack);

                    // Play
                    let vol = Core.settings.getInt("bnb-music-volume", 80) / 100;
                    nextTrack.setVolume(vol);
                    nextTrack.setLooping(false); // We handle looping manually to shuffle
                    nextTrack.play();

                    currentBnbTrack = nextTrack;
                    print("[BnB] Playing menu music: " + nextTrack.toString());

                } catch (err) {
                    print("[BnB] Music Swap Error: " + err);
                }
            };

            // 3. START IMMEDIATELY IF IN MENU
            if (Vars.state.is(State.menu)) {
                // Delay slightly to let game init finish
                Timer.schedule(() => playRandomMusic(), 0.1);
            }

            // 4. TRIGGER ON STATE CHANGE
            Events.on(StateChangeEvent, e => {
                if (e.to == State.menu) {
                    playRandomMusic();
                } else {
                    // STOP music when leaving menu (loading map, etc)
                    if (currentBnbTrack != null) {
                        currentBnbTrack.stop();
                    }
                }
            });

            // 5. AUTO-SHUFFLE & VOLUME SYNC
            let musicErrorCount = 0;
            Timer.schedule(() => {
                if (musicErrorCount > 5) return; // Stop checking if we fail too much

                try {
                    if (Vars.state.is(State.menu)) {
                        // Volume Sync: Update live track volume if setting changes
                        if (currentBnbTrack != null && currentBnbTrack.isPlaying()) {
                            let targetVol = Core.settings.getInt("bnb-music-volume", 80) / 100;
                            if (Math.abs(currentBnbTrack.getVolume() - targetVol) > 0.01) {
                                currentBnbTrack.setVolume(targetVol);
                            }
                        }

                        // Shuffle check
                        // Use our local variable to check playback status
                        // This avoids the "shuffling every second" bug caused by missing field access
                        if (currentBnbTrack == null || !currentBnbTrack.isPlaying()) {
                            print("[BnB] Track finished, shuffling...");
                            playRandomMusic();
                        }
                    }
                } catch (err) {
                    print("[BnB] Playlist Timer Error: " + err);
                    musicErrorCount++;
                }
            }, 1, 1);

            // 6. ADD SETTING SLIDER
            // This adds a slider specifically to the "Sound" tab.
            try {
                if (Vars.ui && Vars.ui.settings && Vars.ui.settings.sound) {
                    Vars.ui.settings.sound.sliderPref("bnb-music-volume", 80, 0, 100, 5, i => i + "%");
                    print("[BnB] Added volume slider to Sound settings.");
                } else {
                    // Fallback to manual discovery if .sound is not directly accessible
                    let settings = Vars.ui.settings;
                    let soundTab = settings.sound || settings.audio;
                    if (soundTab) {
                        soundTab.sliderPref("bnb-music-volume", 80, 0, 100, 5, i => i + "%");
                    }
                }
            } catch (e) {
                print("[BnB] Settings Error: " + e);
            }

        } else {
            print("[BnB] Warning: No 'main-menu*.ogg' files found in music/main menu/");
        }

    } catch (e) {
        print("[BnB] MUSIC SYSTEM ERROR: " + e);
    }
});
