# Pairwise List Ranking Web App  PRD

> **Tech Stack**: React + Material UI (MUI)
> **Runtime**: Front-end only (no backend)

---

## 1. Overview

Build a **front-end only** web application that lets users:

1. **Create** text-only lists.
2. **Rank** each list using **pairwise binary insertion** (comparing two items at a time).
3. **View all lists created in the current browser session.**
4. **Share**:
   - An **unranked list** via URL.
   - A **ranked list** via URL.

Constraints:

- **Framework**: React
- **UI library**: Material UI (MUI)
- **No backend / no auth**
- **URL-encoded state** for sharing lists.

---

## 2. Goals & Non-goals

### 2.1 Goals

- Create a list of text items via a simple input.
- Show the list in a list view.
- Start a **pairwise ranking** flow when there are e 2 items.
- Rank items by repeatedly choosing between 2 options.
- Show the final ranked list.
- Manage multiple lists in one session:
  - View all lists.
  - Switch between them.
- Share an **unranked** and **ranked** list via URL that fully encodes the list data.

### 2.2 Non-goals

- No accounts/logins.
- No remote persistence (optional localStorage is a nice-to-have only).
- No advanced mobile-specific design.
- No advanced error recovery for corrupted links (basic error message is enough).

---

## 3. User Personas & Stories

### 3.1 Persona

**Casual decision-maker**:
- Wants to rank ideas, choices, or tasks (e.g. trip ideas, priorities).
- Wants to share lists to compare rankings.

### 3.2 User Stories

1. **Create List**
   - I can type an item into a text box and press **Enter** or click **Add**.
   - I see items appear in a list above the input.
   - I can delete items before ranking.

2. **Start Ranking**
   - If I have e 2 items, I see a **Start Ranking** button.
   - Clicking **Start Ranking** shows a full-screen view with two items to compare.

3. **Pairwise Ranking**
   - I repeatedly choose which of two items I prefer.
   - When done, I see a final ranked list.

4. **Multiple Lists per Session**
   - I can create multiple lists in one session.
   - I can see all lists I've created in a **My Lists** tab.
   - I can re-open and re-rank lists.

5. **Sharing**
   - From an unranked list, I can copy/share a URL that encodes the unranked list.
   - From a ranked result, I can copy/share a URL that encodes the ranking.
   - Opening a shared URL reconstructs the list in the appropriate mode (unranked or ranked).

---

## 4. UX / Screens

### 4.1 Global Layout

- **AppBar** (MUI `AppBar`):
  - Title: `Pairwise Ranker` (or similar).
  - MUI `Tabs`:
    - **Current List**
    - **My Lists**

- **Content Area**:
  - Renders content for the selected tab and view state.

---

### 4.2 Screen A: Current List (Unranked View)

**Components:**

1. **List Name**
   - MUI `TextField` (optional) for list name.

2. **Item Input**
   - MUI `TextField` with placeholder: `"Type an item and press Enter"`.
   - MUI `Button` labeled `"Add"`.
   - Pressing Enter or clicking Add:
     - Validates non-empty trimmed text.
     - Adds a new item to the list.

3. **Item List**
   - MUI `List` with `ListItem` per item.
   - Each item:
     - Shows text.
     - Shows delete icon (`IconButton` with delete icon).

4. **Actions**
   - **Start Ranking** (`Button`):
     - Enabled only if `items.length >= 2`.
   - **Share Unranked List** (`Button`):
     - Enabled if `items.length >= 1`.
     - On click:
       - Encodes current list into URL (see URL encoding).
       - Shows URL in a MUI `Dialog` or `Snackbar` with copy-to-clipboard.

5. **Indicator for Shared Links**
   - If loaded from a shared unranked URL:
     - Show small banner: `"Loaded from a shared unranked list"`.

---

### 4.3 Screen B: Ranking View (Full Screen)

**Layout:**

- Full-screen `Box` (fixed or normal route).
- **Header**:
  - List name.
  - Progress indicator (e.g. `"Comparing item X of N"` or `"Y comparisons made"`).

**Core UI:**

- Two large **item cards** (MUI `Card`), left and right:
  - Display the two items being compared.
  - Each card is clickable (acts as a button).

- **Actions**:
  - Clicking left card = choose left item.
  - Clicking right card = choose right item.
  - Optionally:
    - Buttons: `"Choose Left"` and `"Choose Right"`.
    - Keyboard shortcuts: left arrow / right arrow.

- **Exit/Back**:
  - A small `"Back"` or `"Exit Ranking"` button:
    - Returns to Current List view.
    - Optional confirmation dialog if progress would be lost.

**Completion:**

- When the algorithm determines final ordering:
  - Automatically transition to **Ranked Result View** for the list.

---

### 4.4 Screen C: Ranked Result View

**Elements:**

