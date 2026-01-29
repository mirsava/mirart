import React from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backgroundGradient?: string;
  titleGradient?: string;
  disablePattern?: boolean;
  align?: 'left' | 'center';
  sx?: SxProps<Theme>;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  backgroundGradient,
  titleGradient,
  disablePattern = false,
  align = 'left',
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const alignment = align === 'center' ? 'center' : 'left';
  const justifyContent = align === 'center' ? 'center' : 'flex-start';

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
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ textAlign: { xs: 'center', md: alignment } }}>
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            component="h1"
            sx={{
              fontWeight: 700,
              color: theme.palette.primary.main,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              mb: subtitle ? 1.5 : 0,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                maxWidth: { xs: '100%', md: '800px' },
                mx: { xs: 'auto', md: align === 'center' ? 'auto' : 0 },
                mt: 1.5,
                lineHeight: 1.6,
                fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem' },
                fontWeight: 400,
                textAlign: { xs: 'center', md: alignment },
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PageHeader;
