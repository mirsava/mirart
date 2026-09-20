import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { SxProps, Theme, alpha } from '@mui/material/styles';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backgroundGradient?: string;
  titleGradient?: string;
  disablePattern?: boolean;
  align?: 'left' | 'center';
  subtitleLines?: number;
  sx?: SxProps<Theme>;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  titleGradient,
  align = 'left',
  subtitleLines = 2,
  sx,
}) => {
  const isCenter = align === 'center';

  return (
    <Box 
      sx={{ 
        mb: { xs: 2.5, md: 3 }, 
        pt: { xs: 3, md: 4 },
        width: '100%',
        position: 'relative',
        ...(sx && typeof sx === 'object' && !Array.isArray(sx) ? sx : {}),
      }}
    >
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCenter ? 'center' : 'flex-start',
            gap: 1.5,
            py: { xs: 0.5, md: 0.75 },
          }}
        >
          <Box sx={{ minWidth: 0, textAlign: isCenter ? 'center' : 'left' }}>
            {eyebrow && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: isCenter ? 'center' : 'flex-start', gap: 1.25, mb: 1 }}>
                <Box sx={{ width: 28, height: 2, bgcolor: 'primary.main' }} />
                <Typography
                  component="p"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  {eyebrow}
                </Typography>
              </Box>
            )}
            <Typography
              variant="h4"
              component="h1"
              sx={{
                ...(titleGradient ? { color: titleGradient } : {}),
                fontSize: { xs: '1.6rem', sm: '1.8rem', md: '2rem' },
                lineHeight: 1.2,
                m: 0,
              }}
            >
              {title}
            </Typography>
            <Divider
              sx={{
                mt: 0.7,
                mb: 0,
                border: 0,
                height: 3,
                borderRadius: 999,
                background: (theme: Theme) => `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.45)} 65%, ${alpha(theme.palette.primary.main, 0)} 100%)`,
                width: isCenter ? { xs: 150, md: 210 } : { xs: 140, md: 190 },
                mx: isCenter ? 'auto' : 0,
              }}
            />
            {subtitle && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  mt: 1.5,
                  maxWidth: 760,
                  mx: isCenter ? 'auto' : 0,
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: subtitleLines,
                  overflow: 'hidden',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PageHeader;
