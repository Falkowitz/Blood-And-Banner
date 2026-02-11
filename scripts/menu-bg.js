// scripts/menu-bg.js

Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");
        const spritesRoot = mod.root.child("sprites").child("main menu");

        let backgrounds = [];
        let cache = {};

        // Discover backgrounds directly in sprites folder
        const legacy = spritesRoot.child("main-menu.png");
        if (legacy.exists()) backgrounds.push(legacy);

        let index = 1;
        while (true) {
            let f = spritesRoot.child("main-menu" + index + ".png");
            if (f.exists()) {
                backgrounds.push(f);
                index++;
            } else {
                break;
            }
        }

        print("[BnB] Found " + backgrounds.length + " menu backgrounds.");

        if (backgrounds.length > 0) {
            let currentImage = null;

            const getDrawable = (file) => {
                let path = file.path();
                if (cache[path]) return cache[path];

                try {
                    let p = new Pixmap(file);
                    let tex = new Texture(p);
                    tex.setFilter(Texture.TextureFilter.linear);
                    p.dispose();

                    let drawable = new TextureRegionDrawable(new TextureRegion(tex));
                    cache[path] = drawable;
                    return drawable;
                } catch (err) {
                    print("[BnB] Failed to load background: " + file.name() + " -> " + err);
                    return null;
                }
            };

            const displayBackground = (bgFile, animate) => {
                try {
                    if (Vars.ui.menuGroup == null || Vars.ui.menuGroup.getChildren().isEmpty()) return;
                    let wrapper = Vars.ui.menuGroup.getChildren().get(0);

                    let drawable = getDrawable(bgFile);
                    if (drawable == null) return;

                    const Act = (typeof Actions !== 'undefined') ? Actions : null;

                    if (!animate || !currentImage || currentImage.parent != wrapper) {
                        // Clear existing
                        let children = wrapper.getChildren();
                        for (let i = children.size - 1; i >= 0; i--) {
                            let child = children.get(i);
                            if (child && (child.name == "bnb-bg" || child.name == "bnb-bg-next")) {
                                child.remove();
                            }
                        }

                        currentImage = new Image(drawable);
                        currentImage.name = "bnb-bg";
                        currentImage.setFillParent(true);
                        currentImage.setScaling(Scaling.fill);
                        currentImage.touchable = Touchable.disabled;

                        // Above vanilla renderer (0), below UI tables
                        wrapper.addChildAt(Math.min(wrapper.getChildren().size, 1), currentImage);
                    } else if (Act) {
                        // Crossfade animation
                        let nextImage = new Image(drawable);
                        nextImage.name = "bnb-bg-next";
                        nextImage.setFillParent(true);
                        nextImage.setScaling(Scaling.fill);
                        nextImage.touchable = Touchable.disabled;
                        nextImage.color.a = 0;

                        let currentIndex = wrapper.getChildren().indexOf(currentImage);
                        wrapper.addChildAt(currentIndex + 1, nextImage);

                        nextImage.addAction(Act.sequence(
                            Act.fadeIn(1.5),
                            Act.run(new java.lang.Runnable({
                                run: () => {
                                    if (currentImage) currentImage.remove();
                                    currentImage = nextImage;
                                    currentImage.name = "bnb-bg";
                                }
                            }))
                        ));
                    }
                } catch (err) {
                    print("[BnB] BG Swap Error: " + err);
                }
            };

            let inMenu = false;
            let slideshowTask = null;

            const handleEntry = () => {
                if (inMenu) return;
                inMenu = true;

                let randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
                displayBackground(randomBg, false);

                if (backgrounds.length > 1) {
                    slideshowTask = Timer.schedule(() => {
                        if (!inMenu || !Vars.state.isMenu()) return;
                        let nextBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
                        displayBackground(nextBg, true);
                    }, 15, 15);
                }
            };

            const handleExit = () => {
                inMenu = false;
                if (slideshowTask) {
                    slideshowTask.cancel();
                    slideshowTask = null;
                }
            };

            Events.on(StateChangeEvent, e => {
                if (e.to == GameState.State.menu) {
                    handleEntry();
                } else {
                    handleExit();
                }
            });

            if (Vars.state.isMenu()) {
                handleEntry();
            }

        } else {
            print("[BnB] Warning: No menu backgrounds found in sprites folder.");
        }
    } catch (e) {
        print("[BnB] MENU BG ERROR: " + e);
    }
});
