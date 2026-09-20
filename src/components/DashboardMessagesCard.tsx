import React, { useEffect, useState } from 'react';
import { Avatar, Box, Button, Chip, Paper, Typography } from '@mui/material';
import { MailOutline as MailIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService, { Message } from '../services/api';

interface DashboardMessagesCardProps {
  authUserId: string;
  isBuyer?: boolean;
}

const formatWhen = (value: string): string => {
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Summary of the inbox for the dashboard: unread count plus the latest few messages, linking to the full inbox.
const DashboardMessagesCard: React.FC<DashboardMessagesCardProps> = ({ authUserId, isBuyer = false }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    apiService
      .getMessages(authUserId, 'received')
      .then(({ messages: received }) => active && setMessages(Array.isArray(received) ? received : []))
      .catch(() => active && setMessages([]))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [authUserId]);

  const unread = messages.filter((message) => message.status === 'sent').length;
  const latest = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);

  return (
    <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: unread > 0 ? 'primary.main' : 'divider', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: latest.length > 0 ? 1.5 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <MailIcon sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Messages
          </Typography>
          {unread > 0 && <Chip size="small" color="primary" label={`${unread} unread`} />}
        </Box>
        <Button size="small" variant={unread > 0 ? 'contained' : 'outlined'} onClick={() => navigate('/messages')}>
          Open inbox
        </Button>
      </Box>

      {loaded && latest.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {isBuyer
            ? 'No messages yet. Replies from artists will appear here.'
            : 'No messages yet. When buyers contact you about your artwork, their messages will appear here.'}
        </Typography>
      )}

      {latest.map((message) => {
        const isUnread = message.status === 'sent';
        const sender = message.sender_name_display || message.sender_name || 'Someone';
        return (
          <Box
            key={message.id}
            onClick={() => navigate('/messages')}
            sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1, borderTop: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Avatar sx={{ width: 32, height: 32, fontSize: '0.85rem', bgcolor: isUnread ? 'primary.main' : 'action.disabledBackground' }}>
              {sender.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: isUnread ? 700 : 500 }}>
                {sender}
                {message.listing_title ? ` · ${message.listing_title}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {message.message}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {formatWhen(message.created_at)}
            </Typography>
          </Box>
        );
      })}
    </Paper>
  );
};

export default DashboardMessagesCard;
