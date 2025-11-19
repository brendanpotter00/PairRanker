# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pairwise Ranker** is a front-end only React + TypeScript web application that implements pairwise ranking using a binary insertion sort algorithm. Users create lists and rank items by choosing between two items at a time. No backend is required - all data is stored in localStorage and can be shared via URL-encoded query parameters.

## Commands

```bash
# Development server (runs on http://localhost:5173 or next available port)
npm run dev

# Production build (outputs to dist/)
npm run build

# Lint TypeScript/TSX files
npm run lint

# Preview production build
npm run preview
```

## Architecture

### State Management Pattern

The app uses a **centralized reducer pattern** with React Context (`src/context/AppContext.tsx`). All state mutations flow through a single `appReducer` function that handles ~15 action types.

**Key principle**: The reducer is the single source of truth for state transitions. When adding features:
1. Define action type in `src/types.ts`
2. Add reducer case in `AppContext.tsx`
3. Components dispatch actions, never mutate state directly

### Data Flow: Ranking System

The ranking system has two modes that work differently:

**Full Ranking** (`mode: 'full'`):
- Triggered by `START_RANKING` action
- All items start in `pendingItemIds`
- Algorithm ranks everything from scratch
- Clears any previous `rankedData`

**Partial Ranking** (`mode: 'partial'`):
- Triggered by `START_PARTIAL_RANKING` action
- Only new items (`unrankedItems`) go in `pendingItemIds`
- `sortedListItemIds` starts with existing ranked order from `rankedData.itemIdsInOrder`
- Inserts new items into existing ranking using same algorithm

Both modes use the same binary insertion algorithm in `utils/rankingAlgorithm.ts`.

### Critical Algorithm Detail

**IMPORTANT**: When `processComparison()` returns `null`, the ranking is complete and `sortedListItemIds` **already contains all items including the last candidate**. The `currentCandidateId` should NOT be appended again.

This was a bug that caused duplicates. The correct pattern is:
```typescript
if (newRankingState === null) {
  const finalOrder = state.rankingState.sortedListItemIds; // Already complete!
}
```

### List State Lifecycle

A `List` object has three states (`ListStatus`):
- **`unranked`**: Items exist but not ranked. Can add/delete items freely.
- **`ranking`**: Binary insertion in progress. `rankingState` exists. Item editing disabled.
- **`ranked`**: Has `rankedData.itemIdsInOrder`. Can add items to `unrankedItems` for partial ranking.

**`unrankedItems` field**: Temporary holding area for items added to a ranked list before they're inserted via partial ranking. Cleared when ranking completes or is cancelled.

### URL Encoding for Sharing

Lists are shared via base64url-encoded JSON in the `?data=` query parameter:

1. Build `SharePayload` object (type + name + items array)
2. JSON.stringify → UTF-8 encode → base64 → make URL-safe (replace +/= with -_)
3. On load, reverse the process
4. Invalid payloads show error banner but app remains usable

The encoding/decoding logic lives in `src/utils/urlEncoding.ts`.

### Navigation State vs View State

The app has **dual navigation tracking**:
- `currentTab`: Which tab is selected ('current' | 'myLists')
- `currentView`: What content to show ('currentList' | 'ranking' | 'rankedResult')

**Rendering priority** (in `App.tsx`):
1. If `currentView === 'ranking'` → always show `RankingView` (full-screen)
2. Else if `currentTab === 'myLists'` → show `MyListsView`
3. Else if `currentView === 'rankedResult'` → show `RankedResultView`
4. Else → show `CurrentListView` (default)

**Key principle**: When user is ranking, `currentView` takes precedence over `currentTab` to show full-screen ranking UI.

### Theme

Material UI theme uses black/grey color palette (not default blue):
- Primary: `#212121` (dark grey/black)
- Secondary: `#757575` (medium grey)

This is defined in `src/App.tsx` and affects all MUI components.

### localStorage Persistence

On every state change, entire `AppState` is serialized to localStorage (key: `'pairwise-ranker-state'`). On mount, state is restored from localStorage if available. URL-shared lists are loaded on top of localStorage state.

## Common Patterns

### Adding a New Action

1. Add action type to `Action` union in `src/types.ts`
2. Add reducer case in `src/context/AppContext.tsx`
3. Components dispatch like: `dispatch({ type: 'ACTION_NAME', payload })`

### Modifying Lists

Always use the reducer pattern. Find the list by ID and map over the lists array:
```typescript
lists: state.lists.map((list) =>
  list.id === targetListId
    ? { ...list, /* changes */ }
    : list
)
```

### Working with Rankings

- Initialize ranking: `initializeRankingState(items)` or `initializePartialRankingState(existingOrder, newItems)`
- Process user comparison: `processComparison(rankingState, userChooseCandidate)`
- Returns updated state or `null` when complete
- Get current comparison items: `getCurrentComparison(rankingState)` returns `{ candidateId, referenceId }`

## Key Files

- **`src/context/AppContext.tsx`**: All state management, reducer with 15+ cases
- **`src/types.ts`**: TypeScript definitions for entire app state
- **`src/utils/rankingAlgorithm.ts`**: Binary insertion sort implementation
- **`src/utils/urlEncoding.ts`**: Share URL encoding/decoding + ID generation
- **`src/App.tsx`**: Root component with theme, tab navigation, and view routing

## Implementation Notes

See `IMPLEMENTATION.md` for the original PRD with full feature specifications and acceptance criteria. This is useful for understanding requirements when adding features.
