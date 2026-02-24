import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
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
  icon,
  backgroundGradient,
  titleGradient,
  disablePattern = false,
  align = 'left',
  subtitleLines = 1,
  sx,
}) => {
  const isCenter = align === 'center';
  const titleColor = titleGradient || 'text.primary';

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
          {icon && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: { xs: 44, md: 50 },
                height: { xs: 44, md: 50 },
                flexShrink: 0,
                '& .MuiSvgIcon-root': {
                  color: 'primary.main',
                  fontSize: { xs: 34, md: 38 },
                  opacity: 0.9,
                },
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0, textAlign: isCenter ? 'center' : 'left' }}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 700,
                color: titleColor,
                fontSize: { xs: '1.35rem', sm: '1.45rem', md: '1.55rem' },
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
                m: 0,
              }}
            >
              {title}
            </Typography>
            <Divider
              sx={{
                mt: 0.7,
                mb: subtitle ? 0.55 : 0,
                border: 0,
                height: 3,
                borderRadius: 999,
                background: 'linear-gradient(90deg, rgba(74,58,154,0.95) 0%, rgba(74,58,154,0.6) 65%, rgba(74,58,154,0.2) 100%)',
                width: isCenter ? { xs: 150, md: 210 } : { xs: 140, md: 190 },
                mx: isCenter ? 'auto' : 0,
              }}
            />
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.35,
                  lineHeight: 1.5,
                  fontSize: { xs: '0.88rem', md: '0.93rem' },
                  maxWidth: isCenter ? { xs: '100%', md: '860px' } : '100%',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: subtitleLines,
                  WebkitBoxOrient: 'vertical',
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
