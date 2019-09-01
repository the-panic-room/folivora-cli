const path = require('path')
const tmp = require('tmp')
const fs = require('fs')
const request = require('request')
const crypto = require('crypto')
const ProgressBar = require('progress')
const getInfo = require('./infofile')

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
                var error = new Error('El archivo esta corrupto o dañado')
                error.code = 'CORRUPT'
                self.errors.push(error)
            }
            self.getSign(function (err, sig) {
                if (err) {
                    self.errors.push(err)
                }
                callback(self.errors)
            })
        })
    }

    _download (uri, verbose, callback) {
        if (verbose) {
            process.stdout.write('Descargando paquete. ' + uri)
        }
        tmp.file(function _tempFileCreated (err, path, fd, cleanupCallback) {
            if (err) {
                cleanupCallback()
                return callback(err)
            }
            var bar
            request.get(uri)
                .on('data', function (data) {
                    const receive = data.length
                    if (verbose) {
                        bar.tick(receive)
                    }
                })
                .on('response', function (response) {
                    const count = parseInt(response.headers['content-length'], 10)
                    bar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
                        complete: '=',
                        incomplete: ' ',
                        width: 20,
                        total: count
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

    download (callback, ignoreSig, ignoreChecksum, verbose) {
        var self = this
        function downloadFile (uri, dest, callback2) {
            self._download(uri, verbose, function (err, temp, clean) {
                if (err) {
                    return callback(err)
                }
                if (ignoreChecksum) {
                    return fs.copyFile(temp, dest, function (err) {
                        if (err) {
                            return callback(err)
                        }
                        clean()
                        callback2()
                    })
                }
                self.checkSum(function (err, hash) {
                    if (err) {
                        return callback(err)
                    }
                    if (hash !== self.md5) {
                        var error = new Error('El archivo esta corrupto o dañado')
                        error.code = 'CORRUPT'
                        return callback(error)
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
                if (verbose) {
                    process.stdout.write('El archivo ' + self.path + ' ya existe')
                }
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
            if (verbose) {
                process.stdout.write('El archivo ' + self.pathSig + ' ya existe')
            }
            checkFile()
        })
    }
}

module.exports = Package
