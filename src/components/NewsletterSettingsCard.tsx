import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, Switch, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import apiService, { NewsletterStatus } from '../services/api';
import { useConfirm } from '../contexts/ConfirmContext';

// Admin controls for the weekly "new art" email.
const NewsletterSettingsCard: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { confirm } = useConfirm();
  const [status, setStatus] = useState<NewsletterStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'toggle' | 'test' | 'send' | null>(null);

  useEffect(() => {
    apiService.getNewsletterStatus()
      .then(setStatus)
      .catch((error: any) => setLoadError(error?.message || 'Failed to load newsletter settings'));
  }, []);

  if (loadError) return <Alert severity="error" sx={{ mb: 3 }}>Weekly email settings could not load: {loadError}.</Alert>;
  if (!status) return null;

  const toggle = async (enabled: boolean) => {
    if (enabled && !(await confirm({
      title: 'Turn on the weekly email?',
      message: `It goes to ${status.subscribers} subscriber${status.subscribers === 1 ? '' : 's'} every Monday afternoon (UTC), and is skipped in weeks with nothing new. Send yourself a test first to check it.`,
      confirmText: 'Turn on',
    }))) return;
    setBusy('toggle');
    try {
      setStatus(await apiService.setNewsletterEnabled(enabled));
      enqueueSnackbar(`Weekly email ${enabled ? 'enabled' : 'disabled'}`, { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error?.message || 'Failed to save', { variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy('test');
    try {
      const { to } = await apiService.sendTestNewsletter();
      enqueueSnackbar(`Test email sent to ${to}`, { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error?.message || 'Failed to send test email', { variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const sendNow = async () => {
    if (!(await confirm({
      title: 'Send the weekly email now?',
      message: `This emails all ${status.subscribers} subscriber${status.subscribers === 1 ? '' : 's'} right away, even if this week's email already went out.`,
      confirmText: 'Send now',
      destructive: true,
    }))) return;
    setBusy('send');
    try {
      const { sent } = await apiService.sendNewsletterNow();
      enqueueSnackbar(`Sent to ${sent} subscriber${sent === 1 ? '' : 's'}`, { variant: 'success' });
      setStatus(await apiService.getNewsletterStatus());
    } catch (error: any) {
      enqueueSnackbar(error?.message || 'Failed to send', { variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Weekly Email</Typography>
          <Typography variant="body2" color="text.secondary">
            {status.enabled
              ? 'ON: sent every Monday afternoon (UTC) with the featured artist, spotlight listings and new work.'
              : 'OFF: nothing is sent automatically. People can still subscribe from the footer.'}
          </Typography>
        </Box>
        <Switch checked={status.enabled} disabled={Boolean(busy)} onChange={(e) => toggle(e.target.checked)} />
      </Box>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Subscribers: <strong>{status.subscribers}</strong>
        {status.last_sent_week && ` · Last sent: week of ${status.last_sent_week} (${status.last_sent_count} recipients)`}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" disabled={Boolean(busy)} onClick={sendTest}>
          {busy === 'test' ? 'Sending…' : 'Send me a test'}
        </Button>
        <Button variant="outlined" color="error" disabled={Boolean(busy) || status.subscribers === 0} onClick={sendNow}>
          {busy === 'send' ? 'Sending…' : 'Send now'}
        </Button>
      </Box>
    </Paper>
  );
};

export default NewsletterSettingsCard;
