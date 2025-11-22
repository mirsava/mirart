import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import apiService, { User, Listing } from '../services/api';

const ArtistProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getImageUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  useEffect(() => {
    const fetchArtistProfile = async () => {
      if (!username) {
        setError('Invalid artist username');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const artistData = await apiService.getUser(username);
        setArtist(artistData);
        
        if (artistData?.id) {
          const listingsResponse = await apiService.getListings({ userId: artistData.id, status: 'active' }).catch(() => ({ listings: [] }));
          setListings(listingsResponse.listings || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load artist profile');
      } finally {
        setLoading(false);
      }
    };

    fetchArtistProfile();
  }, [username]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !artist) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Artist not found'}</Alert>
      </Container>
    );
  }

  const specialties = artist.specialties
    ? typeof artist.specialties === 'string'
      ? JSON.parse(artist.specialties)
      : artist.specialties
    : [];

  return (
    <Box sx={{ py: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: 4, mb: 4 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                {artist.profile_image_url ? (
                  <Avatar
                    src={getImageUrl(artist.profile_image_url)}
                    alt={artist.business_name || `${artist.first_name} ${artist.last_name}`}
                    sx={{ width: 200, height: 200, mb: 2 }}
                  />
                ) : (
                  <Avatar sx={{ width: 200, height: 200, mb: 2, bgcolor: 'primary.main', fontSize: 64 }}>
                    {artist.first_name?.[0] || artist.business_name?.[0] || 'A'}
                  </Avatar>
                )}
                <Typography variant="h4" gutterBottom>
                  {artist.business_name || `${artist.first_name || ''} ${artist.last_name || ''}`.trim() || 'Artist'}
                </Typography>
                {artist.first_name && artist.last_name && artist.business_name && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {artist.first_name} {artist.last_name}
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="h5" gutterBottom>
                About
              </Typography>
              {artist.bio ? (
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                  {artist.bio}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No bio available.
                </Typography>
              )}

              <Divider sx={{ my: 3 }} />

              <Grid container spacing={2}>
                {artist.experience_level && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Experience
                    </Typography>
                    <Typography variant="body1">{artist.experience_level}</Typography>
                  </Grid>
                )}
                {specialties.length > 0 && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Specialties
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {specialties.map((specialty: string) => (
                        <Chip key={specialty} label={specialty} size="small" />
                      ))}
                    </Box>
                  </Grid>
                )}
                {artist.country && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body1">{artist.country}</Typography>
                  </Grid>
                )}
                {artist.website && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Website
                    </Typography>
                    <Typography variant="body1">
                      <a href={artist.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                        {artist.website}
                      </a>
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {artist.signature_url && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Signature
                  </Typography>
                  <Box
                    component="img"
                    src={getImageUrl(artist.signature_url)}
                    alt="Artist Signature"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 150,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  />
                </>
              )}
            </Grid>
          </Grid>
        </Paper>

        {listings.length > 0 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Artwork ({listings.length})
            </Typography>
            <Grid container spacing={3}>
              {listings.map((listing) => (
                <Grid item xs={12} sm={6} md={4} key={listing.id}>
                  <Paper
                    sx={{
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      },
                    }}
                    onClick={() => navigate(`/painting/${listing.id}`)}
                  >
                    {listing.primary_image_url && (
                      <Box
                        component="img"
                        src={getImageUrl(listing.primary_image_url)}
                        alt={listing.title}
                        sx={{
                          width: '100%',
                          height: 250,
                          objectFit: 'cover',
                        }}
                      />
                    )}
                    <Box sx={{ p: 2 }}>
                      <Typography variant="h6" noWrap gutterBottom>
                        {listing.title}
                      </Typography>
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        ${listing.price}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default ArtistProfile;

