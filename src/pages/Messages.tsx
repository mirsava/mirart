import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Inbox as InboxIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService, { Message } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Messages: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  useEffect(() => {
    if (!user?.id) {
      navigate('/artist-signin');
      return;
    }

    fetchMessages();
  }, [user?.id, tabValue]);

  const fetchMessages = async (): Promise<void> => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const type = tabValue === 0 ? 'all' : tabValue === 1 ? 'sent' : 'received';
      const response = await apiService.getMessages(user.id, type);
      setMessages(response.messages);

      if (type === 'received') {
        const unreadMessages = response.messages.filter(m => m.status === 'sent');
        for (const msg of unreadMessages) {
          try {
            await apiService.markMessageAsRead(msg.id, user.id);
          } catch (err) {
            console.error('Error marking message as read:', err);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue);
  };

  const handleMessageClick = (message: Message): void => {
    setSelectedMessage(message);
    setDialogOpen(true);
  };

  const handleViewListing = (listingId: number): void => {
    navigate(`/painting/${listingId}`);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Messages
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your communication with buyers and sellers
          </Typography>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<EmailIcon />} iconPosition="start" label="All Messages" />
            <Tab icon={<SendIcon />} iconPosition="start" label="Sent" />
            <Tab icon={<InboxIcon />} iconPosition="start" label="Received" />
          </Tabs>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : messages.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <EmailIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No messages found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tabValue === 0
                ? "You don't have any messages yet."
                : tabValue === 1
                ? "You haven't sent any messages yet."
                : "You haven't received any messages yet."}
            </Typography>
          </Paper>
        ) : (
          <List>
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <ListItem
                  button
                  onClick={() => handleMessageClick(message)}
                  sx={{
                    bgcolor: message.status === 'sent' && tabValue === 2 ? 'action.hover' : 'transparent',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                      }}
                    >
                      {message.listing_image ? (
                        <img
                          src={getImageUrl(message.listing_image)}
                          alt={message.listing_title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <ImageIcon />
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" component="span">
                          {tabValue === 1
                            ? message.recipient_name || message.recipient_email
                            : message.sender_name_display || message.sender_name || message.sender_email}
                        </Typography>
                        {message.status === 'sent' && tabValue === 2 && (
                          <Chip label="New" size="small" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {message.subject}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {message.message.substring(0, 100)}
                          {message.message.length > 100 ? '...' : ''}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {message.listing_title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {formatDate(message.created_at)}
                          </Typography>
                        </Box>
                      </>
                    }
                  />
                </ListItem>
                {index < messages.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          {selectedMessage && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'primary.main',
                      width: 56,
                      height: 56,
                    }}
                  >
                    {selectedMessage.listing_image ? (
                      <img
                        src={getImageUrl(selectedMessage.listing_image)}
                        alt={selectedMessage.listing_title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <ImageIcon />
                    )}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{selectedMessage.subject}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedMessage.listing_title}
                    </Typography>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      From
                    </Typography>
                    <Typography variant="body1">
                      {tabValue === 1
                        ? selectedMessage.recipient_name || selectedMessage.recipient_email
                        : selectedMessage.sender_name_display || selectedMessage.sender_name || selectedMessage.sender_email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tabValue === 1 ? selectedMessage.recipient_email : selectedMessage.sender_email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Date
                    </Typography>
                    <Typography variant="body1">
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedMessage.message}
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Close</Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setDialogOpen(false);
                    handleViewListing(selectedMessage.listing_id);
                  }}
                >
                  View Listing
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Box>
  );
};

export default Messages;

