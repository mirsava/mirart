import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import {
  Visibility as ViewsIcon,
  Favorite as LikesIcon,
  Email as MessagesIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Remove as FlatIcon,
  CheckCircle as DoneIcon,
  RadioButtonUnchecked as TodoIcon,
  Campaign as PromoteIcon,
  AutoAwesome as SpotlightIcon,
  Link as LinkIcon,
  Add as AddIcon,
  Description as DraftIcon,
  EventAvailable as EventIcon,
  Timer as TimerIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import apiService, { ArtistOverviewData } from '../../services/api';
import NewsletterPreference from './NewsletterPreference';
import RecentActivity from './RecentActivity';
import FeatureCreditDialog from './FeatureCreditDialog';

interface ArtistOverviewProps {
  authUserId: string;
  onGoToTab: (tab: string) => void;
  onPromoteListing: (listingId: number) => void;
  onFeatureShop: () => void;
}

const shortDate = (v: string) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const weekRange = (weekStart: string) => {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
};

// One headline number with its change from last week (arrow + words, so it never relies on color alone).
const WeekStat: React.FC<{ label: string; icon: React.ReactNode; value: number; last: number }> = ({ label, icon, value, last }) => {
  const diff = value - last;
  const Trend = diff > 0 ? UpIcon : diff < 0 ? DownIcon : FlatIcon;
  const trendText = diff === 0 ? 'Same as last week' : `${diff > 0 ? '+' : ''}${diff} vs last week`;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mb: 0.5 }}>
        {icon}
        <Typography variant="body2">{label} this week</Typography>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'inherit' }}>{value.toLocaleString()}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: diff > 0 ? 'success.main' : diff < 0 ? 'warning.main' : 'text.secondary' }}>
        <Trend sx={{ fontSize: 16 }} />
        <Typography variant="caption">{trendText}</Typography>
      </Box>
    </Paper>
  );
};

