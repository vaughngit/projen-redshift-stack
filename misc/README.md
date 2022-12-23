## Install commands:
    version version 
        lsb_release -a
    
### yarn: 
    npm install --global yarn

### upgrade nmp if nessary: 
    npm install -g npm@9.2.0  

### AWS CDK
	npm update -g aws-cdk

### projen 
    npm install -g projen@latest 
    mkdir awesome-cdk-construct 
    cd awesome-cdk-construct
    npx projen new
    npx projen new awscdk-construct
    npx projen test

## Resources:
    Projen API Reference: https://projen.io/

    Enable GitHub Upgrade-Main Action: https://github.com/projen/projen/blob/main/docs/github.md (PROJEN_GITHUB_TOKEN)
    GitHub Workflow upgrade automation:
        https://www.sentiatechblog.com/building-shareable-cdk-constructors-using-projen
        GitHub API access: https://projen.io/github.html#github-api-access
        
    
    *Publishing to AWS CodeArtifact: https://github.com/projen/projen/blob/main/docs/publisher.md
### Setup NuGet Release 
    Building a NuGet Package: https://code-maze.com/dotnet-nuget-create-publish/
    Nuget: https://www.nuget.org/packages/construct.ssm.parameter
#### install dotnet on unbuntu: 
            https://docs.microsoft.com/en-us/windows-server/administration/linux-package-repository-for-microsoft-software
            https://ubuntu.pkgs.org/20.04/microsoft-prod-amd64/netstandard-targeting-pack-2.1_2.1.0-1_amd64.deb.html

            Ubuntu 18.04 (Bionic)
                curl -sSL https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
                sudo apt-add-repository https://packages.microsoft.com/ubuntu/18.04/prod
                sudo apt-get update
            Ubuntu 20.04 (Focal)
                curl -sSL https://packages.microsoft.com/keys/microsoft.asc | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc
                sudo apt-add-repository https://packages.microsoft.com/ubuntu/20.04/prod
                sudo apt-get update

            sudo apt-get install netstandard-targeting-pack-2.1
            wget https://packages.microsoft.com/config/ubuntu/22.10/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
            sudo dpkg -i packages-microsoft-prod.deb
            rm packages-microsoft-prod.deb
            sudo apt-get update && sudo apt-get install -y dotnet-sdk-6.0
### Setup NPM release 
    NPM: https://www.npmjs.com/

    Steps For Creating a New CDK Construct Using projen: https://github.com/seeebiii/projen-test#publishing-to-different-repositories
    
    Create and Publish CDK Constructs Using projen and jsii (good documention for nuget, github, pypi, npm release): https://github.com/seeebiii/projen-test
    
    A Beginner's Guide to Create AWS CDK Construct Library with projen: https://dev.to/aws-builders/a-beginner-s-guide-to-create-aws-cdk-construct-library-with-projen-5eh4 

    Generate Python, Java, and .NET software libraries from a TypeScript source: https://aws.amazon.com/blogs/opensource/generate-python-java-dotnet-software-libraries-from-typescript-source/

    Authoring Polyglot AWS CDK Constructs Using JSII: https://medium.com/aws-tip/authoring-polyglot-aws-cdk-constructs-using-jsii-be0ed66e9910

## misc
    

    resetup path: 
        export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
        export PATH=~/.npm-global/bin:$PATH
        source ~/.profile 

### Setup Python Release:
    https://pypi.org/account/register/
    https://github.com/cdklabs/publib#pypi
    https://constructs.dev/contribute
    
	ls /usr/bin/python*

    sudo apt update
    sudo apt install software-properties-common
    sudo add-apt-repository ppa:deadsnakes/ppa
    sudo apt update
    sudo apt install python3.8
    wget https://bootstrap.pypa.io/get-pip.py -P /tmp
    python3.8 /tmp/get-pip.py

    virtualenv --version
    sudo apt-get install python3-venv

    sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.8 10
    sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.8 10  


    Fix: 
    pip install setuptools==65.6.3   
    sudo apt-get install python3.8-venv 
    sudo apt-get purge python* && sudo apt-get autoclean && sudo apt-get install python3*
    sudo apt-get install --fix-broken


    sudo apt install build-essential zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev libssl-dev libreadline-dev libffi-dev wget




## References:
    github Secrets to capture: 
        NPM_TOKEN
        NUGET_API_KEY
        code artifact: 
            AWS_ACCESS_KEY_ID
            AWS_SECRET_ACCESS_KEY
    
    yarn build
        Run yarn build and compile TypeScript to the jsii module.
        jsii-docgen (https://github.com/aws/jsii-docgen) generates API documentation (API.md) from comments in the code.
        In addition, jsii-pacmak (https://github.com/aws/jsii/tree/main/packages/jsii-pacmak) creates language-specific public packages in the dist directory.

    cdk synth --app='./lib/integ.default.js'
    cdk deploy --app='./lib/integ.default.js'
        Once the build is successful its ready to deploy locally.

    git add . 
    git commit -m "feat: initial release"
        projen automatically performs semantic versioning based on Conventional Commits (https://www.conventionalcommits.org/en/v1.0.0/).
        
        For example:
            fix: bump PATCH version (v0.0.1)
            feat: bump MINOR version (v0.1.0)
            MAJOR version must be explicitly bumped by adding majorVersion: x to .projenrc.js to protect users from critical changes.


