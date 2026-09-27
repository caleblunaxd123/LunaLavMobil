/**
 * Proveedor de mapas. Por defecto usa los mapas públicos de OpenStreetMap (como la web), que tienen
 * límites de uso: para producción conviene un proveedor con clave, por ejemplo MapTiler:
 *   EXPO_PUBLIC_MAP_TILE_URL=https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=TU_CLAVE
 *   EXPO_PUBLIC_MAP_ATTRIBUTION=© MapTiler © OpenStreetMap
 */
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_TILE_URL = process.env.EXPO_PUBLIC_MAP_TILE_URL?.trim() || OSM_TILES;
export const MAP_ATTRIBUTION = process.env.EXPO_PUBLIC_MAP_ATTRIBUTION?.trim()
  || (MAP_TILE_URL === OSM_TILES ? '&copy; OpenStreetMap' : '&copy; OpenStreetMap contributors');
