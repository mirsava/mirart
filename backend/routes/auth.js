import express from 'express';
import { CognitoIdentityProviderClient, AdminListGroupsForUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const router = express.Router();

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_c9TqRAcz9';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const cognitoClient = new CognitoIdentityProviderClient({ 
  region: AWS_REGION
});

router.get('/user-groups/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;

    if (!cognitoUsername) {
      return res.status(400).json({ error: 'cognitoUsername is required' });
    }

    try {
      const command = new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: cognitoUsername,
      });

      const response = await cognitoClient.send(command);
      const groups = (response.Groups || []).map(group => group.GroupName);

      res.json({ groups });
    } catch (awsError) {
      if (awsError.name === 'CredentialsProviderError' || awsError.message?.includes('credentials')) {
        console.warn('AWS credentials not configured. Groups cannot be fetched from Cognito.');
        console.warn('Please configure AWS credentials or enable groups in ID token.');
        res.status(503).json({ 
          error: 'AWS credentials not configured',
          message: 'Backend cannot fetch groups from Cognito. Please configure AWS credentials in your .env file or enable groups in Cognito ID token.',
          details: 'Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your backend .env file'
        });
      } else {
        throw awsError;
      }
    }
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user groups', 
      details: error.message 
    });
  }
});

export default router;

