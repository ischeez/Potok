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
  palette: { primary: { main: '#264d3e' }, background: { default: '#f7f6f2', paper: '#fffefa' }, text: { primary: '#243c31', secondary: '#6e7a6e' }, divider: '#e4e6dd' },
  typography: { fontFamily: 'Manrope, sans-serif', button: { textTransform: 'none', fontWeight: 700 } },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44, paddingInline: 20, borderRadius: 12, fontSize: 13 } } },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 24, boxShadow: '0 24px 100px #193a3126', backgroundImage: 'none' } } },
    MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider></React.StrictMode>,
);
