import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Action, List } from '../types';
import { generateId } from '../utils/urlEncoding';
import {
  initializeRankingState,
  initializePartialRankingState,
  processComparison,
} from '../utils/rankingAlgorithm';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/localStorage';

// Initial state factory
function createInitialState(): AppState {
  return {
    lists: [
      {
        id: generateId(),
        name: '',
        items: [],
        status: 'unranked',
        createdAt: Date.now(),
      },
    ],
    currentListId: null,
    rankingState: null,
    currentTab: 'current',
    currentView: 'currentList',
  };
}

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, currentTab: action.tab };

    case 'SET_VIEW':
      return { ...state, currentView: action.view };

    case 'CREATE_LIST': {
      const newList: List = {
        id: generateId(),
        name: '',
        items: [],
        status: 'unranked',
        createdAt: Date.now(),
      };
      return {
        ...state,
        lists: [...state.lists, newList],
        currentListId: newList.id,
        currentTab: 'current',
        currentView: 'currentList',
      };
    }

    case 'SET_CURRENT_LIST':
      const list = state.lists.find((l) => l.id === action.listId);
      if (!list) return state;

      return {
        ...state,
        currentListId: action.listId,
        currentTab: 'current',
        currentView: list.status === 'ranked' ? 'rankedResult' : 'currentList',
        rankingState: null,
      };

    case 'UPDATE_LIST_NAME':
      return {
        ...state,
        lists: state.lists.map((list) =>
          list.id === action.listId ? { ...list, name: action.name } : list
        ),
      };

    case 'ADD_ITEM': {
      const trimmedText = action.text.trim();
      if (!trimmedText) return state;

      return {
        ...state,
        lists: state.lists.map((list) =>
          list.id === action.listId
            ? {
                ...list,
                items: [...list.items, { id: generateId(), text: trimmedText }],
              }
            : list
        ),
      };
    }

    case 'DELETE_ITEM':
      return {
        ...state,
        lists: state.lists.map((list) =>
          list.id === action.listId
            ? {
                ...list,
                items: list.items.filter((item) => item.id !== action.itemId),
              }
            : list
        ),
      };

    case 'ADD_ITEM_TO_RANKED_LIST': {
      const trimmedText = action.text.trim();
      if (!trimmedText) return state;

      return {
        ...state,
        lists: state.lists.map((list) =>
          list.id === action.listId && list.status === 'ranked'
            ? {
                ...list,
                unrankedItems: [
                  ...(list.unrankedItems || []),
                  { id: generateId(), text: trimmedText },
                ],
              }
            : list
        ),
      };
    }

    case 'DELETE_UNRANKED_ITEM': {
      return {
        ...state,
        lists: state.lists.map((list) =>
          list.id === action.listId
            ? {
                ...list,
                unrankedItems: (list.unrankedItems || []).filter(
                  (item) => item.id !== action.itemId
                ),
              }
            : list
        ),
      };
    }

    case 'START_RANKING': {
      const list = state.lists.find((l) => l.id === action.listId);
      if (!list) return state;

      // Combine existing items with unranked items for full re-ranking
      const allItems = [...list.items, ...(list.unrankedItems || [])];
      if (allItems.length < 2) return state;

      const rankingState = initializeRankingState(allItems);
      if (!rankingState) return state;

      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.listId
            ? {
                ...l,
                items: allItems,
                status: 'ranking',
                unrankedItems: undefined,
                rankedData: undefined, // Clear previous ranking
              }
            : l
        ),
        rankingState,
        currentView: 'ranking',
      };
    }

    case 'START_PARTIAL_RANKING': {
      const list = state.lists.find((l) => l.id === action.listId);
      if (!list || !list.rankedData || !list.unrankedItems || list.unrankedItems.length === 0) {
        return state;
      }

      const rankingState = initializePartialRankingState(
        list.rankedData.itemIdsInOrder,
        list.unrankedItems
      );
      if (!rankingState) return state;

      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.listId
            ? {
                ...l,
                status: 'ranking',
                items: [...l.items, ...(l.unrankedItems || [])],
              }
            : l
        ),
        rankingState,
        currentView: 'ranking',
      };
    }

    case 'MAKE_COMPARISON': {
      if (!state.rankingState) return state;

      const newRankingState = processComparison(
        state.rankingState,
        action.chooseCandidate
      );

      if (newRankingState === null) {
        // Ranking is complete - sortedListItemIds already contains all items
        const finalOrder = state.rankingState.sortedListItemIds;

        return {
          ...state,
          lists: state.lists.map((list) =>
            list.id === state.currentListId
              ? {
                  ...list,
                  status: 'ranked',
                  rankedData: { itemIdsInOrder: finalOrder },
                  unrankedItems: undefined, // Clear unranked items after insertion
                }
              : list
          ),
          rankingState: null,
          currentView: 'rankedResult',
        };
      }

      return {
        ...state,
        rankingState: newRankingState,
      };
    }

    case 'COMPLETE_RANKING': {
      // This handles manual exit from ranking
      const isPartialMode = state.rankingState?.mode === 'partial';

      return {
        ...state,
        lists: state.lists.map((list) => {
          if (list.id !== state.currentListId || list.status !== 'ranking') {
            return list;
          }

          if (isPartialMode) {
            // Partial mode: update rankedData with current progress, remove uninserted items
            const sortedListItemIds = state.rankingState?.sortedListItemIds || [];
            const uninsertedItemIds = state.rankingState?.pendingItemIds || [];
            const currentCandidateId = state.rankingState?.currentCandidateId;
            const itemsToRemove = currentCandidateId
              ? [...uninsertedItemIds, currentCandidateId]
              : uninsertedItemIds;

            return {
              ...list,
              status: 'ranked',
              rankedData: { itemIdsInOrder: sortedListItemIds },
              items: list.items.filter(item => !itemsToRemove.includes(item.id)),
              unrankedItems: undefined,
            };
          } else {
            // Full mode: revert to unranked
            return { ...list, status: 'unranked', unrankedItems: undefined };
          }
        }),
        rankingState: null,
        currentView: isPartialMode ? 'rankedResult' : 'currentList',
      };
    }

    case 'DELETE_LIST': {
      const listsAfterDelete = state.lists.filter((l) => l.id !== action.listId);

      // If no lists remain, create a new empty list
      if (listsAfterDelete.length === 0) {
        const newList: List = {
          id: generateId(),
          name: '',
          items: [],
          status: 'unranked',
          createdAt: Date.now(),
        };
        return {
          ...state,
          lists: [newList],
          currentListId: newList.id,
          // Keep user on current tab (likely 'myLists')
          rankingState: null,
        };
      }

      // If deleted list was current, switch to another list
      let newCurrentListId = state.currentListId;
      if (state.currentListId === action.listId) {
        newCurrentListId = listsAfterDelete[0].id;
      }

      return {
        ...state,
        lists: listsAfterDelete,
        currentListId: newCurrentListId,
        // Keep user on current tab and view - don't force navigation
        rankingState: null,
      };
    }

    case 'LOAD_SHARED_LIST': {
      // Ensure the new list has a unique ID
      const newList = { ...action.list, id: generateId() };

      return {
        ...state,
        lists: [...state.lists, newList],
        currentListId: newList.id,
        currentTab: 'current',
        currentView: newList.status === 'ranked' ? 'rankedResult' : 'currentList',
      };
    }

    default:
      return state;
  }
}

// Context
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  // Initialize state - check URL first, then localStorage, then default
  const [state, dispatch] = useReducer(appReducer, null, () => {
    // Will be initialized in useEffect after checking URL
    const saved = loadFromLocalStorage();
    if (saved) {
      // Set first list as current if none selected
      if (!saved.currentListId && saved.lists.length > 0) {
        saved.currentListId = saved.lists[0].id;
      }
      return saved;
    }

    const initial = createInitialState();
    initial.currentListId = initial.lists[0].id;
    return initial;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToLocalStorage(state);
  }, [state]);

  // Set first list as current if none selected
  useEffect(() => {
    if (!state.currentListId && state.lists.length > 0) {
      dispatch({ type: 'SET_CURRENT_LIST', listId: state.lists[0].id });
    }
  }, [state.currentListId, state.lists]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
