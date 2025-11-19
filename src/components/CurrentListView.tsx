import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Typography,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShareIcon from '@mui/icons-material/Share';
import { useApp } from '../context/AppContext';
import { ShareDialog } from './ShareDialog';
import { createShareUrl, createPayloadFromList } from '../utils/urlEncoding';

export function CurrentListView() {
  const { state, dispatch } = useApp();
  const [itemInput, setItemInput] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const currentList = state.lists.find((l) => l.id === state.currentListId);

  if (!currentList) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography>No list selected</Typography>
      </Box>
    );
  }

  const canStartRanking = currentList.items.length >= 2;
  const canShare = currentList.items.length >= 1;
  const isRanking = currentList.status === 'ranking';

  const handleAddItem = () => {
    if (itemInput.trim() && state.currentListId) {
      dispatch({
        type: 'ADD_ITEM',
        listId: state.currentListId,
        text: itemInput,
      });
      setItemInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (state.currentListId) {
      dispatch({
        type: 'DELETE_ITEM',
        listId: state.currentListId,
        itemId,
      });
    }
  };

  const handleStartRanking = () => {
    if (state.currentListId) {
      dispatch({
        type: 'START_RANKING',
        listId: state.currentListId,
      });
    }
  };

  const handleShare = () => {
    const payload = createPayloadFromList(currentList, 'unranked');
    const url = createShareUrl(payload);
    setShareUrl(url);
    setShareDialogOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (state.currentListId) {
      dispatch({
        type: 'UPDATE_LIST_NAME',
        listId: state.currentListId,
        name: e.target.value,
      });
    }
  };

  // Check if this list was loaded from a shared URL
  const isFromSharedUrl = new URLSearchParams(window.location.search).has('data');

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 800, mx: 'auto' }}>
      {isFromSharedUrl && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Loaded from a shared unranked list
        </Alert>
      )}

      <TextField
        fullWidth
        label="List Name (optional)"
        value={currentList.name}
        onChange={handleNameChange}
        disabled={isRanking}
        sx={{ mb: 3 }}
      />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add Items
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Type an item and press Enter"
            value={itemInput}
            onChange={(e) => setItemInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isRanking}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={!itemInput.trim() || isRanking}
            size="large"
          >
            Add
          </Button>
        </Box>
      </Paper>

      {currentList.items.length > 0 ? (
        <Paper sx={{ mb: 3 }}>
          <List>
            {currentList.items.map((item) => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={isRanking}
                    sx={{
                      minWidth: 44,
                      minHeight: 44,
                      color: 'error.main',
                      '&:hover': {
                        bgcolor: 'error.light',
                        color: 'error.dark',
                      },
                      '&.Mui-disabled': {
                        color: 'action.disabled',
                      },
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No items yet. Add items above to get started.
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={handleStartRanking}
          disabled={!canStartRanking}
        >
          Start Ranking
        </Button>
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={handleShare}
          disabled={!canShare}
          size="large"
        >
          Share Unranked List
        </Button>
      </Box>

      {!canStartRanking && currentList.items.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Add at least 2 items to start ranking
        </Typography>
      )}

      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        url={shareUrl}
        title="Share Unranked List"
      />
    </Box>
  );
}
