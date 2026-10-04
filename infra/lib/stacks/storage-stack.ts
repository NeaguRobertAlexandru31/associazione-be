import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

interface Props extends cdk.StackProps {
  stage: string;
}

export class StorageStack extends cdk.Stack {
  public readonly mediaBucket: s3.Bucket;
  public readonly mediaDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const { stage } = props;

    // Bucket privato per le immagini (eventi, articoli, progetti, avatar)
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName:        `associazione-media-${stage}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption:        s3.BucketEncryption.S3_MANAGED,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: stage === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== 'prod',
    });

    // CloudFront davanti al bucket — accesso tramite OAC (Origin Access Control)
    const oac = new cloudfront.S3OriginAccessControl(this, 'MediaOAC', {
      description: `OAC per media bucket ${stage}`,
    });

    this.mediaDistribution = new cloudfront.Distribution(this, 'MediaDistribution', {
      comment: `Associazione media CDN - ${stage}`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.mediaBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy:          cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
    });

    new cdk.CfnOutput(this, 'MediaBucketName', {
      value:       this.mediaBucket.bucketName,
      description: 'Nome S3 bucket immagini',
    });

    new cdk.CfnOutput(this, 'MediaCdnUrl', {
      value:       `https://${this.mediaDistribution.distributionDomainName}`,
      description: 'URL CDN pubblico per le immagini',
    });
  }
}
