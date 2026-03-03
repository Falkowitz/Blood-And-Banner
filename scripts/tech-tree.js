// builds the BnB tech tree, removes vanilla trees, assigns to Kaelthas

var TechTree = Packages.mindustry.content.TechTree;
var TechNode = Packages.mindustry.content.TechTree.TechNode;
var ItemStack = Packages.mindustry.type.ItemStack;
var MPlanets = Packages.mindustry.content.Planets;

// content lookup helpers
const b = (name) => {
    let block = Vars.content.block("bnb-" + name);
    if (block == null) return null;
    return block;
};
const u = (name) => {
    let unit = Vars.content.unit("bnb-" + name);
    if (unit == null) return null;
    return unit;
};
const i = (name) => {
    let item = Vars.content.item("bnb-" + name);
    if (item == null) return null;
    return item;
};

Events.on(ContentInitEvent, () => {

    const RP = i("research-point");
    if (RP == null) return;

    const cost1 = ItemStack.with(RP, 1);
    const free = ItemStack.empty;

    // remove vanilla tech trees
    let toRemove = [];
    for (let idx = 0; idx < TechTree.roots.size; idx++) {
        toRemove.push(TechTree.roots.get(idx));
    }
    for (let node of toRemove) {
        TechTree.roots.remove(node);
    }

    if (MPlanets.serpulo != null) MPlanets.serpulo.techTree = null;
    if (MPlanets.erekir != null) MPlanets.erekir.techTree = null;

    const planet = Vars.content.planet("bnb-kaelthas");
    const fort = b("block-fort");

    const root = TechTree.nodeRoot("kaelthas", fort, () => {

        // items
        TechTree.node(i("manpower"), free, () => {
            TechTree.node(i("materials"), free, () => { });
            TechTree.node(i("research-point"), free, () => { });
            TechTree.node(i("doctrine-point"), free, () => { });
            TechTree.node(i("colonel-point"), free, () => { });
        });

        // militia -> infantry branches
        TechTree.node(b("block-militiamen-deployment"), free, () => {
            TechTree.node(u("unit-militiamen"), free, () => { });

            // swordsmen
            TechTree.node(b("block-swordsmen-deployment"), cost1, () => {
                TechTree.node(u("unit-swordsmen"), free, () => { });

                TechTree.node(b("block-shieldmen-deployment"), cost1, () => {
                    TechTree.node(u("unit-shieldmen"), free, () => { });
                });

                TechTree.node(b("block-spearmen-deployment"), cost1, () => {
                    TechTree.node(u("unit-spearmen"), free, () => { });
                });
            });

            // bowmen
            TechTree.node(b("block-bowmen-deployment"), cost1, () => {
                TechTree.node(u("unit-bowmen"), free, () => { });
            });

            // cavalry
            TechTree.node(b("block-cavalrymen-deployment"), cost1, () => {
                TechTree.node(u("unit-cavalrymen"), free, () => { });

                TechTree.node(b("block-cuirassiers-deployment"), cost1, () => {
                    TechTree.node(u("unit-cuirassiers"), free, () => { });
                });

                TechTree.node(b("block-lancers-deployment"), cost1, () => {
                    TechTree.node(u("unit-lancers"), free, () => { });
                });
            });

            // colonels
            TechTree.node(b("block-attack-colonel-deployment"), cost1, () => {
                TechTree.node(u("unit-attack-colonel"), free, () => { });
            });
            TechTree.node(b("block-defence-colonel-deployment"), cost1, () => {
                TechTree.node(u("unit-defence-colonel"), free, () => { });
            });
            TechTree.node(b("block-maneuver-colonel-deployment"), cost1, () => {
                TechTree.node(u("unit-maneuver-colonel"), free, () => { });
            });
            TechTree.node(b("block-universal-colonel-deployment"), cost1, () => {
                TechTree.node(u("unit-universal-colonel"), free, () => { });
            });
        });

        // towers
        TechTree.node(b("block-observation-tower"), free, () => {
            TechTree.node(b("block-defence-tower"), cost1, () => { });
            TechTree.node(b("block-chevaux-de-frise"), cost1, () => { });
        });

        // buildings
        TechTree.node(b("block-barrack"), free, () => {
            TechTree.node(b("block-workshop"), free, () => { });
            TechTree.node(b("block-military-academy"), cost1, () => { });
        });

        TechTree.node(b("block-fortress"), cost1, () => { });
        TechTree.node(b("block-supply-hub"), cost1, () => { });
        TechTree.node(b("block-intendant-yard"), cost1, () => { });

    });

    // assign tree to planet
    if (planet != null && root != null) {
        root.planet = planet;
        root.each(n => { n.planet = planet; });

        planet.techTree = root;
        root.addPlanet(planet);
        root.addDatabaseTab(planet);

        Events.on(ClientLoadEvent, e => {
            if (Vars.ui && Vars.ui.research) {
                Vars.ui.research.rebuildTree(root);
            }

            // hide vanilla status effects, unlock custom ones
            Vars.content.statusEffects().each(s => {
                if (s.name.startsWith("bnb-")) {
                    s.alwaysUnlocked = true;
                    s.unlock();
                } else {
                    s.show = false;
                }
            });

            // force-unlock alwaysUnlocked nodes
            root.each(n => {
                if (n.content.alwaysUnlocked) {
                    n.content.quietUnlock();
                }
            });
        });
    } else {
    }
});
