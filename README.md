## Install packages
sudo yum update -y

sudo yum install git -y

sudo yum install -y java-1.8.0-amazon-corretto.x86_64

sudo yum install -y xorg-x11-server-Xvfb.x86_64

## Install npm, yarn
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

. ~/.nvm/nvm.sh

nvm install --lts

npm install -g yarn

## Setup environment variable
export DISPLAY=:99

## Clone repo and install
git clone https://github.com/jhso-dev/zed-floor-plan-screenshot.git

## Excute floor-plan-generator.js
node floor-plan-generator.js "csv/1.csv"
