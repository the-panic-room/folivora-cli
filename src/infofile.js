const fs = require('fs')

function getInfo (uri, callback) {
    const File = require('./file')
    const Directory = require('./directory')
    fs.stat(uri, function (err, info) {
        if (err) {
            return callback(err)
        }
        var instance = null
        if (info.isDirectory()) {
            instance = new Directory(uri, info)
        }
        if (info.isFile()) {
            instance = new File(uri, info)
        }
        callback(null, instance)
    })
}
module.exports = getInfo
