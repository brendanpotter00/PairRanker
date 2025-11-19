import { RankingState, ListItem } from '../types';

/**
 * Initializes ranking state for a list of items (full ranking)
 */
export function initializeRankingState(items: ListItem[]): RankingState | null {
  if (items.length < 2) {
    return null;
  }

  const itemIds = items.map((item) => item.id);

  return {
    sortedListItemIds: [itemIds[0]],
    pendingItemIds: itemIds.slice(1),
    currentCandidateId: itemIds[1],
    low: 0,
    high: 0,
    mode: 'full',
  };
}

/**
 * Initializes partial ranking state for inserting new items into an existing ranked list
 * @param existingRankedIds - Already ranked item IDs in order
 * @param newItems - New items to insert into the ranking
 */
export function initializePartialRankingState(
  existingRankedIds: string[],
  newItems: ListItem[]
): RankingState | null {
  if (newItems.length === 0) {
    return null;
  }

  if (existingRankedIds.length === 0) {
    // No existing ranking, treat as full ranking
    return initializeRankingState(newItems);
  }

  const newItemIds = newItems.map((item) => item.id);

  return {
    sortedListItemIds: existingRankedIds,
    pendingItemIds: newItemIds.slice(1),
    currentCandidateId: newItemIds[0],
    low: 0,
    high: existingRankedIds.length - 1,
    mode: 'partial',
  };
}

/**
 * Processes a comparison result and updates ranking state
 * @param state Current ranking state
 * @param chooseCandidate True if user chose candidate, false if chose reference
 * @returns Updated ranking state, or null if ranking is complete
 */
export function processComparison(
  state: RankingState,
  chooseCandidate: boolean
): RankingState | null {
  const { sortedListItemIds, pendingItemIds, currentCandidateId, low, high, mode } =
    state;

  // Calculate mid point
  const mid = Math.floor((low + high) / 2);

  let newLow = low;
  let newHigh = high;

  if (chooseCandidate) {
    // Candidate is preferred over reference at mid
    // Search in upper ranks (lower indices)
    newHigh = mid - 1;
  } else {
    // Reference at mid is preferred
    // Search in lower ranks (higher indices)
    newLow = mid + 1;
  }

  // Check if binary search is complete for this candidate
  if (newLow > newHigh) {
    // Insert candidate at position 'newLow'
    const newSortedList = [...sortedListItemIds];
    newSortedList.splice(newLow, 0, currentCandidateId);

    // Get next candidate
    const newPendingItems = pendingItemIds.slice(1);

    if (newPendingItems.length === 0) {
      // Ranking is complete
      return null;
    }

    // Move to next candidate
    return {
      sortedListItemIds: newSortedList,
      pendingItemIds: newPendingItems,
      currentCandidateId: pendingItemIds[0],
      low: 0,
      high: newSortedList.length - 1,
      mode,
    };
  }

  // Continue binary search with updated bounds
  return {
    sortedListItemIds,
    pendingItemIds,
    currentCandidateId,
    low: newLow,
    high: newHigh,
    mode,
  };
}

/**
 * Gets the current comparison items
 * @param state Current ranking state
 * @returns IDs of candidate and reference items
 */
export function getCurrentComparison(state: RankingState): {
  candidateId: string;
  referenceId: string;
} {
  const mid = Math.floor((state.low + state.high) / 2);
  return {
    candidateId: state.currentCandidateId,
    referenceId: state.sortedListItemIds[mid],
  };
}

/**
 * Gets progress information for the ranking
 */
export function getRankingProgress(state: RankingState, totalItems: number): {
  currentItemIndex: number;
  totalItems: number;
  percentComplete: number;
} {
  // Processed items = those already in sortedList + the current candidate being compared
  const processedItems = state.sortedListItemIds.length + 1;
  const percentComplete = Math.round((processedItems / totalItems) * 100);

  return {
    currentItemIndex: processedItems,
    totalItems,
    percentComplete,
  };
}
