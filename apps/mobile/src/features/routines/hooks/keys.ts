/** A tank's routines, each one's detail and occurrences sit under this key. */
export const routinesKey = (tankId: number): readonly unknown[] => ['tanks', tankId, 'routines'];

export const routineKey = (tankId: number, routineId: number): readonly unknown[] => [
  ...routinesKey(tankId),
  routineId,
];

export const historyKey = (tankId: number): readonly unknown[] => ['tanks', tankId, 'routine-history'];
