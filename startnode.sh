#!/bin/bash 
export PATH="$PATH:/usr/local/sinasrv2/bin/:/data1/vhosts/admin.imgcdn.leju.com/htdocs/nodejs/node_modules/forever/bin/"
ulimit -c unlimited

cd /data1/www/data/admin.imgcdn.leju.com/newdojquery/trunk
num=$1;
for((i=0;i<$num;i++)){
      port=$(($i+8031));
      forever start -a -l /data1/www/data/admin.imgcdn.leju.com/logs.log -o /data1/www/data/admin.imgcdn.leju.com/o.log -e /data1/www/data/admin.imgcdn.leju.com/error.log /data1/vhosts/admin.imgcdn.leju.com/htdocs/nodejs/app.js $port
      #forever cleanlogs
}
exit 0;

