// blood splatter + corpse spawning on unit damage

global.organicUnits = new Set();
global.bloodEffectDelay = 1.0; // seconds between blood spawns per unit

global.infantryUnits = new Set();
global.cavalryUnits = new Set();
global.corpseSpawnDelay = 1.0; // seconds between corpse spawns per unit
global.corpseSpawnAmount = 2;

var lastBloodTime = {};
var lastCorpseTime = {};

global.registerOrganicUnit = function (unitTypeName) {
    global.organicUnits.add(unitTypeName);
};

global.registerInfantryUnit = function (unitTypeName) {
    global.infantryUnits.add(unitTypeName);
    global.registerOrganicUnit(unitTypeName);
};

global.registerCavalryUnit = function (unitTypeName) {
    global.cavalryUnits.add(unitTypeName);
    global.registerOrganicUnit(unitTypeName);
};

// 60 second lifetime blood splat
const bloodEffect = new Effect(3600, e => {
    Draw.z(Layer.debris);
    Draw.color(Color.valueOf("880808"));
    Draw.alpha(1.0 - e.fin(Interp.fade));

    let reg = Core.atlas.find("bnb-blood");
    let size = 6.0 * Mathf.randomSeed(e.id, 0.5, 1.5);
    Draw.rect(reg, e.x, e.y, size, size, e.rotation);
    Draw.reset();
});

Events.on(UnitDamageEvent, e => {
    if (!e.unit) return;
    if (!global.organicUnits.has(e.unit.type.name)) return;

    // throttle blood spawns
    let now = Time.time;
    let lastTime = lastBloodTime[e.unit.id] || 0;
    let delayTicks = global.bloodEffectDelay * 60;

    if (now - lastTime < delayTicks) {
        return;
    }

    lastBloodTime[e.unit.id] = now;

    // random scatter offset
    let offsetX = Mathf.range(4);
    let offsetY = Mathf.range(4);
    let bloodX = e.unit.x + offsetX;
    let bloodY = e.unit.y + offsetY;

    bloodEffect.at(bloodX, bloodY, Mathf.random(360));

    // corpse spawning
    let spawnCorpses = false;
    let corpseUnitName = null;

    if (global.infantryUnits.has(e.unit.type.name)) {
        spawnCorpses = true;
        corpseUnitName = "bnb-dead-man";
    } else if (global.cavalryUnits.has(e.unit.type.name)) {
        spawnCorpses = true;
        corpseUnitName = "bnb-dead-man-horse";
    }

    if (spawnCorpses && corpseUnitName) {
        let lastCTime = lastCorpseTime[e.unit.id] || 0;
        let corpseDelayTicks = global.corpseSpawnDelay * 60;

        if (now - lastCTime >= corpseDelayTicks) {
            lastCorpseTime[e.unit.id] = now;
            let corpseType = Vars.content.getByName(ContentType.unit, corpseUnitName);

            if (corpseType) {
                for (let i = 0; i < global.corpseSpawnAmount; i++) {
                    let cOffsetX = Mathf.range(5);
                    let cOffsetY = Mathf.range(5);

                    let corpse = corpseType.create(e.unit.team);
                    if (corpse) {
                        corpse.set(e.unit.x + cOffsetX, e.unit.y + cOffsetY);
                        corpse.rotation = Mathf.random(360);
                        corpse.add();
                    }
                }
            }
        }
    }
});

// cleanup tracking on unit death
Events.on(UnitDestroyEvent, e => {
    if (e.unit) {
        if (lastBloodTime[e.unit.id]) delete lastBloodTime[e.unit.id];
        if (lastCorpseTime[e.unit.id]) delete lastCorpseTime[e.unit.id];
    }
});

// auto-register units from UNIT_CATEGORIES (siege units don't bleed)
global.bloodEffectDelay = 1.0;

for (var unitName in global.UNIT_CATEGORIES) {
    var cat = global.UNIT_CATEGORIES[unitName];
    if (cat === "infantry") {
        global.registerInfantryUnit(unitName);
    } else if (cat === "cavalry") {
        global.registerCavalryUnit(unitName);
    }
}
