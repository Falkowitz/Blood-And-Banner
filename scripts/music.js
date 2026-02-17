// scripts/music.js

// Unified Music Controller for Main Menu, Campaign, Rest (in-game idle), and Combat music.
// Contexts: "menu", "campaign", "rest", "combat", "none"
// - Rest music plays on maps when no recent damage. Shuffled, 5s silence gap, fade in/out.
// - Combat music plays immediately when player-team units take damage, while rest music fades out (crossfade).
// - Returns to rest after 10 seconds of no damage (crossfade).

Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");

        // ========== TRACK LOADER ==========
        const loadTracks = (subfolder, prefix) => {
            let tracks = [];
            let folder = mod.root.child("music").child(subfolder);
            let index = 1;
            while (true) {
                let f = folder.child(prefix + index + ".ogg");
                if (f.exists()) {
                    try {
                        let track = new Music(f);
                        tracks.push(track);
                        print("[BnB Music] Loaded " + subfolder + " track: " + f.name());
                    } catch (err) {
                        print("[BnB Music] ERROR loading track: " + f.name() + " - " + err);
                    }
                    index++;
                } else {
                    break;
                }
            }
            return tracks;
        };

        // ========== LOAD ALL PLAYLISTS ==========
        const menuTracks = loadTracks("main menu", "main-menu");
        const campaignTracks = loadTracks("campaign", "campaign");
        const restTracks = loadTracks("rest", "rest");
        const combatTracks = loadTracks("combat", "combat");

        print("[BnB Music] Loaded: " + menuTracks.length + " menu, " + campaignTracks.length + " campaign, " +
            restTracks.length + " rest, " + combatTracks.length + " combat tracks.");

        // ========== STATE ==========
        let currentTrack = null;          // The "new" track fading in / playing
        let fadingOutTrack = null;        // The "old" track fading out

        let currentContext = "none";      // "menu", "campaign", "rest", "combat", "none"

        let lastMenuIndex = -1;
        let lastCampaignIndex = -1;
        let lastRestIndex = -1;
        let lastCombatIndex = -1;

        // Fade state
        let currentFadeVol = 0;           // Volume multiplier for currentTrack (0..1)
        let fadingOutVol = 0;             // Volume multiplier for fadingOutTrack (0..1)

        // Combat timing
        let lastDamageTime = 0;           // Time.millis() of last player-team damage
        const COMBAT_COOLDOWN = 10000;    // 10 seconds in ms

        // Rest silence gap
        let silenceTimer = 0;             // Countdown in seconds for silence between rest tracks
        const SILENCE_GAP = 5;            // 5 seconds silence between rest tracks

        // Fade speeds (per second)
        const FADE_IN_SPEED = 0.5;        // ~2 seconds to fade in
        const FADE_OUT_SPEED = 0.5;       // ~2 seconds to fade out

        // ========== HELPERS ==========

        const getVolume = () => Core.settings.getInt("blood-and-banner-volume", 80) / 100;

        const stopVanillaMenuMusic = () => {
            try {
                let vanilla = Vars.control.sound.menuMusic;
                if (vanilla) vanilla.stop();
            } catch (e) { }
        };

        const pickRandomIndex = (playlist, lastIndex) => {
            if (playlist.length === 0) return -1;
            let index = Math.floor(Math.random() * playlist.length);
            if (playlist.length > 1 && index === lastIndex) {
                index = (index + 1) % playlist.length;
            }
            return index;
        };

        const startTrack = (track, loop) => {
            if (!track) return;
            try {
                // If we are already playing a track, move it to fadingOutTrack
                if (currentTrack) {
                    if (fadingOutTrack) {
                        try { fadingOutTrack.stop(); } catch (e) { }
                    }
                    fadingOutTrack = currentTrack;
                    fadingOutVol = currentFadeVol; // Start fading from where it was
                    print("[BnB Music] Moving current track to fading background");
                }

                // Setup new track
                track.setVolume(0); // Start silent, fade in
                track.setLooping(loop);
                track.play();

                currentTrack = track;
                currentFadeVol = 0; // Reset fade in
                print("[BnB Music] Started new track in context '" + currentContext + "'");
            } catch (e) {
                print("[BnB Music] ERROR starting track: " + e);
            }
        };

        const startRandomFromPlaylist = (playlist, lastIndex, loop) => {
            let idx = pickRandomIndex(playlist, lastIndex);
            if (idx < 0) return -1;
            startTrack(playlist[idx], loop);
            return idx;
        };

        const stopAllMusic = () => {
            if (currentTrack) { try { currentTrack.stop(); } catch (e) { } currentTrack = null; }
            if (fadingOutTrack) { try { fadingOutTrack.stop(); } catch (e) { } fadingOutTrack = null; }
            currentFadeVol = 0;
            fadingOutVol = 0;
            silenceTimer = 0;
        };

        // ========== DAMAGE LISTENER ==========
        Events.on(EventType.UnitDamageEvent, e => {
            try {
                // Trigger if player's team units take damage OR deal damage
                if ((e.unit && e.unit.team === Vars.player.team()) ||
                    (e.bullet && e.bullet.team === Vars.player.team())) {
                    lastDamageTime = Time.millis();
                }
            } catch (err) { }
        });

        // ========== CONTEXT DETERMINATION ==========
        const determineContext = () => {
            if (Vars.state.is(GameState.State.menu)) {
                if (Vars.ui.planet && Vars.ui.planet.isShown()) return "campaign";
                if (Vars.ui.editor && Vars.ui.editor.isShown()) return "none";
                return "menu";
            }
            if (Vars.state.isGame()) {
                let timeSinceDamage = Time.millis() - lastDamageTime;
                if (lastDamageTime > 0 && timeSinceDamage < COMBAT_COOLDOWN) return "combat";
                return "rest";
            }
            return "none";
        };

        // ========== MAIN LOOP (runs every 0.1 seconds) ==========
        Timer.schedule(() => {
            try {
                let desiredContext = determineContext();

                // --- Context Transition ---
                let contextChanged = false;
                if (desiredContext !== currentContext) {
                    print("[BnB Music] Context switch: " + currentContext + " -> " + desiredContext);
                    currentContext = desiredContext;
                    silenceTimer = 0;
                    contextChanged = true;

                    // Note: We don't forcibly stop music here. We let the "Playback Management" section
                    // start the new track, which triggers the crossfade in startTrack().
                    // EXCEPT if going to "none", where we want to stop everything.
                    if (currentContext === "none") {
                        stopAllMusic();
                    }
                }

                // --- Playback Management ---
                stopVanillaMenuMusic();

                if (currentContext === "none") return;

                // Check if we need to start a NEW track
                // A new track is needed if currentTrack is null OR if it finished playing
                // OR if context just changed (so we want that context's music immediately)
                let needsTrack = (currentTrack === null || !currentTrack.isPlaying() || contextChanged);

                if (needsTrack) {
                    // Logic for starting tracks based on context
                    if (currentContext === "menu") {
                        lastMenuIndex = startRandomFromPlaylist(menuTracks, lastMenuIndex, false);
                    }
                    else if (currentContext === "campaign") {
                        lastCampaignIndex = startRandomFromPlaylist(campaignTracks, lastCampaignIndex, false);
                    }
                    else if (currentContext === "rest") {
                        // Silence gap between rest tracks
                        if (silenceTimer > 0) {
                            silenceTimer -= 0.1;
                            return;
                        }
                        if (restTracks.length > 0) {
                            lastRestIndex = startRandomFromPlaylist(restTracks, lastRestIndex, false);
                        }
                    }
                    else if (currentContext === "combat") {
                        if (combatTracks.length > 0) {
                            lastCombatIndex = startRandomFromPlaylist(combatTracks, lastCombatIndex, false);
                        }
                    }
                }

            } catch (err) {
                print("[BnB Music] Main loop error: " + err);
            }
        }, 0.5, 0.1);

        // ========== FADE & VOLUME LOOP (runs every frame) ==========
        Events.run(Trigger.update, () => {
            try {
                let delta = Time.delta / 60; // Seconds passed
                let masterVol = getVolume();

                // 1. Handle current track (Fade In)
                if (currentTrack && currentTrack.isPlaying()) {
                    if (currentFadeVol < 1.0) {
                        currentFadeVol = Math.min(1.0, currentFadeVol + FADE_IN_SPEED * delta);
                    }
                    currentTrack.setVolume(currentFadeVol * masterVol);
                } else {
                    // If current track stopped naturally (e.g. end of song), handle silence gap for Rest
                    if (currentTrack && !currentTrack.isPlaying()) {
                        currentTrack = null;
                        currentFadeVol = 0;
                        if (currentContext === "rest") {
                            silenceTimer = SILENCE_GAP;
                            print("[BnB Music] Rest track finished. Waiting " + SILENCE_GAP + "s.");
                        }
                    }
                }

                // 2. Handle old track (Fade Out)
                if (fadingOutTrack) {
                    if (fadingOutTrack.isPlaying()) {
                        if (fadingOutVol > 0) {
                            fadingOutVol = Math.max(0, fadingOutVol - FADE_OUT_SPEED * delta);
                            fadingOutTrack.setVolume(fadingOutVol * masterVol);
                        } else {
                            // Volume hit 0, stop it
                            fadingOutTrack.stop();
                            fadingOutTrack = null;
                            fadingOutVol = 0;
                            print("[BnB Music] Old track finished fade out.");
                        }
                    } else {
                        // Stopped on its own? Clean up.
                        fadingOutTrack = null;
                        fadingOutVol = 0;
                    }
                }

            } catch (err) { }
        });

        // ========== SETTINGS ==========
        try {
            if (Vars.ui && Vars.ui.settings && Vars.ui.settings.sound) {
                Vars.ui.settings.sound.sliderPref("blood-and-banner-volume", 80, 0, 100, 5, i => i + "%");
            }
        } catch (e) {
            print("[BnB Music] Settings error: " + e);
        }

    } catch (e) {
        print("[BnB Music] CRITICAL FAILURE: " + e);
    }
});
