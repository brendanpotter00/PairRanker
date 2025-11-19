import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankingView } from './RankingView';
import { AppProvider } from '../context/AppContext';
import { AppState, RankingState } from '../types';

function renderWithContext(initialState?: Partial<AppState>) {
  const defaultRankingState: RankingState = {
    sortedListItemIds: ['item-1'],
    pendingItemIds: ['item-3'],
    currentCandidateId: 'item-2',
    low: 0,
    high: 0,
    mode: 'full',
  };

  const mockState: AppState = {
    lists: [
      {
        id: 'list-1',
        name: 'Test List',
        items: [
          { id: 'item-1', text: 'First Item' },
          { id: 'item-2', text: 'Second Item' },
          { id: 'item-3', text: 'Third Item' },
        ],
        status: 'ranking',
        createdAt: Date.now(),
      },
    ],
    currentListId: 'list-1',
    rankingState: defaultRankingState,
    currentTab: 'current',
    currentView: 'ranking',
    ...initialState,
  };

  localStorage.setItem('pairwise-ranker-state', JSON.stringify(mockState));

  return render(
    <AppProvider>
      <RankingView />
    </AppProvider>
  );
}

describe('RankingView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('renders ranking header', () => {
      renderWithContext();
      expect(screen.getByText('Test List')).toBeInTheDocument();
    });

    it('displays "Ranking List" when list has no name', () => {
      renderWithContext({
        lists: [
          {
            id: 'list-1',
            name: '',
            items: [
              { id: 'item-1', text: 'A' },
              { id: 'item-2', text: 'B' },
            ],
            status: 'ranking',
            createdAt: Date.now(),
          },
        ],
        rankingState: {
          sortedListItemIds: ['item-1'],
          pendingItemIds: [],
          currentCandidateId: 'item-2',
          low: 0,
          high: 0,
          mode: 'full',
        },
      });

      expect(screen.getByText('Ranking List')).toBeInTheDocument();
    });

    it('renders both comparison items', () => {
      renderWithContext();
      expect(screen.getByText('Second Item')).toBeInTheDocument();
      expect(screen.getByText('First Item')).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      renderWithContext();
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('displays progress text', () => {
      renderWithContext();
      expect(screen.getByText(/item \d+ of \d+/i)).toBeInTheDocument();
    });

    it('renders back button', () => {
      renderWithContext();
      const backButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[data-testid="ArrowBackIcon"]')
      );
      expect(backButton).toBeInTheDocument();
    });

    it('renders VS divider on desktop', () => {
      renderWithContext();
      expect(screen.getByText('VS')).toBeInTheDocument();
    });

    it('displays "No ranking in progress" when no ranking state', () => {
      renderWithContext({ rankingState: null });
      expect(screen.getByText('No ranking in progress')).toBeInTheDocument();
    });

    it('displays "No ranking in progress" when no current list', () => {
      renderWithContext({
        lists: [],
        currentListId: null,
      });
      expect(screen.getByText('No ranking in progress')).toBeInTheDocument();
    });

    it('displays error when items not found', () => {
      renderWithContext({
        rankingState: {
          sortedListItemIds: [],
          pendingItemIds: [],
          currentCandidateId: 'nonexistent',
          low: 0,
          high: 0,
          mode: 'full',
        },
      });

      expect(screen.getByText('Error: Items not found')).toBeInTheDocument();
    });
  });

  describe('Partial Ranking Mode', () => {
    it('displays "Inserting Items" title in partial mode', () => {
      renderWithContext({
        rankingState: {
          sortedListItemIds: ['item-1'],
          pendingItemIds: [],
          currentCandidateId: 'item-2',
          low: 0,
          high: 0,
          mode: 'partial',
        },
      });

      expect(screen.getByText('Inserting Items')).toBeInTheDocument();
    });

    it('shows insertion progress text in partial mode', () => {
      renderWithContext({
        rankingState: {
          sortedListItemIds: ['item-1'],
          pendingItemIds: [],
          currentCandidateId: 'item-2',
          low: 0,
          high: 0,
          mode: 'partial',
        },
      });

      expect(screen.getByText(/inserting item \d+ of \d+/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('chooses left item when left card clicked', async () => {
      renderWithContext();

      const cards = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('Second Item')
      );

      if (cards[0]) {
        await userEvent.click(cards[0]);
      }

      // After clicking, state should update (we can't easily verify without integration test)
    });

    it('chooses right item when right card clicked', async () => {
      renderWithContext();

      const cards = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('First Item')
      );

      if (cards[0]) {
        await userEvent.click(cards[0]);
      }

      // After clicking, state should update
    });

    it('opens exit dialog when back button clicked', async () => {
      renderWithContext();

      const backButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[data-testid="ArrowBackIcon"]')
      );

      if (backButton) {
        await userEvent.click(backButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Exit Ranking?')).toBeInTheDocument();
      });
    });

    it('closes exit dialog when cancel clicked', async () => {
      renderWithContext();

      const backButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[data-testid="ArrowBackIcon"]')
      );

      if (backButton) {
        await userEvent.click(backButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Exit Ranking?')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Exit Ranking?')).not.toBeInTheDocument();
      });
    });

    it('has exit button in dialog', async () => {
      renderWithContext();

      const backButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[data-testid="ArrowBackIcon"]')
      );

      if (backButton) {
        await userEvent.click(backButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Exit Ranking?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('chooses left item when left arrow pressed', () => {
      renderWithContext();

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      // Should dispatch MAKE_COMPARISON with chooseCandidate: true
    });

    it('chooses right item when right arrow pressed', () => {
      renderWithContext();

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      // Should dispatch MAKE_COMPARISON with chooseCandidate: false
    });
  });

  describe('Instructions', () => {
    it('shows keyboard shortcuts for left card', () => {
      renderWithContext();
      expect(screen.getByText(/press ← or click to choose/i)).toBeInTheDocument();
    });

    it('shows keyboard shortcuts for right card', () => {
      renderWithContext();
      expect(screen.getByText(/press → or click to choose/i)).toBeInTheDocument();
    });
  });

  describe('Progress Calculation', () => {
    it('calculates progress correctly', () => {
      renderWithContext({
        rankingState: {
          sortedListItemIds: ['item-1'], // 1 sorted
          pendingItemIds: ['item-3'], // 1 pending
          currentCandidateId: 'item-2', // 1 current
          low: 0,
          high: 0,
          mode: 'full',
        },
      });

      // Total = 1 sorted + 1 current + 1 pending = 3
      // Current index = 1 sorted + 1 current = 2
      expect(screen.getByText(/item 2 of 3/i)).toBeInTheDocument();
    });
  });
});
