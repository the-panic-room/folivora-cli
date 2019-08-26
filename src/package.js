const path = require('path')
const tmp = require('tmp')
const fs = require('fs')
const request = require('request')
const crypto = require('crypto')
const getInfo = require('./directory').getInfo

class Package {
    constructor (name, options) {
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

    getFile (callback) {
        if (this.file) {
            return callback(null, this.file)
        }
        var self = this
        this._wrapper(self.path)
            .then(function (file) {
                self.file = file
                callback(null, file)
            })
            .catch(function (err) {
                callback(err)
            })
    }

    getSign (callback) {
        if (this.sig) {
            return callback(null, this.sig)
        }
        var self = this
        this._wrapper(self.pathSig)
            .then(function (file) {
                self.sig = file
                callback(null, file)
            })
            .catch(function (err) {
                callback(err)
            })
    }

    checkSum (callback, dir) {
        var hash = crypto.createHash('md5')
        hash.setEncoding('hex')
        dir = dir || this.path
        var fd = fs.createReadStream(dir)
        hash.on('finish', function () {
            callback(null, hash.read())
        })
        fd.on('error', function (error) {
            callback(error)
        })
        fd.pipe(hash)
    }

    check (callback) {
        var self = this
        self.checkSum(function (err, hash) {
            if (err) {
                self.errors.push(err)
            } else if (hash !== self.md5) {
                self.errors.push(
                    new Error('El archivo esta corrupto o dañado')
                )
            }
            self.getSign(function (err, sig) {
                if (err) {
                    self.errors.push(err)
                }
                callback(self.errors)
            })
        })
    }

    _download (uri, callback) {
        var count = 0
        var receive = 0
        console.log('Descargando paquete. %s', uri)
        tmp.file(function _tempFileCreated (err, path, fd, cleanupCallback) {
            if (err) {
                cleanupCallback()
                return callback(err)
            }
            request.get(uri)
                .on('data', function (data) {
                    receive += data.length
                    var porcent = (receive * 100) / count
                    console.log('Recibido %d %     [%d bytes / %d bytes]', porcent, receive, count)
                })
                .on('response', function (response) {
                    count = response.headers['content-length']
                    console.log('Cantidad total del archivo: %d bytes', count)
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

    download (callback, ignoreSig) {
        var self = this
        function downloadFile (uri, dest, callback2) {
            self._download(uri, function (err, temp, clean) {
                if (err) {
                    return callback(err)
                }
                self.checkSum(function (err, hash) {
                    if (err) {
                        return callback(err)
                    }
                    if (hash !== self.md5) {
                        return callback(
                            new Error("El archivo esta corrupto o dañado")
                        )
                    }
                    fs.copyFile(temp, dest, function (err) {
                        if (err) {
                            return callback(err)
                        }
                        clean()
                        callback2()
                    })
                }, temp)
            })
        }
        function checkFile () {
            self.getFile(function (err, file) {
                if (err) {
                    return downloadFile(self.mirrorURI, self.path, function () {
                        callback()
                    })
                }
                console.log('El archivo %s ya existe', self.path)
                return callback()
            })
        }
        if (ignoreSig) {
            return checkFile()
        }
        self.getSign(function (err, file) {
            if (err) {
                return downloadFile(self.mirrorURI + '.sig', self.pathSig, function () {
                    checkFile()
                })
            }
            console.log('El archivo %s ya existe', self.pathSig)
            checkFile()
        })
    }
}

module.exports = Package
