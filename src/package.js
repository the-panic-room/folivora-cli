const path = require('path')
const tmp = require('tmp')
const fs = require('fs')
const request = require('request')
const crypto = require('crypto')
const ProgressBar = require('progress')
const getInfo = require('./infofile')
const EventEmitter = require('events').EventEmitter

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
        this.name = name
        this.version = options.version
        this.md5 = options.md5
        this.filename = options.filename
        this.arch = options.arch || 'any'
        this.path = path.resolve(options.path || './', this.filename)
        this.pathSig = this.path + '.sig'
        if (typeof options.mirror !== 'undefined') {
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
        if (typeof callback !== 'undefined') {
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
        if (typeof callback !== 'undefined') {
            event.once('finish', callback)
            return
        }
        return event
    }

    _downloadFile (url, verbose) {
        var event = new EventEmitter()
        event.once('temp-file', function (dir, clean) {
            var response = request.get(url)
            var bar = null
            if (verbose) {
                process.stdout.write('Descargando paquete. ' + url + '\n')
            }
            response.on('response', function (response) {
                const count = parseInt(response.headers['content-length'], 10)
                bar = new ProgressBar('  downloading [:bar] :rate/kbps :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: count / 1024
                })
                if (response.statusCode !== 200) {
                    const error = {
                        status: response.statusCode,
                        text: response.statusMessage
                    }
                    event.emit('error', error)
                }
                response.on('end', function () {
                    if (verbose) {
                        process.stdout.write('Descarga completada: ' + url + '\n')
                    }
                    event.emit('close', dir, clean)
                })
            })
                .on('data', function (data) {
                    const receive = data.length / 1024
                    if (verbose) {
                        bar.tick(receive)
                    }
                })                
                .pipe(fs.createWriteStream(dir))
            event.emit('response', response)
        })
        tmp.file(function _tempFileCreated (err, path, fd, cleanupCallback) {
            if (err) {
                event.emit('error', err)
                return
            }
            event.emit('temp-file', path, cleanupCallback)
        })
        return event
    }

    download (callback, ignoreSig, ignoreChecksum, verbose, force) {
        var self = this
        if (!ignoreSig) {
            self._downloadFile(self.mirrorURI + '.sig', verbose)
                .once('close', function (dir, clean) {
                    var event = this
                    fs.copyFile(dir, self.pathSig, function (err) {
                        if (err) {
                            return event.emit('error', err)
                        }
                        clean()
                        event.emit('finish')
                    })
                })
        }
        var responseFile = self._downloadFile(self.mirrorURI, verbose)
            .once('close', function (dir, clean) {
                var event = this
                if (!ignoreChecksum) {
                    self.checkSum(dir).once('finish', function (isValid) {
                        if (!isValid) {
                            return event.emit('error', { code: 'invalid', message: 'Archivo invalido o corrupto' })
                        }
                        fs.copyFile(dir, self.path, function (err) {
                            if (err) {
                                return event.emit('error', err)
                            }
                            clean()
                            event.emit('finish')
                        })
                    })
                        .on('error', function (err) {
                            event.emit('error', err)
                        })
                } else {
                    fs.copyFile(dir, self.path, function (err) {
                        if (err) {
                            return event.emit('error', err)
                        }
                        clean()
                        event.emit('finish')
                    })
                }
            })
        if (typeof callback !== 'undefined') {
            responseFile.once('finish', function () {
                callback()
            })
            responseFile.once('error', callback)
            return
        }
        return responseFile
    }



    _wrapper (uri) {
        return new Promise(function (resolve, reject) {
            getInfo(uri, function (err, info) {
                if (err) {
                    return reject(err)
                }
                resolve(info)
            })
        })
    }

    _download (uri, verbose, callback) {
        if (verbose) {
            process.stdout.write('Descargando paquete. ' + uri + '\n')
        }
        tmp.file(function _tempFileCreated (err, path, fd, cleanupCallback) {
            if (err) {
                cleanupCallback()
                return callback(err)
            }
            var bar
            request.get(uri)
                .on('data', function (data) {
                    const receive = data.length / 1024
                    if (verbose) {
                        bar.tick(receive)
                    }
                })
                .on('response', function (response) {
                    const count = parseInt(response.headers['content-length'], 10)
                    bar = new ProgressBar('  downloading [:bar] :rate/kbps :percent :etas', {
                        complete: '=',
                        incomplete: ' ',
                        width: 20,
                        total: count / 1024
                    })
                    if (response.statusCode !== 200) {
                        cleanupCallback()
                        const error = {
                            status: response.statusCode,
                            text: response.statusMessage
                        }
                        return callback(error)
                    }
                    response.pipe(fs.createWriteStream(path))
                        .on('close', function () {
                            callback(null, path, cleanupCallback)
                        })
                })
                .on('error', function (err) {
                    cleanupCallback()
                    callback(err)
                })
        })
    }

    // download (callback, ignoreSig, ignoreChecksum, verbose, force) {
    //     var self = this
    //     function downloadFile (uri, dest, callback2, ignore) {
    //         self._download(uri, verbose, function (err, temp, clean) {
    //             if (err) {
    //                 return callback(err)
    //             }
    //             if (ignore) {
    //                 return fs.copyFile(temp, dest, function (err) {
    //                     if (err) {
    //                         return callback(err)
    //                     }
    //                     clean()
    //                     callback2()
    //                 })
    //             }
    //             self.checkSum(function (err, hash) {
    //                 if (err) {
    //                     return callback(err)
    //                 }
    //                 if (hash !== self.md5) {
    //                     var error = new Error('El archivo esta corrupto o dañado')
    //                     error.code = 'CORRUPT'
    //                     return callback(error)
    //                 }
    //                 fs.copyFile(temp, dest, function (err) {
    //                     if (err) {
    //                         return callback(err)
    //                     }
    //                     clean()
    //                     callback2()
    //                 })
    //             }, temp)
    //         })
    //     }
    //     function checkFile () {
    //         if (force) {
    //             return downloadFile(self.mirrorURI, self.path, function () {
    //                 callback()
    //             }, ignoreChecksum)
    //         }
    //         self.getFile(function (err, file) {
    //             if (err) {
    //                 return downloadFile(self.mirrorURI, self.path, function () {
    //                     callback()
    //                 }, ignoreChecksum)
    //             }
    //             if (verbose) {
    //                 process.stdout.write(('El archivo ' + self.path + ' ya existe\n').green)
    //             }
    //             return callback()
    //         })
    //     }
    //     if (ignoreSig) {
    //         return checkFile()
    //     }
    //     if (force) {
    //         return downloadFile(self.mirrorURI + '.sig', self.pathSig, function () {
    //             checkFile()
    //         }, true)
    //     }
    //     self.getSign(function (err, file) {
    //         if (err) {
    //             return downloadFile(self.mirrorURI + '.sig', self.pathSig, function () {
    //                 checkFile()
    //             }, true)
    //         }
    //         if (verbose) {
    //             process.stdout.write(('El archivo ' + self.pathSig + ' ya existe\n').green)
    //         }
    //         checkFile()
    //     })
    // }
}

module.exports = Package
