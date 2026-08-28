# ephjos.com

Deployed using AWS Amplify from S3.

## fonts

now using a licensed font. gitignored per the license, will require placing file
from personal backup into repo to work. `.woff2` files go directly in
`public/00-assets`.

## aws

```shell
# install aws-cli
# create new IAM access key
aws configure
aws sts get-caller-identity
```
