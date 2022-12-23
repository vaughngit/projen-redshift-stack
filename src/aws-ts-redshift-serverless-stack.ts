import {Stack, Tags, StackProps, CfnOutput,  Duration, RemovalPolicy,  custom_resources as cr, CustomResource} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {SubnetType}  from 'aws-cdk-lib/aws-ec2'
import * as s3 from 'aws-cdk-lib/aws-s3'
import {aws_ssm as ssm } from 'aws-cdk-lib' 
import * as iam from 'aws-cdk-lib/aws-iam'
import * as redshiftserverless from 'aws-cdk-lib/aws-redshiftserverless'
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import * as path from 'path';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';


export interface IStackProps extends StackProps {
  environment: string; 
  costcenter: string; 
  solution: string;
  appName: string; 
  redShiftMasterUsername: string; 
  rssnamespace: string
  rssworkgroup: string 
 // codecommit: codecommit.Repository;
}


export class RedshiftServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props: IStackProps) {
    super(scope, id, props);
/* 
    const vpc = new Vpc(this, `${props.appName}-vpc`, {
      vpcName: `${props.appName}-vpc`,
      maxAzs: 1
    });    
     */

    const natGatewayProvider = ec2.NatProvider.instance({
      instanceType: new ec2.InstanceType('t3.nano')
    })


