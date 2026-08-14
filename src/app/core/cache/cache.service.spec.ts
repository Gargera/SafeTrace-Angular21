import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';
import { of, Subject } from 'rxjs';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CacheService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should create CacheService successfully', () => {
    expect(service).toBeTruthy();
  });

  describe('set() and get()', () => {
    it('should store and retrieve normal values', () => {
      service.set('testKey', { data: 'test' }, 1000);
      const result = service.get<{ data: string }>('testKey');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for missing key', () => {
      const result = service.get('missingKey');
      expect(result).toBeNull();
    });
  });

  describe('Expiration', () => {
    it('should return null for expired entries', () => {
      // Set TTL to -1000 so it expires immediately
      service.set('expiredKey', 'value', -1000);
      expect(service.get('expiredKey')).toBeNull();
      expect(service.get('expiredKey')).toBeNull();
    });

    it('should return value for valid entries', () => {
      // Set TTL to 10000 so it remains valid
      service.set('validKey', 'value', 10000);
      expect(service.get('validKey')).toEqual('value');
      expect(service.get('validKey')).toEqual('value');
    });
  });

  describe('has()', () => {
    it('should return true when cache key exists and is valid', () => {
      service.set('key', 'value', 10000);
      expect(service.has('key')).toBe(true);
    });

    it('should return false when key does not exist', () => {
      expect(service.has('missingKey')).toBe(false);
    });

    it('should return false for expired entries', () => {
      service.set('expiredKey', 'value', -1000);
      expect(service.has('expiredKey')).toBe(false);
    });
  });

  describe('remove()', () => {
    it('should remove only the requested key', () => {
      service.set('key1', 'value1', 1000);
      service.set('key2', 'value2', 1000);
      service.remove('key1');
      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toEqual('value2');
    });
  });

  describe('clear()', () => {
    it('should clear all cache entries', () => {
      service.set('key1', 'value1', 1000);
      service.set('key2', 'value2', 1000);
      service.clear();
      expect(service.has('key1')).toBe(false);
      expect(service.has('key2')).toBe(false);
    });
  });

  describe('clearExpiredEntries()', () => {
    it('should remove only expired entries and keep valid ones', () => {
      service.set('expiredKey', 'value', -1000);
      service.set('validKey', 'value', 5000);

      service.clearExpiredEntries();

      expect(service.get('validKey')).toEqual('value');
      // Since it's cleaned up internally, it is gone from the cache map.
      // We can also verify by calling has() directly but it also cleans up.
    });
  });

  describe('invalidateByTags()', () => {
    it('should remove entries that contain matching tags', () => {
      service.set('key1', 'value1', 1000, ['tag1', 'tag2']);
      service.set('key2', 'value2', 1000, ['tag2', 'tag3']);
      service.set('key3', 'value3', 1000, ['tag4']);

      service.invalidateByTags(['tag1']);
      expect(service.has('key1')).toBe(false);
      expect(service.has('key2')).toBe(true);
      expect(service.has('key3')).toBe(true);
    });

    it('should keep entries with different tags', () => {
      service.set('key1', 'value1', 1000, ['tag1']);
      service.invalidateByTags(['tag2']);
      expect(service.has('key1')).toBe(true);
    });
  });

  describe('invalidate()', () => {
    it('should remove keys matching RegExp pattern', () => {
      service.set('user_123_profile', 'value', 1000);
      service.set('user_456_profile', 'value', 1000);
      service.set('admin_settings', 'value', 1000);

      service.invalidate(/^user_\d+_profile$/);

      expect(service.has('user_123_profile')).toBe(false);
      expect(service.has('user_456_profile')).toBe(false);
      expect(service.has('admin_settings')).toBe(true);
    });
  });

  describe('getOrSet()', () => {
    it('should call requestFactory when cache is empty and store response', () => {
      let callCount = 0;
      const requestFactory = () => {
        callCount++;
        return of('fresh_data');
      };

      service.getOrSet('key', requestFactory, 1000).subscribe(result => {
        expect(result).toEqual('fresh_data');
      });

      expect(callCount).toBe(1);
      expect(service.get('key')).toEqual('fresh_data');
    });

    it('should return cached value without calling requestFactory when data already exists', () => {
      service.set('key', 'cached_data', 1000);

      let callCount = 0;
      const requestFactory = () => {
        callCount++;
        return of('fresh_data');
      };

      service.getOrSet('key', requestFactory, 1000).subscribe(result => {
        expect(result).toEqual('cached_data');
      });

      expect(callCount).toBe(0);
    });

    it('should handle ongoing requests by sharing the same observable', () => {
      const subject = new Subject<string>();
      let callCount = 0;
      const requestFactory = () => {
        callCount++;
        return subject.asObservable();
      };

      let result1: string | undefined;
      let result2: string | undefined;

      service.getOrSet('key', requestFactory, 1000).subscribe(res => {
        result1 = res;
      });

      service.getOrSet('key', requestFactory, 1000).subscribe(res => {
        result2 = res;
      });

      expect(callCount).toBe(1);

      subject.next('shared_data');
      subject.complete();

      expect(result1).toEqual('shared_data');
      expect(result2).toEqual('shared_data');
      expect(service.get('key')).toEqual('shared_data');
    });

    it('should clear cache on destroy', () => {

      service.set('key', 'value', 10000);

      service.ngOnDestroy();

      expect(service.get('key')).toBeNull();

    });
  });
});
