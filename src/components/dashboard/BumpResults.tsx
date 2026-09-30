import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { ArrowUpward as ArrowUpwardIcon } from '@mui/icons-material';
import apiService, { BumpResult } from '../../services/api';

// Plain-language result of one bump, shared by the Overview card and the "Bumped" chip.
export const describeBumpResult = (r: BumpResult): string => {
  const period = r.active ? `so far (${r.days_so_far} of 7 days)` : 'during its week';
  if (r.usual_views === 0) {
    return r.views > 0
      ? `${r.views} ${r.views === 1 ? 'view' : 'views'} ${period}. It had none the week before.`
      : `No views yet ${period}.`;
  }
  return r.extra_views > 0
    ? `+${r.extra_views} extra ${r.extra_views === 1 ? 'view' : 'views'} ${period}: ${r.views} views vs about ${r.usual_views} usually.`
    : `${r.views} views ${period}, about the same as usual (${r.usual_views}).`;
};

const shortDate = (v: string) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// "Your recent bumps" on the artist Overview: what each bump brought, so artists can judge whether it's worth it.
const BumpResults: React.FC<{ authUserId: string }> = ({ authUserId }) => {
  const [results, setResults] = useState<BumpResult[]>([]);

  useEffect(() => {
    apiService.getBumpResults(authUserId).then((r) => setResults(r.results)).catch(() => setResults([]));
  }, [authUserId]);

  if (results.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>Your recent bumps</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        Views in the week after each bump, compared with the listing's usual views the week before.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {results.slice(0, 5).map((r) => (
          <Box key={`${r.listing_id}-${r.bumped_at}`} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <ArrowUpwardIcon fontSize="small" color={r.extra_views > 0 ? 'success' : 'disabled'} sx={{ mt: 0.25 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {r.title} <Typography component="span" variant="caption" color="text.secondary">· bumped {shortDate(r.bumped_at)}</Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary">{describeBumpResult(r)}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default BumpResults;
