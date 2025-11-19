import { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
  Snackbar,
} from '@mui/material';
import { useApp } from './context/AppContext';
import { CurrentListView } from './components/CurrentListView';
import { RankingView } from './components/RankingView';
import { RankedResultView } from './components/RankedResultView';
import { MyListsView } from './components/MyListsView';
import { decodePayloadFromUrl, createListFromPayload } from './utils/urlEncoding';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#212121', // Dark grey/black
      light: '#484848',
      dark: '#000000',
    },
    secondary: {
      main: '#757575', // Medium grey
      light: '#a4a4a4',
      dark: '#494949',
    },
  },
});

function AppContent() {
  const { state, dispatch } = useApp();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');

    if (data) {
      const payload = decodePayloadFromUrl(data);

      if (payload) {
        const list = createListFromPayload(payload);
        dispatch({ type: 'LOAD_SHARED_LIST', list });
      } else {
        setErrorMessage('Invalid shared link. Starting with a new list.');
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'current' | 'myLists') => {
    dispatch({ type: 'SET_TAB', tab: newValue });
  };

  // Determine which view to show
  const renderView = () => {
    // Ranking view takes precedence
    if (state.currentView === 'ranking') {
      return <RankingView />;
    }

    // Check current tab
    if (state.currentTab === 'myLists') {
      return <MyListsView />;
    }

    // Current tab - check view
    if (state.currentView === 'rankedResult') {
      return <RankedResultView />;
    }

    return <CurrentListView />;
  };

  // Don't show tabs during ranking
  const showTabs = state.currentView !== 'ranking';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />

      {showTabs && (
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Pairwise Ranker
            </Typography>
          </Toolbar>
          <Tabs
            value={state.currentTab}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ bgcolor: 'primary.dark' }}
          >
            <Tab label="Current List" value="current" />
            <Tab label="My Lists" value="myLists" />
          </Tabs>
        </AppBar>
      )}

      {renderView()}

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorMessage(null)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
