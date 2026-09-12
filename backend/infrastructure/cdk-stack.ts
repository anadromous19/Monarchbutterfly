/**
 * AWS CloudFormation / CDK Infrastructure Stack for Monarch Citizen Science Backend
 * Defines: Cognito Identity Pool, DynamoDB Table, S3 Evidence Bucket, AppSync API, and IAM Roles.
 */

export interface MonarchStackProps {
  environmentName: 'dev' | 'staging' | 'prod';
}

export class MonarchInfrastructureStack {
  readonly environment: string;

  constructor(props: MonarchStackProps) {
    this.environment = props.environmentName;
  }

  getTemplate() {
    return {
      AWSTemplateFormatVersion: '2010-09-09',
      Description: `Monarch Citizen Science Cloud Infrastructure (${this.environment})`,
      Parameters: {
        EnvironmentName: {
          Type: 'String',
          Default: this.environment,
          AllowedValues: ['dev', 'staging', 'prod'],
          Description: 'Deployment environment identifier',
        },
      },
      Resources: {
        // 1. Cognito Identity Pool for guest / unauthenticated access
        MonarchIdentityPool: {
          Type: 'AWS::Cognito::IdentityPool',
          Properties: {
            IdentityPoolName: `monarch_identities_${this.environment}`,
            AllowUnauthenticatedIdentities: true,
          },
        },

        // 2. IAM Role for Unauthenticated Guests
        MonarchUnauthRole: {
          Type: 'AWS::IAM::Role',
          Properties: {
            RoleName: `monarch-unauth-role-${this.environment}`,
            AssumeRolePolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: {
                    Federated: 'cognito-identity.amazonaws.com',
                  },
                  Action: 'sts:AssumeRoleWithWebIdentity',
                  Condition: {
                    StringEquals: {
                      'cognito-identity.amazonaws.com:aud': {
                        Ref: 'MonarchIdentityPool',
                      },
                    },
                    'ForAnyValue:StringLike': {
                      'cognito-identity.amazonaws.com:amr': 'unauthenticated',
                    },
                  },
                },
              ],
            },
            Policies: [
              {
                PolicyName: 'MonarchGuestAccessPolicy',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Effect: 'Allow',
                      Action: ['appsync:GraphQL'],
                      Resource: '*',
                    },
                  ],
                },
              },
            ],
          },
        },

        // 3. Attach Unauthenticated IAM Role to Cognito Identity Pool
        MonarchIdentityPoolRoleAttachment: {
          Type: 'AWS::Cognito::IdentityPoolRoleAttachment',
          Properties: {
            IdentityPoolId: { Ref: 'MonarchIdentityPool' },
            Roles: {
              unauthenticated: { 'Fn::GetAtt': ['MonarchUnauthRole', 'Arn'] },
            },
          },
        },

        // 4. DynamoDB Metadata Table (Single-table design: PK=OBS#<id>, SK=META)
        MonarchObservationTable: {
          Type: 'AWS::DynamoDB::Table',
          Properties: {
            TableName: `monarch_observations_${this.environment}`,
            BillingMode: 'PAY_PER_REQUEST',
            AttributeDefinitions: [
              { AttributeName: 'PK', AttributeType: 'S' },
              { AttributeName: 'SK', AttributeType: 'S' },
              { AttributeName: 'ownerIdentityId', AttributeType: 'S' },
              { AttributeName: 'capturedAt', AttributeType: 'S' },
            ],
            KeySchema: [
              { AttributeName: 'PK', KeyType: 'HASH' },
              { AttributeName: 'SK', KeyType: 'RANGE' },
            ],
            GlobalSecondaryIndexes: [
              {
                IndexName: 'GSI_OwnerTimeline',
                KeySchema: [
                  { AttributeName: 'ownerIdentityId', KeyType: 'HASH' },
                  { AttributeName: 'capturedAt', KeyType: 'RANGE' },
                ],
                Projection: {
                  ProjectionType: 'ALL',
                },
              },
            ],
            SSESpecification: {
              SSEEnabled: true,
            },
            PointInTimeRecoverySpecification: {
              PointInTimeRecoveryEnabled: true,
            },
          },
        },

        // 5. Private S3 Evidence Bucket with CORS for direct uploads
        MonarchEvidenceBucket: {
          Type: 'AWS::S3::Bucket',
          Properties: {
            BucketName: {
              'Fn::Sub': 'monarch-evidence-${AWS::AccountId}-${EnvironmentName}',
            },
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              BlockPublicPolicy: true,
              IgnorePublicAcls: true,
              RestrictPublicBuckets: true,
            },
            BucketEncryption: {
              ServerSideEncryptionConfiguration: [
                {
                  ServerSideEncryptionByDefault: {
                    SSEAlgorithm: 'AES256',
                  },
                },
              ],
            },
            CorsConfiguration: {
              CorsRules: [
                {
                  AllowedHeaders: ['*'],
                  AllowedMethods: ['PUT', 'GET', 'HEAD'],
                  AllowedOrigins: ['*'],
                  MaxAge: 3000,
                },
              ],
            },
          },
        },

        // 6. AWS AppSync GraphQL API
        MonarchAppSyncApi: {
          Type: 'AWS::AppSync::GraphQLApi',
          Properties: {
            Name: `monarch-api-${this.environment}`,
            AuthenticationType: 'AWS_IAM',
            AdditionalAuthenticationProviders: [
              {
                AuthenticationType: 'API_KEY',
              },
            ],
          },
        },

        // 7. AppSync Default API Key
        MonarchAppSyncApiKey: {
          Type: 'AWS::AppSync::ApiKey',
          Properties: {
            ApiId: { 'Fn::GetAtt': ['MonarchAppSyncApi', 'ApiId'] },
            Description: `Default API Key for Monarch API (${this.environment})`,
          },
        },
      },

      // CloudFormation Outputs (These directly map to the .env file variables!)
      Outputs: {
        Region: {
          Description: 'AWS Region for EXPO_PUBLIC_AWS_REGION',
          Value: { Ref: 'AWS::Region' },
          Export: { Name: `MonarchRegion-${this.environment}` },
        },
        AppSyncUrl: {
          Description: 'AppSync GraphQL Endpoint for EXPO_PUBLIC_APPSYNC_URL',
          Value: { 'Fn::GetAtt': ['MonarchAppSyncApi', 'GraphQLUrl'] },
          Export: { Name: `MonarchAppSyncUrl-${this.environment}` },
        },
        IdentityPoolId: {
          Description: 'Cognito Identity Pool ID for EXPO_PUBLIC_IDENTITY_POOL_ID',
          Value: { Ref: 'MonarchIdentityPool' },
          Export: { Name: `MonarchIdentityPoolId-${this.environment}` },
        },
        S3EvidenceBucket: {
          Description: 'S3 Evidence Bucket Name for EXPO_PUBLIC_S3_EVIDENCE_BUCKET',
          Value: { Ref: 'MonarchEvidenceBucket' },
          Export: { Name: `MonarchEvidenceBucket-${this.environment}` },
        },
      },
    };
  }
}
