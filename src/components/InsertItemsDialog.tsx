import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';

interface InsertItemsDialogProps {
  open: boolean;
  onClose: () => void;
  itemCount: number;
  onInsertOneByOne: () => void;
  onReRankAll: () => void;
}

export function InsertItemsDialog({
  open,
  onClose,
  itemCount,
  onInsertOneByOne,
  onReRankAll,
}: InsertItemsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Insert {itemCount} Item{itemCount > 1 ? 's' : ''}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          You have {itemCount} new item{itemCount > 1 ? 's' : ''} to add to your ranked list.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Choose how to proceed:
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => {
                onInsertOneByOne();
                onClose();
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Insert Items One by One
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compare each new item against your existing ranking.
                {itemCount > 1 ? ` (${itemCount} rounds of comparisons)` : ''}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => {
                onReRankAll();
                onClose();
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Re-rank Entire List
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start fresh and rank all items from scratch. Use this if you want to
                reconsider your previous rankings.
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
