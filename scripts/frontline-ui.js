// scripts/frontline-ui.js

var FrontlineUI = {
    counts: {},

    config: {
        yOffset: 32
    },

    teamNames: (function () {
        let names = {};
        names[Team.crux.id] = "Redwyn";
        names[Team.blue.id] = "Valdier";
        names[Team.green.id] = "Turqis";
        names[Team.sharded.id] = "Hispalis";
        names[Team.malis.id] = "Basilaeum";
        names[Team.derelict.id] = "Neutral";
        return names;
    })(),

    teamColors: (function () {
        let colors = {};
        colors[Team.blue.id] = "[#6c87fd]";
        colors[Team.crux.id] = "[#f25555]";
        colors[Team.green.id] = "[#54d67d]";
        colors[Team.sharded.id] = "[#ffd37f]";
        colors[Team.malis.id] = "[#a27ce5]";
        colors[Team.derelict.id] = "[lightgray]";
        return colors;
    })(),

    updateCounts() {
        let newCounts = {};
        Groups.build.each(build => {
            if (build && build.block && build.block.name && build.block.name.includes("citadel")) {
                let teamId = build.team.id;
                newCounts[teamId] = (newCounts[teamId] || 0) + 1;
            }
        });
        this.counts = newCounts;
    },

    drawUI(table) {
        table.clear();
        table.top();

        let activeTeams = Object.keys(this.counts).sort((a, b) => b - a);
        if (activeTeams.length === 0) return;

        table.table(Styles.black6, t => {
            t.margin(6);
            activeTeams.forEach((teamId, index) => {
                let team = Team.get(parseInt(teamId));
                let color = this.teamColors[teamId] || "[white]";
                let factionName = this.teamNames[teamId] || team.name.toUpperCase();
                let count = this.counts[teamId];

                t.add(color + factionName + " [white]: " + count).padLeft(index === 0 ? 0 : 12).padRight(index === activeTeams.length - 1 ? 0 : 5);

                if (index < activeTeams.length - 1) {
                    t.add("[gray]|").padLeft(4).padRight(4);
                }
            });
        });
    }
};

Events.on(ClientLoadEvent, e => {
    Vars.ui.hudGroup.fill(null, t => {
        t.top();
        t.name = "bnb-frontline-ui";

        t.update(() => {
            t.toFront();

            let coreInfo = Vars.ui.hudGroup.find("coreinfo");
            if (coreInfo != null) {
                let inner = coreInfo.getChildren().get(0);
                let shift = (inner ? inner.getPrefHeight() : coreInfo.getPrefHeight()) + FrontlineUI.config.yOffset;
                t.marginTop(shift);
            }

            FrontlineUI.drawUI(t);
        });
    });
});

Events.on(WorldLoadEvent, e => FrontlineUI.updateCounts());
Events.on(BuildTeamChangeEvent, e => {
    if (e.build && e.build.block.name.includes("citadel")) {
        FrontlineUI.updateCounts();
    }
});
Events.on(TileChangeEvent, e => {
    if (e.tile && e.tile.build && e.tile.block().name.includes("citadel")) {
        Timer.schedule(() => FrontlineUI.updateCounts(), 0.05);
    }
});
Events.on(BlockDestroyEvent, e => {
    if (e.tile && e.tile.block().name.includes("citadel")) {
        FrontlineUI.updateCounts();
    }
});
Events.on(BlockBuildEndEvent, e => {
    if (e.tile && e.tile.block().name.includes("citadel")) {
        FrontlineUI.updateCounts();
    }
});

if (!Vars.state.isMenu()) {
    Timer.schedule(() => FrontlineUI.updateCounts(), 0.5);
}

print("[BnB] Frontline UI loaded.");
