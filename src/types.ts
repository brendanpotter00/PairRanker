export type ListItem = {
  id: string;
  text: string;
};

export type ListStatus = 'unranked' | 'ranking' | 'ranked';

export type RankedListData = {
  itemIdsInOrder: string[];
};

export type List = {
  id: string;
  name: string;
  items: ListItem[];
  status: ListStatus;
  rankedData?: RankedListData;
  unrankedItems?: ListItem[]; // Items added to ranked list, not yet inserted
  createdAt: number;
};

export type RankingState = {
  sortedListItemIds: string[];
  pendingItemIds: string[];
  currentCandidateId: string;
  low: number;
  high: number;
  mode?: 'full' | 'partial';
};

export type AppState = {
  lists: List[];
  currentListId: string | null;
  rankingState: RankingState | null;
  currentTab: 'current' | 'myLists';
  currentView: 'currentList' | 'ranking' | 'rankedResult';
};

export type SharePayload = {
  type: 'unranked' | 'ranked';
  name: string;
  items: string[];
};

export type Action =
  | { type: 'SET_TAB'; tab: 'current' | 'myLists' }
  | { type: 'SET_VIEW'; view: 'currentList' | 'ranking' | 'rankedResult' }
  | { type: 'CREATE_LIST' }
  | { type: 'SET_CURRENT_LIST'; listId: string }
  | { type: 'UPDATE_LIST_NAME'; listId: string; name: string }
  | { type: 'ADD_ITEM'; listId: string; text: string }
  | { type: 'DELETE_ITEM'; listId: string; itemId: string }
  | { type: 'ADD_ITEM_TO_RANKED_LIST'; listId: string; text: string }
  | { type: 'DELETE_UNRANKED_ITEM'; listId: string; itemId: string }
  | { type: 'START_RANKING'; listId: string }
  | { type: 'START_PARTIAL_RANKING'; listId: string }
  | { type: 'MAKE_COMPARISON'; chooseCandiate: boolean }
  | { type: 'COMPLETE_RANKING' }
  | { type: 'DELETE_LIST'; listId: string }
  | { type: 'LOAD_SHARED_LIST'; list: List };
