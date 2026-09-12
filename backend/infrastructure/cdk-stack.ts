/**
 * AWS CDK Infrastructure Stack for Monarch Citizen Science Backend
 * Architecture Document Sections 3.3, 3.4, 4.2, 4.3, 6, 7
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
      Resources: {
        // 1. Cognito Identity Pool for guest identities
        MonarchIdentityPool: {
          Type: 'AWS::Cognito::IdentityPool',
          Properties: {
            IdentityPoolName: `monarch_identities_${this.environment}`,
            AllowUnauthenticatedIdentities: true,
          },
        },

        // 2. DynamoDB Metadata Table (Single-table design: PK=OBS#<id>, SK=META)
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

        // 3. Private S3 Evidence Bucket
        MonarchEvidenceBucket: {
          Type: 'AWS::S3::Bucket',
          Properties: {
            BucketName: `monarch-evidence-${this.environment}-${Date.now().toString(36)}`,
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
      },
    };
  }
}
