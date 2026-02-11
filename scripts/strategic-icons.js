// scripts/strategic-icons.js

/**
 * Strategic Icons (Macro Icons) 
 * Draws bold unit icons when zoomed out, similar to Rusted Warfare.
 */

// Zoom level where icons start appearing (Mindustry renderer.scale)
// Standard zoom is ~6.0. Zoomed out is ~1.0.
const SCALE_THRESHOLD = 4.0;

Events.run(Trigger.draw, () => {
    if (!Vars.state.isGame()) return;

    // Mindustry's internal scale: smaller = zoomed out
    let scale = Vars.renderer.scale;

    if (scale < SCALE_THRESHOLD) {
        // Alpha calculation: fades in as scale gets smaller (towards max zoom out)
        let alpha = Mathf.clamp((SCALE_THRESHOLD - scale) / 2.0);

        Groups.unit.each(unit => {
            if (!unit || unit.inFogTo(Vars.player.team())) return;

            // EXCLUSIONS: King and Dead/Corpse units
            let name = unit.type.name;
            if (name.indexOf("king") !== -1 || name.indexOf("dead") !== -1) return;

            let region = unit.type.cellRegion;
            if (!region || !region.found()) region = unit.type.fullIcon;
            if (!region || !region.found()) return;

            // Visual properties (Pulsing towards white, only when damaged)
            let pulse = 0;
            if (unit.damaged()) {
                let health = Math.max(0, unit.healthf());
                pulse = Mathf.absin(Time.time, 15, 0.2 * (1.0 - health));
            }

            let color = Tmp.c1.set(unit.team.color).lerp(Color.white, pulse);
            color.a = alpha;

            // Screen-space size target: 20 pixels
            let worldSize = 16.0 / scale;
            // Draw the strategic icon (Fixed rotation: always upright)
            Draw.color(color);
            Draw.rect(region, unit.x, unit.y, worldSize, worldSize, 0);

            Draw.reset();
        });
    }
});
