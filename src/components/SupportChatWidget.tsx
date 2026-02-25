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
  MenuItem,
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

const getOrCreateGuestSessionId = (): string => {
  const key = 'support_guest_session_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(key, generated);
  return generated;
};

const createGuestSessionId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

const getGuestUserId = (sessionId: string): number => {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) | 0;
  }
  const positive = Math.abs(hash) || 1;
  return -positive;
};

const SupportChatWidget: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { supportChatEnabled } = useChat();
  const [guestSessionId, setGuestSessionId] = useState<string>(() => getOrCreateGuestSessionId());
  const [guestName, setGuestName] = useState<string>(() => localStorage.getItem('support_guest_name') || '');
  const [guestEmail, setGuestEmail] = useState<string>(() => localStorage.getItem('support_guest_email') || '');
  const [guestSupportType, setGuestSupportType] = useState<'sales' | 'signup' | 'subscription' | 'billing' | 'technical' | 'general'>(
    () => (localStorage.getItem('support_guest_type') as any) || 'sales'
  );
  const [config, setConfig] = useState<SupportChatConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastGuestIdentityRef = useRef({ name: guestName.trim(), email: guestEmail.trim() });
  const currentSupportUserId = isAuthenticated && user?.id ? Number(user.id) : getGuestUserId(guestSessionId);

  const resetGuestThread = useCallback(() => {
    if (isAuthenticated) return;
    const nextSessionId = createGuestSessionId();
    localStorage.setItem('support_guest_session_id', nextSessionId);
    setGuestSessionId(nextSessionId);
    setMessages([]);
    setUnreadCount(0);
    setNewMessage('');
  }, [isAuthenticated]);

  const handleCloseWidget = () => {
    setOpen(false);
    setNewMessage('');
    setMessages([]);
    setUnreadCount(0);
    if (!isAuthenticated) {
      resetGuestThread();
    }
  };

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
    try {
      const msgs = await apiService.getSupportChatMessages({
        cognitoUsername: isAuthenticated ? user?.id : undefined,
        userId: currentSupportUserId,
      });
      setMessages(msgs);
      const unread = msgs.filter((m: any) => m.sender === 'admin' && !m.read_at).length;
      setUnreadCount(unread);
    } catch {}
  }, [currentSupportUserId, isAuthenticated, user?.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchMessages().finally(() => setLoading(false));
      apiService.markSupportChatRead({
        cognitoUsername: isAuthenticated ? user?.id : undefined,
        userId: currentSupportUserId,
        sender: 'admin',
      }).then(() => setUnreadCount(0)).catch(() => {});
      pollRef.current = setInterval(fetchMessages, 5000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
    if (pollRef.current) clearInterval(pollRef.current);
  }, [open, fetchMessages, isAuthenticated, user?.id, currentSupportUserId]);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await apiService.sendSupportChatMessage({
        cognitoUsername: isAuthenticated ? user?.id : undefined,
        userId: currentSupportUserId,
        guestSessionId: isAuthenticated ? undefined : guestSessionId,
        guestName: isAuthenticated ? undefined : guestName.trim() || undefined,
        guestEmail: isAuthenticated ? undefined : guestEmail.trim() || undefined,
        supportType: isAuthenticated ? undefined : guestSupportType,
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
        onClose={handleCloseWidget}
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
            <IconButton onClick={handleCloseWidget} sx={{ color: 'white' }} size="small">
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

          <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'background.paper', flexShrink: 0 }}>
            {!isAuthenticated && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Your name (optional)"
                  value={guestName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGuestName(value);
                    localStorage.setItem('support_guest_name', value);
                  }}
                  onBlur={() => {
                    const nextName = guestName.trim();
                    const nextEmail = guestEmail.trim();
                    const identityChanged =
                      nextName !== lastGuestIdentityRef.current.name ||
                      nextEmail !== lastGuestIdentityRef.current.email;
                    if (identityChanged) {
                      lastGuestIdentityRef.current = { name: nextName, email: nextEmail };
                      resetGuestThread();
                    }
                  }}
                />
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Your email (optional)"
                  value={guestEmail}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGuestEmail(value);
                    localStorage.setItem('support_guest_email', value);
                  }}
                  onBlur={() => {
                    const nextName = guestName.trim();
                    const nextEmail = guestEmail.trim();
                    const identityChanged =
                      nextName !== lastGuestIdentityRef.current.name ||
                      nextEmail !== lastGuestIdentityRef.current.email;
                    if (identityChanged) {
                      lastGuestIdentityRef.current = { name: nextName, email: nextEmail };
                      resetGuestThread();
                    }
                  }}
                />
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={guestSupportType}
                  onChange={(e) => {
                    const value = e.target.value as 'sales' | 'signup' | 'subscription' | 'billing' | 'technical' | 'general';
                    setGuestSupportType(value);
                    localStorage.setItem('support_guest_type', value);
                  }}
                >
                  <MenuItem value="sales">Sales</MenuItem>
                  <MenuItem value="signup">Signup Help</MenuItem>
                  <MenuItem value="subscription">Subscription</MenuItem>
                  <MenuItem value="billing">Billing</MenuItem>
                  <MenuItem value="technical">Technical</MenuItem>
                  <MenuItem value="general">General</MenuItem>
                </TextField>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
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
            {!isAuthenticated && (
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                Guest mode is available for signup and subscription questions.
              </Typography>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default SupportChatWidget;
