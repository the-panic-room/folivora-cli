const fs = require('fs')
const InfoBase = require('./infobase')
const File = require('./file')
const Directory = require('./directory')

function getInfo (uri, callback) {
    fs.stat(uri, function (err, info) {
        if (err) {
            return callback(err)
        }
        var Instance = InfoBase
        if (info.isDirectory()) {
            Instance = Directory
        }
        if (info.isFile()) {
            Instance = File
        }
        callback(null, new Instance(uri, info))
    })
}
module.exports = getInfo
