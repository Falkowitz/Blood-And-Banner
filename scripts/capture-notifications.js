// scripts/capture-notifications.js

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

    show(build, citadelName) {
        if (!build || !build.block || !build.block.name.includes("citadel")) return;

        let x = Math.floor(build.tile.x);
        let y = Math.floor(build.tile.y);
        let key = x + "," + y;

        // Use provided name, or look up from global citadel_history_storage
        let name = citadelName;
        if (!name && global.citadel_history_storage && global.citadel_history_storage[key]) {
            let data = global.citadel_history_storage[key];
            name = data.history[build.team.id] || "the citadel";
        }
        if (!name) name = "the citadel";

        let teamId = build.team.id;
        let factionName = (global.TEAM_NAMES[teamId] || build.team.name).toUpperCase();
        let teamColor = global.TEAM_COLORS[teamId] || Color.white;

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

        // Position below Frontline UI
        table.update(() => {
            if (Vars.state.isMenu()) {
                table.remove();
                return;
            }

            let shift = 100;
            let coreInfo = Vars.ui.hudGroup.find("coreinfo");
            let frontlineUI = Vars.ui.hudGroup.find("bnb-frontline-ui");

            if (coreInfo != null) {
                // Force layout validation to get accurate measurements
                coreInfo.validate();
                coreInfo.layout();

                let inner = coreInfo.getChildren().get(0);
                if (inner) {
                    inner.validate();
                    inner.layout();
                }

                shift = (inner ? inner.getPrefHeight() : coreInfo.getPrefHeight());

                if (frontlineUI != null) {
                    // Also validate frontline UI layout
                    frontlineUI.validate();
                    frontlineUI.layout();

                    let flInner = frontlineUI.getChildren().get(0);
                    if (flInner) {
                        flInner.validate();
                        flInner.layout();
                    }

                    shift += (flInner ? flInner.getPrefHeight() : frontlineUI.getPrefHeight()) + 22;
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

// Event Listener - Show notification when citadel is captured
Events.on(TileChangeEvent, e => {
    if (e.tile && e.tile.build && e.tile.block().name.includes("citadel")) {
        // Capture name BEFORE CitadelNames.assign() runs
        let x = Math.floor(e.tile.x);
        let y = Math.floor(e.tile.y);
        let key = x + "," + y;
        let capturedName = "the citadel";

        if (global.citadel_history_storage && global.citadel_history_storage[key]) {
            let data = global.citadel_history_storage[key];

            // Try to find the name used by the PREVIOUS owner (anyone who isn't us)
            let myTeamId = e.tile.build.team.id;
            let historyKeys = Object.keys(data.history);
            let otherTeams = historyKeys.filter(id => parseInt(id) !== myTeamId);

            if (otherTeams.length > 0) {
                // If established history exists, use the name the enemy knew it by
                let prevTeamId = otherTeams[otherTeams.length - 1];
                capturedName = data.history[prevTeamId];
            } else {
                // Otherwise check if we ourselves had a name for it (re-capture of lost ground)
                capturedName = data.history[myTeamId] || "the citadel";
            }
        }

        CaptureNotifications.show(e.tile.build, capturedName);
    }
});

// Global visibility management
Events.run(Trigger.update, () => {
    if (CaptureNotifications.lastNotification != null) {
        CaptureNotifications.lastNotification.visible = Vars.ui.hudfrag.shown;
    }
});

print("[BnB] Capture Notifications loaded.");
