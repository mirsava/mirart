import { Amplify } from 'aws-amplify';

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_c9TqRAcz9',
      userPoolClientId: '61f349846lsiienqlbo79gk5t4', // Make sure this matches your new User Pool's App Client ID
      loginWith: {
        email: true,
        username: true,
        phone: false,
      },
      signUpVerificationMethod: 'code' as const,
    }
  }
};

// Clear any existing configuration and reconfigure
Amplify.configure(awsConfig, { ssr: true });

export default awsConfig;
