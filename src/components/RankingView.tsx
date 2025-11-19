import React, { useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useApp } from '../context/AppContext';
import { getCurrentComparison, getRankingProgress } from '../utils/rankingAlgorithm';

export function RankingView() {
  const { state, dispatch } = useApp();
  const [exitDialogOpen, setExitDialogOpen] = React.useState(false);

  const currentList = state.lists.find((l) => l.id === state.currentListId);
  const rankingState = state.rankingState;

  if (!currentList || !rankingState) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No ranking in progress</Typography>
      </Box>
    );
  }

  const { candidateId, referenceId } = getCurrentComparison(rankingState);
  const candidateItem = currentList.items.find((i) => i.id === candidateId);
  const referenceItem = currentList.items.find((i) => i.id === referenceId);

  const isPartialMode = rankingState.mode === 'partial';
  // Total items = already sorted + current candidate + pending
  const totalItemsToRank = rankingState.sortedListItemIds.length + 1 + rankingState.pendingItemIds.length;
  const progress = getRankingProgress(rankingState, totalItemsToRank);

  const handleChoice = useCallback((chooseCandidate: boolean) => {
    dispatch({
      type: 'MAKE_COMPARISON',
      chooseCandidate: chooseCandidate,
    });
  }, [dispatch]);

  const handleExit = () => {
    setExitDialogOpen(true);
  };

  const confirmExit = () => {
    dispatch({ type: 'COMPLETE_RANKING' });
    setExitDialogOpen(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleChoice(true); // Choose left (candidate)
      } else if (e.key === 'ArrowRight') {
        handleChoice(false); // Choose right (reference)
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleChoice]);

  if (!candidateItem || !referenceItem) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Error: Items not found</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleExit} sx={{ minWidth: 44, minHeight: 44 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">
              {isPartialMode ? 'Inserting Items' : (currentList.name || 'Ranking List')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isPartialMode
                ? `Inserting item ${progress.currentItemIndex} of ${progress.totalItems}`
                : `Item ${progress.currentItemIndex} of ${progress.totalItems}`}
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress.percentComplete}
          sx={{ mt: 2 }}
        />
      </Box>

      {/* Main comparison area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          p: 3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Left card - Candidate */}
        <Card
          sx={{
            width: { xs: '100%', md: 400 },
            height: { xs: 250, md: 300 },
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: 6,
            },
          }}
          onClick={() => handleChoice(true)}
        >
          <CardContent
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Press ← or click to choose
            </Typography>
            <Typography variant="h5" sx={{ mt: 2 }}>
              {candidateItem.text}
            </Typography>
          </CardContent>
        </Card>

        {/* VS Divider */}
        <Typography
          variant="h4"
          color="text.secondary"
          sx={{ display: { xs: 'none', md: 'block' } }}
        >
          VS
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ display: { xs: 'block', md: 'none' } }}
        >
          OR
        </Typography>

        {/* Right card - Reference */}
        <Card
          sx={{
            width: { xs: '100%', md: 400 },
            height: { xs: 250, md: 300 },
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: 6,
            },
          }}
          onClick={() => handleChoice(false)}
        >
          <CardContent
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Press → or click to choose
            </Typography>
            <Typography variant="h5" sx={{ mt: 2 }}>
              {referenceItem.text}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Exit confirmation dialog */}
      <Dialog open={exitDialogOpen} onClose={() => setExitDialogOpen(false)}>
        <DialogTitle>Exit Ranking?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to exit? Your ranking progress will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmExit} color="error">
            Exit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
