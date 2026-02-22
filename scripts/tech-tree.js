// scripts/tech-tree.js
print("[BnB] tech-tree.js: Initialization started...");

var TechTree = Packages.mindustry.content.TechTree;
var TechNode = Packages.mindustry.content.TechTree.TechNode;
var ItemStack = Packages.mindustry.type.ItemStack;
var MPlanets = Packages.mindustry.content.Planets;

// --- Helpers ---
const b = (name) => {
    let block = Vars.content.block("bnb-" + name);
    if (block == null) {
        print("[BnB][ERROR] Block not found: bnb-" + name);
        // Return a dummy block or throw a clear error
        return null;
    }
    return block;
};
const u = (name) => {
    let unit = Vars.content.unit("bnb-" + name);
    if (unit == null) {
        print("[BnB][ERROR] Unit not found: bnb-" + name);
        return null;
    }
    return unit;
};
const i = (name) => {
    let item = Vars.content.item("bnb-" + name);
    if (item == null) {
        print("[BnB][ERROR] Item not found: bnb-" + name);
        return null;
    }
    return item;
};

// We wrap the tree building in a timeout or event to be sure content is fully registered
Events.on(ContentInitEvent, () => {
    print("[BnB] tech-tree.js: ContentInitEvent triggered. Building tree...");

    const RP = i("research-point");
    if (RP == null) {
        print("[BnB][FATAL] Research Point item missing! Aborting tech tree build.");
        return;
    }
    const cost1 = ItemStack.with(RP, 1);
    const free = ItemStack.empty;

    print("[BnB] TechTree.roots count before: " + TechTree.roots.size);

    // =============================================
    //  STEP 1: Remove vanilla tech trees
    // =============================================
    let toRemove = [];
    for (let idx = 0; idx < TechTree.roots.size; idx++) {
        toRemove.push(TechTree.roots.get(idx));
    }
    for (let node of toRemove) {
        TechTree.roots.remove(node);
        print("[BnB] Removed vanilla tech tree root: " + node.content.name);
    }

    if (MPlanets.serpulo != null) MPlanets.serpulo.techTree = null;
    if (MPlanets.erekir != null) MPlanets.erekir.techTree = null;

    print("[BnB] TechTree.roots count after clearing: " + TechTree.roots.size);

    // =============================================
    //  STEP 2: Build BnB Tech Tree
    // =============================================
    const planet = Vars.content.planet("bnb-kaelthas");
    const citadel = b("block-citadel");

    const root = TechTree.nodeRoot("kaelthas", citadel, () => {

        // ─── ITEMS (all free) ────────────────────────
        TechTree.node(i("manpower"), free, () => {
            TechTree.node(i("materials"), free, () => { });
            TechTree.node(i("research-point"), free, () => { });
            TechTree.node(i("doctrine-point"), free, () => { });
            TechTree.node(i("colonel-point"), free, () => { });
        });

        // ─── MILITIA (free) ──────────────────────────
        TechTree.node(b("block-militiamen-deployment"), free, () => {
            // Militia Battalion (free)
            TechTree.node(u("unit-militiamen"), free, () => { });

            // ── SWORDSMEN BRANCH ──
            TechTree.node(b("block-swordsmen-deployment"), cost1, () => {
                TechTree.node(u("unit-swordsmen"), free, () => { });

                // Shieldmen
                TechTree.node(b("block-shieldmen-deployment"), cost1, () => {
                    TechTree.node(u("unit-shieldmen"), free, () => { });
                });

                // Spearmen
                TechTree.node(b("block-spearmen-deployment"), cost1, () => {
                    TechTree.node(u("unit-spearmen"), free, () => { });
                });
            });

            // ── BOWMEN BRANCH ──
            TechTree.node(b("block-bowmen-deployment"), cost1, () => {
                TechTree.node(u("unit-bowmen"), free, () => { });
            });

            // ── LIGHT CAVALRY BRANCH ──
            TechTree.node(b("block-cavalrymen-deployment"), cost1, () => {
                TechTree.node(u("unit-cavalrymen"), free, () => { });

                // Heavy Cavalry (Cuirassiers)
                TechTree.node(b("block-cuirassiers-deployment"), cost1, () => {
                    TechTree.node(u("unit-cuirassiers"), free, () => { });
                });

                // Spear Cavalry (Lancers)
                TechTree.node(b("block-lancers-deployment"), cost1, () => {
                    TechTree.node(u("unit-lancers"), free, () => { });
                });
            });

            // ── COLONELS BRANCH ──
            // Parallel unlocks after Militia Deployment
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

        // ─── OBSERVATION TOWER BRANCH (free) ─────────
        TechTree.node(b("block-observation-tower"), free, () => {
            TechTree.node(b("block-defence-tower"), cost1, () => { });
            TechTree.node(b("block-chevaux-de-frise"), cost1, () => { });
        });

        // ─── BUILDINGS ───────────────────────────────
        // Barracks (free)
        TechTree.node(b("block-barrack"), free, () => {
            TechTree.node(b("block-workshop"), free, () => { });
            TechTree.node(b("block-military-academy"), cost1, () => { });
        });

        // Independent Buildings (after Citadel)
        TechTree.node(b("block-supply-hub"), cost1, () => { });
        TechTree.node(b("block-intendant-yard"), cost1, () => { });

        // ─── SECTORS ─────────────────────────────────
        // Squire's Keep and other sectors will go here
        // when sector presets are created
    });

    // =============================================
    //  STEP 3: Associate tree with planet
    // =============================================
    if (planet != null && root != null) {
        // Set the planet reference on all nodes
        root.planet = planet;
        root.each(n => { n.planet = planet; });

        // Assign to planet so the research dialog finds it
        planet.techTree = root;
        root.addPlanet(planet);
        root.addDatabaseTab(planet);

        print("[BnB] Tech tree built and assigned to Kaelthas. Root children: " + root.children.size);
        print("[BnB] TechTree.roots count after build: " + TechTree.roots.size);
        for (let idx = 0; idx < TechTree.roots.size; idx++) {
            print("[BnB]   Root " + idx + ": " + TechTree.roots.get(idx).content.name);
        }
        // Force the Research UI to update its root since we deleted the vanilla ones it cached
        Events.on(ClientLoadEvent, e => {
            if (Vars.ui && Vars.ui.research) {
                Vars.ui.research.rebuildTree(root);
            }

            // Hide vanilla status effects from database and unlock custom ones
            Vars.content.statusEffects().each(s => {
                if (s.name.startsWith("bnb-")) {
                    s.alwaysUnlocked = true;
                    s.unlock();
                } else {
                    s.show = false;
                }
            });

            // Workaround for Core Database UI not recognizing alwaysUnlocked sometimes:
            // Explicitly unlock all nodes that have alwaysUnlocked == true
            root.each(n => {
                if (n.content.alwaysUnlocked) {
                    n.content.quietUnlock();
                }
            });
        });
    } else {
        print("[BnB] ERROR: planet=" + planet + ", root=" + root);
    }
}); // End ContentInitEvent
