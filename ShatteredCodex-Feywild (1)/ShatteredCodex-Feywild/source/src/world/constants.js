export const N = 1025;          // heightmap samples per side
export const CELL = 2;          // meters per sample
export const HALF = 1024;       // half world size in meters
export const WORLD_SIZE = 2048;
export const COARSE = 32;       // WFC grid
export const COARSE_CELL = 64;  // meters per WFC cell

export const SEASON = { SPRING: 0, SUMMER: 1, AUTUMN: 2, WINTER: 3 };
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
// angle centres (radians, atan2(z,x)), clockwise from above: spring NW, summer NE, autumn SE, winter SW
export const SEASON_ANGLES = [-3 * Math.PI / 4, -Math.PI / 4, Math.PI / 4, 3 * Math.PI / 4];

export const WATER_NONE = 0, WATER_OCEAN = 1, WATER_LAKE = 2, WATER_RIVER = 3;
export const WTYPE_WATER = 0, WTYPE_LAVA = 1, WTYPE_ICE = 2;

export const TREE_KINDS = ['oak', 'birch', 'blossom', 'maple', 'pine', 'dead', 'crystal', 'flower', 'mushroom', 'willow'];
