var requirejs = require('./r2.js'),
    less = require('less'),
    http = require('http'),
    fs = require('fs'),
    path = require('path'),
    uri = require('url'),
    querystring = require('querystring'),
    redis = require("redis"),
    nodemailer = require('nodemailer'),
    configure = require('./configure.js').config,
    utils = require('./utils.js').utils,
    args = process.argv.slice(2),
    host,
    rport,
    rhost,
    port = (args[0] && /^\d+$/.test(args[0])) ? parseInt(args[0]) : 8030,
    bunyan = require('bunyan');
var log = bunyan.createLogger({
    name: 'myapp',
    streams: [{
        level: 'info',
        stream: process.stdout // log INFO and above to stdout
    }, {
        level: 'error',
        path: 'logs/myapp-error.log' // log ERROR and above to a file
    }]
});

var log = bunyan.createLogger({
    name: 'jsmin'
});
// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP", {
    host: configure.mailHost, // 主机
    secureConnection: true, // 使用 SSL
    port: configure.mailPort, // SMTP 端口
    auth: {
        user: "leju_node@qq.com", // 账号
        pass: "ejubeijing" // 密码
    }
});

// setup e-mail data with unicode symbols
var mailOptions = {
    from: configure.mailFrom, // sender address
    to: configure.mailTo, // list of receivers
    subject: configure.mailSubject, // Subject line
    text: configure.mailText, // plaintext body
    html: configure.mailHtml // html body
}



