// scripts/menu-bg.js



Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");
        const spritesRoot = mod.root.child("sprites");

        // 1. DISCOVER BACKGROUNDS
        let backgrounds = [];

        // Check main-menu.png (Default/Legacy)
        let legacy = spritesRoot.child("main-menu.png");
        if (legacy.exists()) backgrounds.push(legacy);

        // Check main-menu1.png, main-menu2.png, ...
        let index = 1;
        while (true) {
            let f = spritesRoot.child("main-menu" + index + ".png");
            if (f.exists()) {
                backgrounds.push(f);
                index++;
            } else {
                break; // Stop at first missing number
            }
        }

        print("[BnB] Found " + backgrounds.length + " menu backgrounds.");

        if (backgrounds.length > 0) {
            // 2. DEFINE SWAP FUNCTION
            const randomizeBackground = () => {
                try {
                    // Pick random file
                    const bgFile = backgrounds[Math.floor(Math.random() * backgrounds.length)];
                    print("[BnB] Applying background: " + bgFile.name());

                    // Load Texture
                    const tex = new Texture(new Pixmap(bgFile));
                    const region = new TextureRegion(tex);

                    // Find or Create Background Element
                    if (Vars.ui.menuGroup.getChildren().size > 0) {
                        const wrapper = Vars.ui.menuGroup.getChildren().get(0);

                        if (wrapper.getChildren().size > 0) {
                            const firstChild = wrapper.getChildren().get(0);

                            if (firstChild.name == "bnb-bg" && firstChild instanceof Image) {
                                // Already has our background -> Just update Drawable
                                firstChild.setDrawable(region);
                                // Also update scaling just in case
                                firstChild.setScaling(Scaling.fill);
                            } else {
                                // Replace old renderer
                                if (!(firstChild instanceof Image) || firstChild.name != "bnb-bg") {
                                    // Remove the old one if it's the renderer or a plain image from before
                                    firstChild.remove();
                                }

                                const bgImage = new Image(region);
                                bgImage.name = "bnb-bg"; // Tag it
                                bgImage.setFillParent(true);
                                bgImage.setScaling(Scaling.fill);
                                bgImage.touchable = Touchable.disabled;
                                wrapper.addChildAt(0, bgImage);
                                bgImage.toBack();
                            }
                        }
                    }
                } catch (err) {
                    print("[BnB] BG Swap Error: " + err);
                }
            };

            // 3. APPLY ON ENTRY
            let inMenu = false;
            const handleEntry = () => {
                if (inMenu) return;
                inMenu = true;
                randomizeBackground();
            };

            // 4. TRIGGER ON START OR RETURN
            Events.on(StateChangeEvent, e => {
                if (e.to == GameState.State.menu) {
                    handleEntry();
                } else {
                    inMenu = false; // Reset when leaving
                }
            });

            // Catch initial load
            if (Vars.state.is(GameState.State.menu)) {
                handleEntry();
            }

        } else {
            print("[BnB] Warning: No 'main-menu*.png' files found.");
        }
    } catch (e) {
        print("[BnB] MENU BG ERROR: " + e);
    }
});
