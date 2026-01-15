// scripts/music.js

Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");
        const musicFolder = mod.root.child("music").child("main menu");

        // 1. DISCOVER MUSIC TRACKS
        let musicTracks = [];

        // Check main-menu1.ogg, main-menu2.ogg, ...
        let mIndex = 1;
        while (true) {
            let f = musicFolder.child("main-menu" + mIndex + ".ogg");
            if (f.exists()) {
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
            let currentBnbTrack = null;
            let lastBnbTrackIndex = -1;

            // Helper to get menuMusic
            const getMenuMusic = () => {
                try {
                    return Vars.control.sound.menuMusic;
                } catch (e) {
                    try {
                        return Reflect.get(Vars.control.sound, "menuMusic");
                    } catch (ex) {
                        return null;
                    }
                }
            };

            // Helper to set menuMusic
            const setMenuMusic = (track) => {
                try {
                    Vars.control.sound.menuMusic = track;
                } catch (e) {
                    try {
                        Reflect.set(Vars.control.sound, "menuMusic", track);
                    } catch (ex) { }
                }
            };

            // 2. PLAY FUNCTION
            const playRandomMusic = () => {
                try {
                    if (musicTracks.length === 0) return;

                    // Don't play if in Editor or Planet Map
                    if ((Vars.ui.editor && Vars.ui.editor.isShown()) || (Vars.ui.planet && Vars.ui.planet.isShown())) return;

                    if (currentBnbTrack != null) {
                        currentBnbTrack.stop();
                    }

                    let vanilla = getMenuMusic();
                    if (vanilla != null && vanilla != currentBnbTrack) {
                        try { vanilla.stop(); } catch (e) { }
                    }

                    let index = Math.floor(Math.random() * musicTracks.length);
                    if (musicTracks.length > 1 && index === lastBnbTrackIndex) {
                        index = (index + 1) % musicTracks.length;
                    }
                    lastBnbTrackIndex = index;
                    let nextTrack = musicTracks[index];

                    setMenuMusic(nextTrack);

                    let vol = Core.settings.getInt("bnb-music-volume", 80) / 100;
                    nextTrack.setVolume(vol);
                    nextTrack.setLooping(false);
                    nextTrack.play();

                    currentBnbTrack = nextTrack;
                    print("[BnB] Playing menu music: " + nextTrack.toString());

                } catch (err) {
                    print("[BnB] Music Swap Error: " + err);
                }
            };

            // 3. APPLY ON ENTRY
            let inMenu = false;
            const handleEntry = () => {
                if (inMenu) return;
                inMenu = true;
                playRandomMusic();
            };

            // 4. TRIGGER ON START OR RETURN
            Events.on(StateChangeEvent, e => {
                if (e.to == GameState.State.menu) {
                    handleEntry();
                } else {
                    inMenu = false;
                    if (currentBnbTrack != null) {
                        currentBnbTrack.stop();
                    }
                }
            });

            // Catch initial load
            if (Vars.state.is(GameState.State.menu)) {
                handleEntry();
            }

            // 5. AUTO-SHUFFLE & VOLUME SYNC
            let musicErrorCount = 0;
            Timer.schedule(() => {
                if (musicErrorCount > 5) return;

                try {
                    // Stop music if we are in Editor or Planet selection, even if state is "menu"
                    let shouldStop = (Vars.ui.editor && Vars.ui.editor.isShown()) || (Vars.ui.planet && Vars.ui.planet.isShown());

                    if (Vars.state.is(GameState.State.menu) && !shouldStop) {
                        if (currentBnbTrack != null && currentBnbTrack.isPlaying()) {
                            let targetVol = Core.settings.getInt("bnb-music-volume", 80) / 100;
                            if (Math.abs(currentBnbTrack.getVolume() - targetVol) > 0.01) {
                                currentBnbTrack.setVolume(targetVol);
                            }
                        }

                        // Only shuffle if track stopped
                        if (currentBnbTrack == null || !currentBnbTrack.isPlaying()) {
                            print("[BnB] Track finished, shuffling...");
                            inMenu = false; // Allow handleEntry to run again for the next track
                            handleEntry();
                        }
                    } else if (currentBnbTrack != null && currentBnbTrack.isPlaying()) {
                        currentBnbTrack.stop();
                    }
                } catch (err) {
                    print("[BnB] Playlist Timer Error: " + err);
                    musicErrorCount++;
                }
            }, 1, 1);

            // 6. ADD SETTING SLIDER
            try {
                if (Vars.ui && Vars.ui.settings && Vars.ui.settings.sound) {
                    Vars.ui.settings.sound.sliderPref("bnb-music-volume", 80, 0, 100, 5, i => i + "%");
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
