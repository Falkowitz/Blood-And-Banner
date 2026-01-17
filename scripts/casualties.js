// scripts/casualties.js

/* Casualty Counter System */
const CasualtySystem = {
    casualties: {}, // team.id -> lives lost
    battalions: {}, // team.id -> full units lost
    lastHealth: new Map(), // unit.id -> health

    // Color thresholds for dynamic text
    thresholds: {
        men: [0, 50000, 100000, 1000000, 3000000],
        batt: [0, 50, 200, 1000, 3000],
        colors: [
            Color.white,
            Color.valueOf("ffc0cb"), // Pink
            Color.red,
            Color.valueOf("8b0000"), // Dark Red
            Color.black
        ]
    },

    getThresholdColor(value, type) {
        let list = type === "men" ? this.thresholds.men : this.thresholds.batt;
        let colors = this.thresholds.colors;

        if (value <= list[0]) return colors[0];
        if (value >= list[list.length - 1]) return colors[colors.length - 1];

        for (let i = 0; i < list.length - 1; i++) {
            if (value >= list[i] && value < list[i + 1]) {
                let range = list[i + 1] - list[i];
                let progress = (value - list[i]) / range;
                return Tmp.c1.set(colors[i]).lerp(colors[i + 1], progress);
            }
        }
        return colors[colors.length - 1];
    },

    isExcluded(unit) {
        if (!unit || !unit.type) return false;
        let name = unit.type.name;
        // Exclude corpse/wreck units
        return name === "dead" || name === "dead-man" || name === "dead-galley" || name === "dead-man-horse" ||
            name === "bnb-dead" || name === "bnb-dead-man" || name === "bnb-dead-galley" || name === "bnb-dead-man-horse";
    },

    reset() {
        this.casualties = {};
        this.battalions = {};
        this.lastHealth.clear();
    },

    update() {
        if (Vars.state.isPaused() || Vars.state.isMenu()) return;

        Groups.unit.each(u => {
            if (this.isExcluded(u)) return;

            let prev = this.lastHealth.get(u.id);
            if (prev !== undefined && u.health < prev) {
                let loss = prev - u.health;
                if (loss > 0) {
                    this.casualties[u.team.id] = (this.casualties[u.team.id] || 0) + loss;
                }
            }
            this.lastHealth.set(u.id, u.health);
        });
    },

    removeUnit(unit) {
        this.lastHealth.delete(unit.id);
    },

    recordDeath(unit) {
        if (this.isExcluded(unit)) return;
        this.battalions[unit.team.id] = (this.battalions[unit.team.id] || 0) + 1;
    },

    getActiveTeams() {
        return Object.keys(this.casualties).filter(id => (this.casualties[id] || 0) > 0.1 || (this.battalions[id] || 0) > 0);
    },

    drawUI(table) {
        table.clear();
        table.top().left();

        table.add("--- Lives Lost ---").style(Styles.outlineLabel).padBottom(4).row();

        let activeIds = this.getActiveTeams();
        activeIds.sort((a, b) => b - a);

        activeIds.forEach(teamId => {
            let men = Math.floor(this.casualties[teamId] || 0);
            let batt = this.battalions[teamId] || 0;

            let team = Team.get(parseInt(teamId));
            let teamName = (global.TEAM_NAMES[team.id] || team.name).toUpperCase();
            let teamColorMarkup = global.TEAM_COLORS_STRING[team.id] || "";

            // Calculate threshold colors
            let menColor = this.getThresholdColor(men, "men");
            let battColor = this.getThresholdColor(batt, "batt");

            table.table(null, t => {
                t.left();
                t.add(teamColorMarkup + teamName + ": ").left();

                // Add men lost with dynamic color
                let menLabel = t.add(men + " men").left().get();
                menLabel.setColor(menColor);

                t.add(", ").left();

                // Add battalions lost with dynamic color
                let battLabel = t.add(batt + " battalions").left().get();
                battLabel.setColor(battColor);
            }).padBottom(4).row();
        });
    }
};

// Event Bindings
Events.on(ResetEvent, () => CasualtySystem.reset());
Events.run(Trigger.update, () => CasualtySystem.update());
Events.on(UnitDestroyEvent, e => {
    CasualtySystem.removeUnit(e.unit);
    CasualtySystem.recordDeath(e.unit);
});

// UI Integration
Events.on(ClientLoadEvent, () => {
    if (!Vars.ui || !Vars.ui.hudfrag || !Vars.ui.hudGroup) return;

    Vars.ui.hudGroup.fill(null, t => {
        t.name = "bnb-casualty-counter";
        t.top().left().margin(10);

        t.update(() => {
            let itemsShown = Core.settings.getBool("coreitems") && !Vars.mobile;
            t.marginTop(itemsShown ? 160 : 100);
        });

        t.touchable = Touchable.disabled;

        t.table(Styles.black3, list => {
            list.margin(8);

            const rebuild = () => {
                CasualtySystem.drawUI(list);
            };

            let lastUpdate = 0;
            list.update(() => {
                // Update every 0.1 seconds to reflect changing casualties/colors
                if (Date.now() - lastUpdate > 100) {
                    rebuild();
                    lastUpdate = Date.now();
                }
            });

        }).visible(() => Vars.ui.hudfrag.shown && !Vars.state.isMenu() && CasualtySystem.getActiveTeams().length > 0);
    });
});