// Artist dashboard landing tab: this week's numbers, a to-do list, growth tools and the profile checklist.
const ArtistOverview: React.FC<ArtistOverviewProps> = ({ authUserId, onGoToTab, onPromoteListing, onFeatureShop }) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState<ArtistOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  const load = () =>
    apiService.getArtistOverview(authUserId).then(setData).catch((err) => setError(err.message || 'Failed to load overview'));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  const { week, todo, checklist } = data;
  const doneCount = checklist.filter((c) => c.done).length;
  const profileUrl = data.username ? `${window.location.origin}/artist/${data.username}` : null;

  const todoItems: Array<{ key: string; icon: React.ReactNode; text: React.ReactNode; action?: { label: string; onClick: () => void } }> = [];
  if (todo.unread_messages > 0) {
    todoItems.push({
      key: 'messages',
      icon: <MessagesIcon color="primary" />,
      text: <><strong>{todo.unread_messages}</strong> unread {todo.unread_messages === 1 ? 'message' : 'messages'} from buyers</>,
      action: { label: 'Reply', onClick: () => navigate('/messages') },
    });
  }
  if (todo.drafts > 0) {
    todoItems.push({
      key: 'drafts',
      icon: <DraftIcon color="warning" />,
      text: <><strong>{todo.drafts}</strong> {todo.drafts === 1 ? 'draft is' : 'drafts are'} not live yet</>,
      action: { label: 'Review', onClick: () => onGoToTab('listings') },
    });
  }
  for (const item of todo.ending_soon) {
    const ends = item.pass_ends && item.feature_ends ? (item.pass_ends < item.feature_ends ? item.pass_ends : item.feature_ends) : item.pass_ends || item.feature_ends;
    todoItems.push({
      key: `ending-${item.id}`,
      icon: <TimerIcon color="warning" />,
      text: <>{item.pass_ends ? 'Listing pass' : 'Featured spot'} for "{item.title}" ends {shortDate(ends as string)}</>,
      action: { label: 'Renew', onClick: () => onPromoteListing(item.id) },
    });
  }
  if (todo.next_featured_week) {
    todoItems.push({
      key: 'featured-week',
      icon: <EventIcon color="success" />,
      text: <>You're the Featured Artist for {weekRange(todo.next_featured_week)}</>,
    });
  }
  if (todo.feature_credits_left > 0) {
    todoItems.push({
      key: 'credits',
      icon: <StarIcon color="warning" />,
      text: (
        <>
          <strong>Your plan includes {todo.feature_credits_left === 1 ? 'a free featured listing' : `${todo.feature_credits_left} free featured listings`}.</strong>{' '}
          Put a piece at the top of the gallery and on the homepage for {todo.feature_credit_days} days, at no cost.
        </>
      ),
      action: { label: 'Feature a listing', onClick: () => setCreditDialogOpen(true) },
    });
  }

  const copyProfileLink = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      enqueueSnackbar('Profile link copied', { variant: 'success' });
    } catch {
      enqueueSnackbar(profileUrl, { variant: 'info' });
    }
  };

  return (
    <Box>
      <FeatureCreditDialog
        open={creditDialogOpen}
        authUserId={authUserId}
        days={todo.feature_credit_days}
        onClose={() => setCreditDialogOpen(false)}
        onUsed={load}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <WeekStat label="Views" icon={<ViewsIcon fontSize="small" />} value={week.views.this_week} last={week.views.last_week} />
        <WeekStat label="Likes" icon={<LikesIcon fontSize="small" />} value={week.likes.this_week} last={week.likes.last_week} />
        <WeekStat label="Messages" icon={<MessagesIcon fontSize="small" />} value={week.messages.this_week} last={week.messages.last_week} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 2, mb: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>To do</Typography>
          {todoItems.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <DoneIcon color="success" fontSize="small" />
              <Typography variant="body2">You're all caught up.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {todoItems.map((item) => (
                <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {item.icon}
                  <Typography variant="body2" sx={{ flex: 1 }}>{item.text}</Typography>
                  {item.action && (
                    <Button size="small" onClick={item.action.onClick} sx={{ textTransform: 'none', flexShrink: 0 }}>{item.action.label}</Button>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Grow your shop</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
            <Button startIcon={<PromoteIcon />} onClick={() => onGoToTab('listings')} sx={{ textTransform: 'none' }}>
              Promote a listing (feature or bump)
            </Button>
            <Button startIcon={<SpotlightIcon />} onClick={onFeatureShop} sx={{ textTransform: 'none' }}>
              Be the Featured Artist for a week
            </Button>
            <Button startIcon={<LinkIcon />} onClick={copyProfileLink} disabled={!profileUrl} sx={{ textTransform: 'none' }}>
              {profileUrl ? 'Copy your profile link to share' : 'Set a username to get a profile link'}
            </Button>
            <Button startIcon={<AddIcon />} onClick={() => navigate('/create-listing')} sx={{ textTransform: 'none' }}>
              Add a listing
            </Button>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 2, alignItems: 'start' }}>
        <RecentActivity authUserId={authUserId} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {doneCount < checklist.length ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Complete your profile</Typography>
              <Typography variant="body2" color="text.secondary">{doneCount} of {checklist.length} done</Typography>
            </Box>
            <LinearProgress variant="determinate" value={(doneCount / checklist.length) * 100} sx={{ mb: 1.5, height: 6, borderRadius: 3 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              A complete profile appears in "Meet the Artists" on the homepage and makes the most of a Featured Artist week.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
              {checklist.map((c) => (
                <Box key={c.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: c.done ? 'text.secondary' : 'text.primary' }}>
                  {c.done ? <DoneIcon color="success" fontSize="small" /> : <TodoIcon fontSize="small" color="disabled" />}
                  <Typography variant="body2" sx={{ textDecoration: c.done ? 'line-through' : 'none' }}>{c.label}</Typography>
                </Box>
              ))}
            </Box>
            <Button variant="outlined" size="small" onClick={() => onGoToTab('profile')} sx={{ textTransform: 'none' }}>Edit profile</Button>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DoneIcon color="success" />
            <Typography variant="body2">Your profile is complete. It can appear in "Meet the Artists" on the homepage.</Typography>
          </Paper>
        )}
        <NewsletterPreference />
        </Box>
      </Box>
    </Box>
  );
};

export default ArtistOverview;
