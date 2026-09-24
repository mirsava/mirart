import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Email as EmailIcon,
  IosShare as ShareIcon,
  Place as PlaceIcon,
  CalendarMonth as CalendarIcon,
  Collections as CollectionsIcon,
  Language as WebsiteIcon,
  Instagram as InstagramIcon,
  YouTube as YouTubeIcon,
  MusicNote as TikTokIcon,
  Brush as BehanceIcon,
  AutoAwesome as SpotlightIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import apiService, { Listing, User } from '../services/api';
import SEO from '../components/SEO';
import PaintingCard from '../components/PaintingCard';
import ContactSellerDialog from '../components/ContactSellerDialog';
import { Artwork } from '../types';
import { getListingImageCount } from '../utils/listingUtils';
import { brandNavy } from '../theme';

const PAGE_SIZE = 12;
const BIO_PREVIEW = 420;
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia', DE: 'Germany', FR: 'France', IT: 'Italy',
  ES: 'Spain', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria', SE: 'Sweden', NO: 'Norway',
  DK: 'Denmark', FI: 'Finland', IE: 'Ireland', NZ: 'New Zealand', JP: 'Japan', KR: 'South Korea', IN: 'India',
  BR: 'Brazil', MX: 'Mexico', AR: 'Argentina', ZA: 'South Africa', IL: 'Israel', AE: 'United Arab Emirates',
  SG: 'Singapore', PT: 'Portugal', PL: 'Poland',
};

const imageUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');
  return base + url;
};

const parseSpecialties = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // stored as plain text
  }
  return value.split(',').map((s) => s.trim()).filter(Boolean);
};

