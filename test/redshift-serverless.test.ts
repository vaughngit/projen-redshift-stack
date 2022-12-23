import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
//import { MyStack } from '../src/main';
import { RedshiftServerlessStack } from '../src/aws-ts-redshift-serverless-stack';

const solution = 'RedShift';
const environment = 'dev';
const costcenter = 'tnc';
const aws_region = 'us-east-2';
const appName = 'redshift';
const desc = 'Redshift Demo Stack';

// for development, use account/region from cdk cli
const devEnv = {
  account: '796072252262' || process.env.CDK_DEFAULT_ACCOUNT,
  region: aws_region || process.env.CDK_DEFAULT_REGION, //process.env.CDK_DEFAULT_REGION,
};


test('Snapshot', () => {
  const app = new App();
  //const stack = new MyStack(app, 'test');

  const stack = new RedshiftServerlessStack(app, 'serverless', {
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

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});