import { useCallback, useEffect } from 'react';
import { useNetworkConfg } from '../../../NetworkConfig/NetworkConfigProvider';

/**
 * The list of cache keys used in the app.
 *
 * To avoid weird caching bugs, hardcoding
 * keys should be avoided, always add the
 * cache key here.
 */
export enum CacheKeys {
  FAVORITES = 'favorites',
  AUDIT_WARNING_SHOWN = 'audit_warning_shown',
  // name.eth -> 0x0 caching
  ENS_RESOLVE_PREFIX = 'ens_resolve_',
  // 0x0 -> name.eth caching
  ENS_LOOKUP_PREFIX = 'ens_lookup_',
}

/**
 * Useful defaults for cache expiration minutes.
 */
export enum CacheExpiry {
  NEVER = -1,
  ONE_HOUR = 60,
  ONE_DAY = ONE_HOUR * 24,
  ONE_WEEK = ONE_DAY * 7,
}

/**
 * Cache default values.
 *
 * Cache keys are not required to have a default value, but
 * note than without one the cache will return null until
 * a value is set.
 */
const CACHE_DEFAULTS = [
  {
    key: CacheKeys.FAVORITES,
    defaultValue: Array<string>(),
    expiration: CacheExpiry.NEVER,
  },
  {
    key: CacheKeys.AUDIT_WARNING_SHOWN,
    defaultValue: true, // TODO never show, we may bring this back in the future...
    expiration: CacheExpiry.NEVER,
  },
];

interface IStorageValue {
  value: any;
  expiration: number;
}

function keyInternal(chainId: number, key: string): string {
  return 'fractal_' + chainId + '_' + key;
}

/**
 * A hook which returns a getter and setter for local storage cache,
 * with an optional expiration (in minutes) param.
 *
 * Each value set/get is specific to the currently connected chainId.
 *
 * The default expiration is 1 week. Use CacheExpiry.NEVER to keep
 * the value cached indefinitely.
 *
 * All JSON parsing is done internally, you should only need to pass
 * the value, array, or object you would like to cache.
 */
export const useLocalStorage = () => {
  const { chainId } = useNetworkConfg();

  const setValue = useCallback(
    (key: string, value: any, expirationMinutes: number = CacheExpiry.ONE_WEEK) => {
      const val: IStorageValue = {
        value: value,
        expiration:
          expirationMinutes === CacheExpiry.NEVER
            ? CacheExpiry.NEVER
            : Date.now() + expirationMinutes * 60000,
      };
      localStorage.setItem(keyInternal(chainId, key), JSON.stringify(val));
    },
    [chainId]
  );

  const getValue = useCallback(
    (key: string) => {
      const rawVal = localStorage.getItem(keyInternal(chainId, key));
      if (rawVal) {
        const parsed: IStorageValue = JSON.parse(rawVal);
        if (parsed.expiration === CacheExpiry.NEVER) {
          return parsed.value;
        } else {
          if (parsed.expiration < Date.now()) {
            localStorage.removeItem(keyInternal(chainId, key));
            return null;
          } else {
            return parsed.value;
          }
        }
      } else {
        return null;
      }
    },
    [chainId]
  );

  /**
   * Sets cache default values, if we have not already done so.
   */
  useEffect(() => {
    CACHE_DEFAULTS.forEach(({ key, defaultValue, expiration }) => {
      if (getValue(key) === null) {
        setValue(key, defaultValue, expiration);
      }
    });
  }, [chainId, getValue, setValue]);

  return { setValue, getValue };
};
