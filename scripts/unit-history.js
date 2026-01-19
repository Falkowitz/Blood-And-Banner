// scripts/unit-history.js

// Global storage for unit history
// Key: Unit ID -> History Data
var unitHistory = {};

// UI state
var currentHistoryPanel = null;
var selectedUnit = null;

// Configuration
const VETERANCY_THRESHOLDS = {
    1: 5,   // 5 kills for Veteran I
    2: 15,  // 15 kills for Veteran II
    3: 30   // 30 kills for Veteran III
};

// Initialize unit history when unit is created
function initUnitHistory(unit) {
    if (!unit) return;
    if (unitHistory[unit.id]) return;

    // Exclude King unit
    if (unit.type.name.includes("king")) return;

    // Find closest friendly citadel to determine origin
    let originCitadel = "Unknown";
    try {
        let closestDist = Infinity;

        if (global.citadel_history_storage) {
            for (let key in global.citadel_history_storage) {
                let data = global.citadel_history_storage[key];
                let tile = Vars.world.tile(Math.floor(data.x), Math.floor(data.y));

                if (tile && tile.build && tile.build.team == unit.team) {
                    let dist = unit.dst(tile.build);
                    if (dist < closestDist) {
                        closestDist = dist;
                        originCitadel = data.history[unit.team.id] || "The Citadel";
                    }
                }
            }
        }
    } catch (err) {
        // Fail silently or log if needed, but keeping clean for production
    }

    // If no citadel found, use team name
    if (originCitadel == "Unknown") {
        originCitadel = global.TEAM_NAMES[unit.team.id] || unit.team.name;
    }

    unitHistory[unit.id] = {
        kills: 0,
        originCitadel: originCitadel,
        birthTime: Time.millis(),
        lastX: unit.x,
        lastY: unit.y,
        distanceTraveled: 0,
        battlesWon: 0,
        veterancyLevel: 0,
        died: false // Critical: Always start false to ensure fatal blows are captured
    };
}

// Update veterancy based on kills
function updateVeterancy(unit) {
    if (!unit || !unitHistory[unit.id]) return;

    let history = unitHistory[unit.id];
    let kills = history.kills;
    let newLevel = 0;

    if (kills >= VETERANCY_THRESHOLDS[3]) {
        newLevel = 3;
    } else if (kills >= VETERANCY_THRESHOLDS[2]) {
        newLevel = 2;
    } else if (kills >= VETERANCY_THRESHOLDS[1]) {
        newLevel = 1;
    }

    if (newLevel != history.veterancyLevel) {
        history.veterancyLevel = newLevel;

        // Remove old veterancy effects
        unit.unapply(Vars.content.getByName(ContentType.status, "bnb-veteran1"));
        unit.unapply(Vars.content.getByName(ContentType.status, "bnb-veteran2"));
        unit.unapply(Vars.content.getByName(ContentType.status, "bnb-veteran3"));

        // Apply new veterancy effect (permanent)
        if (newLevel > 0) {
            let veterancyEffect = Vars.content.getByName(ContentType.status, "bnb-veteran" + newLevel);
            if (veterancyEffect) {
                unit.apply(veterancyEffect, Number.MAX_VALUE);
            }
        }
    }
}

// Track distance traveled
function updateDistance(unit) {
    if (!unitHistory[unit.id]) return;

    let history = unitHistory[unit.id];
    let dx = unit.x - history.lastX;
    let dy = unit.y - history.lastY;
    let dist = Math.sqrt(dx * dx + dy * dy);

    history.distanceTraveled += dist;
    history.lastX = unit.x;
    history.lastY = unit.y;
}

// Format time duration
function formatDuration(millis) {
    let seconds = Math.floor(millis / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return hours + "h " + (minutes % 60) + "m";
    } else if (minutes > 0) {
        return minutes + "m " + (seconds % 60) + "s";
    } else {
        return seconds + "s";
    }
}

