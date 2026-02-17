// scripts/team-tech.js

// This script controls the visibility of blocks based on the player's team.
// It allows unique buildings for different nations/factions.

Events.on(ClientLoadEvent, e => {
    print("[BnB] Loading team tech visibility...");

    // Map of Block Name -> Required Team
    const teamSpecificBlocks = {
        //"bnb-block-barrack-redwyn": Team.crux
    };

    // 1. Handle Team-Specific Blocks
    for (let name in teamSpecificBlocks) {
        let block = Vars.content.block(name);
        if (block) {
            let requiredTeam = teamSpecificBlocks[name];

            // Override buildVisibility
            // BuildVisibility is a concrete class that takes a Boolp (function returning boolean) in its constructor.
            // new BuildVisibility(() => boolean)
            block.buildVisibility = new BuildVisibility(() => {
                try {
                    // Safety checks:
                    // 1. If state/rules are null (e.g. main menu), it's visible (for database/encyclopedia)
                    if (!Vars.state || !Vars.state.rules) return true;

                    // 2. If in editor, always show everything
                    if (Vars.state.isEditor()) return true;

                    // 3. If player is null (e.g. connecting/loading), default to visible
                    var player = Vars.player;
                    if (!player || !player.team()) return true;

                    // 4. Strict check: return true only if teams match
                    return player.team() === requiredTeam;
                } catch (err) {
                    return true; // Fallback
                }
            });
        }
    }

    // Generic blocks logic removed per user request
});
