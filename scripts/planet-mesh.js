// scripts/planet-mesh.js
// Custom HexMesher for Kaelthas — height-based biome system
// Using Java Proxy to guarantee interface implementation

// ===== BIOME COLORS =====
var COL_DEEP_OCEAN = Color.valueOf("5b99a6");
var COL_SHALLOW = Color.valueOf("a3c9cc");
var COL_SAND = Color.valueOf("ffe69b");
var COL_GRASS = Color.valueOf("687f64");
var COL_TROPICS = Color.valueOf("7ca85a");
var COL_FOREST = Color.valueOf("5b7f6b");
var COL_HILLS = Color.valueOf("3e322f");
var COL_MOUNTAINS = Color.valueOf("4a4b53");
var COL_SNOW = Color.valueOf("f0f0f0");

// ===== TUNING KNOBS =====
var SEED = 187; // Kept the seed user requested

// 1. WATER_LEVEL: 
var WATER_LEVEL = 0.63;

// 2. MAIN CONTINENTS
var NOISE_SCL = 1.8;
var NOISE_POW = 2.4;
var NOISE_MULT = 1.3;

// 3. ARCHIPELAGOS (Japan/Indonesia style)
var ISLAND_SCL = 4.5;   // Higher frequency = smaller islands
var ISLAND_MAG = 0.6;   // Height contribution
var ISLAND_THRESH = 0.55;  // Threshold to appear

// Detail noise
var DETAIL_SCL = 0.12;
var DETAIL_MAG = 0.08;

var OCTAVES = 7;
var PERSISTENCE = 0.48;
var VAR_SEED = SEED + 100;

// ===== RIDGED NOISE HELPER =====
// Creates sharp, linear mountains/islands (like mid-ocean ridges or island arcs)
function ridgedNoise(pos, scale, seedOffset) {
    var n = Simplex.noise3d(
        SEED + seedOffset, 4, 0.5,
        1.0 / scale,
        5.0 + pos.x, 5.0 + pos.y, 5.0 + pos.z
    );
    // Map [-1, 1] to [0, 1] then invert absolute value to get ridge at 0
    // abs(n) is 0 at crossing 0. 
    // 1 - abs(n) creates peaks where noise was 0.
    return Math.pow(1.0 - Math.abs(n), 3.0); // Power 3 makes ridges sharper/thinner
}

// ===== RAW HEIGHT =====
function rawHeight(pos) {
    // 1. Main Continents (Blobby, large)
    var hBase = Simplex.noise3d(
        SEED, OCTAVES, PERSISTENCE,
        1.0 / NOISE_SCL,
        5.0 + pos.x, 5.0 + pos.y, 5.0 + pos.z
    );
    // Normalize base: [-1,1] -> [0,1]
    hBase = (hBase + 1.1) / 2.2;
    hBase = Math.pow(Math.max(0, hBase), NOISE_POW) * NOISE_MULT;

    // 2. Island Arcs (Ridged noise)
    // Creates chains of islands independent of continents
    var hIslands = ridgedNoise(pos, ISLAND_SCL, 50) * ISLAND_MAG;

    // Mask islands to appear only in certain 'chaotic' areas (optional, to avoid global noise)
    // But simple addition or max works well for archipelagos.

    // Combine: Max of continent OR island chain
    // This allows islands to exist in deep oceans
    var hCombined = Math.max(hBase, hIslands + 0.3); // +0.3 to boost islands up to sea level 

    // 3. Detail/Roughness (applied to everything)
    var detail = Simplex.noise3d(
        SEED + 5, 3, 0.5,
        1.0 / DETAIL_SCL,
        pos.x, pos.y, pos.z
    );

    return hCombined + (detail * DETAIL_MAG);
}

// ===== HEIGHT for mesh (clamped at water level) =====
function meshGetHeight(pos) {
    return Math.max(rawHeight(pos), WATER_LEVEL);
}

// ===== COLOR for mesh (height → biome) =====
function meshGetColor(pos, out) {
    var h = rawHeight(pos);
    var v = Simplex.noise3d(
        VAR_SEED, 3, 0.5, 1.2,
        5.0 + pos.x, 5.0 + pos.y, 5.0 + pos.z
    );

    if (h < 0.55) { // Deep ocean
        out.set(COL_DEEP_OCEAN);
    } else if (h < WATER_LEVEL) { // Shallow water
        out.set(COL_SHALLOW);
    } else if (h < 0.68) { // Beach/Sand
        out.set(COL_SAND);
    } else if (h < 0.76) { // Lowlands
        if (v > 0.15) {
            out.set(COL_TROPICS);
        } else {
            out.set(COL_GRASS);
        }
    } else if (h < 0.88) { // Forest/Hills
        if (v < -0.2) {
            out.set(COL_HILLS);
        } else {
            out.set(COL_FOREST);
        }
    } else if (h < 0.98) { // High Hills/Lower Mountains
        out.set(COL_HILLS);
    } else if (h < 1.15) { // Mountains
        out.set(COL_MOUNTAINS);
    } else { // Peaks
        out.set(COL_SNOW);
    }
    out.a = 1.0;
}

// ===== HOOK: ClientLoadEvent =====
Events.on(ClientLoadEvent, function (e) {
    var kaelthas = Vars.content.planet("bnb-kaelthas");
    if (kaelthas == null) kaelthas = Vars.content.planet("kaelthas");
    if (kaelthas == null) return;

    var planet = kaelthas;

    var mesher = java.lang.reflect.Proxy.newProxyInstance(
        Vars.content.getClass().getClassLoader(),
        [HexMesher],
        new java.lang.reflect.InvocationHandler({
            invoke: function (proxy, method, args) {
                var name = method.getName();
                if (name == "getHeight") return new java.lang.Float(meshGetHeight(args[0]));
                if (name == "getColor") { meshGetColor(args[0], args[1]); return null; }
                if (name == "isEmissive") return new java.lang.Boolean(false);
                if (name == "skip") return new java.lang.Boolean(false);
                if (name == "toString") return "JS_HexMesher_Proxy";
                return null;
            }
        })
    );

    planet.meshLoader = prov(function () {
        try {
            return new HexMesh(planet, mesher, 6, Shaders.planet);
        } catch (err) {
            return new ShaderSphereMesh(planet, Shaders.planet, 2);
        }
    });

    planet.cloudMeshLoader = prov(function () {
        return new MultiMesh(
            new HexSkyMesh(planet, 11, 0.15, 0.13, 5, Color.valueOf("eafffd7e"), 2, 0.45, 1.35, 0.35),
            new HexSkyMesh(planet, 1, 0.6, 0.16, 5, Color.valueOf("eafffd7e"), 2, 0.45, 1.55, 0.38)
        );
    });

    planet.reloadMesh();
    planet.cloudMesh = planet.cloudMeshLoader.get();
});
