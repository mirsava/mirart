import React, { useEffect, useState } from 'react';
import { Avatar, Box, Button, Card, CardActionArea, CardContent, Chip, Grid, Typography } from '@mui/material';
import { AutoAwesome as SpotlightIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService, { FeaturedArtist } from '../services/api';
import ImagePlaceholder from './ImagePlaceholder';
import { getPaintingDetailPath } from '../utils/seoPaths';

// Homepage slot for this week's paid Featured Artist. Renders nothing when the week is unbooked.
const FeaturedArtistSection: React.FC = () => {
  const navigate = useNavigate();
  const [artist, setArtist] = useState<FeaturedArtist | null>(null);

  useEffect(() => {
    apiService.getFeaturedArtist().then(({ artist: a }) => setArtist(a)).catch(() => {});
  }, []);

  if (!artist) return null;
  const profilePath = artist.username ? `/artist/${artist.username}` : null;

  return (
    <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pt: 8 }}>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: { xs: 2.5, md: 4 },
          bgcolor: 'background.paper',
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={4}>
            <Chip icon={<SpotlightIcon />} label="Featured Artist of the Week" color="warning" size="small" sx={{ mb: 2, fontWeight: 600 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar src={artist.profile_image_url || undefined} alt={artist.artist_name} sx={{ width: 72, height: 72 }}>
                {artist.artist_name.charAt(0)}
              </Avatar>
              <Typography variant="h4" component="h2" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                {artist.artist_name}
              </Typography>
            </Box>
            {artist.bio && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {artist.bio}
              </Typography>
            )}
            {profilePath && (
              <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate(profilePath)} sx={{ textTransform: 'none' }}>
                See all work
              </Button>
            )}
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {artist.listings.map((listing) => (
                <Grid item xs={6} sm={3} md={6} lg={3} key={listing.id}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
                    <CardActionArea onClick={() => navigate(getPaintingDetailPath(listing.id, listing.title))}>
                      {listing.primary_image_url ? (
                        <Box component="img" src={listing.primary_image_url} alt={listing.title} sx={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <ImagePlaceholder sx={{ width: '100%', height: 160 }} iconSize={40} />
                      )}
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{listing.title}</Typography>
                        {listing.price != null && (
                          <Typography variant="body2" color="primary" fontWeight={600}>${listing.price.toLocaleString()}</Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default FeaturedArtistSection;
