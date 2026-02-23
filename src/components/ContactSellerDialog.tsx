import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { Email as EmailIcon, Send as SendIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import apiService from '../services/api';

interface ContactSellerDialogProps {
  open: boolean;
  onClose: () => void;
  listingTitle: string;
  artistName: string;
  listingId: number;
}

const ContactSellerDialog: React.FC<ContactSellerDialogProps> = ({
  open,
  onClose,
  listingTitle,
  artistName,
  listingId,
}) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!subject.trim() || !message.trim()) {
      enqueueSnackbar('Please fill in all fields', { variant: 'error' });
      return;
    }
    if (!user?.id) {
      enqueueSnackbar('Please sign in to send a message', { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      await apiService.sendMessage(user.id, listingId, subject.trim(), message.trim());
      enqueueSnackbar('Message sent! The seller will see it in their messages.', { variant: 'success' });
      setMessage('');
      setSubject('');
      onClose();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to send message. Please try again.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (): void => {
    if (!loading) {
      setMessage('');
      setSubject('');
      onClose();
    }
  };

  const handleDialogClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      onClick={handleDialogClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" />
          <Typography variant="h6">Contact Seller</Typography>
        </Box>
      </DialogTitle>
      <DialogContent onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Artwork: <strong>{listingTitle}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Artist: <strong>{artistName}</strong>
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., Inquiry about pricing"
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell the seller about your interest, ask questions, or negotiate pricing..."
          multiline
          rows={6}
          margin="normal"
          required
        />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Your message will be sent through Artzyla. The seller can view and reply from their messages.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          disabled={loading || !subject.trim() || !message.trim()}
        >
          {loading ? 'Sending...' : 'Send Message'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactSellerDialog;
