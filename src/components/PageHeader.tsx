import React from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { SxProps, Theme, alpha } from '@mui/material/styles';

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
  const headerGradient =
    backgroundGradient ||
    `linear-gradient(132deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 52%, ${alpha(theme.palette.primary.light, 0.92)} 100%)`;
  const titleColor = titleGradient || 'white';

  return (
    <Box 
      sx={{ 
        mb: { xs: 2.5, md: 3.5 }, 
        pt: { xs: 3, md: 4 },
        width: '100%',
        position: 'relative',
        ...(sx && typeof sx === 'object' && !Array.isArray(sx) ? sx : {}),
      }}
    >
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
        <Box 
          sx={{ 
            textAlign: alignment,
            position: 'relative',
            overflow: 'hidden',
            pl: { xs: 2.75, md: align === 'left' ? 4 : 3.5 },
            pr: { xs: 2.75, md: 3.5 },
            py: { xs: 3, md: 3.5 },
            borderRadius: 3,
            background: headerGradient,
            border: '1px solid',
            borderColor: alpha('#ffffff', 0.22),
            boxShadow: '0 12px 34px rgba(22, 16, 58, 0.2)',
            '&::before': disablePattern
              ? undefined
              : {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `
                    radial-gradient(540px 280px at 100% 0%, rgba(255,255,255,0.16), transparent 64%),
                    radial-gradient(520px 260px at 0% 100%, rgba(255,255,255,0.1), transparent 66%)
                  `,
                  opacity: 0.9,
                  pointerEvents: 'none',
                },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent,
              gap: 1.25,
              mb: subtitle ? 1.5 : 0,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {icon && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: { xs: 38, md: 44 },
                  height: { xs: 38, md: 44 },
                  borderRadius: '50%',
                  bgcolor: alpha('#ffffff', 0.16),
                  border: `1px solid ${alpha('#ffffff', 0.3)}`,
                  flexShrink: 0,
                  '& .MuiSvgIcon-root': {
                    color: '#fff',
                    fontSize: { xs: 22, md: 24 },
                  },
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
                color: titleColor,
                fontSize: { xs: '1.8rem', sm: '2.35rem', md: '2.85rem' },
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                m: 0,
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
                color: alpha('#f7f5ff', 0.92),
                maxWidth: { xs: '100%', md: '840px' },
                mx: align === 'center' ? 'auto' : 0,
                mt: 1.2,
                lineHeight: 1.6,
                fontSize: { xs: '0.95rem', sm: '1.03rem', md: '1.1rem' },
                fontWeight: 400,
                textAlign: alignment,
                position: 'relative',
                zIndex: 1,
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
