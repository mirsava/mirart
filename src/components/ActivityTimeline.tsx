import React from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import {
  Person as AccountIcon,
  Image as ListingIcon,
  WorkspacePremium as SubscriptionIcon,
  Payments as PaymentIcon,
  ChatBubbleOutline as MessageIcon,
  NotificationsNone as NoticeIcon,
} from '@mui/icons-material';
import { UserHistoryEvent } from '../services/api';

export const EVENT_STYLE: Record<UserHistoryEvent['type'], { icon: React.ReactElement; color: string; label: string }> = {
  account: { icon: <AccountIcon fontSize="small" />, color: 'secondary.main', label: 'Account' },
  listing: { icon: <ListingIcon fontSize="small" />, color: 'primary.main', label: 'Listings' },
  subscription: { icon: <SubscriptionIcon fontSize="small" />, color: 'info.main', label: 'Subscription' },
  payment: { icon: <PaymentIcon fontSize="small" />, color: 'success.main', label: 'Payments' },
  message: { icon: <MessageIcon fontSize="small" />, color: 'text.secondary', label: 'Messages' },
  notice: { icon: <NoticeIcon fontSize="small" />, color: 'warning.main', label: 'Emails' },
};

const dateTime = (v: string) =>
  new Date(v).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Vertical list of history events with a connecting line, shared by the admin user panel and the artist dashboard.
const ActivityTimeline: React.FC<{ events: UserHistoryEvent[] }> = ({ events }) => (
  <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
    {events.map((event, index) => {
      const style = EVENT_STYLE[event.type];
      return (
        <Box component="li" key={`${event.at}-${index}`} sx={{ display: 'flex', gap: 2, pb: 2, position: 'relative' }}>
          {index < events.length - 1 && (
            <Box sx={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: '2px', bgcolor: 'divider' }} />
          )}
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'background.paper', color: style.color, border: '2px solid', borderColor: style.color, flexShrink: 0 }}>
            {style.icon}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {event.title}
              {event.actor && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>by {event.actor}</Typography>
              )}
            </Typography>
            {event.detail && <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{event.detail}</Typography>}
            <Typography variant="caption" color="text.secondary">{dateTime(event.at)}</Typography>
          </Box>
        </Box>
      );
    })}
  </Box>
);

export default ActivityTimeline;