- List name labeled as `"Ranked"` or similar.
- Ranked items shown in order:
  - MUI `List`; each item prefixed with position: `1.`, `2.`, etc.

**Actions:**

- **Share Ranked List** (`Button`):
  - Encodes final ranked order into URL.
  - Presents URL in a `Dialog` for copying.

- **Re-rank** (`Button`):
  - Starts a new ranking session from scratch based on current items.

- **Back to Current List** (`Button`):
  - Returns to the unranked list view with the same items.

---

### 4.5 Screen D: My Lists (Session Lists)

**Layout:**

- MUI `List` or cards showing all lists in the current session.

Each list row/card includes:

- List name (or `"Untitled List"` if empty).
- Number of items.
- Status:
  - `"Not ranked yet"` or `"Ranked"`.
- Optional: created time (e.g., `"5 minutes ago"`).

**Interactions:**

- Clicking a list:
  - Sets it as `currentListId`.
  - Navigates to:
    - **Current List View** if `status === 'unranked'`.
    - **Ranked Result View** if `status === 'ranked'`.

- **New List** (`Button`):
  - Creates a fresh empty list.
  - Switches to Current List view with that new list.

**Persistence:**

- Minimum: in-memory for current page session.
- Optional (nice-to-have): mirror to `localStorage`.

---

## 5. Functional Requirements

### 5.1 Data Model

```typescript
type ListItem = {
  id: string;   // UUID or unique string
  text: string;
};

type ListStatus = 'unranked' | 'ranking' | 'ranked';

type RankedListData = {
  itemIdsInOrder: string[]; // ranked from most to least preferred
};

type List = {
  id: string;
  name: string;
  items: ListItem[];
  status: ListStatus;
  rankedData?: RankedListData;
  createdAt: number; // timestamp (ms)
};

type RankingState = {
  sortedListItemIds: string[];
  pendingItemIds: string[];
  currentCandidateId: string;
  low: number;
  high: number;
};

type AppState = {
  lists: List[];
  currentListId: string | null;
  rankingState?: RankingState | null;
};
```

### 5.2 Pairwise Binary Insertion Algorithm

**Goal**: Rank N items using pairwise comparisons with a binary search approach.

**Init**

- `sortedList = [firstItem]`.
- `pending = remainingItems`.

**For each candidate in pending:**

1. Maintain search bounds: `low = 0`, `high = sortedList.length - 1`.
2. **While `low <= high`:**
   - `mid = Math.floor((low + high) / 2)`.
   - Show comparison between:
     - `candidate` vs `sortedList[mid]`.
   - **If user chooses candidate** (candidate is preferred):
     - Candidate should be higher than `sortedList[mid]`.
     - So search upper ranks = lower indices (depending on convention):
       - For example: if index 0 is top-ranked, then:
         - `high = mid - 1`.
   - **Else** (user chooses `sortedList[mid]`):
     - Candidate should be lower:
       - `low = mid + 1`.
3. When loop ends (`low > high`), insert candidate into `sortedList` at index `low`.

**After all pending items handled:**

- `sortedList` is final ranked order.

**UI-level mapping:**

In `RankingState`, track:

- `currentCandidateId`
- `sortedListItemIds`
- `low`, `high`

The current comparison item:

- `referenceId = sortedListItemIds[mid]` where `mid` is calculated from `low` and `high`.

UI always shows:

- Left: candidate, Right: reference (or vice versa, but consistent with algorithm implementation).

### 5.3 URL Encoding for Sharing

All sharing is done client-side via URL query parameters.

#### 5.3.1 Payload Shape

**Unranked list:**

```json
{
  "type": "unranked",
  "name": "My List",
  "items": ["Item 1", "Item 2", "Item 3"]
}
```

**Ranked list:**

```json
{
  "type": "ranked",
  "name": "My List",
  "items": ["Item 1", "Item 2", "Item 3"] // in final ranked order
}
```

#### 5.3.2 Encoding

1. Build JSON string.
2. Convert to UTF-8 bytes.
3. Base64-encode and make URL-safe:
   - Replace `+` with `-`.
   - Replace `/` with `_`.
   - Strip trailing `=` padding.
4. Attach as `?data=<encoded>` to the URL.

**Example:**

```
https://example.com/?data=<encoded_payload>
```

#### 5.3.3 Decoding on Load

At app start:

1. Check query param `data`.
2. **If present:**
   - Decode URL-safe base64.
   - Parse JSON.
   - **If `type === "unranked"`:**
     - Create new `List` with:
       - `status: 'unranked'`
       - Items in the given order.
     - Set `currentListId` to this list.
     - Show Current List tab.
   - **If `type === "ranked"`:**
     - Create new `List` with:
       - `status: 'ranked'`
       - Items in ranked order.
       - `rankedData` with item IDs in ranked order.
     - Set `currentListId` to this list.
     - Show Ranked Result view.
   - **If decoding/parsing fails:**
     - Show non-blocking error banner: "Invalid shared link".
     - Create a default empty list so the app remains usable.

