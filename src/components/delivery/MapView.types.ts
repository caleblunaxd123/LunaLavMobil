export interface MapViewProps {
  latitude?: number | null;
  longitude?: number | null;
  height?: number;
  /** false: solo muestra el punto (sin mover ni tocar). */
  interactive?: boolean;
  /** Se llama al tocar el mapa con el nuevo punto. */
  onPick?: (latitude: number, longitude: number) => void;
  zoom?: number;
}
