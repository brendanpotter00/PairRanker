import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ListItem, ListItemText, Box, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ListItem as ListItemType } from '../types';

function getMedalColor(index: number): string {
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
}

interface SortableRankedItemProps {
  id: string;
  item: ListItemType;
  index: number;
}

export function SortableRankedItem({ id, item, index }: SortableRankedItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const medalColor = getMedalColor(index);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 'auto' as const,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        borderLeft: medalColor !== 'transparent' ? 4 : 0,
        borderColor: medalColor,
        bgcolor: index < 3 ? `${medalColor}15` : 'transparent',
        boxShadow: isDragging ? 2 : 0,
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          color: 'text.secondary',
          touchAction: 'none',
          mr: 1,
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIndicatorIcon />
      </Box>
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
}
