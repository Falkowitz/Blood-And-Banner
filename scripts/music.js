// music controller with crossfading
// contexts: menu, campaign, rest (in-game idle), combat
// rest: shuffled tracks with 5s silence gap
// combat: triggered by player-team damage, returns to rest after 10s cooldown
Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");

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
                    } catch (err) {
                    }
                    index++;
                } else {
                    break;
                }
            }
            return tracks;
        };

        const menuTracks = loadTracks("main menu", "main-menu");
        const campaignTracks = loadTracks("campaign", "campaign");
        const restTracks = loadTracks("rest", "rest");
        const combatTracks = loadTracks("combat", "combat");

        let currentTrack = null;
        let fadingOutTrack = null;
        let currentContext = "none";

        let lastMenuIndex = -1;
        let lastCampaignIndex = -1;
        let lastRestIndex = -1;
        let lastCombatIndex = -1;

        let currentFadeVol = 0;
        let fadingOutVol = 0;

        let lastDamageTime = 0;
        const COMBAT_COOLDOWN = 10000; // 10s

        let silenceTimer = 0;
        const SILENCE_GAP = 5; // 5s between rest tracks

        const FADE_IN_SPEED = 0.5; // ~2s fade in
        const FADE_OUT_SPEED = 0.5; // ~2s fade out

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

        // starts a track, crossfading from the current one
        const startTrack = (track, loop) => {
            if (!track) return;
            try {
                if (currentTrack) {
                    if (fadingOutTrack) {
                        try { fadingOutTrack.stop(); } catch (e) { }
                    }
                    fadingOutTrack = currentTrack;
                    fadingOutVol = currentFadeVol;
                }

                track.setVolume(0);
                track.setLooping(loop);
                track.play();

                currentTrack = track;
                currentFadeVol = 0;
            } catch (e) { }
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

        // track player-team damage for combat music
        Events.on(EventType.UnitDamageEvent, e => {
            try {
                if ((e.unit && e.unit.team === Vars.player.team()) ||
                    (e.bullet && e.bullet.team === Vars.player.team())) {
                    lastDamageTime = Time.millis();
                }
            } catch (err) { }
        });

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

        // context check runs every 0.1s
        Timer.schedule(() => {
            try {
                let desiredContext = determineContext();

                let contextChanged = false;
                if (desiredContext !== currentContext) {
                    currentContext = desiredContext;
                    silenceTimer = 0;
                    contextChanged = true;

                    if (currentContext === "none") {
                        stopAllMusic();
                    }
                }

                stopVanillaMenuMusic();

                if (currentContext === "none") return;

                let needsTrack = (currentTrack === null || !currentTrack.isPlaying() || contextChanged);

                if (needsTrack) {
                    if (currentContext === "menu") {
                        lastMenuIndex = startRandomFromPlaylist(menuTracks, lastMenuIndex, false);
                    }
                    else if (currentContext === "campaign") {
                        lastCampaignIndex = startRandomFromPlaylist(campaignTracks, lastCampaignIndex, false);
                    }
                    else if (currentContext === "rest") {
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

            } catch (err) { }
        }, 0.5, 0.1);

        // fade volume every frame
        Events.run(Trigger.update, () => {
            try {
                let delta = Time.delta / 60;
                let masterVol = getVolume();

                // fade in current track
                if (currentTrack && currentTrack.isPlaying()) {
                    if (currentFadeVol < 1.0) {
                        currentFadeVol = Math.min(1.0, currentFadeVol + FADE_IN_SPEED * delta);
                    }
                    currentTrack.setVolume(currentFadeVol * masterVol);
                } else {
                    if (currentTrack && !currentTrack.isPlaying()) {
                        currentTrack = null;
                        currentFadeVol = 0;
                        if (currentContext === "rest") {
                            silenceTimer = SILENCE_GAP;
                        }
                    }
                }

                // fade out old track
                if (fadingOutTrack) {
                    if (fadingOutTrack.isPlaying()) {
                        if (fadingOutVol > 0) {
                            fadingOutVol = Math.max(0, fadingOutVol - FADE_OUT_SPEED * delta);
                            fadingOutTrack.setVolume(fadingOutVol * masterVol);
                        } else {
                            fadingOutTrack.stop();
                            fadingOutTrack = null;
                            fadingOutVol = 0;
                        }
                    } else {
                        fadingOutTrack = null;
                        fadingOutVol = 0;
                    }
                }

            } catch (err) { }
        });

        // volume slider in settings
        try {
            if (Vars.ui && Vars.ui.settings && Vars.ui.settings.sound) {
                Vars.ui.settings.sound.sliderPref("blood-and-banner-volume", 80, 0, 100, 5, i => i + "%");
            }
        } catch (e) { }

    } catch (e) { }
});
