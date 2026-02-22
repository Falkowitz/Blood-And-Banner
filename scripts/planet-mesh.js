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

// 3. ARCHIPELAGOS
var ISLAND_SCL = 4.5;
var ISLAND_MAG = 0.6;
var ISLAND_THRESH = 0.55;

// Detail noise
var DETAIL_SCL = 0.12;
var DETAIL_MAG = 0.08;

// Micro-Roughness (Rock/Coastline detail)
var MICRO_SCL = 0.05;
var MICRO_MAG = 0.025;

var OCTAVES = 8; // Slightly more detail
var PERSISTENCE = 0.5;
var VAR_SEED = SEED + 100;

// ===== MOON SETTINGS =====
var COL_MOON_BASE = Color.valueOf("999999");
var COL_MOON_CRATER = Color.valueOf("777777");
var COL_MOON_HIGH = Color.valueOf("bbbbbb");

// ===== RIDGED NOISE HELPER =====
function ridgedNoise(pos, scale, seedOffset) {
    var n = Simplex.noise3d(
        SEED + seedOffset, 4, 0.5,
        1.0 / scale,
        5.0 + pos.x, 5.0 + pos.y, 5.0 + pos.z
    );
    return Math.pow(1.0 - Math.abs(n), 4.0); // Power 4 for even sharper peaks
}

// ===== RAW HEIGHT =====
function rawHeight(pos) {
    // 1. Main Continents
    var hBase = Simplex.noise3d(
        SEED, OCTAVES, PERSISTENCE,
        1.0 / NOISE_SCL,
        5.0 + pos.x, 5.0 + pos.y, 5.0 + pos.z
    );
    hBase = (hBase + 1.1) / 2.2;
    hBase = Math.pow(Math.max(0, hBase), NOISE_POW) * NOISE_MULT;

    // 2. Island Arcs
    var hIslands = ridgedNoise(pos, ISLAND_SCL, 50) * ISLAND_MAG;

    // Combine
    var hCombined = Math.max(hBase, hIslands + 0.3);

    // 3. Detail/Roughness
    var detail = Simplex.noise3d(
        SEED + 5, 3, 0.5,
        1.0 / DETAIL_SCL,
        pos.x, pos.y, pos.z
    );

    // 4. Micro-roughness (Jaggedness)
    var micro = Simplex.noise3d(
        SEED + 82, 2, 0.5,
        1.0 / MICRO_SCL,
        pos.x, pos.y, pos.z
    );

    return hCombined + (detail * DETAIL_MAG) + (micro * MICRO_MAG);
}

// ===== MOON HEIGHT =====
function moonGetHeight(pos) {
    // 1. Base jaggedness (massive frequency and magnitude)
    var h = Simplex.noise3d(SEED + 12, 5, 0.6, 1.5, pos.x, pos.y, pos.z);

    // 2. High-frequency Micro-bumps (intense jitter)
    var bumps = Simplex.noise3d(SEED + 44, 4, 0.6, 10.0, pos.x, pos.y, pos.z);

    // 3. Extreme sharp ridges (ridged noise)
    var sharp = ridgedNoise(pos, 0.25, 99) * 0.4;

    // 4. Large impact depressions
    var impact = ridgedNoise(pos, 1.2, 77) * 0.5;

    // Result: Combined extreme ruggedness
    return 1.0 + (h * 0.4) + (bumps * 0.15) + sharp - impact;
}

