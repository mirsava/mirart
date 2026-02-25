import React from 'react';
import { Box, Grid } from '@mui/material';
import { HelpOutline as HelpOutlineIcon } from '@mui/icons-material';
import PageHeader from '../components/PageHeader';
import SEO from '../components/SEO';
import FAQSection from '../components/FAQSection';
import { FAQ_ITEMS, FAQ_STRUCTURED_DATA } from '../data/faqs';

const FAQ: React.FC = () => {
  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <SEO
        title="Frequently Asked Questions"
        description="Find answers about buying art, shipping, returns, and selling on ArtZyla."
        url="/faq"
        structuredData={FAQ_STRUCTURED_DATA}
      />
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Answers for buyers and artists about listings, orders, shipping, returns, and marketplace workflow."
        icon={<HelpOutlineIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
        disablePattern={true}
        align="left"
      />
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 4, md: 6 } }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={9}>
            <FAQSection items={FAQ_ITEMS} titleVariant="h5" />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default FAQ;
