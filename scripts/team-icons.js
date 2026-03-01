// registers faction icons as dummy items and replaces team emojis

const factions = ["hispalis", "redwyn", "basilaeum", "turqis", "valdier"];

factions.forEach(name => {
    const item = new Item(name);
    item.localizedName = name.charAt(0).toUpperCase() + name.slice(1) + " Icon";
    item.description = "Faction Icon for Map Editor";
    item.alwaysUnlocked = true;
    item.hidden = true;
});

Events.on(ClientLoadEvent, e => {

    // assign icon sprites to dummy items
    factions.forEach(name => {
        let item = Vars.content.item("bnb-" + name);
        if (item) {
            let region = Core.atlas.find("bnb-" + name);
            if (!region.found()) {
                region = Core.atlas.find(name);
            }
            if (region.found()) {
                item.uiIcon = region;
                item.fullIcon = region;
            }
        }
    });

    // register team emojis
    let startUnicode = 0xF950;
    const replacements = [
        { team: Team.sharded, name: "bnb-hispalis", sprite: "team-sharded" },
        { team: Team.crux, name: "bnb-redwyn", sprite: "team-crux" },
        { team: Team.malis, name: "bnb-basilaeum", sprite: "team-malis" },
        { team: Team.green, name: "bnb-turqis", sprite: "team-green" },
        { team: Team.blue, name: "bnb-valdier", sprite: "team-blue" }
    ];

    replacements.forEach((entry, index) => {
        let regionName = "bnb-" + entry.sprite;
        let region = Core.atlas.find(regionName);
        let unicode = startUnicode + index;

        if (region.found()) {
            try {
                Fonts.registerIcon(entry.name, regionName, unicode, region);
                entry.team.emoji = String.fromCharCode(unicode);
            } catch (err) { }
        }
    });
});
