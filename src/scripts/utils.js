/**
 * Flattens a nested array
 *
 * Example:
 * [['a'], ['b']].flatten() -> ['a', 'b']
 *
 * @param {Array} arr A nested array
 * @returns {Array} A flattened array
 */
export const flattenArray = arr => arr.concat.apply([], arr);