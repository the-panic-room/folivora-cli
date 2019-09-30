const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const getInfo = require('./infofile')
const EventEmitter = require('events').EventEmitter
const downloadFile = require('./utils').downloadFile

/**
 * @class Package
 * @description Gestiona los datos del paquete del repo.
 * @version 0.0.1
 * @author Jhonny Mata
 */
class Package extends EventEmitter {
    /**
     * @constructor
     * @param {String} name nombre del paquete.
     * @param {Object} options configuraciones adicionales.
     */
    constructor (name, options) {
        super()
        options = options || {}
        this.ignoreSig = false
        this.ignoreChecksum = false
        this.forceDownload = false
        this.name = name
        this.version = options.version
        this.md5 = options.md5
        this.filename = options.filename
        this.arch = options.arch || 'any'
        this.dir = options.path
        this.basename = path.basename(options.path)
        this.path = path.resolve(this.dir || './', this.filename)
        this.pathSig = this.path + '.sig'
        if (typeof options.mirror !== 'undefined') {
            this.mirror = options.mirror
            this.mirrorURI = options.mirror + '/' + this.filename
        }
        this.errors = []
    }

    /**
     * @function read
     * @description Obtiene la informacion del paquete.
     * @param {Function} callback funcion de escucha.
     * @returns {ReadStream|internal.Writable}
     */
    read (callback) {
        return getInfo(this.path, callback)
    }

    /**
     * @function _isExist
     * @description Verifica si existe el archivo del paquete.
     * @param {String} url url del archivo.
     * @param {Function} callback funcion de escucha
     */
    _isExist (url, callback) {
        var event = new EventEmitter()
        fs.access(url, function (err) {
            var isExist = true
            if (err) {
                isExist = false
            }
            event.emit('close', isExist)
        })
        if (typeof callback === 'function') {
            event.on('close', function (isExist) {
                callback(isExist)
            })
            return
        }
        return event
    }

    /**
     * @function isExist
     * @description Verifica si existe el archivo del paquete.
     * @param {Function} callback funcion de escucha
     */
    isExist (callback) {
        return this._isExist(this.path, callback)
    }

    /**
     * @function readSign
     * @description Obtiene la informacion del signature.
     * @param {Function} callback funcion de escucha.
     * @returns {ReadStream|internal.Writable}
     */
    readSign (callback) {
        return getInfo(this.pathSig, callback)
    }

    /**
     * @function isExistSig
     * @description Verifica si existe el signature.
     * @param {Function} callback funcion de escucha
     */
    isExistSig (callback) {
        return this._isExist(this.pathSig, callback)
    }

    /**
     * @function checkSum
     * @description Calcula la suma de verificacion del archivo.
     * @returns {Hash}
     */
    checkSum (dir) {
        var self = this
        dir = dir || self.path
        var fd = fs.createReadStream(dir)
        var hash = crypto.createHash('md5')
        var event = new EventEmitter()
        hash.setEncoding('hex')
        fd.on('error', function (err) {
            event.emit('error', err)
        })
        hash.on('finish', function () {
            event.emit('finish', hash.read() === self.md5)
        })
        fd.pipe(hash)
        return event
    }

    /**
     * @function check
     * @description Valida que el paquete no presente errores.
     * @param {Function} callback funcion de escucha.
     * @returns {EventEmitter}
     */
    check (callback) {
        var self = this
        var errors = []
        var event = new EventEmitter()
        event.once('signature', function () {
            self.isExistSig().on('close', function (isExist) {
                if (!isExist) {
                    errors.push({
                        code: 'invalid',
                        message: 'No existe el signature'
                    })
                }
                event.emit('file')
            })
        })
        event.once('file', function () {
            self.isExist().on('close', function (isExist) {
                if (!isExist) {
                    errors.push({
                        code: 'invalid',
                        message: 'El archivo no existe'
                    })
                    event.emit('finish', errors)
                    return
                }
                var hash = self.checkSum()
                hash.on('finish', function (isValid) {
                    if (!isValid) {
                        errors.push({
                            code: 'invalid',
                            message: 'La suma de verificacion no coincide'
                        })
                    }
                    event.emit('finish', errors)
                })
            })
        })
        event.emit('signature')
        if (typeof callback === 'function') {
            event.once('finish', callback)
            return
        }
        return event
    }

    /**
     * @function _downloadFile
     * @description descarga el contenido de la url.
     * @param {String} url funcion de escucha.
     * @param {Boolean} verbose mostrar mas detalles en consola.
     */
    _downloadFile (url, verbose) {
        return downloadFile(url, verbose)
    }

    /**
     * @function download
     * @description descarga el contenido del paquete.
     * @param {Function} callback funcion de escucha.
     * @param {Boolean} verbose mostrar mas detalles en consola.
     */
    download (callback, verbose) {
        var self = this
        var event = new EventEmitter()
        event.once('validate-signature', function () {
            self.isExistSig(function (isValid) {
                if (!self.forceDownload || !isValid) {
                    event.emit('download-signature')
                } else {
                    event.emit('validate-package')
                }
            })
        })
        event.once('validate-package', function () {
            self.isExistSig(function (isValid) {
                if (!self.forceDownload || !isValid) {
                    event.emit('download-package')
                } else {
                    event.emit('finish')
                }
            })
        })
        event.once('download-signature', function () {
            self._downloadFile(self.mirrorURI + '.sig', verbose)
                .once('response', function (response) {
                    event.emit('response-signature', response)
                })
                .once('close', function (dir, clean) {
                    event.emit('copy-file', dir, self.pathSig, clean)
                    event.emit('validate-package')
                })
        })
        event.once('download-package', function () {
            self._downloadFile(self.mirrorURI, verbose)
                .once('response', function (response) {
                    event.emit('response-package', response)
                })
                .once('close', function (dir, clean) {
                    function finish () {
                        event.emit('finish')
                    }
                    if (!self.ignoreChecksum) {
                        self.checkSum(dir).once('finish', function (isValid) {
                            if (!isValid) {
                                return event.emit('error', { code: 'invalid', message: 'Archivo invalido o corrupto' })
                            }
                            event.once('finish-copy', finish)
                            event.emit('copy-file', dir, self.path, clean)
                        })
                            .on('error', function (err) {
                                event.emit('error', err)
                            })
                    } else {
                        event.once('finish-copy', finish)
                        event.emit('copy-file', dir, self.path, clean)
                    }
                })
        })
        event.on('copy-file', function (dir, dest, clean) {
            fs.copyFile(dir, dest, function (err) {
                if (err) {
                    return event.emit('error', err)
                }
                clean()
                event.emit('finish-copy', dest)
            })
        })
        if (!this.ignoreSig) {
            event.emit('validate-signature')
        } else {
            event.emit('validate-package')
        }
        if (typeof callback === 'function') {
            event.once('finish', function () {
                callback()
            })
            event.once('error', callback)
            return
        }
        return event
    }
}

module.exports = Package