// Create and show history panel
function showHistoryPanel(unit) {
    if (!unit || !unitHistory[unit.id]) return;

    // Remove old panel
    if (currentHistoryPanel) {
        currentHistoryPanel.remove();
    }

    let history = unitHistory[unit.id];

    // Get unit regiment name
    let regimentName = global.unitRegimentNames && global.unitRegimentNames[unit.id]
        ? global.unitRegimentNames[unit.id]
        : "Unknown Regiment";

    // Create panel
    let panel = new Table(Styles.black6);
    panel.margin(15);

    // Title
    panel.table(Styles.black8, title => {
        title.add("[accent]" + regimentName).style(Styles.outlineLabel).pad(8).row();
        title.add("[lightgray]Unit History").style(Styles.outlineLabel).pad(4);
    }).growX().row();

    panel.image().height(3).color(Pal.accent).growX().pad(4).row();

    // Stats table
    let stats = new Table();
    stats.defaults().left().padRight(10).padTop(4).padBottom(4);

    // Helper to add a stat row with dynamic value
    const addStat = (label, valueProv) => {
        stats.add(label).style(Styles.outlineLabel).left();
        // Use label with provider for dynamic text updates
        stats.label(valueProv).style(Styles.outlineLabel).left().row();
    };

    // Origin (Static)
    stats.add("[gray]Origin:").style(Styles.outlineLabel).left();
    stats.add("[white]" + history.originCitadel).style(Styles.outlineLabel).left().row();

    // Lifetime (Dynamic)
    addStat("[gray]Service Time:", () => {
        if (!unitHistory[unit.id]) return "";
        let life = Time.millis() - unitHistory[unit.id].birthTime;
        return "[white]" + formatDuration(life);
    });

    // Kills (Dynamic)
    addStat("[gray]Kills:", () => {
        if (!unitHistory[unit.id]) return "[lightgray]0";
        let h = unitHistory[unit.id];
        let color = h.kills >= VETERANCY_THRESHOLDS[3] ? "[accent]" :
            h.kills >= VETERANCY_THRESHOLDS[2] ? "[stat]" :
                h.kills >= VETERANCY_THRESHOLDS[1] ? "[white]" : "[lightgray]";
        return color + h.kills;
    });

    // Veterancy (Dynamic)
    addStat("[gray]Veterancy:", () => {
        if (!unitHistory[unit.id] || unitHistory[unit.id].veterancyLevel <= 0) return "[gray]-";
        let level = unitHistory[unit.id].veterancyLevel;
        let stars = "";
        for (let i = 0; i < level; i++) stars += "★";
        return "[accent]" + stars + " Level " + level;
    });

    // Distance traveled (Dynamic)
    addStat("[gray]Distance:", () => {
        if (!unitHistory[unit.id]) return "[white]0 tiles";
        let tiles = Math.floor(unitHistory[unit.id].distanceTraveled / 8);
        return "[white]" + tiles + " tiles";
    });

    panel.add(stats).grow().row();

    panel.image().height(3).color(Pal.accent).growX().pad(4).row();

    // Close button
    panel.button("Close", Icon.cancel, Styles.cleart, () => {
        panel.remove();
        currentHistoryPanel = null;
        selectedUnit = null;
    }).size(120, 40).pad(6);

    panel.pack();

    // Position at center-right
    panel.update(() => {
        if (Vars.state.isMenu() || !unit.isValid() || unit.dead || Vars.control.input.commandMode) {
            panel.remove();
            currentHistoryPanel = null;
            selectedUnit = null;
            return;
        }

        let screenWidth = Core.graphics.getWidth();
        let screenHeight = Core.graphics.getHeight();
        let x = screenWidth - panel.getPrefWidth() - 20;
        let y = screenHeight / 2;

        panel.setPosition(x, y, Align.right);
    });

    Core.scene.add(panel);
    currentHistoryPanel = panel;
    selectedUnit = unit;
}

// Periodic update for tracking
Timer.schedule(() => {
    Groups.unit.each(u => {
        if (!u.spawnedByCore && u.type.name.includes("unit-")) {
            if (!unitHistory[u.id]) {
                initUnitHistory(u);
            } else {
                updateDistance(u);
            }
        }
    });
}, 0, 0.1);

// Track unit deaths and award kills
Events.on(UnitDestroyEvent, e => {
    let unit = e.unit;
    if (unitHistory[unit.id]) {
        delete unitHistory[unit.id];
    }
});

// Track kills (Damage events are used to detect fatal blows)
Events.on(UnitDamageEvent, e => {
    // Ensure victim is tracked
    if (!unitHistory[e.unit.id]) initUnitHistory(e.unit);

    // Determine attacker
    let attacker = null;
    if (e.bullet && e.bullet.owner && e.bullet.owner instanceof Unit) {
        attacker = e.bullet.owner;
    } else if (e.source && e.source instanceof Unit) {
        attacker = e.source;
    }

    if (attacker) {
        // Ensure attacker is tracked
        if (!unitHistory[attacker.id]) initUnitHistory(attacker);

        // Only track for our tracked units
        if (unitHistory[attacker.id]) {
            // KILL CHECK LOGIC
            let h = unitHistory[attacker.id];
            let victimHist = unitHistory[e.unit.id];
            let isDead = e.unit.dead || e.unit.health <= 0;

            // Check if victim died and hasn't been counted yet
            if (isDead && victimHist && !victimHist.died) {
                victimHist.died = true; // Mark as killed

                // Award kill
                h.kills = (h.kills || 0) + 1;
                updateVeterancy(attacker);
            }
        }
    }
});

// Click handler for units
var lastClickTime = 0;
var clickDelay = 200; // ms between clicks

Events.run(Trigger.update, () => {
    if (Vars.state.isMenu()) return;

    // Don't open history if in command mode (RTS selection)
    if (Vars.control.input.commandMode) return;

    if (Core.input.keyTap(KeyCode.mouseLeft)) {
        let now = Time.millis();
        if (now - lastClickTime < clickDelay) return;
        lastClickTime = now;

        // Check if clicking the history panel itself
        // If so, do nothing (let UI handle buttons/scroll)
        let uiHit = Core.scene.hit(Core.input.mouseX(), Core.input.mouseY(), true);
        if (uiHit && currentHistoryPanel && (uiHit == currentHistoryPanel || uiHit.isDescendantOf(currentHistoryPanel))) {
            return;
        }

        let mouse = Core.input.mouseWorld();

        // Find clicked unit
        let clicked = null;
        let minDist = 30; // Click radius

        Groups.unit.each(u => {
            if (u.team == Vars.player.team() && unitHistory[u.id]) {
                let dist = Mathf.dst(u.x, u.y, mouse.x, mouse.y);
                if (dist < minDist && dist < u.hitSize * 0.8) {
                    minDist = dist;
                    clicked = u;
                }
            }
        });

        if (clicked) {
            showHistoryPanel(clicked);
        } else if (currentHistoryPanel) {
            // Clicked outside -> Close
            currentHistoryPanel.remove();
            currentHistoryPanel = null;
            selectedUnit = null;
        }
    }
});

// Global visibility management
Events.run(Trigger.update, () => {
    if (typeof currentHistoryPanel !== "undefined" && currentHistoryPanel != null) {
        currentHistoryPanel.visible = Vars.ui.hudfrag.shown;
    }
});

// Export globally
global.unitHistory = unitHistory;
global.initUnitHistory = initUnitHistory;

print("[BnB] Unit History & Veterancy System loaded.");
