import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
} from '@mui/material';

const Privacy: React.FC = () => {
  return (
    <Box sx={{ py: 8, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Privacy Policy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>

          <Divider sx={{ mb: 4 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Introduction
            </Typography>
            <Typography variant="body1" paragraph>
              Welcome to ArtZyla ("we," "our," or "us"). We are committed to protecting your privacy 
              and ensuring the security of your personal information. This Privacy Policy explains how 
              we collect, use, disclose, and safeguard your information when you use our marketplace 
              platform that connects artists with art buyers.
            </Typography>
            <Typography variant="body1" paragraph>
              By using ArtZyla, you agree to the collection and use of information in accordance with 
              this policy. If you do not agree with our policies and practices, please do not use our 
              service.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Information We Collect
            </Typography>
            
            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              Information You Provide
            </Typography>
            <Typography variant="body1" paragraph>
              We collect information that you provide directly to us, including:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li>
                <Typography variant="body1" component="span">
                  Account information: username, email address, password, first name, last name, 
                  business name, phone number, country, website, and profile information
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Listing information: artwork details, images, descriptions, pricing, shipping 
                  information, and return policies
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Transaction information: purchase details, shipping addresses, payment information 
                  (processed through secure third-party payment processors)
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Communication data: messages sent through our platform, customer service inquiries, 
                  and feedback
                </Typography>
              </li>
            </Box>

            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              Automatically Collected Information
            </Typography>
            <Typography variant="body1" paragraph>
              When you use our platform, we automatically collect certain information, including:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li>
                <Typography variant="body1" component="span">
                  Device information: IP address, browser type, operating system, device identifiers
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Usage data: pages visited, time spent on pages, clicks, search queries, listing views
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Location data: general location information based on IP address
                </Typography>
              </li>
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              How We Use Your Information
            </Typography>
            <Typography variant="body1" paragraph>
              We use the information we collect to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li>
                <Typography variant="body1" component="span">
                  Provide, maintain, and improve our marketplace services
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Process transactions and facilitate communication between artists and buyers
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Send you transactional communications, such as order confirmations and updates
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Respond to your inquiries, comments, and requests
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Monitor and analyze usage patterns to improve user experience
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Detect, prevent, and address technical issues, fraud, or security concerns
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  Comply with legal obligations and enforce our terms of service
                </Typography>
              </li>
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Information Sharing and Disclosure
            </Typography>
            <Typography variant="body1" paragraph>
              We may share your information in the following circumstances:
            </Typography>
            
            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              Public Information
            </Typography>
            <Typography variant="body1" paragraph>
              When you create a listing or artist profile, certain information becomes publicly visible, 
              including your artist name, artwork listings, descriptions, images, and public profile 
              information. This information is accessible to all users of our platform.
            </Typography>

            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              Transaction Partners
            </Typography>
            <Typography variant="body1" paragraph>
              When you make a purchase, we share necessary information with the seller (artist) to 
              facilitate the transaction, including your name, shipping address, and contact information. 
              Similarly, when you sell artwork, buyer information is shared with you to complete the sale.
            </Typography>

            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              Service Providers
            </Typography>
            <Typography variant="body1" paragraph>
              We may share information with third-party service providers who perform services on our 
              behalf, such as payment processing, hosting, analytics, and customer support. These 
              providers are contractually obligated to protect your information and use it only for 
              the purposes we specify.
            </Typography>

            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              Legal Requirements
            </Typography>
            <Typography variant="body1" paragraph>
              We may disclose information if required by law, court order, or government regulation, 
              or if we believe disclosure is necessary to protect our rights, property, or safety, 
              or that of our users or others.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Data Security
            </Typography>
            <Typography variant="body1" paragraph>
              We implement appropriate technical and organizational security measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or destruction. 
              However, no method of transmission over the internet or electronic storage is 100% secure. 
              While we strive to use commercially acceptable means to protect your information, we 
              cannot guarantee absolute security.
            </Typography>
            <Typography variant="body1" paragraph>
              We use industry-standard encryption for data transmission and secure authentication 
              through AWS Cognito. Payment information is processed through secure, PCI-compliant 
              third-party payment processors and is not stored on our servers.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Your Rights and Choices
            </Typography>
            <Typography variant="body1" paragraph>
              You have the following rights regarding your personal information:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li>
                <Typography variant="body1" component="span">
                  <strong>Access:</strong> You can access and update your account information through 
                  your dashboard settings
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  <strong>Correction:</strong> You can correct inaccurate information by editing your 
                  profile or listings
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  <strong>Deletion:</strong> You can request deletion of your account and associated 
                  data by contacting us
                </Typography>
              </li>
              <li>
                <Typography variant="body1" component="span">
                  <strong>Opt-out:</strong> You can opt out of marketing communications by updating 
                  your preferences or unsubscribing from emails
                </Typography>
              </li>
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Cookies and Tracking Technologies
            </Typography>
            <Typography variant="body1" paragraph>
              We use cookies and similar tracking technologies to enhance your experience, analyze 
              usage patterns, and provide personalized content. You can control cookie preferences 
              through your browser settings, though disabling cookies may limit some functionality.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Children's Privacy
            </Typography>
            <Typography variant="body1" paragraph>
              Our service is not intended for individuals under the age of 18. We do not knowingly 
              collect personal information from children. If you become aware that a child has provided 
              us with personal information, please contact us, and we will take steps to delete such 
              information.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              International Data Transfers
            </Typography>
            <Typography variant="body1" paragraph>
              Your information may be transferred to and processed in countries other than your country 
              of residence. These countries may have data protection laws that differ from those in 
              your country. By using our service, you consent to the transfer of your information 
              to these countries.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Changes to This Privacy Policy
            </Typography>
            <Typography variant="body1" paragraph>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the "Last updated" date. 
              You are advised to review this Privacy Policy periodically for any changes.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Contact Us
            </Typography>
            <Typography variant="body1" paragraph>
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Email:</strong> info@artzyla.com
            </Typography>
            <Typography variant="body1">
              <strong>Website:</strong> <a href="/contact" style={{ color: 'inherit' }}>Contact Page</a>
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            This Privacy Policy is effective as of the date listed above and applies to all users of 
            the ArtZyla marketplace platform.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Privacy;

