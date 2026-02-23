import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Collapse } from '@mui/material';
import {
  Close as CloseIcon,
  InfoOutlined as InfoIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const STORAGE_KEY = 'artzy_dismissed_announcements';

const severityConfig: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  info: { bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.2)', text: '#2563eb', icon: <InfoIcon sx={{ fontSize: 18 }} /> },
  warning: { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)', text: '#d97706', icon: <WarningIcon sx={{ fontSize: 18 }} /> },
  success: { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)', text: '#059669', icon: <SuccessIcon sx={{ fontSize: 18 }} /> },
  error: { bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.2)', text: '#dc2626', icon: <ErrorIcon sx={{ fontSize: 18 }} /> },
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
    <Box sx={{ width: '100%', zIndex: 1200 }}>
      {visible.map((a, i) => {
        const config = severityConfig[a.severity] || severityConfig.info;
        const msg = typeof a.message === 'string' ? a.message : String(a.message || '');
        return (
          <Collapse key={a.id} in>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: { xs: 2, sm: 3, md: 4 },
                py: 1.25,
                bgcolor: config.bg,
                borderBottom: i < visible.length - 1 ? '1px solid' : 'none',
                borderBottomColor: config.border,
              }}
            >
              <Box sx={{ color: config.text, flexShrink: 0, display: 'flex' }}>
                {config.icon}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  color: 'text.primary',
                  fontWeight: 450,
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                }}
              >
                {msg.trim() || 'Site announcement'}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleDismiss(a.id)}
                sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' }, p: 0.5, flexShrink: 0 }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Collapse>
        );
      })}
    </Box>
  );
};

export default AnnouncementBanner;
