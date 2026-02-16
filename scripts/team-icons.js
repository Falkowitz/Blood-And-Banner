// scripts/team-icons.js

// Register Faction Icons as Dummy Items
// This makes them selectable in the Campaign/Map Editor under "Items"
// The sprites are loaded from sprites/ui/ (bnb-name)
const factions = ["hispalis", "redwyn", "basilaeum", "turqis", "valdier"];

factions.forEach(name => {
    // Create Item with internal name "bnb-" + name
    // (prefix added automatically or manually depending on context, 
    // but explicit "bnb-" ensures uniqueness)
    const item = new Item(name);

    // Capitalize for display name
    item.localizedName = name.charAt(0).toUpperCase() + name.slice(1) + " Icon";
    item.description = "Faction Icon for Map Editor";
    item.alwaysUnlocked = true;

    // NOTE: We cannot override item.load() in JS (Rhino error).
    // Instead, we assign the icons in ClientLoadEvent below.
});

Events.on(ClientLoadEvent, e => {
    print("[BnB] Loading team icons...");

    // 1. Assign Icons to Dummy Items
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

    // 2. Register Team Fonts/Emojis
    let startUnicode = 0xF950;
    const replacements = [
        { team: Team.sharded, name: "bnb-hispalis", sprite: "hispalis" },
        { team: Team.crux, name: "bnb-redwyn", sprite: "redwyn" },
        { team: Team.malis, name: "bnb-basilaeum", sprite: "basilaeum" },
        { team: Team.green, name: "bnb-turqis", sprite: "turqis" },
        { team: Team.blue, name: "bnb-valdier", sprite: "valdier" }
    ];

    replacements.forEach((entry, index) => {
        let regionName = "bnb-" + entry.sprite;
        let region = Core.atlas.find(regionName);
        let unicode = startUnicode + index; // Custom unicode range

        if (region.found()) {
            try {
                // Register as font icon for text/emojis
                Fonts.registerIcon(entry.name, regionName, unicode, region);
                entry.team.emoji = String.fromCharCode(unicode);
                print("[BnB] Replaced team emoji: " + entry.team.name);
            } catch (err) {
                // print("[BnB] Error processing " + entry.team.name + ": " + err);
            }
        }
    });
});
