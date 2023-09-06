#Perform a quick update on your instance:
sudo yum update -y

#Install git in your EC2 instance
sudo yum install git -y

#Check git version
git version

sudo yum install -y java-1.8.0-amazon-corretto.x86_64
sudo yum install -y xorg-x11-server-Xvfb.x86_64

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
. ~/.nvm/nvm.sh
nvm install --lts
npm install -g yarn


Xvfb :99 -screen 0 1024x768x24 &
export DISPLAY=:99



git clone https://github.com/jhso-dev/zed-floor-plan-screenshot.git


node floor-plan-generator.js "csv/1.csv"
node floor-plan-generator.js "csv/2csv"
node floor-plan-generator.js "csv/3.csv”
