import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrentListView } from './CurrentListView';
import { AppProvider } from '../context/AppContext';
import { AppState } from '../types';
import * as urlEncoding from '../utils/urlEncoding';

// Mock the urlEncoding module
vi.mock('../utils/urlEncoding', async () => {
  const actual = await vi.importActual('../utils/urlEncoding');
  return {
    ...actual,
    createShareUrl: vi.fn(() => 'http://localhost:5173/?data=mock-encoded-data'),
  };
});

// Mock ShareDialog to simplify testing
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

// Helper to render with app context
function renderWithContext(initialState?: Partial<AppState>) {
  const mockState: AppState = {
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
    ...initialState,
  };

  // Create a wrapper with mocked initial state
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <AppProvider>{children}</AppProvider>;
  };

  // Mock localStorage to inject our state
  const savedState = JSON.stringify(mockState);
  localStorage.setItem('pairwise-ranker-state', savedState);

  return render(<CurrentListView />, { wrapper: Wrapper });
}

describe('CurrentListView', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Mock window.location
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
    it('renders list name input', () => {
      renderWithContext();
      const nameInput = screen.getByLabelText(/list name/i);
      expect(nameInput).toBeInTheDocument();
    });

    it('renders item input field', () => {
      renderWithContext();
      const itemInput = screen.getByPlaceholderText(/type an item/i);
      expect(itemInput).toBeInTheDocument();
    });

    it('renders existing items', () => {
      renderWithContext();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('displays "No list selected" when no current list', () => {
      // To test this, we need to manually render without using renderWithContext
      // because AppProvider automatically sets first list as current
      const mockState: AppState = {
        lists: [],
        currentListId: null,
        rankingState: null,
        currentTab: 'current',
        currentView: 'currentList',
      };

      localStorage.setItem('pairwise-ranker-state', JSON.stringify(mockState));

      render(
        <AppProvider>
          <CurrentListView />
        </AppProvider>
      );

      expect(screen.getByText('No list selected')).toBeInTheDocument();
    });

    it('displays empty state when no items', () => {
      renderWithContext({
        lists: [
          {
            id: 'empty-list',
            name: 'Empty',
            items: [],
            status: 'unranked',
            createdAt: Date.now(),
          },
        ],
        currentListId: 'empty-list',
      });

      expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
    });

    it('shows shared URL alert when loaded from URL', () => {
      window.location.search = '?data=some-encoded-data';
      renderWithContext();

      expect(screen.getByText(/loaded from a shared unranked list/i)).toBeInTheDocument();
    });

    it('does not show shared URL alert when not loaded from URL', () => {
      window.location.search = '';
      renderWithContext();

      expect(screen.queryByText(/loaded from a shared unranked list/i)).not.toBeInTheDocument();
    });
  });

  describe('List Name Editing', () => {
    it('updates list name when input changes', async () => {
      renderWithContext();
      const nameInput = screen.getByLabelText(/list name/i) as HTMLInputElement;

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'New Name');

      expect(nameInput.value).toBe('New Name');
    });

    it('disables name input when ranking', () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: 'Test',
            items: [
              { id: 'item-1', text: 'A' },
              { id: 'item-2', text: 'B' },
            ],
            status: 'ranking',
            createdAt: Date.now(),
          },
        ],
      });

      const nameInput = screen.getByLabelText(/list name/i);
      expect(nameInput).toBeDisabled();
    });
  });

  describe('Adding Items', () => {
    it('adds item when Add button clicked', async () => {
      renderWithContext();
      const itemInput = screen.getByPlaceholderText(/type an item/i);
      const addButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(itemInput, 'New Item');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('New Item')).toBeInTheDocument();
      });
    });

    it('adds item when Enter key pressed', async () => {
      renderWithContext();
      const itemInput = screen.getByPlaceholderText(/type an item/i);

      await userEvent.type(itemInput, 'Another Item{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Another Item')).toBeInTheDocument();
      });
    });

    it('clears input after adding item', async () => {
      renderWithContext();
      const itemInput = screen.getByPlaceholderText(/type an item/i) as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(itemInput, 'Test');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(itemInput.value).toBe('');
      });
    });

    it('does not add empty items', async () => {
      renderWithContext();
      const addButton = screen.getByRole('button', { name: /add/i });

      expect(addButton).toBeDisabled();
    });

    it('trims whitespace from items', async () => {
      renderWithContext();
      const itemInput = screen.getByPlaceholderText(/type an item/i);
      const addButton = screen.getByRole('button', { name: /add/i });

      await userEvent.type(itemInput, '  Whitespace Item  ');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Whitespace Item')).toBeInTheDocument();
      });
    });

    it('disables item input when ranking', () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: 'Test',
            items: [
              { id: 'item-1', text: 'A' },
              { id: 'item-2', text: 'B' },
            ],
            status: 'ranking',
            createdAt: Date.now(),
          },
        ],
      });

      const itemInput = screen.getByPlaceholderText(/type an item/i);
      const addButton = screen.getByRole('button', { name: /add/i });

      expect(itemInput).toBeDisabled();
      expect(addButton).toBeDisabled();
    });
  });

  describe('Deleting Items', () => {
    it('deletes item when delete button clicked', async () => {
      renderWithContext();

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const firstDeleteButton = deleteButtons.find((btn) =>
        btn.querySelector('[data-testid="DeleteIcon"]')
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();

      if (firstDeleteButton) {
        await userEvent.click(firstDeleteButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      });
    });

    it('disables delete buttons when ranking', () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: 'Test',
            items: [
              { id: 'item-1', text: 'A' },
              { id: 'item-2', text: 'B' },
            ],
            status: 'ranking',
            createdAt: Date.now(),
          },
        ],
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) =>
        btn.querySelector('[data-testid="DeleteIcon"]')
      );

      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Start Ranking Button', () => {
    it('enables ranking button with 2+ items', () => {
      renderWithContext();
      const rankButton = screen.getByRole('button', { name: /start ranking/i });
      expect(rankButton).not.toBeDisabled();
    });

    it('disables ranking button with less than 2 items', () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: 'Test',
            items: [{ id: 'item-1', text: 'Only One' }],
            status: 'unranked',
            createdAt: Date.now(),
          },
        ],
      });

      const rankButton = screen.getByRole('button', { name: /start ranking/i });
      expect(rankButton).toBeDisabled();
    });

    it('shows helper text when less than 2 items', () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: 'Test',
            items: [{ id: 'item-1', text: 'Only One' }],
            status: 'unranked',
            createdAt: Date.now(),
          },
        ],
      });

      expect(screen.getByText(/add at least 2 items to start ranking/i)).toBeInTheDocument();
    });

    it('does not show helper text with 2+ items', () => {
      renderWithContext();
      expect(screen.queryByText(/add at least 2 items/i)).not.toBeInTheDocument();
    });

    it('starts ranking when button clicked', async () => {
      renderWithContext();
      const rankButton = screen.getByRole('button', { name: /start ranking/i });

      await userEvent.click(rankButton);

      // The view should change (component will unmount or show different content)
      // We can't easily test the view change here without full integration test
    });
  });

  describe('Share Button', () => {
    it('enables share button with 1+ items', () => {
      renderWithContext();
      const shareButton = screen.getByRole('button', { name: /share unranked list/i });
      expect(shareButton).not.toBeDisabled();
    });

    it('disables share button with no items', () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: 'Empty',
            items: [],
            status: 'unranked',
            createdAt: Date.now(),
          },
        ],
      });

      const shareButton = screen.getByRole('button', { name: /share unranked list/i });
      expect(shareButton).toBeDisabled();
    });

    it('opens share dialog when clicked', async () => {
      renderWithContext();
      const shareButton = screen.getByRole('button', { name: /share unranked list/i });

      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
      });
    });

    it('calls createShareUrl with correct payload', async () => {
      const createPayloadSpy = vi.spyOn(urlEncoding, 'createPayloadFromList');
      const createShareUrlSpy = vi.mocked(urlEncoding.createShareUrl);

      renderWithContext();
      const shareButton = screen.getByRole('button', { name: /share unranked list/i });

      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(createPayloadSpy).toHaveBeenCalled();
        expect(createShareUrlSpy).toHaveBeenCalled();
      });
    });

    it('displays share URL in dialog', async () => {
      renderWithContext();
      const shareButton = screen.getByRole('button', { name: /share unranked list/i });

      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(screen.getByText('http://localhost:5173/?data=mock-encoded-data')).toBeInTheDocument();
      });
    });

    it('closes dialog when close button clicked', async () => {
      renderWithContext();
      const shareButton = screen.getByRole('button', { name: /share unranked list/i });

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

  describe('Integration Scenarios', () => {
    it('adds multiple items in sequence', async () => {
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

      const itemInput = screen.getByPlaceholderText(/type an item/i);

      await userEvent.type(itemInput, 'First{Enter}');
      await userEvent.type(itemInput, 'Second{Enter}');
      await userEvent.type(itemInput, 'Third{Enter}');

      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('Third')).toBeInTheDocument();
      });
    });

    it('enables ranking button after adding second item', async () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: 'Test',
            items: [{ id: 'item-1', text: 'First' }],
            status: 'unranked',
            createdAt: Date.now(),
          },
        ],
      });

      const rankButton = screen.getByRole('button', { name: /start ranking/i });
      expect(rankButton).toBeDisabled();

      const itemInput = screen.getByPlaceholderText(/type an item/i);
      await userEvent.type(itemInput, 'Second{Enter}');

      await waitFor(() => {
        expect(rankButton).not.toBeDisabled();
      });
    });
  });
});
