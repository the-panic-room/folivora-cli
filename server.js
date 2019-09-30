require('colors')
const path = require('path')
const fs = require('fs')
const express = require('express')
const mkdirp = require('mkdirp')
const loadJsonFile = require('load-json-file')
const logger = require('morgan')
const getinfo = require('./src').getinfo
const Repository = require('./src').Repository
const downloadFile = require('./src/utils').downloadFile
var MIRRORS = []

module.exports = function (hostname, cmd) {
    var hostArg = (hostname || '127.0.0.1').split(':')
    var host = hostArg[0]
    var port = parseInt(hostArg[1] || '8000')
    var app = express()
    var online = !cmd.offline
    const dir = cmd.cachePath || process.env.MIRROR_PATH || '/var/cache/folivora/'
    const mirror = process.env.MIRROR_CONFIG || path.resolve('./repo.json')
    if (cmd.verbose) {
        app.use(logger('dev'))
    }
    function checkTimeOutOnline () {
        setTimeout(function () {
            online = true
            console.log('Ha sido reestablecida la conexion.')
        }, 30000)
    }
    app.get('/:system/:canal/:name/:arch/:filename', function (request, response, next) {
        const name = request.params.name
        const arch = request.params.arch
        const filename = (request.params.filename === name + '.db') ? request.params.filename + '.tar.gz' : request.params.filename
        const system = request.params.system
        const canal = request.params.canal
        const uri = MIRRORS[system.toLowerCase()]
        const root = path.resolve(dir, system, canal, name, arch)
        const filePath = path.join(root, filename)
        var repo = new Repository(name, {
            arch: arch,
            mirror: uri + canal + '/',
            path: root
        })
        if (['x86_64', 'i836', 'any'].indexOf(arch) === -1) {
            return response.status(400).send('Arquitectura no soportada')
        }
        function errorHandler (err) {
            if (err.code === 'ENOTFOUND') {
                online = false
                console.log('El sistema ha sido desconectado de la red.')
                checkTimeOutOnline()
            }
            console.log(err)
            response.status(err.status || 503).send(('message' in err) ? err.message : err)
        }
        function _downloadFile () {
            downloadFile(repo.mirror + filename, true)
                .on('error', errorHandler)
                .on('success', function (stream) {
                    stream.on('error', errorHandler)
                        .pipe(response)
                })
                .on('close', function (tmp, clean) {
                    fs.copyFile(tmp, filePath, function (err) {
                        if (err) {
                            console.log('No se pudo respaldar el paquete: %s', filePath)
                        }
                    })
                })
        }
        function init () {
            repo.db.readState(function () {
                getinfo(filePath).on('error', function () {
                    if (online) {
                        return _downloadFile()
                    }
                    errorHandler({ status: 404, message: 'No Found' })
                })
                    .on('data', function (file) {
                        console.log('Busqueda encontrada en: %s', filePath)
                        var time = (repo.db.updated) ? repo.db.updated.getTime() : 0
                        if (!cmd.offline && online && filename === repo.db.filename && Math.abs(Date.now() - time) >= 86400000) {
                            repo.db.forceDownload = true
                            return repo.db.download(null, true).on('error', errorHandler)
                                .on('response', function (stream) {
                                    stream.on('error', errorHandler)
                                        .pipe(response)
                                })
                        }
                        repo.db.read().on('error', errorHandler)
                            .on('finish', function () {
                                function send () {
                                    file.read(true).pipe(response)
                                }
                                var instance = repo.getPackage(filename)
                                if (instance) {
                                    instance.checkSum().on('error', errorHandler)
                                        .on('finish', function (isValid) {
                                            if (!isValid) {
                                                if (!online) {
                                                    return errorHandler({ status: 401, message: 'Invalid File' })
                                                }
                                                return _downloadFile()
                                            }
                                            send()
                                        })
                                } else {
                                    send()
                                }
                            })
                    })
            })
        }
        getinfo(root).on('error', function () {
            mkdirp(root, init)
        })
            .on('data', init)
    })
    loadJsonFile(mirror).then(function (data) {
        MIRRORS = data || []
    })
        .catch(function () {
            process.stdout.write('Ignorando rutas de replica.\n'.yellow)
        })
        .then(function () {
            app.listen(port, host, function (err) {
                if (err) {
                    throw err
                }
                process.stdout.write(('Escuchando en ' + host + ':' + port).green + '\n')
            })
        })
}
