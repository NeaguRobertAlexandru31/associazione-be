import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface Props extends cdk.StackProps {
  stage: string;
}

export class DataStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly dbEndpoint: string;
  public readonly dbName: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const { stage } = props;
    this.dbName = `associazione_${stage}`;

    // VPC minimale: 2 AZ, subnet pubbliche (Lambda) e isolated (RDS), no NAT gateway
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName:            `associazione-vpc-${stage}`,
      maxAzs:             2,
      natGateways:        0,
      subnetConfiguration: [
        {
          name:       'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask:   24,
        },
        {
          name:       'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask:   24,
        },
      ],
    });

    // Security group RDS — accetta connessioni solo da dentro la VPC
    const dbSg = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc:              this.vpc,
      description:      'RDS PostgreSQL security group',
      allowAllOutbound: false,
    });

    dbSg.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'PostgreSQL dalla VPC',
    );

    // RDS PostgreSQL t4g.micro — economico, coperto dal free tier il primo anno
    const instance = new rds.DatabaseInstance(this, 'RdsInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceIdentifier:  `associazione-${stage}`,
      instanceType:        ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      databaseName:        this.dbName,
      vpc:                 this.vpc,
      vpcSubnets:          { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups:      [dbSg],
      storageEncrypted:    true,
      allocatedStorage:    20,
      maxAllocatedStorage: 50,
      deletionProtection:  stage === 'prod',
      removalPolicy: stage === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    this.dbSecret   = instance.secret!;
    this.dbEndpoint = instance.instanceEndpoint.hostname;

    new cdk.CfnOutput(this, 'DbEndpoint', {
      value:       this.dbEndpoint,
      description: 'RDS endpoint',
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value:       this.dbSecret.secretArn,
      description: 'ARN del secret con le credenziali DB',
    });
  }
}
