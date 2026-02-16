# AWS Credentials Setup for Cognito Groups

To enable the backend to fetch user groups from Cognito, you need to configure AWS credentials.

## Option 1: Environment Variables (Recommended for Development)

Add these to your `backend/.env` file:

```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_c9TqRAcz9
```

## Option 2: AWS Credentials File

Create or edit `~/.aws/credentials` (on Windows: `C:\Users\YourUsername\.aws\credentials`):

```ini
[default]
aws_access_key_id = your_access_key_here
aws_secret_access_key = your_secret_key_here
```

And `~/.aws/config`:

```ini
[default]
region = us-east-1
```

## Option 3: Configure Cognito to Include Groups in ID Token (Alternative)

If you don't want to configure AWS credentials, you can configure Cognito to include groups in the ID token:

1. Go to AWS Cognito Console
2. Select your User Pool
3. Go to "App integration" → "App client"
4. Click on your app client
5. Under "Token expiration", click "Edit"
6. Under "OpenID Connect scopes", ensure "openid" and "groups" are selected
7. Under "Attribute read permissions", ensure groups are included
8. Save changes

After this, users will need to sign out and sign back in to get a fresh token with groups included.

## Getting AWS Credentials

1. Go to AWS IAM Console
2. Create a new user or use an existing one
3. Attach a policy that allows Cognito access:
   - `AmazonCognitoPowerUser` (for full access)
   - Or create a custom policy with:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "cognito-idp:AdminListGroupsForUser",
             "cognito-idp:AdminDeleteUser"
           ],
           "Resource": "arn:aws:cognito-idp:us-east-1:*:userpool/us-east-1_c9TqRAcz9"
         }
       ]
     }
     ```
4. Create access keys for the user
5. Use those keys in your `.env` file




