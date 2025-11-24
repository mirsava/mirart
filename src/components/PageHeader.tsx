import React from 'react';
import { Box, Typography, Container, Paper, Fade, useTheme, useMediaQuery } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backgroundGradient?: string;
  sx?: SxProps<Theme>;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  backgroundGradient,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const defaultGradient = 'linear-gradient(135deg, rgba(25, 118, 210, 0.04) 0%, rgba(156, 39, 176, 0.04) 50%, rgba(83, 75, 174, 0.04) 100%)';

  return (
    <Box sx={{ mb: { xs: 4, md: 6 }, width: '100%', ...sx }}>
      <Fade in={true} timeout={800}>
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            p: { xs: 4, sm: 5, md: 6 },
            background: backgroundGradient || defaultGradient,
            borderRadius: 0,
            border: 'none',
            borderBottom: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 50%, rgba(25, 118, 210, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(156, 39, 176, 0.05) 0%, transparent 50%)',
              pointerEvents: 'none',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(83, 75, 174, 0.03) 0%, transparent 70%)',
              animation: 'pulse 8s ease-in-out infinite',
              pointerEvents: 'none',
            },
            '@keyframes pulse': {
              '0%, 100%': {
                transform: 'scale(1)',
                opacity: 0.5,
              },
              '50%': {
                transform: 'scale(1.1)',
                opacity: 0.8,
              },
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {icon && (
              <Fade in={true} timeout={1000} style={{ transitionDelay: '200ms' }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    mb: 3,
                    p: 2,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    borderOpacity: 0.2,
                    transform: 'rotate(-5deg)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'rotate(5deg) scale(1.1)',
                    },
                  }}
                >
                  {icon}
                </Box>
              </Fade>
            )}

            <Typography
              variant={isMobile ? 'h3' : 'h2'}
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 50%, #534bae 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: subtitle ? 2 : 0,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                position: 'relative',
                display: 'inline-block',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '60px',
                  height: '4px',
                  background: 'linear-gradient(90deg, transparent 0%, #1976d2 50%, transparent 100%)',
                  borderRadius: 2,
                },
              }}
            >
              {title}
            </Typography>

            {subtitle && (
              <Fade in={true} timeout={1000} style={{ transitionDelay: '400ms' }}>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{
                    maxWidth: '800px',
                    mx: 'auto',
                    mt: 3,
                    lineHeight: 1.7,
                    fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
                    fontWeight: 400,
                    opacity: 0.9,
                  }}
                >
                  {subtitle}
                </Typography>
              </Fade>
            )}
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
};

export default PageHeader;