// ===== MOON COLOR =====
function moonGetColor(pos, out) {
    // Small-scale mottled noise for "all over" distribution
    // Densify frequency significantly for the small moon
    var freq = 6.0;
    var n1 = Simplex.noise3d(SEED + 500, 3, 0.5, freq, pos.x, pos.y, pos.z);
    var n2 = Simplex.noise3d(SEED + 888, 3, 0.6, freq * 2.5, pos.x, pos.y, pos.z);

    var val = n1 * 0.6 + n2 * 0.4;

    // Distribute variety over entire surface
    if (val < -0.15) {
        out.set(COL_MOON_CRATER); // Dark mottling
    } else if (val > 0.3) {
        out.set(COL_MOON_HIGH);   // Light mottling
    } else {
        out.set(COL_MOON_BASE);   // Mid grey
    }

    // Heavy grit for texture
    var grit = Simplex.noise3d(SEED + 777, 2, 0.55, 20.0, pos.x, pos.y, pos.z) * 0.15;
    out.mul(1.0 + grit);
    out.a = 1.0;
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

    // Noise-based blending for biome borders
    var bNoise = Simplex.noise3d(SEED + 9, 2, 0.5, 2.5, pos.x, pos.y, pos.z) * 0.03;
    var ht = h + bNoise;

    if (ht < 0.52) { // Deep ocean
        out.set(COL_DEEP_OCEAN).mul(0.85); // Slightly darker
    } else if (ht < 0.58) { // Transition ocean
        out.set(COL_DEEP_OCEAN);
    } else if (ht < WATER_LEVEL) { // Shallow water
        out.set(COL_SHALLOW);
    } else if (ht < WATER_LEVEL + 0.04) { // Beach
        out.set(COL_SAND);
    } else if (ht < 0.74) { // Lowlands
        if (v > 0.15) {
            out.set(COL_TROPICS);
        } else {
            out.set(COL_GRASS);
        }
    } else if (ht < 0.86) { // Forest/Hills
        if (v < -0.2) {
            out.set(COL_HILLS);
        } else {
            out.set(COL_FOREST);
        }
    } else if (ht < 0.96) { // High Hills
        out.set(COL_HILLS);
    } else if (ht < 1.12) { // Mountains
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

    var moon = Vars.content.planet("bnb-eloriel");
    if (moon == null) moon = Vars.content.planet("eloriel");

    if (kaelthas != null) {
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
                    if (name == "toString") return "JS_HexMesher_Proxy_Kaelthas";
                    return null;
                }
            })
        );

        kaelthas.meshLoader = prov(function () {
            try {
                return new HexMesh(kaelthas, mesher, 6, Shaders.planet);
            } catch (err) {
                return new ShaderSphereMesh(kaelthas, Shaders.planet, 2);
            }
        });

        kaelthas.cloudMeshLoader = prov(function () {
            // Varied transparency: dense base (100%), mid (75%), wispy top (50%)
            return new MultiMesh(
                new HexSkyMesh(kaelthas, 11, 0.15, 0.13, 5, Color.valueOf("eafffdff"), 2, 0.45, 0.9, 0.40),
                new HexSkyMesh(kaelthas, 1, 0.6, 0.16, 6, Color.valueOf("eafffdbf"), 2, 0.45, 1.2, 0.35),
                new HexSkyMesh(kaelthas, 42, 0.3, 0.18, 7, Color.valueOf("eafffd80"), 3, 0.5, 1.8, 0.30)
            );
        });

        kaelthas.reloadMesh();
        kaelthas.cloudMesh = kaelthas.cloudMeshLoader.get();
        print("[BnB] Kaelthas Mesh Loaded");
    }

    if (moon != null) {
        var moonMesher = java.lang.reflect.Proxy.newProxyInstance(
            Vars.content.getClass().getClassLoader(),
            [HexMesher],
            new java.lang.reflect.InvocationHandler({
                invoke: function (proxy, method, args) {
                    var name = method.getName();
                    if (name == "getHeight") return new java.lang.Float(moonGetHeight(args[0]));
                    if (name == "getColor") { moonGetColor(args[0], args[1]); return null; }
                    if (name == "isEmissive") return new java.lang.Boolean(false);
                    if (name == "skip") return new java.lang.Boolean(false);
                    if (name == "toString") return "JS_HexMesher_Proxy_Eloriel";
                    return null;
                }
            })
        );

        moon.meshLoader = prov(function () {
            try {
                return new HexMesh(moon, moonMesher, 4, Shaders.planet); // Lowered divisions to reduce lag
            } catch (err) {
                return new ShaderSphereMesh(moon, Shaders.planet, 1);
            }
        });

        moon.reloadMesh();
    }

    // Hide vanilla planets from campaign selection
    var serpulo = Vars.content.planet("serpulo");
    var erekir = Vars.content.planet("erekir");

    if (serpulo) {
        serpulo.alwaysUnlocked = false;
        serpulo.accessible = false;
        serpulo.sectors.clear();
        print("[BnB] Hid Serpulo from campaign selection");
    }

    if (erekir) {
        erekir.alwaysUnlocked = false;
        erekir.accessible = false;
        erekir.sectors.clear();
        print("[BnB] Hid Erekir from campaign selection");
    }
});
