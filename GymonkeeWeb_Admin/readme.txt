Steps to install and run application:

Start Server : ssh -i "gymonkeeapp.pem" ec2-user@54.202.154.20

1. git clone https://gitlab.com/bypeople/gymonkee/Admin.git
2. cd Admin
3. sudo su 
4. npm install
5. pm2 start node ./bin/www ( for run application )
6. pm2 restart 0 ( for restart application )
7. pm2 kill ( for kill all the pm2 process )
8. pm2 logs ( for show logs of application )

For cronjob setup:
1. cd Cronjob
2. sudo su
3. npm install
4. pm2 start cronjob.js ( for run cronjob )
5. pm2 restart 0 ( for restart cronjob )

