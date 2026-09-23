import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Switch, TextField, Typography } from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService, { PromotionConfig, PromotionStats } from '../services/api';

const money = (n: number) => `$${n.toFixed(2)}`;

// Admin settings for paid listing passes, featured listings and bumps, with a revenue summary.
const PromotionSettingsCard: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [config, setConfig] = useState<PromotionConfig | null>(null);
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiService.getPromotionAdminConfig()
      .then((result) => {
        setConfig(result.config);
        setStats(result.stats);
      })
      .catch((error: any) => setLoadError(error?.message || 'Failed to load promotion settings'));
  }, []);

  if (loadError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Paid listing settings could not load: {loadError}. If you just updated the code, restart the backend.
      </Alert>
    );
  }
  if (!config) return null;

  const save = async (patch: Partial<PromotionConfig>) => {
    setSaving(true);
    try {
      const result = await apiService.updatePromotionConfig(patch);
      setConfig(result.config);
      enqueueSnackbar('Promotion settings saved', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error?.message || 'Failed to save promotion settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateOption = (index: number, field: 'days' | 'price', value: number) =>
    setConfig({ ...config, feature_options: config.feature_options.map((o, i) => (i === index ? { ...o, [field]: value } : o)) });

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Paid Listing Options</Typography>
          <Typography variant="body2" color="text.secondary">
            {config.enabled
              ? 'Features & bumps ON: artists can pay to feature a listing or bump it to the top of "Newest".'
              : "Features & bumps OFF: artists can't buy them. Listings already featured keep their spot until it ends."}
          </Typography>
        </Box>
        <Switch checked={config.enabled} disabled={saving} onChange={(e) => save({ enabled: e.target.checked })} />
      </Box>

      {stats && (
        <Typography variant="body2" sx={{ mt: 2 }}>
          Last 30 days: <strong>{money(stats.revenue_30d)}</strong> from {stats.paid_count_30d} purchases · All time: {money(stats.revenue_total)} · Featured now: {stats.featured_now}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mt: 3 }}>
        <Box>
          <Typography variant="subtitle2">Pay per listing</Typography>
          <Typography variant="body2" color="text.secondary">
            {config.listing_pass_enabled
              ? 'ON: when an artist has no plan or no free slot, they can pay once to keep a single listing live.'
              : 'OFF: artists who are out of slots can only subscribe or upgrade.'}
          </Typography>
        </Box>
        <Switch
          checked={config.listing_pass_enabled}
          disabled={saving}
          onChange={(e) => save({ listing_pass_enabled: e.target.checked })}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 1.5 }}>
        <TextField
          label="Price ($)"
          type="number"
          size="small"
          value={config.listing_pass_price}
          onChange={(e) => setConfig({ ...config, listing_pass_price: Number(e.target.value) })}
          inputProps={{ min: 0.5, step: 0.5 }}
          sx={{ width: 130 }}
        />
        <TextField
          label="Days live"
          type="number"
          size="small"
          value={config.listing_pass_days}
          onChange={(e) => setConfig({ ...config, listing_pass_days: Number(e.target.value) })}
          inputProps={{ min: 1, max: 365, step: 1 }}
          sx={{ width: 130 }}
        />
      </Box>

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Feature options</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {config.feature_options.map((option, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <TextField
              label="Days"
              type="number"
              size="small"
              value={option.days}
              onChange={(e) => updateOption(index, 'days', Number(e.target.value))}
              inputProps={{ min: 1, max: 365, step: 1 }}
              sx={{ width: 110 }}
            />
            <TextField
              label="Price ($)"
              type="number"
              size="small"
              value={option.price}
              onChange={(e) => updateOption(index, 'price', Number(e.target.value))}
              inputProps={{ min: 0.5, step: 0.5 }}
              sx={{ width: 130 }}
            />
            <IconButton
              size="small"
              aria-label="Remove option"
              disabled={config.feature_options.length <= 1}
              onClick={() => setConfig({ ...config, feature_options: config.feature_options.filter((_, i) => i !== index) })}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        {config.feature_options.length < 6 && (
          <Box>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setConfig({ ...config, feature_options: [...config.feature_options, { days: 14, price: 9 }] })}
            >
              Add option
            </Button>
          </Box>
        )}
      </Box>

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Bump</Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          label="Price ($)"
          type="number"
          size="small"
          value={config.bump_price}
          onChange={(e) => setConfig({ ...config, bump_price: Number(e.target.value) })}
          inputProps={{ min: 0.5, step: 0.5 }}
          sx={{ width: 130 }}
        />
        <TextField
          label="Hours between bumps"
          type="number"
          size="small"
          value={config.bump_cooldown_hours}
          onChange={(e) => setConfig({ ...config, bump_cooldown_hours: Number(e.target.value) })}
          inputProps={{ min: 0, max: 720, step: 1 }}
          sx={{ width: 190 }}
        />
      </Box>

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 0.5 }}>Included with plans (per 30 days)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Free features for subscribers, keyed by plan tier. Set 0 to include none.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {Object.entries(config.plan_feature_credits).map(([tier, count]) => (
          <TextField
            key={tier}
            label={tier.charAt(0).toUpperCase() + tier.slice(1)}
            type="number"
            size="small"
            value={count}
            onChange={(e) => setConfig({ ...config, plan_feature_credits: { ...config.plan_feature_credits, [tier]: Number(e.target.value) } })}
            inputProps={{ min: 0, max: 100, step: 1 }}
            sx={{ width: 140 }}
          />
        ))}
        <TextField
          label="Days per included feature"
          type="number"
          size="small"
          value={config.plan_feature_days}
          onChange={(e) => setConfig({ ...config, plan_feature_days: Number(e.target.value) })}
          inputProps={{ min: 1, max: 90, step: 1 }}
          sx={{ width: 210 }}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" disabled={saving} onClick={() => save(config)}>
          {saving ? 'Saving...' : 'Save promotion settings'}
        </Button>
      </Box>
    </Paper>
  );
};

export default PromotionSettingsCard;
