var requirejs = save('./r2.js'),
    less = require('less'),
    http = require('http'),
    fs = require('fs'),
    uri = require('url'),
    querystring = require('querystring'),
    args = process.argv.slice(2),
    host, // = '127.0.0.1',
    port = (args[0] && /^\d+$/.test(args[0]))? parseInt(args[0]) : 8030;

var JSBASE = '',
    CSSBASE = '';
http.createServer(function(req, res) {
    var resultlist = [];

    function respond(code, contents ,type) {
        var str = '';
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
            //,'Content-Length': contents.length
        });

        res.write(contents, 'utf8');
        //res.end();
    }

    function lessSearchTh(rules) {
        for (var i = 0, rule; rule = rules[i]; i++) {
            //@asg: log dependency
            if (rule.importedFilename) {
                resultlist.push(rule.importedFilename.replace(/\\/g, '/'));
                //console.log('now i\'m reading:', rule.importedFilename);
            }
            if (rule.root) {
                lessSearchTh(rule.root.rules);
            }
        }
    }
    req.on('data', function(data) {
        console.log('req data');
    });

    req.on('close', function(err) {
        console.log('req close');
        res.end();
    });

    var config = {
        baseUrl: JSBASE,
        paths: {
            //Put path to require.js in here, leaving off .js
            //since it is a module ID path mapping. For final deployment,
            //if a smaller AMD loader is desired, no dynamic
            //loading needs to be done, and loader plugins are not
            //in use, change this path to that file. One possibility
            //could be the one at:
            //https://github.com/ajaxorg/ace/blob/master/build_support/mini_require.js
            requireLib: 'minirequire'
        },
        //name: 'requireLib',
        include: [],
        //skipModuleInsertion:true,
        //Uncomment this if you want to debug three.js by itself
        //excludeShallow: ['three'],
        out: function(text) {
            respond(200, text, 1);
        },
        //out:'D:/testing_projects/node/optimizer/built.js',
        onBuildWrite: function(moduleName, path, contents) {
            resultlist.push(path.replace(/^\.\//, ''));
            //@asg: log dependency
            //console.log('now i\'m reading:', path);
            return contents;
        }
    };

    req.on('end', function() {
        var objRequest = uri.parse(req.url, true); //{ href: '/status?name=ryan',//  search: '?name=ryan',//  query: { name: 'ryan' },//  pathname: '/status' }    
        var query = objRequest.query;
        var type = '';
        var pathname = objRequest.pathname.replace(/^\//, '').replace(/\.(js|css)$/, function(macth, t) {
            type = t;
            return '';
        });
        console.log(objRequest);
        console.log(pathname);
        if (!type) {
            respond(404, 'not avalible', 0);
            res.end();
            return false;
        } else {
            var _filelist = pathname.split(';');
            for (var i = 0, l = _filelist.length; i < l; i++) {
                _filelist[i] = _filelist[i].replace(/,/g, function(a) {
                    return a + (_filelist[i].match(/^.*\//) || '');
                });
            };
            if (type == 'js') {
                var arrFiles = _filelist.join(',').split(',');
                if (query['r'] !== undefined) {
                    config.name = 'requireLib';
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
                    //buildResponse is just a text output of the modules
                    //included. Load the built file for the contents.
                    //var contents = fs.readFileSync(config.out, 'utf8');
                    //respond(res, 200, contents);
                    console.log('---------------' + resultlist.join(','));
                    //var contents = querystring.stringify({
                    //    pathname: 'http://imgcdn.house.sina.com.cn' + objRequest.pathname,
                    //    include: resultlist.join(',')
                    //});
                    //var savereq = http.request({
                    //    host: 'admin.imgcdn.house.sina.com.cn',
                    //    path: '/imgcdn/api/index',
                    //    method: 'POST',
                    //    headers: {
                    //        'Content-Type': 'application/x-www-form-urlencoded',
                    //        'Content-Length': contents.length
                    //    }
                    //});
                    //savereq.write(contents);
                    //savereq.end();
                    res.end();
                }, function(e) {
                    //As of r.js 2.1.2, errors are returned via an errback
                    respond(404, e.toString(), 0);
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
                        respond(404, err.toString(), 0);
                    } else {
                        lessSearchTh(tree.rules);
                        respond(200, tree.toCSS({
                            compress: true
                        }), 2);
                        console.log(resultlist.join(','));
                    }
                    res.end();
                });
            }
        }

    });

}).listen(port, host);
console.log('Server running at http://' + host + ':' + port + '/');