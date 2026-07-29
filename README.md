# ephjos.com

Deployed using AWS Amplify from S3.

## fonts

now using licensed fonts. gitignored per the license, will require placing file
from personal backup into repo to work. `.woff2` files go directly in
`public/`.

## aws

```shell
# install aws-cli
# create new IAM access key
aws configure
aws sts get-caller-identity
```
