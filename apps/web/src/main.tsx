import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/cyrillic-700.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import App from './App';
import './styles.css';

const theme = createTheme({
  palette: { primary: { main: '#294f3b' }, background: { default: '#f6f7f9' }, text: { primary: '#202a25', secondary: '#7b837f' } },
  typography: { fontFamily: 'Manrope, sans-serif', button: { textTransform: 'none', fontWeight: 700 } },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 42, paddingInline: 18, borderRadius: 10 } } },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 22 } } },
    MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider></React.StrictMode>,
);
