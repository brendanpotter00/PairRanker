import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appReducer } from './AppContext';
import { AppState, Action, List } from '../types';

// Mock the generateId function to return predictable IDs
vi.mock('../utils/urlEncoding', () => ({
  generateId: vi.fn(() => 'mock-id-' + Date.now()),
}));

describe('AppContext Reducer', () => {
  let initialState: AppState;

  beforeEach(() => {
    initialState = {
      lists: [
        {
          id: 'list-1',
          name: 'Test List',
          items: [
            { id: 'item-1', text: 'Item 1' },
            { id: 'item-2', text: 'Item 2' },
          ],
          status: 'unranked',
          createdAt: Date.now(),
        },
      ],
      currentListId: 'list-1',
      rankingState: null,
      currentTab: 'current',
      currentView: 'currentList',
    };
  });

  describe('SET_TAB', () => {
    it('changes the current tab', () => {
      const action: Action = { type: 'SET_TAB', tab: 'myLists' };
      const result = appReducer(initialState, action);

      expect(result.currentTab).toBe('myLists');
    });
  });

  describe('SET_VIEW', () => {
    it('changes the current view', () => {
      const action: Action = { type: 'SET_VIEW', view: 'ranking' };
      const result = appReducer(initialState, action);

      expect(result.currentView).toBe('ranking');
    });
  });

  describe('CREATE_LIST', () => {
    it('creates a new list and sets it as current', () => {
      const action: Action = { type: 'CREATE_LIST' };
      const result = appReducer(initialState, action);

      expect(result.lists.length).toBe(2);
      expect(result.lists[1].status).toBe('unranked');
      expect(result.lists[1].items).toEqual([]);
      expect(result.currentListId).toBe(result.lists[1].id);
      expect(result.currentTab).toBe('current');
      expect(result.currentView).toBe('currentList');
    });
  });

  describe('SET_CURRENT_LIST', () => {
    it('sets the current list and switches to appropriate view', () => {
      const secondList: List = {
        id: 'list-2',
        name: 'Second List',
        items: [],
        status: 'unranked',
        createdAt: Date.now(),
      };
      const stateWithTwoLists = {
        ...initialState,
        lists: [...initialState.lists, secondList],
      };

      const action: Action = { type: 'SET_CURRENT_LIST', listId: 'list-2' };
      const result = appReducer(stateWithTwoLists, action);

      expect(result.currentListId).toBe('list-2');
      expect(result.currentTab).toBe('current');
      expect(result.currentView).toBe('currentList');
      expect(result.rankingState).toBeNull();
    });

    it('shows rankedResult view for ranked lists', () => {
      const rankedList: List = {
        id: 'list-2',
        name: 'Ranked List',
        items: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
        status: 'ranked',
        rankedData: { itemIdsInOrder: ['a', 'b'] },
        createdAt: Date.now(),
      };
      const stateWithRankedList = {
        ...initialState,
        lists: [...initialState.lists, rankedList],
      };

      const action: Action = { type: 'SET_CURRENT_LIST', listId: 'list-2' };
      const result = appReducer(stateWithRankedList, action);

      expect(result.currentView).toBe('rankedResult');
    });

    it('returns unchanged state if list not found', () => {
      const action: Action = { type: 'SET_CURRENT_LIST', listId: 'nonexistent' };
      const result = appReducer(initialState, action);

      expect(result).toBe(initialState);
    });
  });

  describe('UPDATE_LIST_NAME', () => {
    it('updates the name of the specified list', () => {
      const action: Action = { type: 'UPDATE_LIST_NAME', listId: 'list-1', name: 'New Name' };
      const result = appReducer(initialState, action);

      expect(result.lists[0].name).toBe('New Name');
    });

    it('does not affect other lists', () => {
      const secondList: List = {
        id: 'list-2',
        name: 'Second List',
        items: [],
        status: 'unranked',
        createdAt: Date.now(),
      };
      const stateWithTwoLists = {
        ...initialState,
        lists: [...initialState.lists, secondList],
      };

      const action: Action = { type: 'UPDATE_LIST_NAME', listId: 'list-1', name: 'Updated' };
      const result = appReducer(stateWithTwoLists, action);

      expect(result.lists[0].name).toBe('Updated');
      expect(result.lists[1].name).toBe('Second List');
    });
  });

  describe('ADD_ITEM', () => {
    it('adds an item to the specified list', () => {
      const action: Action = { type: 'ADD_ITEM', listId: 'list-1', text: 'New Item' };
      const result = appReducer(initialState, action);

      expect(result.lists[0].items.length).toBe(3);
      expect(result.lists[0].items[2].text).toBe('New Item');
    });

    it('trims whitespace from item text', () => {
      const action: Action = { type: 'ADD_ITEM', listId: 'list-1', text: '  Trimmed  ' };
      const result = appReducer(initialState, action);

      expect(result.lists[0].items[2].text).toBe('Trimmed');
    });

    it('does not add empty items', () => {
      const action: Action = { type: 'ADD_ITEM', listId: 'list-1', text: '   ' };
      const result = appReducer(initialState, action);

      expect(result.lists[0].items.length).toBe(2);
      expect(result).toBe(initialState);
    });
  });

  describe('DELETE_ITEM', () => {
    it('removes the specified item', () => {
      const action: Action = { type: 'DELETE_ITEM', listId: 'list-1', itemId: 'item-1' };
      const result = appReducer(initialState, action);

      expect(result.lists[0].items.length).toBe(1);
      expect(result.lists[0].items[0].id).toBe('item-2');
    });
  });

  describe('ADD_ITEM_TO_RANKED_LIST', () => {
    it('adds item to unrankedItems for a ranked list', () => {
      const rankedState: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranked',
            rankedData: { itemIdsInOrder: ['item-1', 'item-2'] },
          },
        ],
      };

      const action: Action = { type: 'ADD_ITEM_TO_RANKED_LIST', listId: 'list-1', text: 'New Item' };
      const result = appReducer(rankedState, action);

      expect(result.lists[0].unrankedItems).toBeDefined();
      expect(result.lists[0].unrankedItems?.length).toBe(1);
      expect(result.lists[0].unrankedItems?.[0].text).toBe('New Item');
    });

    it('does not add empty items', () => {
      const rankedState: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranked',
            rankedData: { itemIdsInOrder: ['item-1', 'item-2'] },
          },
        ],
      };

      const action: Action = { type: 'ADD_ITEM_TO_RANKED_LIST', listId: 'list-1', text: '  ' };
      const result = appReducer(rankedState, action);

      expect(result).toBe(rankedState);
    });
  });

  describe('DELETE_UNRANKED_ITEM', () => {
    it('removes item from unrankedItems', () => {
      const stateWithUnranked: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranked',
            rankedData: { itemIdsInOrder: ['item-1'] },
            unrankedItems: [
              { id: 'unranked-1', text: 'Unranked 1' },
              { id: 'unranked-2', text: 'Unranked 2' },
            ],
          },
        ],
      };

      const action: Action = { type: 'DELETE_UNRANKED_ITEM', listId: 'list-1', itemId: 'unranked-1' };
      const result = appReducer(stateWithUnranked, action);

      expect(result.lists[0].unrankedItems?.length).toBe(1);
      expect(result.lists[0].unrankedItems?.[0].id).toBe('unranked-2');
    });
  });

  describe('START_RANKING', () => {
    it('initializes full ranking for unranked list', () => {
      const action: Action = { type: 'START_RANKING', listId: 'list-1' };
      const result = appReducer(initialState, action);

      expect(result.lists[0].status).toBe('ranking');
      expect(result.rankingState).not.toBeNull();
      expect(result.rankingState?.mode).toBe('full');
      expect(result.currentView).toBe('ranking');
    });

    it('combines items and unrankedItems for re-ranking', () => {
      const stateWithUnranked: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranked',
            rankedData: { itemIdsInOrder: ['item-1', 'item-2'] },
            unrankedItems: [{ id: 'item-3', text: 'Item 3' }],
          },
        ],
      };

      const action: Action = { type: 'START_RANKING', listId: 'list-1' };
      const result = appReducer(stateWithUnranked, action);

      expect(result.lists[0].items.length).toBe(3);
      expect(result.lists[0].unrankedItems).toBeUndefined();
      expect(result.lists[0].rankedData).toBeUndefined();
    });

    it('does nothing for lists with less than 2 items', () => {
      const stateWithOneItem: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            items: [{ id: 'item-1', text: 'Item 1' }],
          },
        ],
      };

      const action: Action = { type: 'START_RANKING', listId: 'list-1' };
      const result = appReducer(stateWithOneItem, action);

      expect(result).toBe(stateWithOneItem);
    });
  });

  describe('START_PARTIAL_RANKING', () => {
    it('initializes partial ranking for inserting new items', () => {
      const stateWithUnranked: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranked',
            rankedData: { itemIdsInOrder: ['item-1', 'item-2'] },
            unrankedItems: [{ id: 'item-3', text: 'Item 3' }],
          },
        ],
      };

      const action: Action = { type: 'START_PARTIAL_RANKING', listId: 'list-1' };
      const result = appReducer(stateWithUnranked, action);

      expect(result.lists[0].status).toBe('ranking');
      expect(result.rankingState).not.toBeNull();
      expect(result.rankingState?.mode).toBe('partial');
      expect(result.currentView).toBe('ranking');
    });

    it('does nothing if no unrankedItems', () => {
      const rankedState: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranked',
            rankedData: { itemIdsInOrder: ['item-1', 'item-2'] },
          },
        ],
      };

      const action: Action = { type: 'START_PARTIAL_RANKING', listId: 'list-1' };
      const result = appReducer(rankedState, action);

      expect(result.rankingState).toBeNull();
    });
  });

  describe('MAKE_COMPARISON', () => {
    it('updates ranking state during comparison', () => {
      const rankingState: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranking',
            items: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
              { id: 'c', text: 'C' },
            ],
          },
        ],
        rankingState: {
          sortedListItemIds: ['a'],
          pendingItemIds: ['c'],
          currentCandidateId: 'b',
          low: 0,
          high: 0,
          mode: 'full',
        },
      };

      const action: Action = { type: 'MAKE_COMPARISON', chooseCandidate: true };
      const result = appReducer(rankingState, action);

      expect(result.rankingState).not.toBeNull();
      expect(result.lists[0].status).toBe('ranking');
    });

    it('completes ranking when no more pending items', () => {
      const rankingState: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranking',
            items: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
            ],
          },
        ],
        rankingState: {
          sortedListItemIds: ['a'],
          pendingItemIds: [],
          currentCandidateId: 'b',
          low: 0,
          high: 0,
          mode: 'full',
        },
      };

      const action: Action = { type: 'MAKE_COMPARISON', chooseCandidate: true };
      const result = appReducer(rankingState, action);

      expect(result.rankingState).toBeNull();
      expect(result.lists[0].status).toBe('ranked');
      expect(result.lists[0].rankedData).toBeDefined();
      expect(result.currentView).toBe('rankedResult');
    });
  });

  describe('COMPLETE_RANKING', () => {
    it('reverts to unranked for full ranking mode', () => {
      const rankingState: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranking',
          },
        ],
        rankingState: {
          sortedListItemIds: ['item-1'],
          pendingItemIds: ['item-2'],
          currentCandidateId: 'item-2',
          low: 0,
          high: 0,
          mode: 'full',
        },
      };

      const action: Action = { type: 'COMPLETE_RANKING' };
      const result = appReducer(rankingState, action);

      expect(result.lists[0].status).toBe('unranked');
      expect(result.rankingState).toBeNull();
      expect(result.currentView).toBe('currentList');
    });

    it('preserves partial ranking progress', () => {
      const rankingState: AppState = {
        ...initialState,
        lists: [
          {
            ...initialState.lists[0],
            status: 'ranking',
            items: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
              { id: 'c', text: 'C' },
            ],
          },
        ],
        rankingState: {
          sortedListItemIds: ['a', 'b'],
          pendingItemIds: [],
          currentCandidateId: 'c',
          low: 0,
          high: 1,
          mode: 'partial',
        },
      };

      const action: Action = { type: 'COMPLETE_RANKING' };
      const result = appReducer(rankingState, action);

      expect(result.lists[0].status).toBe('ranked');
      expect(result.lists[0].rankedData?.itemIdsInOrder).toEqual(['a', 'b']);
      expect(result.lists[0].items.map(i => i.id)).toEqual(['a', 'b']);
      expect(result.currentView).toBe('rankedResult');
    });
  });

  describe('DELETE_LIST', () => {
    it('removes the specified list', () => {
      const stateWithTwoLists: AppState = {
        ...initialState,
        lists: [
          initialState.lists[0],
          {
            id: 'list-2',
            name: 'Second List',
            items: [],
            status: 'unranked',
            createdAt: Date.now(),
          },
        ],
      };

      const action: Action = { type: 'DELETE_LIST', listId: 'list-2' };
      const result = appReducer(stateWithTwoLists, action);

      expect(result.lists.length).toBe(1);
      expect(result.lists[0].id).toBe('list-1');
    });

    it('creates new list if deleting the last one', () => {
      const action: Action = { type: 'DELETE_LIST', listId: 'list-1' };
      const result = appReducer(initialState, action);

      expect(result.lists.length).toBe(1);
      expect(result.lists[0].items).toEqual([]);
      expect(result.lists[0].status).toBe('unranked');
    });

    it('switches to another list if deleting current list', () => {
      const stateWithTwoLists: AppState = {
        ...initialState,
        currentListId: 'list-2',
        lists: [
          initialState.lists[0],
          {
            id: 'list-2',
            name: 'Second List',
            items: [],
            status: 'unranked',
            createdAt: Date.now(),
          },
        ],
      };

      const action: Action = { type: 'DELETE_LIST', listId: 'list-2' };
      const result = appReducer(stateWithTwoLists, action);

      expect(result.currentListId).toBe('list-1');
    });
  });

  describe('LOAD_SHARED_LIST', () => {
    it('loads a shared list and sets it as current', () => {
      const sharedList: List = {
        id: 'original-id',
        name: 'Shared List',
        items: [{ id: 'item-1', text: 'Item 1' }],
        status: 'unranked',
        createdAt: Date.now(),
      };

      const action: Action = { type: 'LOAD_SHARED_LIST', list: sharedList };
      const result = appReducer(initialState, action);

      expect(result.lists.length).toBe(2);
      expect(result.lists[1].name).toBe('Shared List');
      expect(result.lists[1].id).not.toBe('original-id'); // Should have new ID
      expect(result.currentListId).toBe(result.lists[1].id);
      expect(result.currentTab).toBe('current');
    });

    it('shows rankedResult view for ranked shared lists', () => {
      const rankedSharedList: List = {
        id: 'shared-id',
        name: 'Ranked Shared',
        items: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
        status: 'ranked',
        rankedData: { itemIdsInOrder: ['a', 'b'] },
        createdAt: Date.now(),
      };

      const action: Action = { type: 'LOAD_SHARED_LIST', list: rankedSharedList };
      const result = appReducer(initialState, action);

      expect(result.currentView).toBe('rankedResult');
    });
  });
});
