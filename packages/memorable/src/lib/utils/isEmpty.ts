/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function isEmpty(object: any) {
  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
}
