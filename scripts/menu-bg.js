// main menu background slideshow with crossfade
Events.on(ClientLoadEvent, e => {
    try {
        const mod = Vars.mods.getMod("bnb");
        const spritesRoot = mod.root.child("sprites").child("main menu");

        let backgrounds = [];
        let cache = {};

        // discover backgrounds: main-menu.png, main-menu1.png, main-menu2.png, ...
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
                        // clear old backgrounds
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

                        // above vanilla renderer, below UI
                        wrapper.addChildAt(Math.min(wrapper.getChildren().size, 1), currentImage);
                    } else if (Act) {
                        // crossfade to new image
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
                } catch (err) { }
            };

            let inMenu = false;
            let slideshowTask = null;

            const handleEntry = () => {
                if (inMenu) return;
                inMenu = true;

                let randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
                displayBackground(randomBg, false);

                // rotate every 15 seconds
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

        } else { }
    } catch (e) { }
});
