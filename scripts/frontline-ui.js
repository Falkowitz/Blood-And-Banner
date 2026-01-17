// scripts/frontline-ui.js

var FrontlineUI = {
    counts: {},

    config: {
        yOffset: 32
    },

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
                let color = global.TEAM_COLORS_STRING[teamId] || "[white]";
                let factionName = global.TEAM_NAMES[teamId] || team.name.toUpperCase();
                let count = this.counts[teamId];

                t.add(color + factionName + " [white]: " + count).padLeft(index === 0 ? 0 : 12).padRight(index === activeTeams.length - 1 ? 0 : 5);

                if (index < activeTeams.length - 1) {
                    t.add("[gray]|").padLeft(4).padRight(4);
                }
            });
        });
    }
};

// Store reference for global update
var uiTable = null;

Events.on(ClientLoadEvent, e => {
    Vars.ui.hudGroup.fill(null, t => {
        uiTable = t; // Capture reference
        t.top();
        t.name = "bnb-frontline-ui";

        t.update(() => {
            t.toFront();

            let coreInfo = Vars.ui.hudGroup.find("coreinfo");
            if (coreInfo != null) {
                // Force layout validation to get accurate measurements
                coreInfo.validate();
                coreInfo.layout();

                let inner = coreInfo.getChildren().get(0);
                if (inner) {
                    inner.validate();
                    inner.layout();
                }

                let shift = (inner ? inner.getPrefHeight() : coreInfo.getPrefHeight()) + FrontlineUI.config.yOffset;
                t.marginTop(shift);
            }

            FrontlineUI.updateCounts(); // Moved inside update loop
            FrontlineUI.drawUI(t); // Moved inside update loop
        });
    });
});

// Global update loop to handle visibility even when hidden
Events.run(Trigger.update, () => {
    if (uiTable != null) {
        uiTable.visible = Vars.ui.hudfrag.shown;
    }
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

print("[BnB] Frontline UI loaded v3 (Global Update).");
