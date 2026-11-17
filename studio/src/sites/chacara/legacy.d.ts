/* Tipos mínimos do construtor portado da maquete v9 (gerado). */
export function createChacara(THREE: typeof import('three'), P: unknown): {
  world: import('three').Group;
  layers: Record<string, import('three').Group>;
  ELS: Record<string, import('three').Group>;
  labels: { text: string; pos: import('three').Vector3; owner: import('three').Group | null }[];
  M: Record<string, import('three').Material>;
  P: any;
  H: (X: number, Z: number) => number;
  rebuild(): void;
};
