import React, { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Paper, Typography } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { FAQItem } from '../data/faqs';

interface FAQSectionProps {
  items: FAQItem[];
  id?: string;
  title?: string;
  titleVariant?: 'h4' | 'h5' | 'h6';
}

const FAQSection: React.FC<FAQSectionProps> = ({ items, id, title = 'Frequently Asked Questions', titleVariant = 'h4' }) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  return (
    <Box id={id} sx={{ mt: 8, scrollMarginTop: { xs: '96px', md: '88px' } }}>
      <Typography variant={titleVariant} fontWeight={700} gutterBottom sx={{ mb: 4, color: 'primary.main' }}>
        {title}
      </Typography>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        {items.map((faq, index) => (
          <Accordion
            key={faq.question}
            disableGutters
            elevation={0}
            expanded={expandedFaq === index}
            onChange={() => setExpandedFaq(expandedFaq === index ? null : index)}
            sx={{
              borderBottom: index < items.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              '&::before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                px: { xs: 1, md: 1.5 },
                py: 1,
                minHeight: 'unset',
                '& .MuiAccordionSummary-content': {
                  my: 0,
                },
                '& .MuiAccordionSummary-content.Mui-expanded': {
                  my: 0,
                },
              }}
            >
              <Typography variant="h6">{faq.question}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: { xs: 1, md: 1.5 }, pt: 0, pb: 2 }}>
              <Typography variant="body1" color="text.secondary">
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </Box>
  );
};

export default FAQSection;
