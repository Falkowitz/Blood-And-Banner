// shows remaining craft time on buildings as floating text
const ProductionTimers = {
    // block name -> vertical offset
    config: {
        "bnb-block-workshop": -1,
        "bnb-block-barrack": -1,
        "bnb-block-military-academy": -1
    },

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

    const fontScale = 0.18;
    Draw.z(Layer.playerName);

    Groups.build.each(build => {
        if (build.team != Vars.player.team()) return;

        let offset = ProductionTimers.getOffset(build);
        if (offset === null) return;

        if (build.progress === undefined || build.block.craftTime === undefined) return;
        if (build.efficiency <= 0 && build.progress <= 0) return;

        let remainingTicks = (1.0 - build.progress) * build.block.craftTime;
        if (build.efficiency > 0) {
            remainingTicks /= build.efficiency;
        }

        let timeText = ProductionTimers.formatTime(remainingTicks);

        // hover detection for alpha
        let mouse = Core.input.mouseWorld();
        let size = (build.block.size * Vars.tilesize);
        let isHovered = Math.abs(mouse.x - build.x) < size / 2 && Math.abs(mouse.y - build.y) < size / 2;
        let alpha = isHovered ? 1.0 : 0.25;

        let baseColor = build.team.color;
        let finalColor = Tmp.c1.set(baseColor);
        finalColor.a = alpha;

        let x = Math.floor(build.x);
        let y = Math.floor(build.y - (size / 2) + offset);

        Fonts.outline.draw(timeText, x, y, finalColor, fontScale, false, Align.center);
    });
});