  // Create new VPC
  const vpc = new ec2.Vpc(this, `${props.solution}-VPC`, { 
    vpcName: props.solution,
    natGatewayProvider: natGatewayProvider,
    maxAzs: 4,
    cidr: "172.16.0.0/16",
    natGateways: 2,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    subnetConfiguration: [
      {
        name: `${props.solution}-ingress-1`,
        cidrMask: 24,
        mapPublicIpOnLaunch: true,
        subnetType: ec2.SubnetType.PUBLIC
      },
      {
        name: `${props.solution}-ingress-2`,
        cidrMask: 24,
        mapPublicIpOnLaunch: true,
        subnetType: ec2.SubnetType.PUBLIC,
      },
      {
        name: `${props.solution}-ingress-3`,
        cidrMask: 24,
        mapPublicIpOnLaunch: true,
        subnetType: ec2.SubnetType.PUBLIC,
      },
      {
        name: `${props.solution}-selfmanaged-1`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      {
        name: `${props.solution}-selfmanaged-2`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      {
        name: `${props.solution}-selfmanaged-3`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      {
        name: `${props.solution}-awsmanaged-1`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      {
        name: `${props.solution}-awsmanaged-2`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      {
        name: `${props.solution}-awsmanaged-3`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }
    ]
  });

  // VPCID SSM Param
  new ssm.StringParameter(this, 'vpcid ssm param', {
    parameterName: `/${props.solution}/${props.environment}/vpcId`,
    stringValue: vpc.vpcId,
    description: `param for ${props.solution} vpcid`,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.INTELLIGENT_TIERING,
    allowedPattern: '.*',
  });

    //EC2 Security Group 
    const ec2SG = new ec2.SecurityGroup(this, `EC2-SG`, { 
        vpc,
        description: `${props.solution} EC2 ${props.environment} SecurityGroup`,
        securityGroupName: `${props.solution}-EC2-${props.environment}-SG`,  
    });
    ec2SG.addIngressRule(ec2SG,ec2.Port.allTraffic(), 'allow all east/west traffic inside security group');

    // createSsmParam.standardStringParameter(ecsSgSsmParam, ecsSG.securityGroupId); 
    new ssm.StringParameter(this, 'ec2 sg ssm param', {
        parameterName: `/${props.solution}/${props.environment}/ec2SgId`,
        stringValue: ec2SG.securityGroupId,
        description: `param for ${props.solution} ec2 security group id`,
        type: ssm.ParameterType.STRING,
        tier: ssm.ParameterTier.INTELLIGENT_TIERING,
        allowedPattern: '.*',
    });


    // S3 Gateway Endpoint 
    vpc.addGatewayEndpoint('s3GatewayEndpoint', {
        service: ec2.GatewayVpcEndpointAwsService.S3,
        // Add only to ISOLATED subnets
        subnets: [
          { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
          { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
        ]
    });

    // DynamoDb Gateway endpoint
    vpc.addGatewayEndpoint('DynamoDbEndpoint', {
        service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        // Add only to ISOLATED subnets
        subnets: [
        { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
        ]
    });

    // Add an interface endpoint
    vpc.addInterfaceEndpoint('SystemsManagerEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SSM,
        // Uncomment the following to allow more fine-grained control over
        // who can access the endpoint via the '.connections' object.
        // open: false
        lookupSupportedAzs: true,
        open: true,
        securityGroups:[ec2SG]
    });
    

    // CloudWatch interface endpoint
    vpc.addInterfaceEndpoint('CloudWatchEndpoint', {
    service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH,
    // Uncomment the following to allow more fine-grained control over
    // who can access the endpoint via the '.connections' object.
    // open: false
    lookupSupportedAzs: true,
    open: true,
    securityGroups: [ec2SG]
    });

    // CW Events interface endpoint
    vpc.addInterfaceEndpoint('CloudWatch_Events_Endpoint', {
    service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_EVENTS,
    // Uncomment the following to allow more fine-grained control over
    // who can access the endpoint via the '.connections' object.
    // open: false
    lookupSupportedAzs: true,
    open: true,
    securityGroups: [ec2SG]
    });

    // CW Logs interface endpoint
    vpc.addInterfaceEndpoint('CloudWatch_Logs_Endpoint', {
    service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    // Uncomment the following to allow more fine-grained control over
    // who can access the endpoint via the '.connections' object.
    // open: false
    lookupSupportedAzs: true,
    open: true,
    securityGroups: [ec2SG]
    });

    // ECR interface endpoint
    vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      // Uncomment the following to allow more fine-grained control over
      // who can access the endpoint via the '.connections' object.
      // open: false
      securityGroups: [ec2SG],
      lookupSupportedAzs: true,
      open: true
    });

    // EFS interface endpoint
    vpc.addInterfaceEndpoint('EFSEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ELASTIC_FILESYSTEM,
      // Uncomment the following to allow more fine-grained control over
      // who can access the endpoint via the '.connections' object.
      // open: false
      lookupSupportedAzs: true,
      open: true,
    });
/* 
    new ec2.InterfaceVpcEndpoint(this, "efs endpoint", { 
      vpc,
      service: new ec2.InterfaceVpcEndpointService(`com.amazonaws.${this.region}.elasticfilesystem`, 2049),
      securityGroups: [ecsSG],
      open: true ,
      lookupSupportedAzs: true 
    }) 
*/
 
  // Configure Cloudwatch Log group: 
  const logGroup = new LogGroup(
    this, `create solution Log group`,
    {
      logGroupName: `/${props.solution}/${props.environment}/`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_MONTH,
    }
  );

  //CW Log group SSM Param 
  new ssm.StringParameter(this, 'log group name ssm param', {
    parameterName: `/${props.solution}/${props.environment}/logGroupName`,
    stringValue: logGroup.logGroupName,
    description: `param for ${props.solution} log group name`,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.INTELLIGENT_TIERING,
    allowedPattern: '.*',
  });

  /* 
  const vpcFlowlogsRole = new iam.Role(this, `${props.solutionName}-role-for-vpcflowlogs`, {
    assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com')
  });
  
  new ec2.FlowLog(this, 'FlowLog', {
    flowLogName: `${props.solutionName}-${props.environment}-vpclogs`,
    resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
    trafficType: ec2.FlowLogTrafficType.ALL,
    destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup, vpcFlowlogsRole)
  }); */



  const sdk3layer = new lambda.LayerVersion(this, 'HelperLayer', {
    layerVersionName: `${props.solution}-${props.environment}`,
    code: lambda.Code.fromAsset('assets/lambda/lambda-layer/aws-sdk-3-layer'),
    description: 'AWS JS SDK v3',
    compatibleRuntimes: [lambda.Runtime.NODEJS_16_X,lambda.Runtime.NODEJS_14_X],
    removalPolicy: RemovalPolicy.DESTROY,
  });


  const crLambda = new NodejsFunction(this, `${props.solution}-${props.appName}-customResourceFunction-${props.environment}`, {
    functionName: `${props.solution}-${props.appName}-update-infrastructure-${props.environment}`,
    entry: path.join(__dirname, `/../assets/lambda/customResourceLambda/index.ts`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'handler',
    timeout: Duration.minutes(10),
    layers: [sdk3layer],
    environment: {
      REGION: this.region
    },
    bundling: {
      minify: true,
      externalModules: ['aws-sdk','@aws-sdk/client-iam','@aws-sdk/client-ec2'],
    },
  });

  const provider = new cr.Provider(this, "Provider", {
    onEventHandler: crLambda,
  });

  provider.onEventHandler.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ["iam:*", "ec2:*"],
      effect: iam.Effect.ALLOW,
      resources: [ `*`],
    })
  );

// add tag to interface gateways and manage nat gateway: 
  new CustomResource(this, "CustomResource", {
    serviceToken: provider.serviceToken,
    properties: {
      natGateways: natGatewayProvider.configuredGateways,
      vpcId: vpc.vpcId,
      tags:[  {Key: "service", Value: props.appName},{Key: "environment", Value: props.environment}, {Key: "solution", Value: props.solution},{Key: "costcenter", Value: props.costcenter}    ]
      
    },
  });
    
  //  const vpcId = ssm.StringParameter.valueFromLookup(this, '/ergon/dev/vpcId');
  // const vpc = Vpc.fromLookup(this, `${props.appName}-vpc`, {vpcId: vpcId.toString()})

/*     
    const vpc = Vpc.fromVpcAttributes(this, `${props.appName}-vpc`, {
      vpcId: Fn.importValue('ergon:dev:VPCID:us-east-2').toString(),
      availabilityZones: [
        Fn.importValue(`ergon:PrivateSubnet1`),
        Fn.importValue(`ergon:PrivateSubnet2`)
      ]
    }) */


    //Redshift needs a role so that it can consume that role to download data from S3 bucket
    const redshiftDataBucket = new s3.Bucket(this, 'RedshiftServerlssDataBucket', {
      bucketName: `${props.appName}-${this.account}-${this.region}-redshift-serverless-data`,
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
            }
          ],
        },
      ],
    });


    const redShiftRole = new iam.Role(this, "redShiftServerlessRole", {
      roleName: `${props.solution}-redShiftRole-serverless-${props.environment}`,
      description: "Grants permission to redshift serverless.",
      assumedBy: new iam.ServicePrincipal("redshift.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSGlueConsoleFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonRedshiftFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
      ],
    })
    redshiftDataBucket.grantRead(redShiftRole);    

    // 👇 Create Trust Entity Policies:
    redShiftRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [ new iam.ServicePrincipal("sagemaker.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [ new iam.ServicePrincipal("events.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      }), 
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [ new iam.ServicePrincipal("scheduler.redshift.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      }), 
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [ new iam.AccountRootPrincipal()],
        actions: ["sts:AssumeRole"],
      }), 
    )




        
    new redshiftserverless.CfnNamespace(this, 'RedShiftServerlessNamespace', {
      namespaceName: props.rssnamespace,
      // the properties below are optional
      adminUsername: props.redShiftMasterUsername,
      adminUserPassword: 'Awsuser123',
      dbName: 'rssdb',
      defaultIamRoleArn: redShiftRole.roleArn,
      finalSnapshotName: 'rssfinalSnapshotName',
      finalSnapshotRetentionPeriod: 30,
      iamRoles: [redShiftRole.roleArn],
     // kmsKeyId: 'kmsKeyId',
     // logExports: ['logExports'],
    //  tags: [{
    //    key: 'key',
    //    value: 'value',
    //  }],
    });


   const subnet_ids = vpc.selectSubnets({subnetType: SubnetType.PRIVATE_WITH_EGRESS}).subnetIds;

  // console.log(vpc.selectSubnets({subnetType: SubnetType.PRIVATE_WITH_EGRESS}).availabilityZones)
  // console.log(...subnet_ids)

  new redshiftserverless.CfnWorkgroup(this, 'serverlessWorkgroup', {
      workgroupName: props.rssworkgroup,
     
      // the properties below are optional
      namespaceName: props.rssnamespace,
      subnetIds: [...subnet_ids],
  /*
      baseCapacity: 123,
      configParameters: [{
        parameterKey: 'parameterKey',
        parameterValue: 'parameterValue',
      }],
      enhancedVpcRouting: false,
      publiclyAccessible: false,
      securityGroupIds: ['securityGroupIds'],
      tags: [{
        key: 'key',
        value: 'value',
      }],
 */

    });


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
  Tags.of(this).add("solution", props.solution)
  Tags.of(this).add("environment", props.environment)
  Tags.of(this).add("costcenter", props.costcenter)

  new CfnOutput(this, 'ReShiftSqlWorkbenchRrl', { value: `https://${this.region}.console.aws.amazon.com/sqlworkbench/home?region=${this.region}#/client`,  description: 'The RedShift SQL Workbench Url'  });
  //https://us-east-2.console.aws.amazon.com/sqlworkbench/home?region=us-east-2#/client

  new CfnOutput(this, 'VPCId', { value: vpc.vpcId, exportName: `${props.solution}:${props.environment}:VPCID:${this.region}`} );

  new CfnOutput(this, 'NatGateways', { value: natGatewayProvider.configuredGateways.toString()} );
 
   new CfnOutput(this, 'VPCCIDR', { value: vpc.vpcCidrBlock, exportName: `${props.solution}:VpcCIDR`} );
 
   new CfnOutput(this, 'VPCPrivateSubnet1', { value: vpc.privateSubnets[0].subnetId, exportName: `${props.solution}:PrivateSubnet1`} );
   
   new CfnOutput(this, 'VPCPrivateSubnet2', { value: vpc.privateSubnets[1].subnetId, exportName: `${props.solution}:PrivateSubnet2`} );

   new CfnOutput(this, 'VPCPrivateSubnet3', { value: vpc.privateSubnets[2].subnetId, exportName: `${props.solution}:PrivateSubnet3`} );
 
   new CfnOutput(this, 'VPCPrivateSubnet1-AZ', { value: vpc.privateSubnets[0].availabilityZone} );
   
   new CfnOutput(this, 'VPCPrivateSubnet2-AZ', { value: vpc.privateSubnets[1].availabilityZone });

   new CfnOutput(this, 'VPCPrivateSubnet3-AZ', { value: vpc.privateSubnets[2].availabilityZone });
 
   new CfnOutput(this, 'VpcSecurityGroup', { value: ec2SG.securityGroupId, exportName: `${props.solution}:EC2SecurityGroup`} );
 
  // new CfnOutput(this, 'LogGroupName', { value: logGroup.logGroupName });
  

  }
}
