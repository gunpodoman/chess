/**
 * Application-facing extension points. Implementations may later add account,
 * rating, match history, matchmaking, clock, friend, ranking, statistics, and
 * settings capabilities without changing the game view.
 *
 * @typedef {Object} FeatureServices
 * @property {Object=} account
 * @property {Object=} rating
 * @property {Object=} history
 * @property {Object=} matchmaking
 * @property {Object=} clock
 * @property {Object=} friends
 * @property {Object=} ranking
 * @property {Object=} statistics
 * @property {Object=} settings
 */

export function createFeatureServices(overrides = {}) {
  return Object.freeze({ ...overrides });
}
