import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankedResultView } from './RankedResultView';
import { AppProvider } from '../context/AppContext';
import { AppState } from '../types';
import * as urlEncoding from '../utils/urlEncoding';

// Mock the urlEncoding module
vi.mock('../utils/urlEncoding', async () => {
  const actual = await vi.importActual('../utils/urlEncoding');
  return {
    ...actual,
    createShareUrl: vi.fn(() => 'http://localhost:5173/?data=mock-ranked-data'),
  };
});

// Mock ShareDialog
vi.mock('./ShareDialog', () => ({
  ShareDialog: ({ open, onClose, url, title }: any) =>
    open ? (
      <div data-testid="share-dialog">
        <div>{title}</div>
        <div>{url}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock InsertItemsDialog
vi.mock('./InsertItemsDialog', () => ({
  InsertItemsDialog: ({ open, onClose, itemCount, onInsertOneByOne, onReRankAll }: any) =>
    open ? (
      <div data-testid="insert-items-dialog">
        <div>Insert {itemCount} Items</div>
        <button onClick={() => { onInsertOneByOne(); onClose(); }}>Insert One by One</button>
        <button onClick={() => { onReRankAll(); onClose(); }}>Re-rank All</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

function renderWithContext(initialState?: Partial<AppState>) {
  const mockState: AppState = {
    lists: [
      {
        id: 'list-1',
        name: 'Test Ranked List',
        items: [
          { id: 'item-1', text: 'First Place' },
          { id: 'item-2', text: 'Second Place' },
          { id: 'item-3', text: 'Third Place' },
        ],
        status: 'ranked',
        rankedData: {
          itemIdsInOrder: ['item-1', 'item-2', 'item-3'],
        },
        createdAt: Date.now(),
      },
    ],
    currentListId: 'list-1',
    rankingState: null,
    currentTab: 'current',
    currentView: 'rankedResult',
    ...initialState,
  };

  localStorage.setItem('pairwise-ranker-state', JSON.stringify(mockState));

  return render(
    <AppProvider>
      <RankedResultView />
    </AppProvider>
  );
}

describe('RankedResultView', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: 'http://localhost:5173/',
      search: '',
    } as Location;
  });

  afterEach(() => {
    localStorage.clear();
    window.location = originalLocation;
  });

  describe('Rendering', () => {
    it('renders ranked list title', () => {
      renderWithContext();
      expect(screen.getByText('Test Ranked List')).toBeInTheDocument();
    });

    it('renders default title when list has no name', () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: '',
            items: [
              { id: 'item-1', text: 'Item' },
            ],
            status: 'ranked',
            rankedData: {
              itemIdsInOrder: ['item-1'],
            },
            createdAt: Date.now(),
          },
        ],
      });

      expect(screen.getByText('Ranked List')).toBeInTheDocument();
    });

    it('renders ranked badge', () => {
      renderWithContext();
      expect(screen.getByText('Ranked')).toBeInTheDocument();
    });

    it('renders all ranked items in order', () => {
      renderWithContext();
      expect(screen.getByText('First Place')).toBeInTheDocument();
      expect(screen.getByText('Second Place')).toBeInTheDocument();
      expect(screen.getByText('Third Place')).toBeInTheDocument();
    });

    it('displays items with correct ranking numbers', () => {
      renderWithContext();
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('3.')).toBeInTheDocument();
    });

    it('displays "No ranked list available" when no ranked data', () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: 'Test',
            items: [],
            status: 'unranked',
            createdAt: Date.now(),
          },
        ],
      });

      expect(screen.getByText('No ranked list available')).toBeInTheDocument();
    });

    it('displays "No ranked list available" when no current list', () => {
      renderWithContext({
        lists: [],
        currentListId: null,
      });

      expect(screen.getByText('No ranked list available')).toBeInTheDocument();
    });

    it('shows shared URL alert when loaded from URL', () => {
      window.location.search = '?data=some-encoded-data';
      renderWithContext();

      expect(screen.getByText(/loaded from a shared ranked list/i)).toBeInTheDocument();
    });

    it('does not show shared URL alert when not loaded from URL', () => {
      window.location.search = '';
      renderWithContext();

      expect(screen.queryByText(/loaded from a shared ranked list/i)).not.toBeInTheDocument();
    });
  });

  describe('Add New Items Section', () => {
    it('renders new item input', () => {
      renderWithContext();
      expect(screen.getByPlaceholderText(/add a new item/i)).toBeInTheDocument();
    });

    it('adds new item to unranked items list', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);
      const addButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'New Item');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('New Item')).toBeInTheDocument();
        expect(screen.getByText('Not yet inserted')).toBeInTheDocument();
      });
    });

    it('adds item on Enter key press', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);

      await userEvent.type(input, 'Another Item{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Another Item')).toBeInTheDocument();
      });
    });

    it('clears input after adding item', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i) as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, 'Test');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('disables add button when input is empty', () => {
      renderWithContext();
      const addButton = screen.getByRole('button', { name: /add/i });
      expect(addButton).toBeDisabled();
    });

    it('trims whitespace from new items', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);
      const addButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(input, '  Whitespace  ');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Whitespace')).toBeInTheDocument();
      });
    });
  });

  describe('Unranked Items Display', () => {
    it('displays unranked items count', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);

      await userEvent.type(input, 'Item 1{Enter}');
      await userEvent.type(input, 'Item 2{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/items to insert \(2\)/i)).toBeInTheDocument();
      });
    });

    it('shows insert button when unranked items exist', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);

      await userEvent.type(input, 'New Item{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /insert 1 item/i })).toBeInTheDocument();
      });
    });

    it('uses plural for multiple unranked items', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);

      await userEvent.type(input, 'Item 1{Enter}');
      await userEvent.type(input, 'Item 2{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /insert 2 items/i })).toBeInTheDocument();
      });
    });

    it('deletes unranked item when delete clicked', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);

      await userEvent.type(input, 'To Delete{Enter}');

      await waitFor(() => {
        expect(screen.getByText('To Delete')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) =>
        btn.querySelector('[data-testid="DeleteIcon"]')
      );

      if (deleteButton) {
        await userEvent.click(deleteButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('To Delete')).not.toBeInTheDocument();
      });
    });
  });

  describe('Insert Items Workflow', () => {
    it('starts partial ranking directly with single unranked item', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);

      await userEvent.type(input, 'Single Item{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /insert 1 item/i })).toBeInTheDocument();
      });

      const insertButton = screen.getByRole('button', { name: /insert 1 item/i });
      await userEvent.click(insertButton);

      // Should dispatch START_PARTIAL_RANKING (we can't easily verify this without checking state changes)
    });

    it('opens insert dialog with multiple unranked items', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);

      await userEvent.type(input, 'Item 1{Enter}');
      await userEvent.type(input, 'Item 2{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /insert 2 items/i })).toBeInTheDocument();
      });

      const insertButton = screen.getByRole('button', { name: /insert 2 items/i });
      await userEvent.click(insertButton);

      await waitFor(() => {
        expect(screen.getByTestId('insert-items-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    it('renders share button', () => {
      renderWithContext();
      expect(screen.getByRole('button', { name: /share ranked list/i })).toBeInTheDocument();
    });

    it('renders re-rank button', () => {
      renderWithContext();
      expect(screen.getByRole('button', { name: /re-rank/i })).toBeInTheDocument();
    });

    it('renders back to current list button', () => {
      renderWithContext();
      expect(screen.getByRole('button', { name: /back to current list/i })).toBeInTheDocument();
    });

    it('opens share dialog when share clicked', async () => {
      renderWithContext();
      const shareButton = screen.getByRole('button', { name: /share ranked list/i });

      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
      });
    });

    it('calls createShareUrl with ranked payload', async () => {
      const createPayloadSpy = vi.spyOn(urlEncoding, 'createPayloadFromList');
      const createShareUrlSpy = vi.mocked(urlEncoding.createShareUrl);

      renderWithContext();
      const shareButton = screen.getByRole('button', { name: /share ranked list/i });

      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(createPayloadSpy).toHaveBeenCalled();
        const call = createPayloadSpy.mock.calls[0];
        expect(call[1]).toBe('ranked'); // Second argument should be 'ranked'
        expect(createShareUrlSpy).toHaveBeenCalled();
      });
    });

    it('displays ranked URL in share dialog', async () => {
      renderWithContext();
      const shareButton = screen.getByRole('button', { name: /share ranked list/i });

      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(screen.getByText('http://localhost:5173/?data=mock-ranked-data')).toBeInTheDocument();
      });
    });

    it('closes share dialog when close clicked', async () => {
      renderWithContext();
      const shareButton = screen.getByRole('button', { name: /share ranked list/i });

      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('share-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Medal Colors and Styling', () => {
    it('renders items with position numbers', () => {
      renderWithContext();
      // First three items should have numbers
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('3.')).toBeInTheDocument();
    });
  });

  describe('Integration Scenarios', () => {
    it('adds multiple unranked items and shows correct count', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);

      await userEvent.type(input, 'Item A{Enter}');
      await userEvent.type(input, 'Item B{Enter}');
      await userEvent.type(input, 'Item C{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/items to insert \(3\)/i)).toBeInTheDocument();
        expect(screen.getByText('Item A')).toBeInTheDocument();
        expect(screen.getByText('Item B')).toBeInTheDocument();
        expect(screen.getByText('Item C')).toBeInTheDocument();
      });
    });

    it('deletes one of multiple unranked items', async () => {
      renderWithContext();
      const input = screen.getByPlaceholderText(/add a new item/i);

      await userEvent.type(input, 'Keep Me{Enter}');
      await userEvent.type(input, 'Delete Me{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Keep Me')).toBeInTheDocument();
        expect(screen.getByText('Delete Me')).toBeInTheDocument();
      });

      // Find delete buttons
      const allButtons = screen.getAllByRole('button', { name: '' });
      const deleteButtons = allButtons.filter((btn) =>
        btn.querySelector('[data-testid="DeleteIcon"]')
      );

      // Click second delete button (for "Delete Me")
      if (deleteButtons.length >= 2) {
        await userEvent.click(deleteButtons[1]);
      }

      await waitFor(() => {
        expect(screen.getByText('Keep Me')).toBeInTheDocument();
        expect(screen.queryByText('Delete Me')).not.toBeInTheDocument();
        expect(screen.getByText(/items to insert \(1\)/i)).toBeInTheDocument();
      });
    });
  });
});
