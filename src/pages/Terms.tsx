import React, { useMemo } from 'react';
import { Box, Container, Divider, Paper, Typography } from '@mui/material';
import SEO from '../components/SEO';
import PageHeader from '../components/PageHeader';
import { LEGAL_CONFIG, getTermsSections } from '../data/terms';
import { useBillingStatus } from '../hooks/useBillingStatus';
import { useMarketplaceSettings } from '../hooks/useMarketplaceSettings';

const Terms: React.FC = () => {
  const { checkoutEnabled } = useMarketplaceSettings();
  const billing = useBillingStatus();
  const billingEnabled = billing?.billing_enabled === true;
  const freeListingLimit = billing?.free_listing_limit ?? 25;

  const sections = useMemo(
    () => getTermsSections({ checkoutEnabled, billingEnabled, freeListingLimit }),
    [checkoutEnabled, billingEnabled, freeListingLimit]
  );

  return (
    <Box sx={{ minHeight: '100vh', pb: 8, bgcolor: 'background.default' }}>
      <SEO
        title="Terms of Service"
        description={`The terms that apply when you use ${LEGAL_CONFIG.siteName}, the marketplace connecting independent artists with buyers.`}
        url="/terms"
      />
      <PageHeader
        title="Terms of Service"
        eyebrow="Legal"
        subtitle={`Last updated ${LEGAL_CONFIG.lastUpdated}`}
        align="left"
        subtitleLines={1}
      />
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 3, md: 5 } }}>
          {sections.map((section, index) => (
            <Box key={section.title} sx={{ mb: index < sections.length - 1 ? 4 : 0 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                {section.title}
              </Typography>
              {section.paragraphs.map((paragraph) => (
                <Typography key={paragraph} variant="body1" color="text.secondary" paragraph sx={{ lineHeight: 1.8 }}>
                  {paragraph}
                </Typography>
              ))}
              {index < sections.length - 1 && <Divider sx={{ mt: 3 }} />}
            </Box>
          ))}
        </Paper>
      </Container>
    </Box>
  );
};

export default Terms;
