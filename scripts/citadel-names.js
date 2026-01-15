// scripts/citadel-names.js
var citadel_history_storage = {};


var CitadelNames = {
    // Team -> Names list
    namePools: (function () {
        let pools = {};
        pools[Team.blue.id] = ["Montreval", "Belvierre", "Chaslor", "Clairmont", "Rocheval", "Villenor", "Fontrev", "Valcour", "Grevaux", "Arvelin"];
        pools[Team.crux.id] = ["Redmere", "Kingsfall", "Stonewyn", "Blackford", "Ashwick", "Dunmere", "Crowhaven", "Westwyk", "Oakmere", "Highfen"];
        pools[Team.green.id] = ["Turqen", "Qashir", "Sarqan", "Hisqal", "Altisar", "Balqen", "Orqis", "Yalqar", "Darqem", "Selqar"];
        pools[Team.sharded.id] = ["Alcastor", "Montelar", "Valcoro", "Torvella", "Almarin", "Castriel", "Velasco", "Dornaval", "Calveron", "Santora"];
        pools[Team.malis.id] = ["Basilor", "Chrydon", "Kallion", "Andrya", "Nikarion", "Theskar", "Paledon", "Asteron", "Myrados", "Koravel"];
        return pools;
    })(),

    // Team -> HEX Colors
    teamColors: (function () {
        let colors = {};
        colors[Team.blue.id] = "[#6c87fd]";
        colors[Team.crux.id] = "[#f25555]";
        colors[Team.green.id] = "[#54d67d]";
        colors[Team.sharded.id] = "[#ffd37f]";
        colors[Team.malis.id] = "[#a27ce5]";
        return colors;
    })(),

    getHistory() {
        return citadel_history_storage;
    },

    reset() {
        print("[BnB] Wiping Citadel history for a fresh match...");
        citadel_history_storage = {};
    },

    getName(teamId) {
        let pool = this.namePools[teamId] || [];
        if (pool.length === 0) return "Citadel";

        let history = this.getHistory();
        let used = [];
        for (let key in history) {
            let data = history[key];
            if (data.history[teamId]) {
                used.push(data.history[teamId]);
            }
        }

        let available = pool.filter(n => !used.includes(n));
        if (available.length === 0) return pool[Math.floor(Math.random() * pool.length)];
        return available[Math.floor(Math.random() * available.length)];
    },

    assign(tile) {
        if (!tile || !tile.build) return;
        let build = tile.build;
        if (!build.block.name.includes("citadel")) return;

        let history = this.getHistory();
        let key = Math.floor(build.tile.x) + "," + Math.floor(build.tile.y);
        let teamId = build.team.id;

        if (!history[key]) {
            // Truly new Citadel
            let name = this.getName(teamId);
            history[key] = {
                history: {},
                x: build.tile.x,
                y: build.tile.y
            };
            history[key].history[teamId] = name;
            print("[BnB] First assignment for Citadel at " + key + ": '" + name + "' (Team " + teamId + ")");
        } else {
            // Existing Citadel, just check if this team has a name for it
            let data = history[key];
            if (!data.history[teamId]) {
                let name = this.getName(teamId);
                data.history[teamId] = name;
                print("[BnB] New name assigned to known Citadel at " + key + " for Team " + teamId + ": '" + name + "'");
            } else {
                print("[BnB] Persistent name restored for Citadel at " + key + " (Team " + teamId + "): '" + data.history[teamId] + "'");
            }
        }
    },

    scanWorld() {
        print("[BnB] Scanning world for Citadels...");
        this.reset();
        Groups.build.each(build => {
            if (build.block.name.includes("citadel") && build.tile === build.tile) {
                this.assign(build.tile);
            }
        });
        print("[BnB] Found " + Object.keys(this.getHistory()).length + " Citadels.");
    }
};