#### 5.3.4 Generating Share URLs

**Unranked:**

- Gather list name and item texts.
- Build unranked payload.
- Encode and show URL in dialog.

**Ranked:**

- Gather final rank order from `rankedData.itemIdsInOrder`.
- Map IDs to texts.
- Build ranked payload.
- Encode and show URL.

---

## 6. Technical Implementation

### 6.1 Tech Stack

- **React** (function components + hooks).
- **Material UI** (`@mui/material`, `@mui/icons-material`).
- **JavaScript or TypeScript** (TypeScript preferred).

### 6.2 Suggested Component Tree

```
<App>
  App-level state (or Context).
  Renders:
    <AppBar>
      <Tabs>

    Active view:
      <CurrentListView />
      <MyListsView />
      <RankingView />
      <RankedResultView />

<CurrentListView />
<RankingView />
<RankedResultView />
<MyListsView />
<ShareDialog /> (generic)
```

### 6.3 State Management

Can be done with `useReducer` in `App` and passed via Context.

**Operations:**

- Create list
- Set current list
- Add/delete item
- Start ranking
- Update ranking state with comparison result
- Complete ranking (set `status: 'ranked'` and `rankedData`)
- Load list from shared URL
- Create new list

### 6.4 Edge Cases

- Ignore blank/whitespace items.
- Don't allow Start Ranking when < 2 items.
- While ranking:
  - Either:
    - Disable editing items; OR
    - Allow editing but if something changes, cancel and require restart.
  - Simpler implementation: disable editing during ranking.

---

## 7. Non-functional Requirements

- **No backend**: must run as a static SPA.
- Should handle lists up to ~200 items without noticeable lag.
- Reasonably responsive layout for laptops/tablets.

---

## 8. Acceptance Criteria

**Create List**

-  Items can be added via input + Enter/Add.
-  Items are displayed in a list above the input.
-  Items can be deleted.

**Start Ranking**

-  "Start Ranking" is only enabled when there are e 2 items.
-  Clicking opens a full-screen ranking view.

**Pairwise Binary Insertion**

-  Only two items are shown at a time.
-  User choices drive the algorithm.
-  Final ranking is derived using binary insertion.
-  User is taken to Ranked Result view on completion.

**Ranked Result View**

-  Ranked items are shown with clear ordering (1, 2, 3, &).
-  A "Share Ranked List" button generates a valid URL.
-  A "Re-rank" button restarts ranking.
-  A "Back to Current List" button returns to the list editor.

**My Lists**

-  A "My Lists" tab shows all session lists.
-  Each list shows name, count, and status.
-  Clicking a list opens it in the appropriate view.
-  A "New List" button resets to a fresh list.

**Sharing**

-  "Share Unranked List" generates a URL that reconstructs the unranked list.
-  "Share Ranked List" generates a URL that reconstructs the ranked list.
-  Invalid/garbled data param shows an error banner and the app still works.

**UI / Tech**

-  MUI is used for AppBar, Tabs, Buttons, TextField, List, Dialog, etc.
-  App runs as a static SPA with no server dependencies.

---

## 9. Implementation Checklist (Sequential)

Use this as a step-by-step guide for implementation.

### Phase 1  Project Setup

- [ ] Initialize React project (e.g., Vite or Create React App).
- [ ] Install Material UI:
  - [ ] `@mui/material`
  - [ ] `@emotion/react`, `@emotion/styled`
  - [ ] `@mui/icons-material`
- [ ] Create top-level `App` component.
- [ ] Set up a basic MUI theme and wrap app in `ThemeProvider`.

### Phase 2  Global Layout & State

- [ ] Define core types (`List`, `ListItem`, `AppState`, `RankingState`) in a types file.
- [ ] Implement a simple state container:
  - [ ] `useReducer` or `useState` in `App`.
  - [ ] Initial state: one empty list with `status: 'unranked'`, set as `currentListId`.
- [ ] Implement `<AppBar>` + `<Tabs>`:
  - [ ] Tabs: "Current List" and "My Lists".
  - [ ] Store selected tab in state.

### Phase 3  Current List View

- [ ] Create `<CurrentListView />` component.
- [ ] Connect it to global state via props or Context:
  - [ ] Reads current list.
  - [ ] Dispatches actions to add/remove items, set name.
- [ ] Implement:
  - [ ] List name `TextField`.
  - [ ] Item input `TextField` + Add Button + Enter key handler.
  - [ ] MUI `List` of items with delete buttons.
  - [ ] "Start Ranking" button:
    - [ ] Enabled if `items.length >= 2`.
    - [ ] On click, dispatch action to initialize `RankingState` and change view to Ranking.
  - [ ] "Share Unranked List" button:
    - [ ] Builds unranked payload from current list.
    - [ ] Encodes to URL.
    - [ ] Opens `ShareDialog` with the URL.

