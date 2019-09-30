const fs = require('fs')
const path = require('path')
const EventEmitter = require('events').EventEmitter
const Package = require('./package')
const PackageList = require('./packagelist')

class Database extends Package {
    /**
     * @constructor
     * @param {String} name nombre del paquete.
     * @param {Object} options configuraciones adicionales.
     */
    constructor (name, options) {
        super(name, options)
        this.ignoreChecksum = true
        this.ignoreSig = true
        this.update = null
        this.packages = new PackageList()
    }

    /**
     * @function readState
     * @description Lee el archivo de actualizacion.
     * @param {Function} callback funcion de escucha.
     */
    readState (callback) {
        var self = this
        fs.readFile(path.join(self.dir, '.state'), function (err, data) {
            if (err) {
                return callback(err)
            }
            self.updated = new Date(parseInt(data.toString()))
            callback(null, self.updated)
        })
    }

    /**
     * @function updateState
     * @description Actualiza el archivo de actualizacion.
     * @param {Function} callback funcion de escucha.
     */
    updateState (callback) {
        this.updated = new Date()
        fs.writeFile(path.join(this.dir, '.state'), this.updated.getTime(), function () {
            if (typeof callback === 'function') {
                callback()
            }
        })
    }

    /**
     * @function download
     * @description descarga el contenido del paquete.
     * @param {Function} callback funcion de escucha.
     * @param {*} verbose mostrar mas detalles en consola.
     */
    download (callback, verbose) {
        var self = this
        var event = super.download(null, verbose)
        event.once('finish', function () {
            self.updateState()
        })
        if (typeof callback === 'function') {
            event.once('finish', callback)
            event.once('error', callback)
            return
        }
        return event
    }

    /**
     * @function read
     * @description Obtiene la informacion del paquete.
     * @param {Function} callback funcion de escucha.
     * @returns {ReadStream|internal.Writable}
     */
    read (callback) {
        var event = new EventEmitter()
        var self = this
        var fn = super.read.bind(self)
        self.readState(function () {
            var stream = fn()
            var files = []
            stream.once('data', function (data) {
                data.read()
                    .on('error', function (err) {
                        event.emit('error', err)
                    })
                    .on('entry', function (file) {
                        file.collect().then(function (data) {
                            var text = data.toString()
                            if (text) {
                                var options = {
                                    version: text.match(/%VERSION%\n(.*)/i)[1],
                                    filename: text.match(/%FILENAME%\n(.*)/i)[1],
                                    md5: text.match(/%MD5SUM%\n(.*)/i)[1],
                                    arch: self.arch || text.match(/%ARCH%\n(.*)/i)[1],
                                    path: self.dir
                                }
                                options.mirror = self.mirror
                                files.push(
                                    new Package(
                                        text.match(/%NAME%\n(.*)/i)[1],
                                        options
                                    )
                                )
                            }
                        })
                    })
                    .on('end', function () {
                        self.packages = new PackageList(files)
                        event.emit('finish', self.packages)
                    })
            })
                .on('error', function (err) {
                    event.emit('error', err)
                })
        })
        if (typeof callback === 'function') {
            event.once('finish', function (files) {
                callback(null, files)
            })
            event.once('error', callback)
            return
        }
        return event
    }
}

module.exports = Database