// Capture Notifications - integrated for direct storage access
var CaptureNotifications = {
    lastNotification: null,

    templates: [
        "{team} has captured {name}",
        "{team} has taken control of {name}",
        "{team} now controls {name}",
        "{team} has secured {name}",
        "{name} is captured by {team}",
        "{name} has been captured by {team}",
        "{name} is now controlled by {team}",
        "{name} is now held by {team}"
    ],

    teamNames: (function () {
        let names = {};
        names[Team.crux.id] = "Redwyn";
        names[Team.blue.id] = "Valdier";
        names[Team.green.id] = "Turqis";
        names[Team.sharded.id] = "Hispalis";
        names[Team.malis.id] = "Basilaeum";
        return names;
    })(),

    teamColors: (function () {
        let colors = {};
        colors[Team.blue.id] = Color.valueOf("6c87fd");
        colors[Team.crux.id] = Color.valueOf("f25555");
        colors[Team.green.id] = Color.valueOf("54d67d");
        colors[Team.sharded.id] = Color.valueOf("ffd37f");
        colors[Team.malis.id] = Color.valueOf("a27ce5");
        return colors;
    })(),

    show(build, citadelName) {
        if (!build || !build.block || !build.block.name.includes("citadel")) return;

        let x = Math.floor(build.tile.x);
        let y = Math.floor(build.tile.y);
        let key = x + "," + y;

        // Use provided name, or look up from history
        let name = citadelName;
        if (!name && citadel_history_storage[key]) {
            let data = citadel_history_storage[key];
            name = data.history[build.team.id] || "the citadel";
        }
        if (!name) name = "the citadel";

        let teamId = build.team.id;
        let factionName = (this.teamNames[teamId] || build.team.name).toUpperCase();
        let teamColor = this.teamColors[teamId] || Color.white;

        let template = this.templates[Math.floor(Math.random() * this.templates.length)];
        let message = template
            .replace("{team}", factionName)
            .replace("{name}", name);

        // Remove previous notification
        if (this.lastNotification != null) {
            this.lastNotification.remove();
        }

        // Create notification table
        let table = new Table(Styles.black3);
        table.margin(12);

        let label = table.add(message).get();
        label.setStyle(Styles.outlineLabel);
        label.setFontScale(1.3);
        label.setColor(teamColor);

        table.pack();

        // Position below Frontline UI (lowered by 1px more)
        table.update(() => {
            if (Vars.state.isMenu()) {
                table.remove();
                return;
            }

            let shift = 100;
            let coreInfo = Vars.ui.hudGroup.find("coreinfo");
            let frontlineUI = Vars.ui.hudGroup.find("bnb-frontline-ui");

            if (coreInfo != null) {
                let inner = coreInfo.getChildren().get(0);
                shift = (inner ? inner.getPrefHeight() : coreInfo.getPrefHeight());

                if (frontlineUI != null) {
                    let flInner = frontlineUI.getChildren().get(0);
                    shift += (flInner ? flInner.getPrefHeight() : frontlineUI.getPrefHeight()) + 22; // Increased from 21 to 22
                }
            }

            table.setPosition(Core.graphics.getWidth() / 2, Core.graphics.getHeight() - shift - 10, Align.top);
        });

        // Fade in 1s, stay 5s, fade out 1s
        table.color.a = 0;
        table.actions(
            Actions.fadeIn(1, Interp.smooth),
            Actions.delay(5),
            Actions.fadeOut(1, Interp.smooth),
            Actions.remove()
        );

        Core.scene.add(table);
        this.lastNotification = table;
    }
};

// --- Event Listeners ---

Events.on(WorldLoadEvent, e => {
    CitadelNames.scanWorld();
});

Events.on(BlockBuildEndEvent, e => {
    if (e.tile && e.tile.build && e.tile.block().name.includes("citadel")) {
        CitadelNames.assign(e.tile.build.tile);
    }
});

Events.on(BuildTeamChangeEvent, e => {
    if (e.build && e.build.block.name.includes("citadel")) {
        CitadelNames.assign(e.build.tile);
    }
});

Events.on(TileChangeEvent, e => {
    if (e.tile && e.tile.build && e.tile.block().name.includes("citadel")) {
        // Capture name BEFORE assign() for notification
        let x = Math.floor(e.tile.x);
        let y = Math.floor(e.tile.y);
        let key = x + "," + y;
        let capturedName = "the citadel";

        if (citadel_history_storage[key]) {
            let data = citadel_history_storage[key];

            // Try to find the name used by the PREVIOUS owner (anyone who isn't us)
            let myTeamId = e.tile.build.team.id;
            let otherTeams = Object.keys(data.history).filter(id => parseInt(id) !== myTeamId);

            if (otherTeams.length > 0) {
                // If established history exists, use the name the enemy knew it by
                capturedName = data.history[otherTeams[0]];
            } else {
                // Otherwise check if we ourselves had a name for it (re-capture of lost ground)
                capturedName = data.history[myTeamId] || "the citadel";
            }
        }

        CitadelNames.assign(e.tile.build.tile);
        CaptureNotifications.show(e.tile.build, capturedName);
    }
});

// Persistence across destruction
Events.on(BlockDestroyEvent, e => {
    if (e.tile && e.tile.block().name.includes("citadel")) {
        print("[BnB] Citadel building lost at " + e.tile.x + "," + e.tile.y + ". History locked in memory.");
    }
});

// Render the names
Events.run(Trigger.draw, () => {
    if (Vars.state.isMenu()) return;

    let history = CitadelNames.getHistory();
    for (let key in history) {
        let data = history[key];
        let tile = Vars.world.tile(Math.floor(data.x), Math.floor(data.y));

        // CRITICAL: We only skip drawing here, we NEVER delete the history data.
        // This ensures the name survives the "blank frame" during captures.
        if (!tile || !tile.build || !tile.build.block.name.includes("citadel")) continue;

        let build = tile.build;
        let name = data.history[build.team.id] || "Citadel";

        let mouse = Core.input.mouseWorld();
        let size = (build.block.size * Vars.tilesize);
        let isHovered = Math.abs(mouse.x - build.x) < size / 2 && Math.abs(mouse.y - build.y) < size / 2;
        let alpha = isHovered ? 1.0 : 0.25;

        Draw.z(Layer.playerName);
        let finalColor = Tmp.c1.set(build.team.color);
        finalColor.a = alpha;

        Fonts.outline.draw(name, Math.floor(build.x), Math.floor(build.y - (size / 2) - 8), finalColor, 0.3, false, Align.center);
    }
});

if (!Vars.state.isMenu() && Vars.world.width() > 0) {
    if (Object.keys(citadel_history_storage).length === 0) CitadelNames.scanWorld();
}

print("[BnB] Citadel Naming System - PERSISTENT LAYER LOADED.");
