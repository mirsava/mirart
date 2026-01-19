import React from 'react';
import { Box, Typography, Container, useTheme, useMediaQuery } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backgroundGradient?: string;
  titleGradient?: string;
  disablePattern?: boolean;
  sx?: SxProps<Theme>;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  backgroundGradient,
  titleGradient,
  disablePattern = false,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box 
      sx={{ 
        mb: { xs: 2, md: 3 }, 
        pt: { xs: 6, md: 8 },
        width: '100%',
        position: 'relative',
        ...(sx && typeof sx === 'object' && !Array.isArray(sx) ? sx : {}),
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              justifyContent: { xs: 'center', md: 'flex-start' },
              mb: subtitle ? 1.5 : 0,
            }}
          >
            {icon && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: theme.palette.primary.main,
                  opacity: 0.7,
                }}
              >
                {icon}
              </Box>
            )}
            <Typography
              variant={isMobile ? 'h3' : 'h2'}
              component="h1"
              sx={{
                fontWeight: 700,
                color: theme.palette.primary.main,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </Typography>
          </Box>

          {subtitle && (
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                maxWidth: { xs: '100%', md: '800px' },
                mx: { xs: 'auto', md: 0 },
                mt: 1.5,
                lineHeight: 1.6,
                fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem' },
                fontWeight: 400,
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default PageHeader;
