// scripts/team-icons.js

Events.on(ClientLoadEvent, e => {
    print("[BnB] Mod script loaded. STARTING TEAM ICONS...");

    let startUnicode = 0xF950;
    const replacements = [
        { team: Team.sharded, name: "bnb-sharded", sprite: "team-sharded" },
        { team: Team.crux, name: "bnb-crux", sprite: "team-crux" },
        { team: Team.malis, name: "bnb-malis", sprite: "team-malis" },
        { team: Team.green, name: "bnb-green", sprite: "team-green" },
        { team: Team.blue, name: "bnb-blue", sprite: "team-blue" }
    ];

    replacements.forEach((entry, index) => {
        let regionName = "bnb-" + entry.sprite;
        let region = Core.atlas.find(regionName);
        let unicode = startUnicode + index;

        if (region.found()) {
            try {
                Fonts.registerIcon(entry.name, regionName, unicode, region);
                entry.team.emoji = String.fromCharCode(unicode);
                print("[BnB] Replaced team emoji: " + entry.team.name);
            } catch (err) {
                print("[BnB] Error processing " + entry.team.name + ": " + err);
            }
        }
    });
});
