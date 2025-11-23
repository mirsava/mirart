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
  ListItemSecondaryAction,
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
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Inbox as InboxIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  MoreVert as MoreVertIcon,
  ArchiveOutlined as ArchiveOutlinedIcon,
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
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; messageId: number } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [archiving, setArchiving] = useState<number | null>(null);
  const [unarchiving, setUnarchiving] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null);

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
      return;
    }

    fetchMessages();
    
    // Notify header to refresh unread count when messages page is loaded
    window.dispatchEvent(new CustomEvent('messagesRead'));
  }, [user?.id, tabValue]);

  const fetchMessages = async (): Promise<void> => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const type = tabValue === 0 ? 'all' : tabValue === 1 ? 'sent' : tabValue === 2 ? 'received' : 'archived';
      const response = await apiService.getMessages(user.id, type);
      setMessages(response.messages);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue);
  };

  const handleMessageClick = async (message: Message): Promise<void> => {
    setSelectedMessage(message);
    setDialogOpen(true);
    
    // Mark message as read if it's unread and user is the recipient
    if (message.status === 'sent' && tabValue !== 1 && user?.id) {
      try {
        await apiService.markMessageAsRead(message.id, user.id);
        // Update local state
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === message.id ? { ...msg, status: 'read' as const } : msg
          )
        );
        // Notify header to refresh count
        window.dispatchEvent(new CustomEvent('messagesRead'));
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    }
  };

  const handleViewListing = (listingId: number): void => {
    navigate(`/painting/${listingId}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, messageId: number): void => {
    event.stopPropagation();
    setMenuAnchor({ element: event.currentTarget, messageId });
  };

  const handleMenuClose = (): void => {
    setMenuAnchor(null);
  };

  const handleArchive = async (messageId: number): Promise<void> => {
    if (!user?.id) return;
    
    setArchiving(messageId);
    try {
      await apiService.archiveMessage(messageId, user.id);
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      handleMenuClose();
      // Refresh unread count
      window.dispatchEvent(new CustomEvent('messagesRead'));
    } catch (err: any) {
      setError(err.message || 'Failed to archive message');
    } finally {
      setArchiving(null);
    }
  };

  const handleUnarchive = async (messageId: number): Promise<void> => {
    if (!user?.id) return;
    
    setUnarchiving(messageId);
    try {
      await apiService.unarchiveMessage(messageId, user.id);
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      handleMenuClose();
      // Refresh unread count
      window.dispatchEvent(new CustomEvent('messagesRead'));
    } catch (err: any) {
      setError(err.message || 'Failed to unarchive message');
    } finally {
      setUnarchiving(null);
    }
  };

  const handleDeleteClick = (messageId: number): void => {
    setMessageToDelete(messageId);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!user?.id || !messageToDelete) return;
    
    setDeleting(messageToDelete);
    setDeleteConfirmOpen(false);
    try {
      await apiService.deleteMessage(messageToDelete, user.id);
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageToDelete));
      // Refresh unread count
      window.dispatchEvent(new CustomEvent('messagesRead'));
    } catch (err: any) {
      setError(err.message || 'Failed to delete message');
    } finally {
      setDeleting(null);
      setMessageToDelete(null);
    }
  };

  const handleDeleteCancel = (): void => {
    setDeleteConfirmOpen(false);
    setMessageToDelete(null);
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
            <Tab icon={<ArchiveOutlinedIcon />} iconPosition="start" label="Archived" />
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
                : tabValue === 2
                ? "You haven't received any messages yet."
                : "You don't have any archived messages yet."}
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
                    bgcolor: message.status === 'sent' && (tabValue === 0 || tabValue === 2)
                      ? 'rgba(25, 118, 210, 0.04)'
                      : 'transparent',
                    borderLeft: message.status === 'sent' && (tabValue === 0 || tabValue === 2)
                      ? '4px solid'
                      : 'none',
                    borderColor: 'primary.main',
                    opacity: tabValue === 3 ? 0.7 : 1,
                    '&:hover': {
                      bgcolor: message.status === 'sent' && (tabValue === 0 || tabValue === 2)
                        ? 'rgba(25, 118, 210, 0.08)'
                        : 'action.hover',
                      opacity: 1,
                    },
                    pr: 10,
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
                        <Typography 
                          variant="subtitle1" 
                          component="span"
                          sx={{
                            fontWeight: message.status === 'sent' && (tabValue === 0 || tabValue === 2) ? 600 : 400,
                          }}
                        >
                          {tabValue === 1
                            ? message.recipient_name || message.recipient_email
                            : message.sender_name_display || message.sender_name || message.sender_email}
                        </Typography>
                        {message.status === 'sent' && (tabValue === 0 || tabValue === 2) && (
                          <Chip 
                            label="New" 
                            size="small" 
                            color="primary"
                            sx={{
                              fontWeight: 600,
                              animation: 'pulse 2s ease-in-out infinite',
                              '@keyframes pulse': {
                                '0%, 100%': {
                                  opacity: 1,
                                },
                                '50%': {
                                  opacity: 0.7,
                                },
                              },
                            }}
                          />
                        )}
                        {tabValue === 3 && (
                          <Chip 
                            label="Archived" 
                            size="small" 
                            color="default"
                            sx={{
                              fontWeight: 500,
                            }}
                          />
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
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, message.id)}
                      disabled={deleting === message.id || archiving === message.id}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
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
                {tabValue === 3 ? (
                  <Button
                    variant="outlined"
                    startIcon={<ArchiveOutlinedIcon />}
                    onClick={async () => {
                      if (selectedMessage && user?.id) {
                        await handleUnarchive(selectedMessage.id);
                        setDialogOpen(false);
                      }
                    }}
                    disabled={unarchiving === selectedMessage?.id}
                  >
                    {unarchiving === selectedMessage?.id ? 'Unarchiving...' : 'Unarchive'}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<ArchiveIcon />}
                    onClick={async () => {
                      if (selectedMessage && user?.id) {
                        await handleArchive(selectedMessage.id);
                        setDialogOpen(false);
                      }
                    }}
                    disabled={archiving === selectedMessage?.id}
                  >
                    {archiving === selectedMessage?.id ? 'Archiving...' : 'Archive'}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    if (selectedMessage) {
                      setDialogOpen(false);
                      handleDeleteClick(selectedMessage.id);
                    }
                  }}
                  disabled={deleting === selectedMessage?.id}
                >
                  {deleting === selectedMessage?.id ? 'Deleting...' : 'Delete'}
                </Button>
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

        <Menu
          anchorEl={menuAnchor?.element}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          {tabValue === 3 ? (
            <MenuItem
              onClick={() => {
                if (menuAnchor) {
                  handleUnarchive(menuAnchor.messageId);
                }
              }}
              disabled={unarchiving === menuAnchor?.messageId}
            >
              <ArchiveOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
              {unarchiving === menuAnchor?.messageId ? 'Unarchiving...' : 'Unarchive'}
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                if (menuAnchor) {
                  handleArchive(menuAnchor.messageId);
                }
              }}
              disabled={archiving === menuAnchor?.messageId}
            >
              <ArchiveIcon sx={{ mr: 1, fontSize: 20 }} />
              {archiving === menuAnchor?.messageId ? 'Archiving...' : 'Archive'}
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              if (menuAnchor) {
                handleDeleteClick(menuAnchor.messageId);
              }
            }}
            disabled={deleting === menuAnchor?.messageId}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
            {deleting === menuAnchor?.messageId ? 'Deleting...' : 'Delete'}
          </MenuItem>
        </Menu>

        <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
          <DialogTitle>Delete Message</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this message? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={deleting !== null}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Messages;

