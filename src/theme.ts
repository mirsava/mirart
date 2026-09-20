import { createTheme, Theme } from '@mui/material/styles';

export const brandNavy = '#1f2a44';

const bodyFont = '"Inter", "Helvetica", "Arial", sans-serif';
const headingFont = '"Playfair Display", Georgia, "Times New Roman", serif';

const makeTypography = (headingColor?: string) => {
  const heading = (size: string, extra: object = {}) => ({
    fontFamily: headingFont,
    fontWeight: 500,
    fontSize: size,
    ...(headingColor ? { color: headingColor } : {}),
    ...extra,
  });
  return {
    fontFamily: bodyFont,
    h1: heading('2.5rem', { letterSpacing: '-0.01em' }),
    h2: heading('2rem', { letterSpacing: '-0.01em' }),
    h3: heading('1.75rem'),
    h4: heading('1.5rem'),
    h5: heading('1.25rem'),
    h6: { fontFamily: bodyFont, fontWeight: 600, fontSize: '1rem', ...(headingColor ? { color: headingColor } : {}) },
  };
};

export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#b5573a',
      light: '#c97a5f',
      dark: '#94432b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3a3632',
      light: '#57524c',
      dark: '#1c1c1c',
      contrastText: '#ffffff',
    },
    background: {
      default: '#faf8f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#1c1c1c',
      secondary: '#6b665f',
    },
    divider: 'rgba(28, 28, 28, 0.14)',
  },
  typography: makeTypography(brandNavy),
  shape: {
    borderRadius: 1,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          width: '100%',
          maxWidth: '100%',
          left: 0,
          right: 0,
          margin: 0,
          padding: 0,
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          paddingLeft: '0 !important',
          paddingRight: '0 !important',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 1,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(181, 87, 58, 0.10)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(181, 87, 58, 0.16)',
            '&:hover': {
              backgroundColor: 'rgba(181, 87, 58, 0.24)',
            },
          },
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.12)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(181, 87, 58, 0.5)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.12)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(181, 87, 58, 0.5)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
  },
});

export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#d9825f',
      light: '#e69f82',
      dark: '#b5573a',
      contrastText: '#1c1c1c',
    },
    secondary: {
      main: '#cfc7bc',
      light: '#e2dcd3',
      dark: '#a89f92',
      contrastText: '#1c1c1c',
    },
    background: {
      default: '#171513',
      paper: '#211e1b',
    },
    text: {
      primary: '#f3efe9',
      secondary: '#b3aca2',
    },
    divider: 'rgba(243, 239, 233, 0.12)',
  },
  typography: makeTypography(),
  shape: {
    borderRadius: 1,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          width: '100%',
          maxWidth: '100%',
          left: 0,
          right: 0,
          margin: 0,
          padding: 0,
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          paddingLeft: '0 !important',
          paddingRight: '0 !important',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 1,
          '&.MuiButton-text': {
            color: '#ffffff',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          },
          '&.MuiButton-outlined': {
            borderColor: 'rgba(255, 255, 255, 0.5)',
            color: '#ffffff',
            '&:hover': {
              borderColor: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          },
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(217, 130, 95, 0.6)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(217, 130, 95, 0.6)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#e0e0e0',
          '&.Mui-selected': {
            color: '#ffffff',
          },
          '&:hover': {
            color: '#ffffff',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#d9825f',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          '&.MuiChip-outlined': {
            borderColor: 'rgba(255, 255, 255, 0.5)',
            color: '#ffffff',
            '&.MuiChip-colorPrimary': {
              borderColor: '#b5573a',
              color: '#e69f82',
            },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(217, 130, 95, 0.16)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(217, 130, 95, 0.22)',
            '&:hover': {
              backgroundColor: 'rgba(217, 130, 95, 0.3)',
            },
          },
        },
      },
    },
  },
});


