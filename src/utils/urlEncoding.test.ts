import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateId,
  encodePayloadToUrl,
  decodePayloadFromUrl,
  createShareUrl,
  createListFromPayload,
  createPayloadFromList,
} from './urlEncoding';
import { SharePayload, List } from '../types';

describe('urlEncoding utilities', () => {
  describe('generateId', () => {
    it('generates non-empty strings', () => {
      const id = generateId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100); // All unique
    });

    it('includes timestamp component', () => {
      const id = generateId();
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('encodePayloadToUrl and decodePayloadFromUrl', () => {
    it('encodes and decodes unranked payload correctly', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Test List',
        items: ['Item 1', 'Item 2', 'Item 3'],
      };

      const encoded = encodePayloadToUrl(payload);
      const decoded = decodePayloadFromUrl(encoded);

      expect(decoded).toEqual(payload);
    });

    it('encodes and decodes ranked payload correctly', () => {
      const payload: SharePayload = {
        type: 'ranked',
        name: 'Ranked List',
        items: ['First', 'Second', 'Third'],
      };

      const encoded = encodePayloadToUrl(payload);
      const decoded = decodePayloadFromUrl(encoded);

      expect(decoded).toEqual(payload);
    });

    it('encodes to URL-safe base64 (no + / =)', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Test',
        items: ['A', 'B'],
      };

      const encoded = encodePayloadToUrl(payload);

      expect(encoded).not.toMatch(/\+/);
      expect(encoded).not.toMatch(/\//);
      expect(encoded).not.toMatch(/=/);
    });

    it('handles special characters in names and items', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: '特殊字符 & émojis 🎉',
        items: ['Item with "quotes"', 'Item with <tags>', 'Line\nbreak'],
      };

      const encoded = encodePayloadToUrl(payload);
      const decoded = decodePayloadFromUrl(encoded);

      expect(decoded).toEqual(payload);
    });

    it('handles empty name', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: '',
        items: ['Item 1'],
      };

      const encoded = encodePayloadToUrl(payload);
      const decoded = decodePayloadFromUrl(encoded);

      expect(decoded).toEqual(payload);
    });

    it('handles empty items array', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Empty List',
        items: [],
      };

      const encoded = encodePayloadToUrl(payload);
      const decoded = decodePayloadFromUrl(encoded);

      expect(decoded).toEqual(payload);
    });

    it('returns null for invalid base64', () => {
      const decoded = decodePayloadFromUrl('!!!invalid!!!');
      expect(decoded).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      // Encode a plain string instead of JSON
      const invalidEncoded = btoa('not json').replace(/\+/g, '-').replace(/\//g, '_');
      const decoded = decodePayloadFromUrl(invalidEncoded);
      expect(decoded).toBeNull();
    });

    it('returns null for malformed payload structure', () => {
      const invalidPayload = { foo: 'bar' };
      const encoded = encodePayloadToUrl(invalidPayload as any);
      const decoded = decodePayloadFromUrl(encoded);
      expect(decoded).toBeNull();
    });

    it('returns null for missing type field', () => {
      const invalidPayload = { name: 'Test', items: [] };
      const encoded = encodePayloadToUrl(invalidPayload as any);
      const decoded = decodePayloadFromUrl(encoded);
      expect(decoded).toBeNull();
    });

    it('returns null for invalid type value', () => {
      const invalidPayload = { type: 'invalid', name: 'Test', items: [] };
      const encoded = encodePayloadToUrl(invalidPayload as any);
      const decoded = decodePayloadFromUrl(encoded);
      expect(decoded).toBeNull();
    });

    it('returns null for non-array items', () => {
      const invalidPayload = { type: 'unranked', name: 'Test', items: 'not an array' };
      const encoded = encodePayloadToUrl(invalidPayload as any);
      const decoded = decodePayloadFromUrl(encoded);
      expect(decoded).toBeNull();
    });

    it('handles very long item lists', () => {
      const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Long List',
        items,
      };

      const encoded = encodePayloadToUrl(payload);
      const decoded = decodePayloadFromUrl(encoded);

      expect(decoded).toEqual(payload);
    });

    it('logs error to console for decoding failures', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      decodePayloadFromUrl('!!!invalid!!!');

      expect(consoleSpy).toHaveBeenCalledWith('Error decoding payload:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('createShareUrl', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // Mock window.location
      delete (window as any).location;
      (window as any).location = {
        ...originalLocation,
        href: 'http://localhost:5173/',
      };
    });

    afterEach(() => {
      (window as any).location = originalLocation;
    });

    it('creates URL with data parameter', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Test',
        items: ['A', 'B'],
      };

      const url = createShareUrl(payload);

      expect(url).toContain('?data=');
      expect(url).toMatch(/^http:\/\/localhost:5173\/\?data=/);
    });

    it('clears existing search parameters', () => {
      window.location.href = 'http://localhost:5173/?old=param';

      const payload: SharePayload = {
        type: 'unranked',
        name: 'Test',
        items: ['A'],
      };

      const url = createShareUrl(payload);

      expect(url).not.toContain('old=param');
      expect(url).toContain('?data=');
    });

    it('creates URL that can be decoded back', () => {
      const payload: SharePayload = {
        type: 'ranked',
        name: 'Share Test',
        items: ['First', 'Second'],
      };

      const url = createShareUrl(payload);
      const urlObj = new URL(url);
      const dataParam = urlObj.searchParams.get('data');

      expect(dataParam).not.toBeNull();
      const decoded = decodePayloadFromUrl(dataParam!);
      expect(decoded).toEqual(payload);
    });
  });

  describe('createListFromPayload', () => {
    it('creates unranked list from payload', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Test List',
        items: ['Item 1', 'Item 2'],
      };

      const list = createListFromPayload(payload);

      expect(list.name).toBe('Test List');
      expect(list.status).toBe('unranked');
      expect(list.items).toHaveLength(2);
      expect(list.items[0].text).toBe('Item 1');
      expect(list.items[1].text).toBe('Item 2');
      expect(list.rankedData).toBeUndefined();
    });

    it('creates ranked list from payload', () => {
      const payload: SharePayload = {
        type: 'ranked',
        name: 'Ranked List',
        items: ['First', 'Second', 'Third'],
      };

      const list = createListFromPayload(payload);

      expect(list.name).toBe('Ranked List');
      expect(list.status).toBe('ranked');
      expect(list.items).toHaveLength(3);
      expect(list.rankedData).toBeDefined();
      expect(list.rankedData!.itemIdsInOrder).toHaveLength(3);
    });

    it('uses "Untitled List" for empty name', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: '',
        items: ['Item 1'],
      };

      const list = createListFromPayload(payload);

      expect(list.name).toBe('Untitled List');
    });

    it('generates unique IDs for items', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Test',
        items: ['A', 'B', 'C'],
      };

      const list = createListFromPayload(payload);

      const ids = list.items.map((item) => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('generates list ID', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Test',
        items: ['A'],
      };

      const list = createListFromPayload(payload);

      expect(list.id).toBeTruthy();
      expect(typeof list.id).toBe('string');
    });

    it('sets createdAt timestamp', () => {
      const beforeTime = Date.now();
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Test',
        items: ['A'],
      };

      const list = createListFromPayload(payload);
      const afterTime = Date.now();

      expect(list.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(list.createdAt).toBeLessThanOrEqual(afterTime);
    });

    it('rankedData itemIdsInOrder matches items order for ranked lists', () => {
      const payload: SharePayload = {
        type: 'ranked',
        name: 'Ranked',
        items: ['First', 'Second'],
      };

      const list = createListFromPayload(payload);

      expect(list.rankedData!.itemIdsInOrder[0]).toBe(list.items[0].id);
      expect(list.rankedData!.itemIdsInOrder[1]).toBe(list.items[1].id);
    });

    it('handles empty items array', () => {
      const payload: SharePayload = {
        type: 'unranked',
        name: 'Empty',
        items: [],
      };

      const list = createListFromPayload(payload);

      expect(list.items).toHaveLength(0);
    });
  });

  describe('createPayloadFromList', () => {
    it('creates unranked payload from unranked list', () => {
      const list: List = {
        id: 'test-id',
        name: 'Test List',
        items: [
          { id: 'item-1', text: 'Item 1' },
          { id: 'item-2', text: 'Item 2' },
        ],
        status: 'unranked',
        createdAt: Date.now(),
      };

      const payload = createPayloadFromList(list, 'unranked');

      expect(payload.type).toBe('unranked');
      expect(payload.name).toBe('Test List');
      expect(payload.items).toEqual(['Item 1', 'Item 2']);
    });

    it('creates ranked payload from ranked list', () => {
      const list: List = {
        id: 'test-id',
        name: 'Ranked List',
        items: [
          { id: 'item-1', text: 'First' },
          { id: 'item-2', text: 'Second' },
        ],
        status: 'ranked',
        rankedData: {
          itemIdsInOrder: ['item-2', 'item-1'], // Reverse order
        },
        createdAt: Date.now(),
      };

      const payload = createPayloadFromList(list, 'ranked');

      expect(payload.type).toBe('ranked');
      expect(payload.name).toBe('Ranked List');
      expect(payload.items).toEqual(['Second', 'First']); // Respects ranked order
    });

    it('uses items in current order when type is unranked even if list has rankedData', () => {
      const list: List = {
        id: 'test-id',
        name: 'List',
        items: [
          { id: 'item-1', text: 'A' },
          { id: 'item-2', text: 'B' },
        ],
        status: 'ranked',
        rankedData: {
          itemIdsInOrder: ['item-2', 'item-1'],
        },
        createdAt: Date.now(),
      };

      const payload = createPayloadFromList(list, 'unranked');

      expect(payload.items).toEqual(['A', 'B']); // Current order, not ranked
    });

    it('handles empty list', () => {
      const list: List = {
        id: 'test-id',
        name: 'Empty',
        items: [],
        status: 'unranked',
        createdAt: Date.now(),
      };

      const payload = createPayloadFromList(list, 'unranked');

      expect(payload.items).toEqual([]);
    });

    it('handles missing item in rankedData order', () => {
      const list: List = {
        id: 'test-id',
        name: 'List',
        items: [
          { id: 'item-1', text: 'A' },
          { id: 'item-2', text: 'B' },
        ],
        status: 'ranked',
        rankedData: {
          itemIdsInOrder: ['item-2', 'item-999'], // item-999 doesn't exist
        },
        createdAt: Date.now(),
      };

      const payload = createPayloadFromList(list, 'ranked');

      expect(payload.items).toEqual(['B', '']); // Missing item becomes empty string
    });
  });

  describe('Round-trip integration', () => {
    it('list -> payload -> encode -> decode -> payload -> list preserves data', () => {
      const originalList: List = {
        id: 'original-id',
        name: 'Original List',
        items: [
          { id: 'a', text: 'Alpha' },
          { id: 'b', text: 'Beta' },
          { id: 'c', text: 'Gamma' },
        ],
        status: 'ranked',
        rankedData: {
          itemIdsInOrder: ['c', 'a', 'b'],
        },
        createdAt: 1234567890,
      };

      // List -> Payload
      const payload1 = createPayloadFromList(originalList, 'ranked');

      // Encode -> Decode
      const encoded = encodePayloadToUrl(payload1);
      const payload2 = decodePayloadFromUrl(encoded);

      // Payload -> List
      const finalList = createListFromPayload(payload2!);

      // Verify content (IDs will be different but content should match)
      expect(finalList.name).toBe(originalList.name);
      expect(finalList.status).toBe(originalList.status);
      expect(finalList.items.map((i) => i.text)).toEqual(['Gamma', 'Alpha', 'Beta']); // Ranked order
    });
  });
});
