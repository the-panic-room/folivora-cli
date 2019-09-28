const fs = require('fs')
const EventEmitter = require('events').EventEmitter

/**
 * @function getInfo
 * @description Obtiene la informacion del archivo o directorio.
 * @param {String} uri url del directorio o archivo.
 * @param {Functions} callback funcion de escucha.
 * @returns {Directory|File}
 */
function getInfo (uri, callback) {
    const File = require('./file')
    const Directory = require('./directory')
    var event = new EventEmitter()
    fs.stat(uri, function (err, info) {
        if (err) {
            return event.emit('error', err)
        }
        var instance = null
        if (info.isDirectory()) {
            instance = new Directory(uri, info)
        }
        if (info.isFile()) {
            instance = new File(uri, info)
        }
        event.emit('data', instance)
    })
    if (callback) {
        event.on('data', function (data) {
            callback(null, data)
        })
        event.on('error', function (err) {
            callback(err)
        })
        return
    }
    return event
}
module.exports = getInfo
