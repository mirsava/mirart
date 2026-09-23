import React, { useEffect, useState } from 'react';
import { Avatar, Box, ButtonBase, Chip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiService, { ShowcaseArtist } from '../../services/api';

// Horizontally scrolling strip of artists with live work. Hidden when there are none.
const MeetTheArtists: React.FC = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<ShowcaseArtist[]>([]);

  useEffect(() => {
    apiService.getArtistShowcase().then(({ artists: a }) => setArtists(a)).catch(() => {});
  }, []);

  if (artists.length === 0) return null;

  return (
    <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, py: 8 }}>
      <Typography
        variant="h4"
        component="h2"
        sx={{ fontWeight: 600, color: 'text.primary', fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }, mb: 1 }}
      >
        Meet the Artists
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 800, lineHeight: 1.6 }}>
        Every piece on ArtZyla comes straight from the person who made it.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: { xs: '72%', sm: '42%', md: 'calc((100% - 72px) / 4)' },
          gap: 3,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          pb: 2,
          // Keep the scrollbar subtle
          scrollbarWidth: 'thin',
        }}
      >
        {artists.map((artist) => {
          const profilePath = artist.username ? `/artist/${artist.username}` : null;
          return (
            <ButtonBase
              key={artist.id}
              disabled={!profilePath}
              onClick={() => profilePath && navigate(profilePath)}
              sx={{
                display: 'block',
                textAlign: 'left',
                scrollSnapAlign: 'start',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: 'box-shadow 0.25s ease',
                '&:hover, &:focus-visible': { boxShadow: 4 },
                '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
              }}
            >
              <Box
                sx={{
                  height: 150,
                  bgcolor: 'action.hover',
                  backgroundImage: artist.cover_image_url ? `url("${artist.cover_image_url}")` : 'linear-gradient(135deg, #1f2a44, #b5573a)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <Box sx={{ px: 2, pb: 2, mt: -4.5 }}>
                <Avatar
                  src={artist.profile_image_url || undefined}
                  alt={artist.artist_name}
                  sx={{ width: 72, height: 72, border: '3px solid', borderColor: 'background.paper', bgcolor: 'primary.main', fontSize: '1.75rem' }}
                >
                  {artist.artist_name.charAt(0)}
                </Avatar>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mt: 1 }} noWrap>
                  {artist.artist_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {artist.listing_count} {artist.listing_count === 1 ? 'work' : 'works'}{artist.country ? ` · ${artist.country}` : ''}
                </Typography>
                {artist.specialties.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                    {artist.specialties.map((s) => (
                      <Chip key={s} label={s} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
};

export default MeetTheArtists;