### Phase 4  URL Encoding / Decoding Plumbing

- [ ] Implement utility functions:
  - [ ] `encodePayloadToUrl(data: Payload): string`
  - [ ] `decodePayloadFromUrl(): Payload | null`
- [ ] On app mount:
  - [ ] Check for `data` param.
  - [ ] Decode and parse.
  - [ ] If valid:
    - [ ] Create `List` from payload.
    - [ ] Set as `currentListId`.
    - [ ] Set UI to appropriate view (unranked or ranked).
  - [ ] If invalid:
    - [ ] Show banner: "Invalid shared link".
    - [ ] Fall back to default empty list.

### Phase 5  Ranking Algorithm & View

- [ ] Create `<RankingView />` component.
- [ ] Implement `RankingState` initialization:
  - [ ] `sortedListItemIds = [firstItem.id]`
  - [ ] `pendingItemIds = remaining IDs`.
  - [ ] `currentCandidateId = first of pendingItemIds`.
  - [ ] `low = 0`, `high = sortedListItemIds.length - 1`.
- [ ] Implement a selector/helper to derive:
  - [ ] `currentCandidate` and `currentReference` items from state.
- [ ] UI:
  - [ ] Full-screen layout with two MUI `Card`s (left/right).
  - [ ] Each card clickable to represent user's choice.
  - [ ] Optional arrow key support.
- [ ] Algorithm step on choice:
  - [ ] Compute `mid = floor((low + high)/2)`.
  - [ ] If user chooses candidate:
    - [ ] Adjust bounds accordingly (e.g., `high = mid - 1` if candidate is "better").
  - [ ] If user chooses reference:
    - [ ] Adjust other side (`low = mid + 1`).
  - [ ] If `low > high`:
    - [ ] Insert candidate into `sortedListItemIds` at `low`.
    - [ ] Move to next candidate:
      - [ ] If `pendingItemIds` not empty:
        - [ ] Set `currentCandidateId` to next.
        - [ ] Reset `low`/`high` for new candidate.
      - [ ] Else:
        - [ ] Ranking complete.
- [ ] When ranking complete:
  - [ ] Update current `List`:
    - [ ] `status = 'ranked'`
    - [ ] `rankedData.itemIdsInOrder = sortedListItemIds`
  - [ ] Transition to Ranked Result view.

### Phase 6  Ranked Result View

- [ ] Create `<RankedResultView />` component.
- [ ] Shows:
  - [ ] List name.
  - [ ] MUI `List` of items ordered by `rankedData.itemIdsInOrder`.
- [ ] Actions:
  - [ ] "Share Ranked List" button:
    - [ ] Builds payload with items in ranked order.
    - [ ] Encodes into URL.
    - [ ] Shows in `ShareDialog`.
  - [ ] "Re-rank" button:
    - [ ] Re-initializes `RankingState` for this list.
    - [ ] Navigates to `<RankingView />`.
  - [ ] "Back to Current List" button:
    - [ ] Navigates to `<CurrentListView />`.

### Phase 7  My Lists View

- [ ] Create `<MyListsView />`.
- [ ] Read `lists` from global state.
- [ ] Render MUI `List` or cards where each entry shows:
  - [ ] List name or "Untitled List".
  - [ ] Number of items.
  - [ ] Status (Unranked/Ranked).
- [ ] On click:
  - [ ] Set `currentListId`.
  - [ ] Switch to:
    - [ ] Current List tab for unranked.
    - [ ] Ranked Result view for ranked.
- [ ] Add "New List" button:
  - [ ] Creates new empty list.
  - [ ] Sets `currentListId`.
  - [ ] Switches to Current List view.

### Phase 8  Polish & Edge Cases

- [ ] Disable editing (add/delete items) while `status === 'ranking'`, or handle cancel/restart.
- [ ] Handle empty/whitespace inputs gracefully.
- [ ] Add minimal responsive styles using MUI's `Box`, `Grid`, etc.
- [ ] Add banners/alerts for:
  - [ ] Invalid shared link.
  - [ ] Possibly for "Loaded from shared link".
- [ ] Optional: Persist lists to `localStorage` on change, and read from it on load if no `data` param.

### Phase 9  Final QA Against Acceptance Criteria

- [ ] Verify checklist in Section 8 (Acceptance Criteria) end-to-end.
- [ ] Test:
  - [ ] Creating a list, ranking, and seeing the final list.
  - [ ] Creating multiple lists and switching between them.
  - [ ] Sharing unranked and ranked lists, opening in a new tab.
  - [ ] Behavior with corrupted/invalid `data` param.
