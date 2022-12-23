const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.56.0',
  defaultReleaseBranch: 'main',
  docgen: true,
  license: 'Apache-2.0',
  name: 'projen-redshift-stack',
  deps: ['@aws-cdk/aws-redshift-alpha'], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: ['@aws-cdk/aws-redshift-alpha'], /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
  jestOptions: {
    jestConfig: {
      moduleNameMapper: {
        ['^aws-cdk-lib/.warnings.jsii.js$']: '<rootDir>/node_modules/aws-cdk-lib/.warnings.jsii.js',
      },
    },
  },
});
project.synth();