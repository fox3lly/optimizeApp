var redis = require('redis'),
    fs = require('fs'),
    configure = require('./configure.js').config;

exports.utils = {
    // each folder
    handleFile: function(path, floor) {
        for (var i = 0; i < floor; i++) {
            blankStr += '    ';
        }

        fs.stat(path, function(err1, stats) {
            if (err1) {
                console.log('stat error');
            } else {
                if (stats.isDirectory()) {
                    console.log('+' + blankStr + path);
                } else {
                    console.log('-' + blankStr + path);
                }
            }
        })
    },
    // array method,compare with an array,return true or false
    unique: function(str, arr) {
        // console.log(arr.length);
        for (var i = 1; i < arr.length; i++) {
            if (str == arr[i]) {
                // console.log(arr[i]);
                // console.log("可以通过");
                return false;
                break;
            } else {
                // console.log("不能用过")
                return true;
            }

        }
    },
    // foreach Specified folder,push all files into an array
    walk: function(path) {
        var dirList = fs.readdirSync(path);
        dirList.forEach(function(item) {
            if (fs.statSync(path + '/' + item).isDirectory()) {
                walk(path + '/' + item);
            } else {
                // fileList.splice(0,fileList.length);
                fileList.push(item.split(".")[0]);
            }
        });
    }
};