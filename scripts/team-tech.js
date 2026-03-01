// controls block visibility based on player team
// add entries to teamSpecificBlocks to restrict buildings to factions
Events.on(ClientLoadEvent, e => {

    // block name -> required team
    const teamSpecificBlocks = {
        // "bnb-block-barrack-redwyn": Team.crux
    };

    for (let name in teamSpecificBlocks) {
        let block = Vars.content.block(name);
        if (block) {
            let requiredTeam = teamSpecificBlocks[name];

            block.buildVisibility = new BuildVisibility(() => {
                try {
                    if (!Vars.state || !Vars.state.rules) return true;
                    if (Vars.state.isEditor()) return true;

                    var player = Vars.player;
                    if (!player || !player.team()) return true;

                    return player.team() === requiredTeam;
                } catch (err) {
                    return true;
                }
            });
        }
    }
});
