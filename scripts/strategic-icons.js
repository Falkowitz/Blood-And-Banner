// draws bold unit icons when zoomed out (like Rusted Warfare)
// fades in as zoom decreases past threshold

const SCALE_THRESHOLD = 4.0;

Events.run(Trigger.draw, () => {
    if (!Vars.state.isGame()) return;

    let scale = Vars.renderer.scale;

    if (scale < SCALE_THRESHOLD) {
        let alpha = Mathf.clamp((SCALE_THRESHOLD - scale) / 2.0);

        Groups.unit.each(unit => {
            if (!unit || unit.inFogTo(Vars.player.team())) return;

            // skip king and corpse units
            let name = unit.type.name;
            if (name.indexOf("king") !== -1 || name.indexOf("dead") !== -1) return;

            let region = unit.type.cellRegion;
            if (!region || !region.found()) region = unit.type.fullIcon;
            if (!region || !region.found()) return;

            // pulse towards white when damaged
            let pulse = 0;
            if (unit.damaged()) {
                let health = Math.max(0, unit.healthf());
                pulse = Mathf.absin(Time.time, 15, 0.2 * (1.0 - health));
            }

            let color = Tmp.c1.set(unit.team.color).lerp(Color.white, pulse);
            color.a = alpha;

            // fixed 16px screen-space size
            let worldSize = 16.0 / scale;
            Draw.color(color);
            Draw.rect(region, unit.x, unit.y, worldSize, worldSize, 0);

            Draw.reset();
        });
    }
});
