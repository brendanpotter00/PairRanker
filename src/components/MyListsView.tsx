import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useApp } from '../context/AppContext';
import { List } from '../types';

export function MyListsView() {
  const { state, dispatch } = useApp();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);

  const handleSelectList = (listId: string) => {
    dispatch({ type: 'SET_CURRENT_LIST', listId });
  };

  const handleNewList = () => {
    dispatch({ type: 'CREATE_LIST' });
  };

  const handleDeleteClick = (e: React.MouseEvent, listId: string) => {
    e.stopPropagation(); // Prevent card selection when clicking delete
    setListToDelete(listId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (listToDelete) {
      dispatch({ type: 'DELETE_LIST', listId: listToDelete });
      setDeleteDialogOpen(false);
      setListToDelete(null);
    }
  };

  const getStatusLabel = (list: List): string => {
    if (list.status === 'ranked') return 'Ranked';
    if (list.status === 'ranking') return 'Ranking in progress';
    return 'Not ranked yet';
  };

  const getStatusColor = (
    list: List
  ): 'default' | 'success' | 'warning' | 'primary' => {
    if (list.status === 'ranked') return 'success';
    if (list.status === 'ranking') return 'warning';
    return 'default';
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">My Lists</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewList}
          size="large"
        >
          New List
        </Button>
      </Box>

      {state.lists.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No lists yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first list to get started
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewList} size="large">
            Create List
          </Button>
        </Card>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {state.lists
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((list) => (
              <Grid item xs={12} sm={6} md={4} key={list.id}>
                <Card
                  sx={{
                    height: '100%',
                    border:
                      list.id === state.currentListId ? 2 : 0,
                    borderColor: 'primary.main',
                  }}
                >
                  <CardActionArea
                    onClick={() => handleSelectList(list.id)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          mb: 2,
                        }}
                      >
                        <FormatListNumberedIcon
                          sx={{ color: 'primary.main', mt: 0.5 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {list.name || 'Untitled List'}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {formatTimeAgo(list.createdAt)}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteClick(e, list.id)}
                          disabled={state.lists.length === 1}
                          title={state.lists.length === 1 ? "Cannot delete your only list" : "Delete list"}
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
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          flexWrap: 'wrap',
                          mb: 1,
                        }}
                      >
                        <Chip
                          label={`${list.items.length} item${
                            list.items.length !== 1 ? 's' : ''
                          }`}
                          size="small"
                        />
                        <Chip
                          label={getStatusLabel(list)}
                          color={getStatusColor(list)}
                          size="small"
                          icon={
                            list.status === 'ranked' ? (
                              <CheckCircleIcon />
                            ) : undefined
                          }
                        />
                      </Box>

                      {list.id === state.currentListId && (
                        <Chip
                          label="Current"
                          color="primary"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete List?</DialogTitle>
        <DialogContent>
          <Typography>
            {listToDelete && (() => {
              const list = state.lists.find((l) => l.id === listToDelete);
              return `Are you sure you want to delete "${list?.name || 'Untitled List'}"? This action cannot be undone.`;
            })()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
