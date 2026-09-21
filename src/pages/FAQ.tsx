import React from 'react';
import { Box, Grid } from '@mui/material';
import PageHeader from '../components/PageHeader';
import SEO from '../components/SEO';
import FAQSection from '../components/FAQSection';
import { buildFaqStructuredData } from '../data/faqs';
import { useFaqItems } from '../hooks/useFaqItems';

const FAQ: React.FC = () => {
  const faqItems = useFaqItems();
  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <SEO
        title="Frequently Asked Questions"
        description="Find answers about buying art, shipping, returns, and selling on ArtZyla."
        url="/faq"
        structuredData={buildFaqStructuredData(faqItems)}
      />
      <PageHeader
        title="Frequently Asked Questions"
        eyebrow="Help center"
        subtitle="Answers for buyers and artists about listings, orders, shipping, returns, and marketplace workflow."
        disablePattern={true}
        align="left"
      />
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 4, md: 6 } }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={9}>
            <FAQSection items={faqItems} title={null} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default FAQ;
