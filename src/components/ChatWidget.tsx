import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
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
  AppBar,
  Toolbar,
  Fab,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  Image as ImageIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import apiService, { User } from '../services/api';

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

interface ChatWidgetProps {
  open: boolean;
  onClose: () => void;
  initialConversationId?: number | null;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ open, onClose, initialConversationId = null }) => {
  const { user } = useAuth();
  const { openChat: openChatFromContext } = useChat();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [windowWidth, setWindowWidth] = useState(400);
  const [windowHeight, setWindowHeight] = useState(600);
  const [isResizingWindow, setIsResizingWindow] = useState(false);
  const [resizeType, setResizeType] = useState<'width' | 'height' | 'corner' | null>(null);
  const [showConversationsList, setShowConversationsList] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (!user?.id || !open) return;

    fetchConversations();

    if (initialConversationId) {
      setSelectedConversation(initialConversationId);
      fetchMessages(initialConversationId);
    }
  }, [user?.id, open, initialConversationId]);

  useEffect(() => {
    if (!user?.id || !selectedConversation || !open || minimized) return;

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
  }, [user?.id, selectedConversation, open, minimized]);

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

  const getUserDisplayName = (user: User): string => {
    if (user.business_name) return user.business_name;
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email || user.cognito_username;
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiService.searchUsers(searchQuery, 10);
        const filteredUsers = response.users.filter(u => u.id !== user?.id);
        setSearchResults(filteredUsers);
      } catch (err: any) {
        setError(err.message || 'Failed to search users');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, user?.id]);

  const handleStartChatWithUser = async (otherUser: User) => {
    if (!user?.id || !otherUser.id) {
      setError('User information not available');
      return;
    }

    try {
      setSearching(true);
      setError(null);
      const message = `Hi! I'd like to connect with you.`;
      const response = await apiService.createChatConversation(
        user.id,
        otherUser.id,
        null,
        message
      );
      
      if (response && response.conversationId) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedConversation(response.conversationId);
        await fetchMessages(response.conversationId);
        await fetchConversations();
      } else {
        setError('Failed to create conversation');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to start chat';
      setError(errorMessage);
    } finally {
      setSearching(false);
    }
  };

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!widgetRef.current) return;

      if (isResizingWindow) {
        const rect = widgetRef.current.getBoundingClientRect();
        
        if (resizeType === 'width' || resizeType === 'corner') {
          const newWidth = e.clientX - rect.left;
          if (newWidth >= 300 && newWidth <= window.innerWidth - 32) {
            setWindowWidth(newWidth);
          }
        }
        
        if (resizeType === 'height' || resizeType === 'corner') {
          const newHeight = rect.bottom - e.clientY;
          if (newHeight >= 400 && newHeight <= window.innerHeight - 100) {
            setWindowHeight(newHeight);
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingWindow(false);
      setResizeType(null);
    };

    if (isResizingWindow) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'resizing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingWindow, resizeType, windowWidth]);

  return (
    <>
      {open && !minimized && (
        <Paper
          ref={widgetRef}
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            width: { xs: 'calc(100vw - 32px)', sm: `${windowWidth}px` },
            height: { xs: 'calc(100vh - 100px)', sm: `${windowHeight}px` },
            maxHeight: { xs: 'calc(100vh - 100px)', sm: '80vh' },
            minWidth: { xs: 'auto', sm: 300 },
            minHeight: { xs: 'auto', sm: 400 },
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            overflow: 'hidden',
            zIndex: 1300,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            resize: { xs: 'none', sm: 'both' },
          }}
        >
          <Box
            onMouseDown={(e) => {
              const rect = widgetRef.current?.getBoundingClientRect();
              if (!rect) return;
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const threshold = 20;
              
              if (x >= rect.width - threshold && y >= rect.height - threshold) {
                setResizeType('corner');
                setIsResizingWindow(true);
              } else if (x >= rect.width - threshold) {
                setResizeType('width');
                setIsResizingWindow(true);
              } else if (y >= rect.height - threshold) {
                setResizeType('height');
                setIsResizingWindow(true);
              }
            }}
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 20,
              height: 20,
              cursor: 'nwse-resize',
              zIndex: 1,
              display: { xs: 'none', sm: 'block' },
            }}
          />
          <Box
            onMouseDown={() => {
              setResizeType('width');
              setIsResizingWindow(true);
            }}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 4,
              height: '100%',
              cursor: 'ew-resize',
              zIndex: 1,
              display: { xs: 'none', sm: 'block' },
              '&:hover': {
                bgcolor: 'primary.main',
                opacity: 0.3,
              },
            }}
          />
          <Box
            onMouseDown={() => {
              setResizeType('height');
              setIsResizingWindow(true);
            }}
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: 4,
              cursor: 'ns-resize',
              zIndex: 1,
              display: { xs: 'none', sm: 'block' },
              '&:hover': {
                bgcolor: 'primary.main',
                opacity: 0.3,
              },
            }}
          />
          <AppBar position="static" elevation={0}>
            <Toolbar sx={{ 
              minHeight: '48px !important', 
              px: { xs: 1.5, sm: 2 },
              py: 0,
            }}>
              <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1rem', fontWeight: 600, pl: { xs: 0.5, sm: 1 } }}>
                Chat {totalUnread > 0 && `(${totalUnread})`}
              </Typography>
              <IconButton 
                color="inherit" 
                size="small" 
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (!showSearch) {
                    setSearchQuery('');
                    setSearchResults([]);
                  }
                }}
                sx={{ 
                  mr: 0.5,
                  p: 0.75,
                }}
              >
                <PersonAddIcon fontSize="small" />
              </IconButton>
              <IconButton 
                color="inherit" 
                size="small" 
                onClick={() => setShowConversationsList(!showConversationsList)} 
                sx={{ 
                  mr: 0.5, 
                  display: { xs: 'flex', sm: 'none' },
                  p: 0.75,
                }}
              >
                <ChatIcon fontSize="small" />
              </IconButton>
              <IconButton 
                color="inherit" 
                size="small" 
                onClick={() => setMinimized(true)}
                sx={{ p: 0.75 }}
              >
                <MinimizeIcon fontSize="small" />
              </IconButton>
              <IconButton 
                color="inherit" 
                size="small" 
                onClick={onClose}
                sx={{ p: 0.75 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Toolbar>
          </AppBar>

          {showSearch && (
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              p: 1.5,
              bgcolor: 'background.paper',
            }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search users by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                }}
                sx={{ mb: 1 }}
              />
              {searching && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              )}
              {!searching && searchResults.length > 0 && (
                <List sx={{ maxHeight: 200, overflow: 'auto', p: 0 }}>
                  {searchResults.map((resultUser) => (
                    <ListItem
                      key={resultUser.id}
                      button
                      onClick={() => handleStartChatWithUser(resultUser)}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar src={getImageUrl(resultUser.profile_image_url)}>
                          {getUserDisplayName(resultUser).charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={getUserDisplayName(resultUser)}
                        secondary={resultUser.email}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 500,
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                        }}
                      />
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <ChatIcon fontSize="small" />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              )}
              {!searching && searchQuery.trim() && searchResults.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No users found
                </Typography>
              )}
            </Box>
          )}

          {showConversationsList && (
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              maxHeight: 200,
              overflow: 'auto',
              display: { xs: 'block', sm: 'none' },
            }}>
              <List>
                {conversations.map((conversation) => (
                  <ListItem
                    key={conversation.id}
                    selected={selectedConversation === conversation.id}
                    onClick={() => {
                      handleSelectConversation(conversation.id);
                      setShowConversationsList(false);
                    }}
                    sx={{
                      bgcolor: selectedConversation === conversation.id ? 'action.selected' : 'transparent',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={conversation.unread_count} color="error" invisible={conversation.unread_count === 0}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {conversation.listing_image ? (
                            <img
                              src={getImageUrl(conversation.listing_image)}
                              alt={conversation.listing_title || 'Chat'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <ChatIcon fontSize="small" />
                          )}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap sx={{ fontWeight: conversation.unread_count > 0 ? 600 : 400 }}>
                          {getOtherUserName(conversation)}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {conversation.last_message || 'No messages yet'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Box sx={{ borderBottom: 1, borderColor: 'divider', display: { xs: 'none', sm: 'block' } }}>
            <Tabs
              value={selectedConversation || false}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 48,
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                },
              }}
            >
              {conversations.map((conversation) => (
                <Tab
                  key={conversation.id}
                  value={conversation.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        {conversation.listing_image ? (
                          <img
                            src={getImageUrl(conversation.listing_image)}
                            alt={conversation.listing_title || 'Chat'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <ChatIcon sx={{ fontSize: 16 }} />
                        )}
                      </Avatar>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>
                        {getOtherUserName(conversation)}
                      </Typography>
                      {conversation.unread_count > 0 && (
                        <Chip
                          label={conversation.unread_count}
                          size="small"
                          color="error"
                          sx={{ height: 18, fontSize: '0.7rem', minWidth: 18 }}
                        />
                      )}
                    </Box>
                  }
                  onClick={() => handleSelectConversation(conversation.id)}
                  sx={{
                    opacity: selectedConversation === conversation.id ? 1 : 0.7,
                  }}
                />
              ))}
            </Tabs>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              sx={{ m: 1 }}
            >
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, flexDirection: 'column' }}>

            {selectedConversation ? (
              <>
                <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper' }}>
                  {(() => {
                    const conv = conversations.find(c => c.id === selectedConversation);
                    return (
                      <>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {conv?.listing_image ? (
                            <img
                              src={getImageUrl(conv.listing_image)}
                              alt={conv.listing_title || 'Chat'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <ChatIcon sx={{ fontSize: 18 }} />
                          )}
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {conv ? getOtherUserName(conv) : 'Chat'}
                          </Typography>
                          {conv?.listing_title && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {conv.listing_title}
                            </Typography>
                          )}
                        </Box>
                      </>
                    );
                  })()}
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
                          <Typography variant="body2">{message.message}</Typography>
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
                <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
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
                    sx={{
                      '& .MuiInputBase-root': {
                        fontSize: '0.95rem',
                        minHeight: '48px',
                        alignItems: 'flex-end',
                      },
                      '& .MuiInputBase-input': {
                        padding: '12px 14px',
                        lineHeight: 1.5,
                      },
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    sx={{
                      minWidth: 48,
                      minHeight: 48,
                      mb: 0.5,
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <ChatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select a conversation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose a conversation from the list to start chatting
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {(!open || minimized) && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1300,
          }}
          onClick={() => {
            if (minimized) {
              setMinimized(false);
            } else {
              openChatFromContext();
            }
          }}
        >
          <Badge badgeContent={totalUnread} color="error">
            <ChatIcon />
          </Badge>
        </Fab>
      )}
    </>
  );
};

export default ChatWidget;

