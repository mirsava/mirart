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
  Alert,
  CircularProgress,
} from '@mui/material';
import { Email as EmailIcon, Send as SendIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ContactSellerDialogProps {
  open: boolean;
  onClose: () => void;
  listingTitle: string;
  artistName: string;
  listingId: number;
}

interface ContactEmailResponse {
  success: boolean;
  message: string;
  mocked?: boolean;
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
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [buyerName, setBuyerName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!message.trim() || !subject.trim()) {
      enqueueSnackbar('Please fill in all fields', { variant: 'error' });
      return;
    }

    if (!buyerEmail.trim()) {
      enqueueSnackbar('Please provide your email address', { variant: 'error' });
      return;
    }

    if (!artistEmail) {
      enqueueSnackbar('Seller contact information is not available', { variant: 'error' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/email/contact-seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          subject,
          message,
          buyerEmail: buyerEmail.trim(),
          buyerName: buyerName.trim() || undefined,
        }),
      });

      const data: ContactEmailResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      if (data.mocked) {
        enqueueSnackbar('Email sent (mock mode - SMTP not configured)', { variant: 'info' });
      } else {
        enqueueSnackbar('Email sent successfully! The seller will contact you soon.', { variant: 'success' });
      }

      setMessage('');
      setSubject('');
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      enqueueSnackbar(error.message || 'Failed to send email. Please try again.', { variant: 'error' });
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
      onBackdropClick={(e) => {
        e.stopPropagation();
        handleClose();
      }}
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
          label="Your Email"
          type="email"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          placeholder="your.email@example.com"
          margin="normal"
          required
          disabled={!!user?.email}
        />

        <TextField
          fullWidth
          label="Your Name (Optional)"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Your name"
          margin="normal"
        />

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
          Your message will be sent directly to the seller via email. They will respond to your email address.
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
          disabled={loading || !buyerEmail.trim()}
        >
          {loading ? 'Sending...' : 'Send Message'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactSellerDialog;

