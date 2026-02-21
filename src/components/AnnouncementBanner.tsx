import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import {
  Close as CloseIcon,
  InfoOutlined as InfoIcon,
  WarningAmber as WarningIcon,
  CheckCircle as SuccessIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const STORAGE_KEY = 'artzy_dismissed_announcements';

const severityStyles: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  info: { bg: '#e3f2fd', color: '#0d47a1', icon: <InfoIcon /> },
  warning: { bg: '#fff3e0', color: '#e65100', icon: <WarningIcon /> },
  success: { bg: '#e8f5e9', color: '#1b5e20', icon: <SuccessIcon /> },
  error: { bg: '#ffebee', color: '#b71c1c', icon: <ErrorIcon /> },
};

const AnnouncementBanner: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Array<{ id: number; message: string; severity: string }>>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored).map(Number)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await apiService.getAnnouncements(user?.id, user?.groups);
        setAnnouncements(res.announcements || []);
      } catch {
        setAnnouncements([]);
      }
    };
    fetchAnnouncements();
  }, [user?.id, user?.groups]);

  const handleDismiss = (id: number) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {}
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <Box sx={{ position: 'sticky', top: { xs: 100, sm: 120 }, zIndex: 1200, width: '100%' }}>
      {visible.map((a) => {
        const style = severityStyles[a.severity] || severityStyles.info;
        const msg = typeof a.message === 'string' ? a.message : (a.message ? String(a.message) : '');
        return (
          <Box
            key={a.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 64,
              py: 2,
              px: 2,
              backgroundColor: style.bg,
              color: style.color,
              borderRadius: 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
              <Box sx={{ color: 'inherit', flexShrink: 0 }}>
                {style.icon}
              </Box>
              <Typography component="span" variant="body1" sx={{ color: 'inherit', lineHeight: 1.6 }}>
                {msg.trim() || 'Site announcement'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => handleDismiss(a.id)} sx={{ color: 'inherit', ml: 1 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      })}
    </Box>
  );
};

export default AnnouncementBanner;
