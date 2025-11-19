import { describe, it, expect } from 'vitest';
import {
  initializeRankingState,
  initializePartialRankingState,
  processComparison,
  getCurrentComparison,
  getRankingProgress,
} from './rankingAlgorithm';
import { RankingState, ListItem } from '../types';

describe('rankingAlgorithm', () => {
  describe('initializeRankingState', () => {
    it('returns null for empty array', () => {
      expect(initializeRankingState([])).toBeNull();
    });

    it('returns null for single item', () => {
      const items: ListItem[] = [{ id: 'a', text: 'Item A' }];
      expect(initializeRankingState(items)).toBeNull();
    });

    it('initializes correctly with 2 items', () => {
      const items: ListItem[] = [
        { id: 'a', text: 'Item A' },
        { id: 'b', text: 'Item B' },
      ];
      const result = initializeRankingState(items);

      expect(result).not.toBeNull();
      expect(result!.sortedListItemIds).toEqual(['a']);
      expect(result!.pendingItemIds).toEqual([]); // BUG FIX: empty (only 2 items total)
      expect(result!.currentCandidateId).toBe('b');
      expect(result!.low).toBe(0);
      expect(result!.high).toBe(0);
      expect(result!.mode).toBe('full');
    });

    it('initializes correctly with many items', () => {
      const items: ListItem[] = [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' },
        { id: 'd', text: 'D' },
      ];
      const result = initializeRankingState(items);

      expect(result!.sortedListItemIds).toEqual(['a']);
      expect(result!.pendingItemIds).toEqual(['c', 'd']); // BUG FIX: exclude 'b' (current)
      expect(result!.currentCandidateId).toBe('b');
    });
  });

  describe('initializePartialRankingState', () => {
    it('returns null for empty new items', () => {
      const result = initializePartialRankingState(['a', 'b'], []);
      expect(result).toBeNull();
    });

    it('falls back to full ranking when no existing ranked items', () => {
      const newItems: ListItem[] = [
        { id: 'x', text: 'X' },
        { id: 'y', text: 'Y' },
      ];
      const result = initializePartialRankingState([], newItems);

      expect(result!.mode).toBe('full');
      expect(result!.sortedListItemIds).toEqual(['x']);
      expect(result!.currentCandidateId).toBe('y');
    });

    it('initializes partial ranking with existing ranked items', () => {
      const existingRankedIds = ['a', 'b', 'c'];
      const newItems: ListItem[] = [
        { id: 'x', text: 'X' },
        { id: 'y', text: 'Y' },
      ];
      const result = initializePartialRankingState(existingRankedIds, newItems);

      expect(result!.mode).toBe('partial');
      expect(result!.sortedListItemIds).toEqual(['a', 'b', 'c']);
      expect(result!.currentCandidateId).toBe('x');
      expect(result!.pendingItemIds).toEqual(['y']);
      expect(result!.low).toBe(0);
      expect(result!.high).toBe(2);
    });
  });

  describe('processComparison', () => {
    function createState(
      sortedListItemIds: string[],
      pendingItemIds: string[],
      currentCandidateId: string,
      low: number,
      high: number,
      mode: 'full' | 'partial' = 'full'
    ): RankingState {
      return {
        sortedListItemIds,
        pendingItemIds,
        currentCandidateId,
        low,
        high,
        mode,
      };
    }

    describe('binary search iterations', () => {
      it('narrows search space when candidate is preferred', () => {
        const state = createState(['a', 'b', 'c', 'd'], [], 'x', 0, 3);
        const result = processComparison(state, true);

        expect(result).not.toBeNull();
        expect(result!.low).toBe(0);
        expect(result!.high).toBe(0); // mid - 1 = 1 - 1 = 0
      });

      it('narrows search space when reference is preferred', () => {
        const state = createState(['a', 'b', 'c', 'd'], [], 'x', 0, 3);
        const result = processComparison(state, false);

        expect(result).not.toBeNull();
        expect(result!.low).toBe(2); // mid + 1 = 1 + 1 = 2
        expect(result!.high).toBe(3);
      });
    });

    describe('item insertion', () => {
      it('inserts candidate when binary search complete and more pending items exist', () => {
        const state = createState(['a', 'b', 'c'], ['y', 'z'], 'x', 2, 1);
        const result = processComparison(state, false);

        expect(result).not.toBeNull();
        expect(result!.sortedListItemIds).toEqual(['a', 'b', 'x', 'c']);
        expect(result!.currentCandidateId).toBe('y'); // 'y' becomes current (pendingItemIds[0])
        expect(result!.pendingItemIds).toEqual(['z']); // 'z' remains pending (newPendingItems)
        expect(result!.low).toBe(0);
        expect(result!.high).toBe(3);
      });

      it('returns final state with empty currentCandidateId when all items processed', () => {
        const state = createState(['a', 'b'], [], 'x', 2, 1);
        const result = processComparison(state, false);

        expect(result).not.toBeNull();
        expect(result.pendingItemIds).toEqual([]);
        expect(result.currentCandidateId).toBe('');
        expect(result.sortedListItemIds).toEqual(['a', 'b', 'x']);
      });
    });

    describe('CRITICAL BUG TESTS: Duplicates and Missing Items', () => {
      it('includes final candidate in sortedListItemIds when ranking completes', () => {
        const state = createState(['a', 'b'], [], 'c', 2, 1);

        const result = processComparison(state, false);

        expect(result).not.toBeNull();
        expect(result.sortedListItemIds).toEqual(['a', 'b', 'c']);
        expect(result.currentCandidateId).toBe('');
        expect(result.pendingItemIds).toEqual([]);
      });

      it('completes 3-item ranking with all items and no duplicates', () => {
        const items: ListItem[] = [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
          { id: 'c', text: 'C' },
        ];

        let state = initializeRankingState(items)!;

        // B vs A: choose B
        state = processComparison(state, true);
        expect(state).not.toBeNull();
        expect(state.sortedListItemIds).toEqual(['b', 'a']);

        // C vs B: choose C
        state = processComparison(state, true);

        expect(state.currentCandidateId).toBe('');
        expect(state.sortedListItemIds.length).toBe(3);
        expect(new Set(state.sortedListItemIds).size).toBe(3); // No duplicates
      });

      it('full ranking of 4 items has no duplicates', () => {
        const items: ListItem[] = [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
          { id: 'c', text: 'C' },
          { id: 'd', text: 'D' },
        ];

        let state: RankingState | null = initializeRankingState(items)!;
        const allSeenIds = new Set<string>();

        let iteration = 0;
        while (state.currentCandidateId !== '' && iteration < 30) {
          // Track all IDs in current state
          state.sortedListItemIds.forEach(id => allSeenIds.add(id));
          allSeenIds.add(state.currentCandidateId);

          // Check for duplicates in sortedListItemIds
          const sortedSet = new Set(state.sortedListItemIds);
          expect(sortedSet.size).toBe(state.sortedListItemIds.length);

          state = processComparison(state, iteration % 2 === 0);
          iteration++;
        }

        expect(state.currentCandidateId).toBe(''); // Should complete
        expect(allSeenIds.size).toBe(4); // All 4 items seen
      });

      it('never loses items during ranking process', () => {
        const items: ListItem[] = [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
          { id: 'c', text: 'C' },
        ];

        let state: RankingState = initializeRankingState(items)!;

        let iteration = 0;

        while (state.currentCandidateId !== '' && iteration < 20) {
          // Total items = sorted + current + pending
          const totalItems = state.sortedListItemIds.length + 1 + state.pendingItemIds.length;
          expect(totalItems).toBe(3);

          state = processComparison(state, iteration % 2 === 0);
          iteration++;
        }

        // When completed, all items should be in sortedListItemIds
        expect(state.currentCandidateId).toBe('');
        expect(state.sortedListItemIds.length).toBe(3);
      });
    });

    describe('full ranking flow simulations', () => {
      it('correctly ranks 3 items with consistent preferences', () => {
        const items: ListItem[] = [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
          { id: 'c', text: 'C' },
        ];

        let state: RankingState = initializeRankingState(items)!;

        // User preference: always prefer candidate (simulates C > B > A)
        while (state.currentCandidateId !== '') {
          state = processComparison(state, true);
        }

        // Final state should have all items
        const finalOrder = state.sortedListItemIds;
        expect(new Set(finalOrder).size).toBe(finalOrder.length);
        expect(finalOrder.length).toBe(3);
      });

      it('correctly ranks 5 items', () => {
        const items: ListItem[] = Array.from({ length: 5 }, (_, i) => ({
          id: `item-${i}`,
          text: `Item ${i}`,
        }));

        let state: RankingState = initializeRankingState(items)!;
        let iteration = 0;

        while (state.currentCandidateId !== '' && iteration < 50) {
          // Verify no duplicates at each step
          const uniqueIds = new Set(state.sortedListItemIds);
          expect(uniqueIds.size).toBe(state.sortedListItemIds.length);

          state = processComparison(state, iteration % 3 === 0);
          iteration++;
        }

        expect(state.currentCandidateId).toBe('');
        expect(iteration).toBeLessThan(50);
        expect(state.sortedListItemIds.length).toBe(5);
      });
    });
  });

  describe('getCurrentComparison', () => {
    it('returns correct candidate and reference IDs', () => {
      const state: RankingState = {
        sortedListItemIds: ['a', 'b', 'c', 'd'],
        pendingItemIds: [],
        currentCandidateId: 'x',
        low: 0,
        high: 3,
        mode: 'full',
      };

      const comparison = getCurrentComparison(state);

      expect(comparison.candidateId).toBe('x');
      // mid = floor((0 + 3) / 2) = 1
      expect(comparison.referenceId).toBe('b');
    });

    it('updates reference as search narrows', () => {
      const state: RankingState = {
        sortedListItemIds: ['a', 'b', 'c', 'd'],
        pendingItemIds: [],
        currentCandidateId: 'x',
        low: 0,
        high: 1,
        mode: 'full',
      };

      const comparison = getCurrentComparison(state);

      // mid = floor((0 + 1) / 2) = 0
      expect(comparison.referenceId).toBe('a');
    });
  });

  describe('getRankingProgress', () => {
    it('calculates progress correctly', () => {
      const state: RankingState = {
        sortedListItemIds: ['a', 'b'],
        pendingItemIds: ['d', 'e'],
        currentCandidateId: 'c',
        low: 0,
        high: 1,
        mode: 'full',
      };

      const progress = getRankingProgress(state, 5);

      // Processed = sortedList.length (2) + current (1) = 3
      expect(progress.currentItemIndex).toBe(3);
      expect(progress.totalItems).toBe(5);
      expect(progress.percentComplete).toBe(60);
    });

    it('calculates 100% when all items in sortedList', () => {
      const state: RankingState = {
        sortedListItemIds: ['a', 'b', 'c', 'd', 'e'],
        pendingItemIds: [],
        currentCandidateId: 'f',
        low: 0,
        high: 4,
        mode: 'full',
      };

      const progress = getRankingProgress(state, 6);

      // 5 + 1 = 6, 6/6 = 100%
      expect(progress.percentComplete).toBe(100);
    });
  });
});
