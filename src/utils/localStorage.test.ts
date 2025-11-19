import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveToLocalStorage, loadFromLocalStorage, clearLocalStorage } from './localStorage';
import { AppState } from '../types';

describe('localStorage utilities', () => {
  const mockState: AppState = {
    lists: [
      {
        id: 'test-list',
        name: 'Test List',
        items: [
          { id: 'item-1', text: 'Item 1' },
          { id: 'item-2', text: 'Item 2' },
        ],
        status: 'unranked',
        createdAt: Date.now(),
      },
    ],
    currentListId: 'test-list',
    rankingState: null,
    currentTab: 'current',
    currentView: 'currentList',
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveToLocalStorage', () => {
    it('saves state to localStorage', () => {
      saveToLocalStorage(mockState);

      const saved = localStorage.getItem('pairwise-ranker-state');
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved!);
      expect(parsed).toEqual(mockState);
    });

    it('serializes complex state correctly', () => {
      const complexState: AppState = {
        ...mockState,
        rankingState: {
          sortedListItemIds: ['a', 'b'],
          pendingItemIds: ['c'],
          currentCandidateId: 'd',
          low: 0,
          high: 1,
          mode: 'full',
        },
      };

      saveToLocalStorage(complexState);

      const saved = localStorage.getItem('pairwise-ranker-state');
      const parsed = JSON.parse(saved!);

      expect(parsed.rankingState).toEqual(complexState.rankingState);
    });

    it('handles errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.setItem to throw an error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      saveToLocalStorage(mockState);

      expect(consoleSpy).toHaveBeenCalledWith('Error saving to localStorage:', expect.any(Error));

      consoleSpy.mockRestore();
      setItemSpy.mockRestore();
    });
  });

  describe('loadFromLocalStorage', () => {
    it('loads state from localStorage', () => {
      localStorage.setItem('pairwise-ranker-state', JSON.stringify(mockState));

      const loaded = loadFromLocalStorage();

      expect(loaded).toEqual(mockState);
    });

    it('returns null if no state exists', () => {
      const loaded = loadFromLocalStorage();

      expect(loaded).toBeNull();
    });

    it('returns null for corrupted data', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      localStorage.setItem('pairwise-ranker-state', 'invalid json{{{');

      const loaded = loadFromLocalStorage();

      expect(loaded).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error loading from localStorage:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('handles storage access errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const loaded = loadFromLocalStorage();

      expect(loaded).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error loading from localStorage:', expect.any(Error));

      consoleSpy.mockRestore();
      getItemSpy.mockRestore();
    });

    it('preserves data types correctly', () => {
      const stateWithTypes: AppState = {
        ...mockState,
        lists: [
          {
            ...mockState.lists[0],
            createdAt: 1234567890,
          },
        ],
      };

      localStorage.setItem('pairwise-ranker-state', JSON.stringify(stateWithTypes));

      const loaded = loadFromLocalStorage();

      expect(loaded?.lists[0].createdAt).toBe(1234567890);
      expect(typeof loaded?.lists[0].createdAt).toBe('number');
    });
  });

  describe('clearLocalStorage', () => {
    it('removes state from localStorage', () => {
      localStorage.setItem('pairwise-ranker-state', JSON.stringify(mockState));

      clearLocalStorage();

      const saved = localStorage.getItem('pairwise-ranker-state');
      expect(saved).toBeNull();
    });

    it('handles errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      clearLocalStorage();

      expect(consoleSpy).toHaveBeenCalledWith('Error clearing localStorage:', expect.any(Error));

      consoleSpy.mockRestore();
      removeItemSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('handles save and load cycle', () => {
      saveToLocalStorage(mockState);
      const loaded = loadFromLocalStorage();

      expect(loaded).toEqual(mockState);
    });

    it('handles multiple saves (overwrites)', () => {
      saveToLocalStorage(mockState);

      const updatedState: AppState = {
        ...mockState,
        lists: [
          {
            ...mockState.lists[0],
            name: 'Updated Name',
          },
        ],
      };

      saveToLocalStorage(updatedState);

      const loaded = loadFromLocalStorage();
      expect(loaded?.lists[0].name).toBe('Updated Name');
    });

    it('handles clear then load', () => {
      saveToLocalStorage(mockState);
      clearLocalStorage();

      const loaded = loadFromLocalStorage();
      expect(loaded).toBeNull();
    });
  });
});
