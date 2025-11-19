import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Alert,
  Chip,
  TextField,
  IconButton,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApp } from '../context/AppContext';
import { ShareDialog } from './ShareDialog';
import { InsertItemsDialog } from './InsertItemsDialog';
import { createShareUrl, createPayloadFromList } from '../utils/urlEncoding';

export function RankedResultView() {
  const { state, dispatch } = useApp();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [newItemInput, setNewItemInput] = useState('');

  const currentList = state.lists.find((l) => l.id === state.currentListId);

  if (!currentList || !currentList.rankedData) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography>No ranked list available</Typography>
      </Box>
    );
  }

  const rankedItems = currentList.rankedData.itemIdsInOrder.map((id) =>
    currentList.items.find((item) => item.id === id)
  );

  const handleShare = () => {
    const payload = createPayloadFromList(currentList, 'ranked');
    const url = createShareUrl(payload);
    setShareUrl(url);
    setShareDialogOpen(true);
  };

  const handleShareUnranked = () => {
    const payload = createPayloadFromList(currentList, 'unranked');
    const url = createShareUrl(payload);
    setShareUrl(url);
    setShareDialogOpen(true);
  };

  const handleReRank = () => {
    if (state.currentListId) {
      dispatch({
        type: 'START_RANKING',
        listId: state.currentListId,
      });
    }
  };

  const handleBackToList = () => {
    dispatch({ type: 'SET_VIEW', view: 'currentList' });
  };

  const handleAddItem = () => {
    if (newItemInput.trim() && state.currentListId) {
      dispatch({
        type: 'ADD_ITEM_TO_RANKED_LIST',
        listId: state.currentListId,
        text: newItemInput,
      });
      setNewItemInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  const handleDeleteUnrankedItem = (itemId: string) => {
    if (state.currentListId) {
      dispatch({
        type: 'DELETE_UNRANKED_ITEM',
        listId: state.currentListId,
        itemId,
      });
    }
  };

  const handleInsertItems = () => {
    const unrankedCount = currentList.unrankedItems?.length || 0;

    if (unrankedCount === 1) {
      // Single item, start partial ranking directly
      handleInsertOneByOne();
    } else if (unrankedCount > 1) {
      // Multiple items, show dialog
      setInsertDialogOpen(true);
    }
  };

  const handleInsertOneByOne = () => {
    if (state.currentListId) {
      dispatch({
        type: 'START_PARTIAL_RANKING',
        listId: state.currentListId,
      });
    }
  };

  const handleReRankWithNewItems = () => {
    if (state.currentListId && currentList) {
      // Start full ranking with all items (reducer will handle combining unranked items)
      dispatch({
        type: 'START_RANKING',
        listId: state.currentListId,
      });
    }
  };

  // Check if this list was loaded from a shared URL
  const isFromSharedUrl = new URLSearchParams(window.location.search).has('data');

  const hasUnrankedItems = currentList.unrankedItems && currentList.unrankedItems.length > 0;

  const getMedalColor = (index: number): string => {
    switch (index) {
      case 0:
        return '#FFD700'; // Gold
      case 1:
        return '#C0C0C0'; // Silver
      case 2:
        return '#CD7F32'; // Bronze
      default:
        return 'transparent';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 800, mx: 'auto' }}>
      {isFromSharedUrl && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Loaded from a shared ranked list
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <EmojiEventsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" gutterBottom>
            {currentList.name || 'Ranked List'}
          </Typography>
          <Chip label="Ranked" color="success" size="small" />
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <List>
          {rankedItems.map((item, index) => {
            if (!item) return null;
            const medalColor = getMedalColor(index);

            return (
              <ListItem
                key={item.id}
                sx={{
                  borderLeft: medalColor !== 'transparent' ? 4 : 0,
                  borderColor: medalColor,
                  bgcolor:
                    index < 3
                      ? `${medalColor}15`
                      : 'transparent',
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          minWidth: 40,
                          fontWeight: index < 3 ? 'bold' : 'normal',
                        }}
                      >
                        {index + 1}.
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: index < 3 ? 'bold' : 'normal',
                        }}
                      >
                        {item.text}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Add New Items Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add New Items
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Add a new item to insert into your ranking"
            value={newItemInput}
            onChange={(e) => setNewItemInput(e.target.value)}
            onKeyPress={handleKeyPress}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={!newItemInput.trim()}
            startIcon={<AddIcon />}
            size="large"
          >
            Add
          </Button>
        </Box>

        {hasUnrankedItems && (
          <>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Items to insert ({currentList.unrankedItems!.length}):
            </Typography>
            <List dense>
              {currentList.unrankedItems!.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    bgcolor: 'action.hover',
                    mb: 1,
                    borderRadius: 1,
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteUnrankedItem(item.id)}
                      size="small"
                      sx={{ minWidth: 44, minHeight: 44 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={item.text}
                    secondary="Not yet inserted"
                  />
                </ListItem>
              ))}
            </List>
            <Button
              variant="contained"
              color="primary"
              onClick={handleInsertItems}
              fullWidth
              sx={{ mt: 1 }}
              size="large"
            >
              Insert {currentList.unrankedItems!.length} Item
              {currentList.unrankedItems!.length > 1 ? 's' : ''}
            </Button>
          </>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<ShareIcon />}
          onClick={handleShare}
          size="large"
        >
          Share Ranked List
        </Button>
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={handleShareUnranked}
          size="large"
        >
          Share Unranked List
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleReRank}
          size="large"
        >
          Re-rank
        </Button>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToList}
          size="large"
        >
          Back to Current List
        </Button>
      </Box>

      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        url={shareUrl}
        title="Share Ranked List"
      />

      <InsertItemsDialog
        open={insertDialogOpen}
        onClose={() => setInsertDialogOpen(false)}
        itemCount={currentList.unrankedItems?.length || 0}
        onInsertOneByOne={handleInsertOneByOne}
        onReRankAll={handleReRankWithNewItems}
      />
    </Box>
  );
}
