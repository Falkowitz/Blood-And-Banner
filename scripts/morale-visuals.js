
// scripts/morale-visuals.js
// Dynamic morale ring rendering with team colors

// Configuration
const MORALE_RING_RADIUS = 5; // world units
const MORALE_RING_WIDTH = 1.2;
const MORALE_RING_LAYER = 28.9; // Just below unit ground layer (29)
const MORALE_RING_ALPHA = 0.7;
const MORALE_RING_SEGMENTS = 64; // Smoothness of arc

// Helper to draw arc
function drawMoraleArc(x, y, radius, startAngle, endAngle, color, width) {
    Draw.z(MORALE_RING_LAYER);
    Draw.color(color.r, color.g, color.b, MORALE_RING_ALPHA);

    // Draw arc using Lines
    let segments = Math.floor(MORALE_RING_SEGMENTS * ((endAngle - startAngle) / 360));
    if (segments < 2) segments = 2;

    let angleStep = (endAngle - startAngle) / segments;

    for (let i = 0; i < segments; i++) {
        let a1 = (startAngle + i * angleStep) * Math.PI / 180;
        let a2 = (startAngle + (i + 1) * angleStep) * Math.PI / 180;

        let x1 = x + Math.cos(a1) * radius;
        let y1 = y + Math.sin(a1) * radius;
        let x2 = x + Math.cos(a2) * radius;
        let y2 = y + Math.sin(a2) * radius;

        Lines.stroke(width);
        Lines.line(x1, y1, x2, y2);
    }

    Draw.reset();
}

// Main drawing loop
Events.run(Trigger.draw, () => {
    if (!Vars.ui.hudfrag.shown) return;
    if (!global.unitMoraleData) return;

    Groups.unit.each(u => {
        // Only draw for player's team (disabled for testing - show all teams)
        // if (u.team != Vars.player.team()) return;

        let moraleData = global.unitMoraleData[u.id];
        if (!moraleData) return;

        let config = global.getMoraleConfig(u);
        if (!config) return;

        // Calculate morale percentage
        let moralePercent = moraleData.currentMorale / config.baseMorale;
        if (moralePercent < 0) moralePercent = 0;
        if (moralePercent > 1) moralePercent = 1;

        // Calculate arc angle (starting from top, clockwise)
        let arcAngle = 360 * moralePercent;

        // Get team color
        let teamColor = u.team.color;

        // Draw background ring (darker tone of team color)
        // Multiply team color by 0.6 to get a "dark tone" similar to the requested 9e8080 relative to white
        let darkTeamColor = new Color(teamColor).mul(0.6);
        // Ensure alpha is appropriate (though drawMoraleArc sets alpha to constant 0.7 anyway)
        // actually drawMoraleArc uses MORALE_RING_ALPHA (0.7) for the color passed.

        drawMoraleArc(
            u.x,
            u.y,
            MORALE_RING_RADIUS,
            0,
            360,
            darkTeamColor,
            MORALE_RING_WIDTH
        );

        // Draw morale ring
        if (arcAngle > 0) {
            drawMoraleArc(
                u.x,
                u.y,
                MORALE_RING_RADIUS,
                -90, // Start from top (12 o'clock)
                -90 + arcAngle, // Clockwise
                teamColor,
                MORALE_RING_WIDTH
            );
        }

        // Optional: Draw retreat indicator
        if (moraleData.isRetreating) {
            Draw.z(MORALE_RING_LAYER + 0.1);
            Draw.color(Color.white.r, Color.white.g, Color.white.b, 0.5);

            // Pulsing effect
            let pulse = (Math.sin(Time.time * 0.1) + 1) / 2; // 0 to 1
            let pulseRadius = MORALE_RING_RADIUS + pulse * 1.5;

            Lines.stroke(0.5);
            Lines.circle(u.x, u.y, pulseRadius);

            Draw.reset();
        }

        // Check for global debug flag (default to false if undefined)
        if (global.enableMoraleDebugText) {
            // Debug text: Display current morale value
            Draw.z(Layer.flyingUnit + 1);

            let font = Fonts.def;
            let currentMorale = Math.floor(moraleData.currentMorale);
            // Use veterancy-adjusted max morale for display
            let maxMorale = Math.floor(global.getEffectiveBaseMorale ? global.getEffectiveBaseMorale(u, config) : config.baseMorale);
            let moraleText = "Morale: " + currentMorale + "/" + maxMorale;

            // Color based on morale level
            let textColor = Color.white;
            if (moralePercent < 0.3) {
                textColor = Color.red;
            } else if (moralePercent < 0.6) {
                textColor = Color.orange;
            } else {
                textColor = Color.green;
            }

            font.setColor(textColor);

            let oldScaleX = font.getData().scaleX;
            let oldScaleY = font.getData().scaleY;

            font.getData().setScale(0.12);
            font.setUseIntegerPositions(false);

            // Position below morale ring
            font.draw(moraleText, u.x, u.y - 10, Align.center);

            // Reset
            font.setUseIntegerPositions(true);
            font.getData().setScale(oldScaleX, oldScaleY);
            font.setColor(Color.white);

            Draw.reset();
        }
    });
});

print("[BnB] Morale Visuals loaded.");
