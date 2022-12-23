//import {App, Stack, Tags, StackProps, CfnOutput,  Duration, RemovalPolicy, Fn, custom_resources as cr, CustomResource} from 'aws-cdk-lib';
import { Cluster, ClusterType } from '@aws-cdk/aws-redshift-alpha';
import { Stack, Tags, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
//import {aws_ssm as ssm } from 'aws-cdk-lib'
import { Construct } from 'constructs';
//import * as ec2 from 'aws-cdk-lib/aws-ec2';
//import * as fs from 'fs';
//import { aws_lambda as lambda } from 'aws-cdk-lib';
//import * as path from 'path';

export interface IStackProps extends StackProps {
  environment: string;
  costcenter: string;
  solution: string;
  appName: string;
  redShiftMasterUsername: string;
  // codecommit: codecommit.Repository;
}


export class AwsTsRedshiftStack extends Stack {
  constructor(scope: Construct, id: string, props: IStackProps) {
    super(scope, id, props);
    /*
    const vpc = new Vpc(this, `${props.appName}-vpc`, {
      vpcName: `${props.appName}-vpc`,
      maxAzs: 1
    });
     */

    //  const vpcId = ssm.StringParameter.valueFromLookup(this, '/ergon/dev/vpcId');
    // const vpc = Vpc.fromLookup(this, `${props.appName}-vpc`, {vpcId: vpcId.toString()})

    const vpc = Vpc.fromLookup(this, `${props.appName}-vpc`, { isDefault: true });

    /*
    const vpc = Vpc.fromVpcAttributes(this, `${props.appName}-vpc`, {
      vpcId: Fn.importValue('ergon:dev:VPCID:us-east-2').toString(),
      availabilityZones: [
        Fn.importValue(`ergon:PrivateSubnet1`),
        Fn.importValue(`ergon:PrivateSubnet2`)
      ]
    }) */


    //Redshift needs a role so that it can consume that role to download data from S3 bucket
    const redshiftDataBucket = new s3.Bucket(this, 'RedshiftDataBucket', {
      bucketName: `${props.appName}-${this.account}-${this.region}-redshift-data`,
      removalPolicy: RemovalPolicy.DESTROY,
      eventBridgeEnabled: true,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      //notificationsHandlerRole: RoleForS3ToInvokeLambda,
      //encryption: s3.BucketEncryption.KMS,
      //encryptionKey: encryptionKey,
      lifecycleRules: [
        {
          // 👇 optionally apply object name filtering
          // prefix: 'data/',
          abortIncompleteMultipartUploadAfter: Duration.days(30),
          expiration: Duration.days(365),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: Duration.days(60),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: Duration.days(180),
            },
          ],
        },
      ],
    });


    const redShiftRole = new iam.Role(this, 'redShiftRole', {
      roleName: `${props.solution}-redShiftRole-${props.environment}`,
      description: 'Grants permission to redshift cluster.',
      assumedBy: new iam.ServicePrincipal('redshift.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSGlueConsoleFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRedshiftFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });
    redshiftDataBucket.grantRead(redShiftRole);

    // 👇 Create Trust Entity Policies:
    redShiftRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('sagemaker.amazonaws.com')],
        actions: ['sts:AssumeRole'],
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('events.amazonaws.com')],
        actions: ['sts:AssumeRole'],
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('scheduler.redshift.amazonaws.com')],
        actions: ['sts:AssumeRole'],
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountRootPrincipal()],
        actions: ['sts:AssumeRole'],
      }),
    );


    //create multi-node cluster with 2 compute nodes type DC2_LARGE (as default)
    //masterUser is created with password stored in secret manager (as default option)

    new Cluster(this, `${props.appName}-cluster-demo`, {
      clusterName: `${props.appName}-demo`,
      vpc: vpc,
      masterUser: {
        masterUsername: props.redShiftMasterUsername,
      },
      numberOfNodes: 2,
      clusterType: ClusterType.MULTI_NODE,
      removalPolicy: RemovalPolicy.DESTROY,
      roles: [redShiftRole],
      loggingProperties: {
        loggingBucket: redshiftDataBucket,
        loggingKeyPrefix: 'redshiftLogs/',
      },

    });


    /*
    //custom resource function:
    const LambdaPopulateSSMParameter = new lambda.Function(this, 'LambdaPopulateSSMParameter', {
      functionName: `${this.stackName}-PopulateSSMParameter`,
     code: lambda.Code.fromAsset(path.join(__dirname, "../sourceCode/lambda/LambdaPopulateSSMParameter/")),
     // memorySize: 1024,
      handler: "index.lambda_handler",
      timeout: Duration.seconds(60),
     // layers: [awssdk, datefnstz, nanopackage, uuidpackage],
      role: LambdaTwitterPermission,
      runtime: lambda.Runtime.PYTHON_3_8,
      environment: {
        TWITTER_MENTION_USER: TwitterMentionUser
      },
    });


    const provider = new cr.Provider(this, "Provider", {
      onEventHandler: LambdaPopulateSSMParameter,
      //role: LambdaTwitterPermission
    });

    //Custom Resource 1:
    new CustomResource(this, "CustomResource", {
      serviceToken: provider.serviceToken,
       properties: {
        BearerToken: BearerToken.secretArn,
        TwitterUser: TwitterUser.parameterName,
        tags:[  {Key: "service", Value: props.serviceName},{Key: "environment", Value: props.environment}, {Key: "solution", Value: props.solution},{Key: "costcenter", Value: props.costcenter}    ]

      },
    });


 */
    /*
    const clusterSg = cluster.connections.securityGroups[0];
    clusterSg.addIngressRule(clusterSg,  ec2.Port.allTcp(), "Allow internal access Redshift");

    const rsclient = new ec2.Instance(this, `${props.appName}-psql`, {
      instanceName: `${props.appName}-psql`,
      vpc: vpc,
      securityGroup: clusterSg,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: new ec2.AmazonLinuxImage({generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2}),
      role: new iam.Role(this, `${props.appName}-ec2-ssm`, {
        roleName: `${props.appName}-ec2-ssm`,
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [{managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'}]
      })
    });

    const userData = fs.readFileSync(path.join(__dirname, './user-data.sh'), 'utf8');
    rsclient.addUserData(userData);

 */
    Tags.of(this).add('solution', props.solution);
    Tags.of(this).add('environment', props.environment);
    Tags.of(this).add('costcenter', props.costcenter);

    new CfnOutput(this, 'ReShiftSqlWorkbenchRrl', { value: `https://${this.region}.console.aws.amazon.com/sqlworkbench/home?region=${this.region}#/client`, description: 'The RedShift SQL Workbench Url' });

    //https://us-east-2.console.aws.amazon.com/sqlworkbench/home?region=us-east-2#/client

  }
}