// Accepts "@name", "name" or a full link and returns a proper URL for that network.
const socialUrl = (value: string | undefined, base: string): string | null => {
  const v = (value || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return `https://${v}`;
  return `${base}${v.replace(/^@/, '')}`;
};

const toArtwork = (l: Listing): Artwork => ({
  id: l.id,
  title: l.title,
  artist: l.artist_name || '',
  artistUsername: l.auth_user_id,
  artistSignatureUrl: l.signature_url,
  price: l.price,
  image: imageUrl(l.primary_image_url) || '',
  description: l.description || '',
  category: l.category as Artwork['category'],
  subcategory: l.subcategory || '',
  dimensions: l.dimensions || '',
  medium: l.medium || '',
  year: l.year || new Date().getFullYear(),
  inStock: l.in_stock,
  quantityAvailable: l.quantity_available ?? 1,
  likeCount: l.like_count || 0,
  isLiked: l.is_liked || false,
  imageCount: getListingImageCount(l),
  shippingInfo: l.shipping_info,
  avgRating: l.avg_rating ? parseFloat(Number(l.avg_rating).toFixed(1)) : null,
  reviewCount: l.review_count || 0,
  isFeatured: l.is_featured === true,
});

const SORTS: Record<string, { label: string; sortBy: string; sortOrder: 'ASC' | 'DESC' }> = {
  newest: { label: 'Newest', sortBy: 'created_at', sortOrder: 'DESC' },
  price_low: { label: 'Price: low to high', sortBy: 'price', sortOrder: 'ASC' },
  price_high: { label: 'Price: high to low', sortBy: 'price', sortOrder: 'DESC' },
};

// Public artist page: a storefront with the artist's story, links and all their live work.
const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { openChat, chatEnabled } = useChat();
  const { enqueueSnackbar } = useSnackbar();

  const [artist, setArtist] = useState<(User & Record<string, any>) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState<keyof typeof SORTS>('newest');
  const [category, setCategory] = useState('');
  const [sold, setSold] = useState<Listing[]>([]);
  const [soldTotal, setSoldTotal] = useState(0);
  const [featuredThisWeek, setFeaturedThisWeek] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [pickPieceOpen, setPickPieceOpen] = useState(false);
  const [contactListing, setContactListing] = useState<Listing | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Artist details, sold work and whether they're this week's Featured Artist
  useEffect(() => {
    if (!username) return;
    let active = true;
    setLoading(true);
    setError(null);
    apiService.getUser(username)
      .then(async (a) => {
        if (!active) return;
        setArtist(a as User & Record<string, any>);
        if (!a?.id) return;
        const [soldResult, all, featured] = await Promise.all([
          apiService.getListings({ userId: a.id, status: 'sold', limit: 6 }).catch(() => ({ listings: [] as Listing[], pagination: { total: 0 } as any })),
          apiService.getListings({ userId: a.id, status: 'active', limit: 100 }).catch(() => ({ listings: [] as Listing[] })),
          apiService.getFeaturedArtist().catch(() => ({ artist: null })),
        ]);
        if (!active) return;
        setSold(soldResult.listings);
        setSoldTotal(soldResult.pagination?.total || soldResult.listings.length);
        setCategories([...new Set(all.listings.map((l) => l.category))].sort());
        setFeaturedThisWeek(featured.artist?.id === a.id);
      })
      .catch((err) => active && setError(err.status === 404 ? 'We couldn’t find this artist.' : err.message || 'Failed to load artist profile'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [username]);

  // Live work: first page whenever the artist, sort or category changes
  useEffect(() => {
    if (!artist?.id) return;
    let active = true;
    const s = SORTS[sort];
    apiService.getListings({
      userId: artist.id,
      status: 'active',
      limit: PAGE_SIZE,
      page: 1,
      sortBy: s.sortBy,
      sortOrder: s.sortOrder,
      ...(category ? { category } : {}),
      ...(user?.id ? { requestingUser: user.id } : {}),
    })
      .then((r) => {
        if (!active) return;
        setListings(r.listings);
        setTotal(r.pagination.total);
        setPage(1);
      })
      .catch(() => active && setListings([]));
    return () => {
      active = false;
    };
  }, [artist?.id, sort, category, user?.id]);

  const loadMore = async () => {
    if (!artist?.id) return;
    setLoadingMore(true);
    try {
      const s = SORTS[sort];
      const r = await apiService.getListings({
        userId: artist.id, status: 'active', limit: PAGE_SIZE, page: page + 1, sortBy: s.sortBy, sortOrder: s.sortOrder,
        ...(category ? { category } : {}),
      });
      setListings((prev) => [...prev, ...r.listings]);
      setPage((p) => p + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  const specialties = useMemo(() => parseSpecialties(artist?.specialties), [artist?.specialties]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>;
  }
  if (error || !artist) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>{error || 'Artist not found'}</Typography>
        <Button variant="contained" onClick={() => navigate('/gallery')} sx={{ mt: 2, textTransform: 'none' }}>Browse the gallery</Button>
      </Container>
    );
  }

  const artistName = artist.business_name || `${artist.first_name || ''} ${artist.last_name || ''}`.trim() || artist.username || 'Artist';
  const personalName = artist.business_name && artist.first_name ? `${artist.first_name} ${artist.last_name || ''}`.trim() : null;
  const isOwner = Boolean(user?.id && artist.auth_user_id === user.id);
  const country = artist.country ? COUNTRY_NAMES[artist.country] || artist.country : null;
  const memberSince = artist.created_at ? new Date(artist.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : null;
  const cover = imageUrl(listings.find((l) => l.primary_image_url)?.primary_image_url);
  const bio = artist.bio || '';
  const longBio = bio.length > BIO_PREVIEW;
  const links = [
    { key: 'website', label: 'Website', icon: <WebsiteIcon />, url: socialUrl(artist.website, 'https://') },
    { key: 'instagram', label: 'Instagram', icon: <InstagramIcon />, url: socialUrl(artist.social_instagram, 'https://instagram.com/') },
    { key: 'tiktok', label: 'TikTok', icon: <TikTokIcon />, url: socialUrl(artist.social_tiktok, 'https://www.tiktok.com/@') },
    { key: 'behance', label: 'Behance', icon: <BehanceIcon />, url: socialUrl(artist.social_behance, 'https://www.behance.net/') },
    { key: 'youtube', label: 'YouTube', icon: <YouTubeIcon />, url: socialUrl(artist.social_youtube, 'https://www.youtube.com/@') },
  ].filter((l) => l.url);
  const pageUrl = `${window.location.origin}/artist/${artist.username || username}`;
  const seoDescription = bio ? bio.slice(0, 155) + (bio.length > 155 ? '…' : '') : `Original artwork by ${artistName} on ArtZyla.`;

  const requireSignIn = () => {
    // SignIn sends people back to state.from.pathname afterwards
    navigate('/signin', { state: { from: { pathname: location.pathname }, message: `Sign in to message ${artist.first_name || 'the artist'}.` } });
  };

  const messageArtist = async () => {
    if (!isAuthenticated || !user?.id) return requireSignIn();
    if (chatEnabled) {
      try {
        const response = await apiService.createChatConversation(user.id, artist.id as number, null, `Hi ${artistName}! I'd like to ask about your work.`, artist.auth_user_id);
        openChat(response.conversationId);
      } catch (err: any) {
        enqueueSnackbar(err.message || 'Could not start a chat', { variant: 'error' });
      }
      return;
    }
    // Messages are about a specific piece: ask which one
    if (listings.length === 1) setContactListing(listings[0]);
    else setPickPieceOpen(true);
  };

  const share = async () => {
    const data = { title: `${artistName} on ArtZyla`, url: pageUrl };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(pageUrl);
        enqueueSnackbar('Link copied', { variant: 'success' });
      }
    } catch {
      // share sheet dismissed
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 8 }}>
      <SEO title={`${artistName} - Artist Profile`} description={seoDescription} url={`/artist/${artist.username || username}`} image={imageUrl(artist.profile_image_url) || cover} />

      {/* Cover: the artist's latest piece, softened, behind the brand color */}
      <Box
        sx={{
          height: { xs: 140, md: 220 },
          bgcolor: brandNavy,
          backgroundImage: cover ? `linear-gradient(rgba(31,42,68,0.55), rgba(31,42,68,0.75)), url("${cover}")` : `linear-gradient(135deg, ${brandNavy}, #b5573a)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <Container maxWidth="lg">
        {isOwner && (
          <Alert
            severity="info"
            sx={{ mt: 2 }}
            action={<Button color="inherit" size="small" startIcon={<EditIcon />} onClick={() => navigate('/dashboard?tab=profile')} sx={{ textTransform: 'none' }}>Edit profile</Button>}
          >
            This is how buyers see your page.
          </Alert>
        )}

        {/* Identity */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'center', md: 'flex-end' }, gap: { xs: 2, md: 3 }, mt: isOwner ? 2 : { xs: -7, md: -9 }, mb: 3 }}>
          <Avatar
            src={imageUrl(artist.profile_image_url)}
            alt={artistName}
            sx={{ width: { xs: 120, md: 160 }, height: { xs: 120, md: 160 }, fontSize: '3rem', bgcolor: 'primary.main', border: '5px solid', borderColor: 'background.default', boxShadow: 3, mt: isOwner ? 0 : undefined }}
          >
            {artistName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', md: 'left' }, pb: { md: 1 } }}>
            {featuredThisWeek && (
              <Chip icon={<SpotlightIcon />} label="Featured Artist this week" color="warning" size="small" sx={{ mb: 1, fontWeight: 600 }} />
            )}
            <Typography variant="h3" component="h1" sx={{ fontWeight: 600, fontSize: { xs: '2rem', md: '2.75rem' }, lineHeight: 1.15 }}>{artistName}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1, color: 'text.secondary', justifyContent: { xs: 'center', md: 'flex-start' } }}>
              {artist.username && <Typography variant="body2">@{artist.username}</Typography>}
              {personalName && <Typography variant="body2">{personalName}</Typography>}
              {country && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PlaceIcon sx={{ fontSize: 16 }} /><Typography variant="body2">{country}</Typography></Box>
              )}
              {memberSince && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CalendarIcon sx={{ fontSize: 16 }} /><Typography variant="body2">On ArtZyla since {memberSince}</Typography></Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CollectionsIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">{total} {total === 1 ? 'work' : 'works'} available{soldTotal ? ` · ${soldTotal} sold` : ''}</Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pb: { md: 1 } }}>
            {!isOwner && (listings.length > 0 || chatEnabled) && (
              <Button variant="contained" startIcon={chatEnabled ? <ChatIcon /> : <EmailIcon />} onClick={messageArtist} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Message {artist.first_name || 'artist'}
              </Button>
            )}
            <Tooltip title="Share this page">
              <IconButton onClick={share} aria-label="Share this page" sx={{ border: '1px solid', borderColor: 'divider' }}>
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={4}>
          {/* About */}
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 3, position: { md: 'sticky' }, top: { md: 88 } }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>About</Typography>
              {bio ? (
                <>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {longBio && !bioExpanded ? `${bio.slice(0, BIO_PREVIEW).trimEnd()}…` : bio}
                  </Typography>
                  {longBio && (
                    <Button size="small" onClick={() => setBioExpanded((v) => !v)} sx={{ px: 0, mt: 0.5, textTransform: 'none' }}>
                      {bioExpanded ? 'Show less' : 'Read more'}
                    </Button>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">{artistName} hasn't written a bio yet.</Typography>
              )}

              {(specialties.length > 0 || artist.experience_level) && (
                <Box sx={{ mt: 2.5 }}>
                  {specialties.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
                      {specialties.map((s) => <Chip key={s} label={s} size="small" variant="outlined" />)}
                    </Box>
                  )}
                  {artist.experience_level && (
                    <Typography variant="body2" color="text.secondary">Experience: {artist.experience_level}</Typography>
                  )}
                </Box>
              )}

              {links.length > 0 && (
                <Box sx={{ mt: 2.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {links.map((l) => (
                    <Tooltip key={l.key} title={l.label}>
                      <IconButton component="a" href={l.url as string} target="_blank" rel="noopener noreferrer" aria-label={`${artistName} on ${l.label}`} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        {l.icon}
                      </IconButton>
                    </Tooltip>
                  ))}
                </Box>
              )}

              {artist.signature_url && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Signature</Typography>
                  <Box component="img" src={imageUrl(artist.signature_url)} alt={`${artistName}'s signature`} sx={{ maxWidth: '100%', maxHeight: 80, opacity: 0.85, filter: (t) => (t.palette.mode === 'dark' ? 'invert(1)' : 'none') }} />
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Work */}
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>Available work</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {categories.length > 1 && (
                  <>
                    <Chip label="All" color={category ? 'default' : 'primary'} variant={category ? 'outlined' : 'filled'} onClick={() => setCategory('')} />
                    {categories.map((c) => (
                      <Chip key={c} label={c} color={category === c ? 'primary' : 'default'} variant={category === c ? 'filled' : 'outlined'} onClick={() => setCategory(c)} />
                    ))}
                  </>
                )}
                {total > 1 && (
                  <Select size="small" value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} inputProps={{ 'aria-label': 'Sort' }}>
                    {Object.entries(SORTS).map(([key, s]) => <MenuItem key={key} value={key}>{s.label}</MenuItem>)}
                  </Select>
                )}
              </Box>
            </Box>

            {listings.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">{isOwner ? 'You have no live listings yet.' : `${artistName} has no work for sale right now.`}</Typography>
                {isOwner && <Button variant="contained" sx={{ mt: 2, textTransform: 'none' }} onClick={() => navigate('/create-listing')}>Add a listing</Button>}
              </Paper>
            ) : (
              <>
                <Grid container spacing={3}>
                  {listings.map((l) => (
                    <Grid item xs={12} sm={6} key={l.id}>
                      <PaintingCard painting={toArtwork(l)} />
                    </Grid>
                  ))}
                </Grid>
                {listings.length < total && (
                  <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Button variant="outlined" onClick={loadMore} disabled={loadingMore} sx={{ textTransform: 'none' }}>
                      {loadingMore ? 'Loading…' : `Show more (${total - listings.length} more)`}
                    </Button>
                  </Box>
                )}
              </>
            )}

            {sold.length > 0 && (
              <Box sx={{ mt: 6 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>Previously sold</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Like one of these? Message {artist.first_name || 'the artist'} about similar work or a commission.</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 1.5 }}>
                  {sold.map((l) => (
                    <Tooltip key={l.id} title={l.title}>
                      <Box
                        component="img"
                        src={imageUrl(l.primary_image_url)}
                        alt={`${l.title} (sold)`}
                        sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 1, filter: 'grayscale(35%)', opacity: 0.85, bgcolor: 'action.hover' }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Which piece is the message about? (messages are attached to a listing) */}
      <Dialog open={pickPieceOpen} onClose={() => setPickPieceOpen(false)} maxWidth="xs" fullWidth scroll="paper">
        <DialogTitle>Which piece is it about?</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <List dense disablePadding>
            {listings.map((l) => (
              <ListItemButton key={l.id} onClick={() => { setPickPieceOpen(false); setContactListing(l); }}>
                <ListItemAvatar><Avatar variant="rounded" src={imageUrl(l.primary_image_url)}>{l.title.charAt(0)}</Avatar></ListItemAvatar>
                <ListItemText primary={l.title} secondary={l.price != null ? `$${Number(l.price).toLocaleString()}` : undefined} primaryTypographyProps={{ noWrap: true }} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions><Button onClick={() => setPickPieceOpen(false)}>Cancel</Button></DialogActions>
      </Dialog>

      {contactListing && (
        <ContactSellerDialog
          open
          onClose={() => setContactListing(null)}
          listingTitle={contactListing.title}
          artistName={artistName}
          listingId={contactListing.id}
        />
      )}
    </Box>
  );
};

export default PublicProfile;
