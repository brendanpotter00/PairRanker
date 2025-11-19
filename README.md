# Pairwise Ranker

A front-end only web application for ranking lists using pairwise comparisons with binary insertion sort algorithm.

## Features

- **Create Lists**: Add text items to create unranked lists
- **Pairwise Ranking**: Rank items by comparing two at a time using binary insertion
- **Insert Items into Ranked Lists**: Add new items to already-ranked lists without re-ranking everything
- **Multiple Lists**: Manage multiple lists in one session
- **Delete Lists**: Remove lists you no longer need
- **Share Lists**: Share unranked or ranked lists via URL-encoded links
- **localStorage Persistence**: Lists are saved to your browser's localStorage
- **Keyboard Shortcuts**: Use arrow keys (← →) during ranking for faster comparisons

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Material UI (MUI) for components
- Front-end only (no backend required)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder, ready to be deployed as a static site.

### Preview Production Build

```bash
npm run preview
```

## How to Use

### Creating a List

1. Navigate to the "Current List" tab
2. Optionally enter a list name
3. Type items and press Enter or click "Add"
4. Add at least 2 items to enable ranking

### Ranking

1. Click "Start Ranking" when you have 2+ items
2. Choose between two items repeatedly
3. Use mouse clicks or keyboard arrows (← for left, → for right)
4. The algorithm uses binary insertion to efficiently determine the final order
5. View your ranked results when complete

### Adding Items to a Ranked List

After you've ranked a list, you can add new items without re-ranking everything:

1. In the ranked result view, use the "Add New Items" section
2. Type new items and click "Add"
3. When ready, click "Insert X Item(s)"
4. For multiple items, choose:
   - **Insert Items One by One**: Each item is compared against your existing ranking
   - **Re-rank Entire List**: Start fresh with all items (old + new)

### Managing Multiple Lists

1. Switch to the "My Lists" tab to see all your lists
2. Click on any list to open it
3. Create new lists with the "New List" button
4. Delete lists by clicking the trash icon (with confirmation)
5. Lists are automatically saved to localStorage

### Sharing Lists

**Share Unranked List:**
- Click "Share Unranked List" button
- Copy the URL and send to others
- Recipients will get the same items in unranked state

**Share Ranked List:**
- After ranking, click "Share Ranked List" button
- Copy the URL and send to others
- Recipients will see the final ranked order

All list data is encoded in the URL (no server storage).

## Algorithm

The app uses **pairwise binary insertion sort**:

1. Start with the first item as "sorted"
2. For each remaining item (candidate):
   - Use binary search to find its position
   - Compare candidate with the middle item of sorted list
   - Adjust search bounds based on user's choice
   - Insert when position is found
3. Repeat until all items are ranked

This approach minimizes the number of comparisons needed (approximately O(n log n) comparisons for n items).

## Project Structure

```
src/
├── components/          # React components
│   ├── CurrentListView.tsx
│   ├── RankingView.tsx
│   ├── RankedResultView.tsx
│   ├── MyListsView.tsx
│   ├── ShareDialog.tsx
│   └── InsertItemsDialog.tsx
├── context/             # State management
│   └── AppContext.tsx
├── utils/               # Utility functions
│   ├── urlEncoding.ts
│   ├── localStorage.ts
│   └── rankingAlgorithm.ts
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main app component
└── main.tsx             # Entry point
```

## Features Checklist

✅ Create and edit lists
✅ Pairwise ranking with binary insertion
✅ Insert new items into ranked lists
✅ Multiple list management
✅ Delete lists with confirmation
✅ Share unranked lists via URL
✅ Share ranked lists via URL
✅ localStorage persistence
✅ Keyboard shortcuts (arrow keys)
✅ Material UI design
✅ Full TypeScript support
✅ Responsive layout

## Browser Compatibility

Works in all modern browsers that support:
- ES2020
- localStorage
- Clipboard API (for share feature)

## License

MIT
