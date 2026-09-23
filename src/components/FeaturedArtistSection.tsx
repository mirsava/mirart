import React, { useEffect, useState } from 'react';
import { Avatar, Box, Button, Typography } from '@mui/material';
import { ArrowForward as ArrowForwardIcon, Place as PlaceIcon, Collections as CollectionsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService, { FeaturedArtist } from '../services/api';
import ImagePlaceholder from './ImagePlaceholder';
import { getPaintingDetailPath } from '../utils/seoPaths';
import { brandNavy } from '../theme';

const cream = '#f3efe9';
const terracotta = '#d9825f';
const serif = '"Playfair Display", Georgia, serif';

const formatWeek = (weekStart: string) => {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
};

// Gallery-wall placement for 1–3 pieces: the lead piece is large, the rest stack beside it.
const tileArea = (count: number, index: number) => {
  if (count === 1) return { gridColumn: '1 / -1', gridRow: '1 / -1' };
  if (count === 2) return { gridColumn: index === 0 ? '1' : '2', gridRow: '1 / -1' };
  return index === 0 ? { gridColumn: '1', gridRow: '1 / -1' } : { gridColumn: '2', gridRow: String(index) };
};

// Homepage slot for this week's paid Featured Artist. Renders nothing when the week is unbooked.
const FeaturedArtistSection: React.FC = () => {
  const navigate = useNavigate();
  const [artist, setArtist] = useState<FeaturedArtist | null>(null);

  useEffect(() => {
    apiService.getFeaturedArtist().then(({ artist: a }) => setArtist(a)).catch(() => {});
  }, []);

  if (!artist) return null;
  const profilePath = artist.username ? `/artist/${artist.username}` : null;
  const pieces = artist.listings.slice(0, 3);

  return (
    <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pt: 8 }}>
      <Box
        component="section"
        aria-label={`Featured artist of the week: ${artist.artist_name}`}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 3,
          bgcolor: brandNavy,
          color: cream,
          p: { xs: 3, md: 5 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
          gap: { xs: 4, md: 6 },
          alignItems: 'center',
          // Soft terracotta glow, echoing the hero artwork frames
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${terracotta}55 0%, transparent 70%)`,
            top: -160,
            left: -140,
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Typography
            variant="overline"
            sx={{ color: terracotta, letterSpacing: '0.22em', fontWeight: 700, display: 'block', lineHeight: 1.6 }}
          >
            Featured Artist of the Week
          </Typography>
          <Typography variant="body2" sx={{ color: `${cream}b3`, mb: 3 }}>
            {formatWeek(artist.week_start)}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
            <Avatar
              src={artist.profile_image_url || undefined}
              alt={artist.artist_name}
              sx={{
                width: { xs: 84, md: 104 },
                height: { xs: 84, md: 104 },
                fontSize: '2.25rem',
                fontFamily: serif,
                bgcolor: terracotta,
                color: brandNavy,
                border: `3px solid ${terracotta}`,
                boxShadow: `0 0 0 6px ${brandNavy}, 0 0 0 7px ${terracotta}66`,
              }}
            >
              {artist.artist_name.charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="h2"
                sx={{ fontFamily: serif, fontWeight: 500, color: cream, fontSize: { xs: '1.9rem', md: '2.6rem' }, lineHeight: 1.1 }}
              >
                {artist.artist_name}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1, color: `${cream}b3` }}>
                {artist.country && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PlaceIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{artist.country}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CollectionsIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2">
                    {artist.listing_count} {artist.listing_count === 1 ? 'work' : 'works'} available
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {artist.bio && (
            <Box sx={{ position: 'relative', pl: 3, mb: 4, borderLeft: `2px solid ${terracotta}` }}>
              <Typography
                sx={{
                  fontFamily: serif,
                  fontStyle: 'italic',
                  color: cream,
                  fontSize: { xs: '1.05rem', md: '1.2rem' },
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {artist.bio}
              </Typography>
            </Box>
          )}

          {profilePath && (
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate(profilePath)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: terracotta,
                color: brandNavy,
                px: 3,
                '&:hover': { bgcolor: cream },
              }}
            >
              Explore {artist.artist_name.split(' ')[0]}'s work
            </Button>
          )}
        </Box>

        {pieces.length > 0 && (
          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: pieces.length === 1 ? '1fr' : '3fr 2fr',
              gridTemplateRows: pieces.length === 3 ? '1fr 1fr' : '1fr',
              gap: 2,
              height: { xs: 340, sm: 420, md: 460 },
            }}
          >
            {pieces.map((piece, index) => (
              <Box
                key={piece.id}
                component="button"
                type="button"
                onClick={() => navigate(getPaintingDetailPath(piece.id, piece.title))}
                aria-label={piece.title}
                sx={{
                  ...tileArea(pieces.length, index),
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  border: 0,
                  p: 0,
                  cursor: 'pointer',
                  bgcolor: '#2a3552',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                  '& img': { transition: 'transform 0.5s ease' },
                  '&:hover img, &:focus-visible img': { transform: 'scale(1.05)' },
                  '&:focus-visible': { outline: `3px solid ${terracotta}`, outlineOffset: 2 },
                }}
              >
                {piece.primary_image_url ? (
                  <Box component="img" src={piece.primary_image_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <ImagePlaceholder sx={{ width: '100%', height: '100%' }} iconSize={48} />
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 'auto 0 0 0',
                    p: 1.5,
                    pt: 5,
                    textAlign: 'left',
                    background: 'linear-gradient(to top, rgba(15,20,35,0.85), transparent)',
                  }}
                >
                  <Typography variant="body2" sx={{ color: cream, fontWeight: 600 }} noWrap>{piece.title}</Typography>
                  {piece.price != null && (
                    <Typography variant="caption" sx={{ color: terracotta, fontWeight: 600 }}>${piece.price.toLocaleString()}</Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default FeaturedArtistSection;
