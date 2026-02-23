import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Fab,
  Drawer,
  Typography,
  TextField,
  IconButton,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  HeadsetMic as SupportIcon,
  Close as CloseIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import apiService from '../services/api';

interface SupportChatConfig {
  enabled: boolean;
  hours_start: number;
  hours_end: number;
  timezone: string;
  offline_message: string;
  welcome_message: string;
}

const SupportChatWidget: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { supportChatEnabled } = useChat();
  const [config, setConfig] = useState<SupportChatConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    apiService.getSupportChatConfig().then(setConfig).catch(() => {});
  }, []);

  const isOnline = useCallback(() => {
    if (!config) return false;
    try {
      const now = new Date();
      const tz = config.timezone || 'America/Los_Angeles';
      const timeStr = now.toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
      const [h] = timeStr.split(':').map(Number);
      const day = new Date(now.toLocaleString('en-US', { timeZone: tz })).getDay();
      if (day === 0 || day === 6) return false;
      return h >= config.hours_start && h < config.hours_end;
    } catch {
      return true;
    }
  }, [config]);

  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;
    try {
      const msgs = await apiService.getSupportChatMessages(user.id);
      setMessages(msgs);
      const unread = msgs.filter((m: any) => m.sender === 'admin' && !m.read_at).length;
      setUnreadCount(unread);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchMessages();
    }
  }, [isAuthenticated, user?.id, fetchMessages]);

  useEffect(() => {
    if (open && user?.id) {
      setLoading(true);
      fetchMessages().finally(() => setLoading(false));
      apiService.markSupportChatRead(user.id, 'admin').then(() => setUnreadCount(0)).catch(() => {});
      pollRef.current = setInterval(fetchMessages, 5000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
    if (pollRef.current) clearInterval(pollRef.current);
  }, [open, user?.id, fetchMessages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user?.id) return;
    setSending(true);
    try {
      await apiService.sendSupportChatMessage({
        cognitoUsername: user.id,
        message: newMessage.trim(),
        sender: 'user',
      });
      setNewMessage('');
      await fetchMessages();
    } catch {}
    setSending(false);
  };

  if (supportChatEnabled === false || (!config?.enabled && supportChatEnabled === null)) return null;

  const online = isOnline();

  return (
    <>
      <Fab
        size="medium"
        color="secondary"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 88,
          right: 20,
          zIndex: 1299,
          boxShadow: 4,
          '@media print': { display: 'none' },
          ...(open && { display: 'none' }),
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          sx={{ '& .MuiBadge-badge': { fontWeight: 600 } }}
        >
          <SupportIcon />
        </Badge>
      </Fab>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        disableScrollLock
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 380 },
            height: { xs: '100%', sm: 520 },
            top: { xs: 0, sm: 'auto' },
            bottom: { sm: 24 },
            right: { sm: 24 },
            borderRadius: { xs: 0, sm: 2 },
            overflow: 'hidden',
            position: 'fixed',
          },
        }}
        ModalProps={{ keepMounted: true }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{
            px: 2.5,
            py: 2,
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SupportIcon />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  Artzyla Support
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: online ? '#4caf50' : '#bdbdbd' }} />
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {online ? 'Online' : 'Offline'}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'background.default' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <>
                <Box sx={{
                  alignSelf: 'flex-start',
                  maxWidth: '80%',
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  borderTopLeftRadius: 0,
                  bgcolor: 'action.hover',
                }}>
                  <Typography variant="body2">
                    {online ? config.welcome_message : config.offline_message}
                  </Typography>
                </Box>

                {messages.map((msg: any) => (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Box sx={{
                      maxWidth: '80%',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      borderTopRightRadius: msg.sender === 'user' ? 0 : 2,
                      borderTopLeftRadius: msg.sender === 'admin' ? 0 : 2,
                      bgcolor: msg.sender === 'user' ? 'primary.main' : 'action.hover',
                      color: msg.sender === 'user' ? 'white' : 'text.primary',
                    }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.message}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'right', mt: 0.25 }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </Box>

          {isAuthenticated ? (
            <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, bgcolor: 'background.paper', flexShrink: 0 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                multiline
                maxRows={3}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
              >
                <SendIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center', bgcolor: 'background.paper', flexShrink: 0 }}>
              <Typography variant="body2" color="text.secondary">
                Please sign in to chat with support
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default SupportChatWidget;