http.createServer(function(req, res) {
    var JSBASE = '',
        CSSBASE = '',
        fileList = [],
        resultlist = [],
        // pattern = new RegExp("[&*()=|{}<>':'\\[\\]<>~！@#￥……&*（）——|{}【】]"),
        beginTime = new Date(),
        redis_ip = req.connection.remoteAddress;
    if (redis_ip == '172.16.244.154' || redis_ip == '172.16.244.155') {
        rhost = '172.16.244.182';
        rport = '7503';
    } else if (redis_ip == '10.71.32.154' || redis_ip == '10.71.32.155') {
        rhost = '10.71.216.72';
        rport = '7503';
    } else {
        rhost = configure.rhost;
        rport = configure.rport;
    };
    console.log("Http begin Time is :" + beginTime + "");
    // compare differents request,handle differents method
    function respond(code, contents, type, isset) {
        switch (type) {
            case 1:
                type = 'application/javascript;charset=UTF-8';
                break;
            case 2:
                type = 'text/css';
                break;
            case 0:
                type = 'text/plain';
                break;
        }
        res.writeHead(code, {
            'Content-Type': type
        });
        isset && config.set(req.url.replace(/^\//, ''), contents);
        res.write(contents, 'utf8');
        //res.end();
    }
    // less
    function lessSearchTh(rules) {
        for (var i = 0, rule; rule = rules[i]; i++) {
            //@asg: log dependency
            if (rule.importedFilename) {
                resultlist.push(rule.importedFilename.replace(/\\/g, '/'));
                console.log('now i\'m reading:', rule.importedFilename);
            }
            if (rule.root) {
                lessSearchTh(rule.root.rules);
            }
        }
    }
    /*   
     *  说明：获取客户端IP地址
     *  使用：
     *  initnode.request.getClientIp();
     */
    function getClientIp(req) {
        return req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
    };
    // configuration
    var config = {
        baseUrl: JSBASE,
        //optimize: configure.optimize,
        _dirname: configure.dirname,
        paths: {
            //Put path to require.js in here, leaving off .js
            //since it is a module ID path mapping. For final deployment,
            //if a smaller AMD loader is desired, no dynamic
            //loading needs to be done, and loader plugins are not
            //in use, change this path to that file. One possibility
            //could be the one at:
            //https://github.com/ajaxorg/ace/blob/master/build_support/mini_require.js
            requireLib: configure.requireLib,
            fullrequireLib: configure.fullrequireLib
        },
        //name: 'requireLib',
        include: [],
        skipModuleInsertion: true,
        //Uncomment this if you want to debug three.js by itself
        //excludeShallow: ['three'],
        out: function(text) {
            respond(200, text, 1, true);
        },
        //out:'D:/testing_projects/node/optimizer/built.js',
        onBuildWrite: function(moduleName, path, contents) {
            resultlist.push(path.replace(/^\.\//, ''));
            //@asg: log dependency
            //console.log('now i\'m reading:', path);
            return contents;
        },
        set: function(key, val) {
            var key = key;
            try {
                if (key) {
                    client.set(key, val, function(err, data) {
                        if (!err) {
                            console.log(data);
                        }
                    });
                }
            } catch (e) {
                console.log('redis error:' + e);
            }
        },
        //push request into redis list
        push: function(url) {
            try {
                if (url) {
                    client.lpush("jobs", url, function(err, data) {
                        if (!err) {
                            client.quit();
                        }
                    });
                }
            } catch (e) {
                console.log('redis error:' + e);
                return false;
            }
        },
        //pop redis list's top value
        pop: function() {
            try {
                client.lpop("jobs", function(err, data) {
                    if (!err) {
                        client.quit();
                    }
                });
            } catch (e) {
                console.log('redis error:' + e);
                return false;
            }
        },
        //when serivce break down,nodemailer send mail to the principal
        warning: function() {
            // send mail with defined transport object
            smtpTransport.sendMail(mailOptions, function(error, response) {
                if (error) {
                    console.log(error);
                } else {
                    console.log("Message sent: " + response.message);
                }

                // if you don't want to use this transport object anymore, uncomment following line
                //smtpTransport.close(); // shut down the connection pool, no more messages
            });
        },
        save: function(contents) {
            var savereq = http.request({
                host: 'admin.imgcdn.leju.com',
                path: '/imgcdn/api/index',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': contents.length
                }
            });
            savereq.write(contents);
            savereq.end();
        }
    };

    req.on('data', function(data) {
        console.log('req data');
    });
    req.on('error', function(data) {
        console.log('req data');
    });
    req.on('close', function(err) {
        console.log('req close');
        res.end();
    });
    // creat redis client
    var client = redis.createClient(rport, rhost); // redis event monitor error
    client.on('error', function(err, data) {
        console.log('redis error:' + err);
        config.warning();
        client.end();
    });

    client.on("connect", function() {
        console.log("connect succeed");
    });

    req.on('end', function() {
        config.push();
        client.mget(req.url.replace(/^\//, ''), function(err, data) {
            if (req.url != '/favicon.ico') {
                if (!err) {
                    var objRequest = uri.parse(req.url, true); //{ href: '/status?name=ryan',//  search: '?name=ryan',//  query: { name: 'ryan' },//  pathname: '/status' }
                    var query = objRequest.query;
                    var type = '';
                    var testvar = 1;
                    var pathname = objRequest.pathname.replace(/^\//, '').replace(/\.(js|css)$/, function(macth, t) {
                        type = t;
                        return '';
                    });
                    var data = data.toString();
                    if (data.length != '0') {
                        var fetchTime = new Date(),
                            timeSpan = fetchTime - beginTime;
                        console.log("This is fetch time:" + fetchTime + "");
                        console.log("request cost:" + timeSpan + "毫秒");
                        console.log("Request is:\b" + req.url + "\n" + "status is:\b" +
                            "fetch data from redis succeed");
                        log.warn({
                            lang: 'fr'
                        }, 'au revoir');
                        config.pop();
                        if (type == 'js') {
                            respond(200, data, 1, false);
                        }
                        if (type == 'css') {
                            respond(200, data, 2, false);
                        }
                        res.end();
                        console.log('redis close at fetch point');
                        client.end();
                    } else {
                        // 获取pathname
                        var urlPath = pathname.split("/")[1],
                            folderPath = pathname.split("/")[0];
                        if (!type) {
                            respond(500, 'not avalible', 0, true);
                            res.end();
                            return false;
                        } else {
                            var _filelist = pathname.split(';');
                            //control/req,req2;control/plugins/test1,test2
                            for (var i = 0, l = _filelist.length; i < l; i++) {
                                _filelist[i] = _filelist[i].replace(/,/g, function(a) {
                                    return a + (_filelist[i].match(/^.*\//) || '');
                                });
                            };
                            //['control/req,control/req2','control/plugins/test1,control/plugins/test2']
                            if (type != 'js') {} else {
                                var arrFiles = _filelist.join(',').split(',');
                                if (query['r'] !== undefined) {
                                    if (query['r'] == 'full') {
                                        config.name = 'fullrequireLib';
                                    } else {
                                        config.name = 'requireLib';
                                    }
                                } else {
                                    config.skipModuleInsertion = true;
                                    config.name = arrFiles.shift();
                                }
                                if (arrFiles.length > 0) {
                                    config.include = arrFiles;
                                }
                                //Does not matter what the request is,
                                //the answer is always OPTIMIZED JS!
                                requirejs.optimize(config, function(buildResponse) {
                                    config.pop();
                                    var contents = querystring.stringify({
                                        pathname: req.url.replace(/^\//, ''),
                                        include: resultlist.join(',')
                                    });
                                    config.save(contents);
                                    var compressTime = new Date(),
                                        timeSpan = compressTime - beginTime;
                                    console.log("This is compressTime time:" + compressTime + "");
                                    console.log("request cost:" + timeSpan + "毫秒");
                                    res.end();
                                }, function(e) {
                                    respond(404, e.toString(), 0 ,true);
                                    var contents = querystring.stringify({
                                        pathname: req.url.replace(/^\//, ''),
                                        include: resultlist.join(','),
                                        errorinfo: e.toString()
                                    });
                                    config.save(contents);
                                    console.log('redis close at compress point');
                                    client.end();
                                    res.end();
                                });
                            }
                            if (type == 'css') {
                                var parser = new(less.Parser)({
                                    paths: ['.', CSSBASE], // Specify search paths for @import directives
                                    filename: 'style.less' // Specify a filename, for better error messages
                                });
                                //'@import (less)"1"; @import (less)"2.css";'
                                var strContents = '@import (less)"' +
                                    _filelist.join(',').replace(/,/g, '.' + type + '";@import (less)"') + '.' + type + '";'
                                parser.parse(strContents, function(err, tree) {
                                    if (err) {
                                        respond(404, err.toString(), 0 ,true);
                                        var contents = querystring.stringify({
                                            pathname: req.url.replace(/^\//, ''),
                                            include: '',
                                            errorinfo: err.toString()
                                        });
                                        config.save(contents);
                                    } else {
                                        lessSearchTh(tree.rules);
                                        respond(200, tree.toCSS({
                                            compress: true
                                        }), 2 ,true);
                                        var contents = querystring.stringify({
                                            pathname: req.url.replace(/^\//, ''),
                                            include: resultlist.join(',')
                                        });
                                        config.save(contents);
                                        console.log(resultlist.join(','));
                                    }
                                    console.log('redis close at compress point');
                                    client.end();
                                    res.end();
                                });
                            }

                        }
                    }
                }
            }
        });
    });
}).listen(port, host);
console.log('Server running at http://' + host + ':' + port + '/');