// scripts/production-timers.js

const ProductionTimers = {
    // List of blocks to track with custom Y-offsets (relative to bottom edge)
    // You can add more blocks here and adjust the number to move the timer up/down
    config: {
        "bnb-block-workshop": -1,
        "bnb-block-barrack": -1
    },

    // Check if a building is one of our targets and get its offset
    getOffset(build) {
        if (!build || !build.block) return null;
        return this.config[build.block.name];
    },

    formatTime(ticks) {
        let seconds = Math.ceil(ticks / 60);
        if (seconds < 60) {
            return seconds + "s";
        }
        let minutes = Math.floor(seconds / 60);
        let remSeconds = seconds % 60;
        return minutes + "m " + remSeconds + "s";
    }
};

Events.run(Trigger.draw, () => {
    if (Vars.state.isMenu() || !Vars.ui.hudfrag.shown) return;

    // Made the text smaller for 1x1 blocks
    const fontScale = 0.18;
    Draw.z(Layer.playerName);

    Groups.build.each(build => {
        let offset = ProductionTimers.getOffset(build);
        if (offset === null) return;

        // Custom buildings usually extend GenericCrafter
        // We need to check if it's currently crafting
        if (build.progress === undefined || build.block.craftTime === undefined) return;

        // Don't show if not crafting (no progress or efficiency)
        if (build.efficiency <= 0 && build.progress <= 0) return;

        // Calculate remaining time
        let remainingTicks = (1.0 - build.progress) * build.block.craftTime;
        // Adjust for efficiency speed
        if (build.efficiency > 0) {
            remainingTicks /= build.efficiency;
        }

        let timeText = ProductionTimers.formatTime(remainingTicks);

        // Hover detection
        let mouse = Core.input.mouseWorld();
        let size = (build.block.size * Vars.tilesize);
        let isHovered = Math.abs(mouse.x - build.x) < size / 2 && Math.abs(mouse.y - build.y) < size / 2;
        let alpha = isHovered ? 1.0 : 0.25;

        // Color based on team
        let baseColor = build.team.color;
        let finalColor = Tmp.c1.set(baseColor);
        finalColor.a = alpha;

        // Position using the custom offset
        let x = Math.floor(build.x);
        let y = Math.floor(build.y - (size / 2) + offset);

        Fonts.outline.draw(timeText, x, y, finalColor, fontScale, false, Align.center);
    });
});

print("[BnB] Production Timers system loaded.");
