// scripts/citadel-names.js
var citadel_history_storage = {};


var CitadelNames = {
    // Team -> Names list
    namePools: (function () {
        let pools = {};
        pools[Team.blue.id] = ["Montreval", "Belvierre", "Chaslor", "Clairmont", "Rocheval", "Villenor", "Fontrev", "Valcour", "Grevaux", "Arvelin", "Lourval", "Chenonceau", "Vaudray", "Florin", "Alsace", "Merlon", "Brisant", "Dauphin", "Savoie", "Bastille"];
        pools[Team.crux.id] = ["Redmere", "Kingsfall", "Stonewyn", "Blackford", "Ashwick", "Dunmere", "Crowhaven", "Westwyk", "Oakmere", "Highfen", "Crownguard", "Oxenfurt", "Wainwright", "Horksberg", "Falkreath", "Wymond", "Ostwick", "Greenhill", "Staghold", "Brampton"];
        pools[Team.green.id] = ["Turqen", "Qashir", "Sarqan", "Hisqal", "Altisar", "Balqen", "Orqis", "Yalqar", "Darqem", "Selqar", "Zulqar", "Mashiq", "Ashqar", "Raiqan", "Jalqar", "Bashiq", "Hiraq", "Omani", "Zayed", "Qadir"];
        pools[Team.sharded.id] = ["Alcastor", "Montelar", "Valcoro", "Torvella", "Almarin", "Castriel", "Velasco", "Dornaval", "Calveron", "Santora", "Vancora", "Estella", "Marino", "Saldana", "Cortez", "Alvarez", "Santana", "Valerion", "Castello", "Espada"];
        pools[Team.malis.id] = ["Basilor", "Chrydon", "Kallion", "Andrya", "Nikarion", "Theskar", "Paledon", "Asteron", "Myrados", "Koravel", "Zathras", "Morthos", "Valkion", "Hydron", "Pyros", "Kryon", "Xenthos", "Oryx", "Phanax", "Strymon"];
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
        // Do NOT reassign the object, or global references will break.
        for (var member in citadel_history_storage) delete citadel_history_storage[member];
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
        CitadelNames.assign(e.tile.build.tile);
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
    if (Vars.state.isMenu() || !Vars.ui.hudfrag.shown) return;

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
// Export globally
global.citadel_history_storage = citadel_history_storage;
global.CitadelNames = CitadelNames;
