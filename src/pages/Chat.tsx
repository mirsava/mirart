<<<<<<< HEAD
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Badge,
  Grid,
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  message: string;
  created_at: string;
  read_at: string | null;
  sender_name?: string;
  sender_business_name?: string;
  sender_email?: string;
}

interface Conversation {
  id: number;
  listing_id: number | null;
  last_message_at: string;
  other_user_id: number;
  other_user_business_name: string | null;
  other_user_name: string;
  other_user_email: string;
  listing_title: string | null;
  listing_image: string | null;
  last_message: string | null;
  unread_count: number;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getImageUrl = (url?: string | null): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user?.id) return;

    fetchConversations();

    const conversationParam = searchParams.get('conversation');
    if (conversationParam) {
      const conversationId = parseInt(conversationParam);
      if (!isNaN(conversationId)) {
        setSelectedConversation(conversationId);
        fetchMessages(conversationId);
        searchParams.delete('conversation');
        setSearchParams(searchParams);
      }
    }
  }, [user?.id, searchParams]);

  useEffect(() => {
    if (!user?.id || !selectedConversation) return;

    fetchMessages(selectedConversation);
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(selectedConversation);
      fetchConversations();
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user?.id, selectedConversation]);

  const fetchConversations = async () => {
    if (!user?.id) return;

    try {
      const response = await apiService.getChatConversations(user.id);
      setConversations(response.conversations);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    if (!user?.id) return;

    try {
      const response = await apiService.getChatConversation(conversationId, user.id);
      setMessages(response.messages);
      await apiService.markChatMessagesAsRead(conversationId, user.id);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    }
  };

  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversation(conversationId);
    fetchMessages(conversationId);
  };

  const handleSendMessage = async () => {
    if (!user?.id || !selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      await apiService.sendChatMessage(user.id, selectedConversation, newMessage.trim());
      setNewMessage('');
      fetchMessages(selectedConversation);
      fetchConversations();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const getOtherUserName = (conversation: Conversation): string => {
    return conversation.other_user_business_name || 
           conversation.other_user_name.trim() || 
           conversation.other_user_email;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            mt: 3,
            p: { xs: 3, sm: 4, md: 5 },
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            Chat
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
            Chat directly with buyers and sellers
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ height: '70vh' }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6">Conversations</Typography>
              </Box>
              <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                {conversations.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <ChatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      No conversations yet
                    </Typography>
                  </Box>
                ) : (
                  conversations.map((conversation) => (
                    <ListItem
                      key={conversation.id}
                      button
                      selected={selectedConversation === conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      sx={{
                        bgcolor: selectedConversation === conversation.id ? 'action.selected' : 'transparent',
                      }}
                    >
                      <ListItemAvatar>
                        <Badge badgeContent={conversation.unread_count} color="error" invisible={conversation.unread_count === 0}>
                          <Avatar>
                            {conversation.listing_image ? (
                              <img
                                src={getImageUrl(conversation.listing_image)}
                                alt={conversation.listing_title || 'Chat'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <ChatIcon />
                            )}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" noWrap sx={{ fontWeight: conversation.unread_count > 0 ? 600 : 400 }}>
                              {getOtherUserName(conversation)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(conversation.last_message_at)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {conversation.last_message || 'No messages yet'}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            {selectedConversation ? (
              <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6">
                    {(() => {
                      const conv = conversations.find(c => c.id === selectedConversation);
                      return conv ? getOtherUserName(conv) : 'Chat';
                    })()}
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '70%',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: isOwn ? 'primary.main' : 'grey.200',
                            color: isOwn ? 'white' : 'text.primary',
                          }}
                        >
                          <Typography variant="body1">{message.message}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                            {formatTime(message.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Box>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sending}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Paper>
            ) : (
              <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <ChatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select a conversation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose a conversation from the list to start chatting
                  </Typography>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Chat;

=======
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Badge,
  Grid,
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  message: string;
  created_at: string;
  read_at: string | null;
  sender_name?: string;
  sender_business_name?: string;
  sender_email?: string;
}

interface Conversation {
  id: number;
  listing_id: number | null;
  last_message_at: string;
  other_user_id: number;
  other_user_business_name: string | null;
  other_user_name: string;
  other_user_email: string;
  listing_title: string | null;
  listing_image: string | null;
  last_message: string | null;
  unread_count: number;
}

const Chat: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getImageUrl = (url?: string | null): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user?.id) return;

    fetchConversations();

    const conversationParam = searchParams.get('conversation');
    if (conversationParam) {
      const conversationId = parseInt(conversationParam);
      if (!isNaN(conversationId)) {
        setSelectedConversation(conversationId);
        fetchMessages(conversationId);
        searchParams.delete('conversation');
        setSearchParams(searchParams);
      }
    }
  }, [user?.id, searchParams]);

  useEffect(() => {
    if (!user?.id || !selectedConversation) return;

    fetchMessages(selectedConversation);
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(selectedConversation);
      fetchConversations();
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user?.id, selectedConversation]);

  const fetchConversations = async () => {
    if (!user?.id) return;

    try {
      const response = await apiService.getChatConversations(user.id);
      setConversations(response.conversations);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    if (!user?.id) return;

    try {
      const response = await apiService.getChatConversation(conversationId, user.id);
      setMessages(response.messages);
      await apiService.markChatMessagesAsRead(conversationId, user.id);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    }
  };

  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversation(conversationId);
    fetchMessages(conversationId);
  };

  const handleSendMessage = async () => {
    if (!user?.id || !selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      await apiService.sendChatMessage(user.id, selectedConversation, newMessage.trim());
      setNewMessage('');
      fetchMessages(selectedConversation);
      fetchConversations();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const getOtherUserName = (conversation: Conversation): string => {
    return conversation.other_user_business_name || 
           conversation.other_user_name.trim() || 
           conversation.other_user_email;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            mt: 3,
            p: { xs: 3, sm: 4, md: 5 },
            background: theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, rgba(74, 58, 154, 0.15) 0%, rgba(255, 143, 0, 0.1) 100%)`
              : `linear-gradient(135deg, rgba(74, 58, 154, 0.08) 0%, rgba(255, 143, 0, 0.05) 100%)`,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            Chat
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
            Chat directly with buyers and sellers
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ height: '70vh' }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6">Conversations</Typography>
              </Box>
              <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                {conversations.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <ChatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      No conversations yet
                    </Typography>
                  </Box>
                ) : (
                  conversations.map((conversation) => (
                    <ListItem
                      key={conversation.id}
                      button
                      selected={selectedConversation === conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      sx={{
                        bgcolor: selectedConversation === conversation.id ? 'action.selected' : 'transparent',
                      }}
                    >
                      <ListItemAvatar>
                        <Badge badgeContent={conversation.unread_count} color="error" invisible={conversation.unread_count === 0}>
                          <Avatar>
                            {conversation.listing_image ? (
                              <img
                                src={getImageUrl(conversation.listing_image)}
                                alt={conversation.listing_title || 'Chat'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <ChatIcon />
                            )}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" noWrap sx={{ fontWeight: conversation.unread_count > 0 ? 600 : 400 }}>
                              {getOtherUserName(conversation)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(conversation.last_message_at)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {conversation.last_message || 'No messages yet'}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            {selectedConversation ? (
              <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6">
                    {(() => {
                      const conv = conversations.find(c => c.id === selectedConversation);
                      return conv ? getOtherUserName(conv) : 'Chat';
                    })()}
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '70%',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: isOwn ? 'primary.main' : 'grey.200',
                            color: isOwn ? 'white' : 'text.primary',
                          }}
                        >
                          <Typography variant="body1">{message.message}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                            {formatTime(message.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Box>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sending}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Paper>
            ) : (
              <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <ChatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select a conversation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose a conversation from the list to start chatting
                  </Typography>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Chat;

>>>>>>> ae19598c9ceca4f51c7616cdeab0e22e51a36cbd
