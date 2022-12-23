import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
//import { AwsTsRedshiftStack } from './aws-ts-redshift-stack';
import { RedshiftServerlessStack } from './aws-ts-redshift-serverless-stack';

const solution = 'RedShift';
const environment = 'dev';
const costcenter = '12_1_12_9_20_8';
const aws_region = 'us-east-2';
const appName = 'redshift';
const desc = 'Redshift Demo Stack';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: aws_region || process.env.CDK_DEFAULT_REGION, //process.env.CDK_DEFAULT_REGION,
};

const app = new App();

//new MyStack(app, 'projen-redshift-stack-dev', { env: devEnv });
// new MyStack(app, 'projen-redshift-stack-prod', { env: prodEnv });

new RedshiftServerlessStack(app, 'serverless', {
  env: devEnv,
  stackName: `${solution}-serverless-${appName}`,
  redShiftMasterUsername: 'awsuser',
  rssnamespace: 'demoworkspaces',
  rssworkgroup: 'rssworkshop',
  appName,
  description: desc,
  solution,
  environment,
  costcenter,
  tags: {
    solution,
    environment,
    costcenter,
  },
});
/*
new AwsTsRedshiftStack(app, 'AwsTsRedshiftStack', {
  env: {account, region},
  stackName: `${solution}-${appName}`,
  redShiftMasterUsername: "awsuser",
  appName,
  description: desc,
  solution,
  environment,
  costcenter,
  tags: {
    solution,
    environment,
    costcenter
  },
});
 */


app.synth();