/**
 * Convert a list of [key, value] tuples to an object.
 */
export function strObjFromTuples(tuples: [string, string][]): { [key: string]: string } {
  let obj: { [key: string]: string } = {};
  for (const t of tuples) {
    obj[t[0]] = t[1];
  }

  return obj;
}
