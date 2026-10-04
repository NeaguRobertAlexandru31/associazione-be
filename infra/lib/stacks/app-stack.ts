import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

interface Props extends cdk.StackProps {
  stage: string;
  mediaBucket: s3.Bucket;
  mediaDistribution: cloudfront.Distribution;
  // vpc, dbSecret, dbEndpoint, dbName: rimossi — DB su Neon
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const { stage, mediaBucket, mediaDistribution } = props;

    // ── Segreti applicazione ──────────────────────────────────────────────────
    // Dopo il primo deploy, compila questi valori in AWS Secrets Manager

    const appSecret = new secretsmanager.Secret(this, 'AppSecret', {
      secretName:  `/associazione/${stage}/app`,
      description: 'Segreti applicazione NestJS',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          JWT_SECRET:                '',
          JWT_REFRESH_SECRET:        '',
          ENCRYPTION_KEY:            '',
          MAIL_FROM:                 '',
          CORS_ORIGIN:               '',
          DATABASE_URL:              '',
          STRIPE_SECRET_KEY:         '',
          STRIPE_WEBHOOK_SECRET:     '',
          STRIPE_PUBLISHABLE_KEY:    '',
          TELEGRAM_BOT_TOKEN:        '',
          TELEGRAM_CHANNEL_ID:       '',
          TELEGRAM_ADMIN_CHANNEL_ID: '',
          TELEGRAM_ADMIN_IDS:        '',
        }),
        generateStringKey: '_placeholder',
      },
    });

    // ── Lambda — NestJS via serverless-express ────────────────────────────────

    const depsLayer = new lambda.LayerVersion(this, 'BackendDepsLayer', {
      layerVersionName: `associazione-backend-deps-${stage}`,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambda-bundle/layer'),
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      description: 'node_modules per NestJS backend',
    });

    const backendFn = new lambda.Function(this, 'BackendFn', {
      functionName: `associazione-backend-${stage}`,
      runtime:      lambda.Runtime.NODEJS_22_X,
      handler:      'src/lambda.handler',
      code:         lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambda-bundle/code'),
      ),
      layers:     [depsLayer],
      timeout:    cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV:        'production',
        APP_SECRET_ARN:  appSecret.secretArn,
        S3_BUCKET:       mediaBucket.bucketName,
        CDN_URL:         `https://${mediaDistribution.distributionDomainName}`,
        AWS_REGION_NAME: this.region,
        // APP_PUBLIC_URL viene aggiunto dopo il primo deploy (URL CloudFront)
      },
    });

    appSecret.grantRead(backendFn);
    mediaBucket.grantReadWrite(backendFn);

    backendFn.addToRolePolicy(new iam.PolicyStatement({
      actions:   ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // ── API Gateway ───────────────────────────────────────────────────────────

    const api = new apigw.LambdaRestApi(this, 'ApiGateway', {
      restApiName:   `associazione-api-${stage}`,
      handler:       backendFn,
      proxy:         true,
      deployOptions: { stageName: stage },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
        allowCredentials: true,
      },
      binaryMediaTypes: ['multipart/form-data', 'image/*', 'application/octet-stream'],
    });

    // ── S3 bucket frontend Angular ────────────────────────────────────────────

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName:        `associazione-frontend-${stage}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: stage === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== 'prod',
    });

    // ── CloudFront — frontend + API ───────────────────────────────────────────

    const frontendOac = new cloudfront.S3OriginAccessControl(this, 'FrontendOAC', {
      description: `OAC frontend ${stage}`,
    });

    const apiOrigin = new origins.HttpOrigin(
      `${api.restApiId}.execute-api.${this.region}.amazonaws.com`,
      { originPath: `/${stage}` },
    );

    const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ApiOriginRequestPolicy', {
      originRequestPolicyName: `associazione-api-cookies-${stage}`,
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
        'Content-Type', 'Origin', 'Accept',
      ),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
    });

    // Cache policy: TTL=1s minimo richiesto da AWS per usare HeaderBehavior
    // Authorization in cache key → CloudFront lo forwarda all'origin senza cachare in pratica
    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `associazione-api-nocache-${stage}`,
      defaultTtl: cdk.Duration.seconds(0),
      minTtl:     cdk.Duration.seconds(0),
      maxTtl:     cdk.Duration.seconds(1),
      headerBehavior:      cloudfront.CacheHeaderBehavior.allowList('Authorization'),
      cookieBehavior:      cloudfront.CacheCookieBehavior.all(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    });

    const distribution = new cloudfront.Distribution(this, 'AppDistribution', {
      comment: `Associazione app - ${stage}`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket, {
          originAccessControl: frontendOac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy:          cloudfront.CachePolicy.CACHING_DISABLED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin:               apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy:          apiCachePolicy,
          allowedMethods:       cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy:  apiOriginRequestPolicy,
          functionAssociations: [{
            function: new cloudfront.Function(this, 'StripApiPrefix', {
              code: cloudfront.FunctionCode.fromInline(`
                function handler(event) {
                  var request = event.request;
                  request.uri = request.uri.replace(/^\\/api/, '');
                  if (request.uri === '' || request.uri === '/') request.uri = '/';
                  return request;
                }
              `),
            }),
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }],
        },
        '/telegram/*': {
          origin:               apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy:          apiCachePolicy,
          allowedMethods:       cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy:  apiOriginRequestPolicy,
        },
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    // ── SES ───────────────────────────────────────────────────────────────────

    new ses.EmailIdentity(this, 'MailIdentity', {
      identity: ses.Identity.email('neagurobertalexandru@gmail.com'),
    });

    // ── Output ────────────────────────────────────────────────────────────────

    new cdk.CfnOutput(this, 'AppUrl', {
      value:       `https://${distribution.distributionDomainName}`,
      description: 'URL pubblico app — copiare in APP_PUBLIC_URL del secret',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value:       `https://${distribution.distributionDomainName}/api`,
      description: 'URL API tramite CloudFront',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value:       frontendBucket.bucketName,
      description: 'Bucket S3 frontend Angular',
    });

    new cdk.CfnOutput(this, 'AppSecretArn', {
      value:       appSecret.secretArn,
      description: 'ARN secret — compila i valori in AWS Secrets Manager',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value:       distribution.distributionId,
      description: 'ID distribution CloudFront — serve per invalidare la cache',
    });
  }
}
