import React from 'react';
import { Box, Typography, Container, Fade, useTheme, useMediaQuery } from '@mui/material';
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

  const getPatternForTitle = (title: string): string => {
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const patterns = [
      `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%234a3a9a' stroke-width='1' opacity='0.15'%3E%3Cpath d='M0 30 Q15 15, 30 30 T60 30'/%3E%3Cpath d='M0 45 Q15 30, 30 45 T60 45'/%3E%3C/g%3E%3C/svg%3E")`,
      `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ff8f00' opacity='0.12'%3E%3Ccircle cx='15' cy='15' r='4'/%3E%3Ccircle cx='50' cy='30' r='3'/%3E%3Ccircle cx='65' cy='55' r='3.5'/%3E%3Ccircle cx='25' cy='65' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
      `url("data:image/svg+xml,%3Csvg width='70' height='70' viewBox='0 0 70 70' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%234a3a9a' stroke-width='1.2' opacity='0.18'%3E%3Cline x1='8' y1='20' x2='35' y2='8'/%3E%3Cline x1='50' y1='15' x2='65' y2='30'/%3E%3Cline x1='15' y1='55' x2='40' y2='65'/%3E%3Cline x1='55' y1='60' x2='62' y2='68'/%3E%3C/g%3E%3C/svg%3E")`,
      `url("data:image/svg+xml,%3Csvg width='65' height='65' viewBox='0 0 65 65' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ff8f00' stroke-width='1' opacity='0.16'%3E%3Cpath d='M8 8 L20 18 L15 30 L8 8'/%3E%3Cpath d='M45 15 L58 28 L50 40 L45 15'/%3E%3Cpath d='M20 45 L35 55 L28 60 L20 45'/%3E%3C/g%3E%3C/svg%3E")`,
      `url("data:image/svg+xml,%3Csvg width='75' height='75' viewBox='0 0 75 75' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%234a3a9a' stroke-width='1' opacity='0.14'%3E%3Crect x='12' y='12' width='15' height='15' transform='rotate(12 19.5 19.5)'/%3E%3Crect x='48' y='28' width='12' height='12' transform='rotate(-15 54 34)'/%3E%3Crect x='20' y='52' width='14' height='14' transform='rotate(20 27 59)'/%3E%3C/g%3E%3C/svg%3E")`,
      `url("data:image/svg+xml,%3Csvg width='55' height='55' viewBox='0 0 55 55' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ff8f00' stroke-width='1.1' opacity='0.17'%3E%3Cpath d='M8 15 Q18 8, 28 15'/%3E%3Cpath d='M32 28 Q42 20, 48 28'/%3E%3Cpath d='M12 42 Q22 35, 32 42'/%3E%3C/g%3E%3C/svg%3E")`,
    ];
    return patterns[hash % patterns.length];
  };

  const pattern = disablePattern ? null : getPatternForTitle(title);

  return (
    <Box 
      sx={{ 
        mb: { xs: 2, md: 2.5 }, 
        pt: { xs: 4, md: 5 }, 
        width: '100%',
        position: 'relative',
        ...(sx && typeof sx === 'object' && !Array.isArray(sx) ? sx : {}),
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          pt: { xs: 2.5, sm: 3, md: 3.5 },
          pb: { xs: 3, sm: 3.5, md: 4 },
          px: { xs: 3, sm: 4, md: 5 },
          background: backgroundGradient || `linear-gradient(135deg, rgba(61, 45, 138, 0.03) 0%, rgba(255, 143, 0, 0.02) 50%, rgba(74, 58, 154, 0.03) 100%)`,
          borderRadius: { xs: 0, md: 4 },
          borderBottom: { xs: '2px solid', md: 'none' },
          borderColor: 'divider',
        }}
      >
        {pattern && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: pattern,
              backgroundSize: { xs: '120px 120px', md: '150px 150px' },
              backgroundPosition: { xs: '25% 35%', md: '20% 30%' },
              backgroundRepeat: 'repeat',
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          />
        )}

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Box sx={{ textAlign: { xs: 'center', md: 'left' }, maxWidth: { md: '80%' } }}>
            {icon && (
              <Fade in={true} timeout={1000} style={{ transitionDelay: '200ms' }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    mb: 2,
                    p: 2,
                    borderRadius: '20px',
                    background: `linear-gradient(135deg, rgba(74, 58, 154, 0.08) 0%, rgba(255, 143, 0, 0.08) 100%)`,
                    border: `2px solid rgba(74, 58, 154, 0.18)`,
                    transform: { xs: 'none', md: 'rotate(-3deg)' },
                    transition: 'all 0.3s ease',
                    boxShadow: `0 4px 20px rgba(74, 58, 154, 0.12)`,
                    '&:hover': {
                      transform: { xs: 'scale(1.05)', md: 'rotate(3deg) scale(1.1)' },
                      boxShadow: `0 6px 30px rgba(74, 58, 154, 0.18)`,
                    },
                  }}
                >
                  {icon}
                </Box>
              </Fade>
            )}

            <Box
              sx={{
                position: 'relative',
                display: 'inline-block',
                mb: subtitle ? 2 : 0,
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              <Typography
                variant={isMobile ? 'h3' : 'h2'}
                component="h1"
                sx={{
                  fontWeight: 800,
                  color: theme.palette.primary.main,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  lineHeight: 1.2,
                  letterSpacing: '-0.03em',
                  position: 'relative',
                  zIndex: 2,
                  textShadow: `0 2px 8px ${theme.palette.primary.main}20`,
                }}
              >
                {title}
              </Typography>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -10,
                  left: { xs: '50%', md: 0 },
                  transform: { xs: 'translateX(-50%)', md: 'none' },
                  width: { xs: '80px', md: '120px' },
                  height: '6px',
                  background: theme.palette.secondary.main,
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.9,
                  zIndex: 1,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -7,
                  left: { xs: '50%', md: 0 },
                  transform: { xs: 'translateX(-50%)', md: 'none' },
                  width: { xs: '100px', md: '140px' },
                  height: '3px',
                  background: theme.palette.primary.main,
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.6,
                  zIndex: 0,
                }}
              />
            </Box>

            {subtitle && (
              <Fade in={true} timeout={1000} style={{ transitionDelay: '400ms' }}>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{
                    maxWidth: { xs: '100%', md: '700px' },
                    mx: { xs: 'auto', md: 0 },
                    mt: 2,
                    lineHeight: 1.6,
                    fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem' },
                    fontWeight: 400,
                    opacity: 0.85,
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  {subtitle}
                </Typography>
              </Fade>
            )}
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default PageHeader;
