require('colors')
const path = require('path')
const fs = require('fs')
const express = require('express')
const mkdirp = require('mkdirp')
const loadJsonFile = require('load-json-file')
const logger = require('morgan')
const getinfo = require('./src').getinfo
const Repository = require('./src').Repository
var MIRRORS = []

function downloadPackage (repo, filename, verbose, isDB) {    
    if (isDB) {
        return repo.updateDatabase(verbose, true).then(function () {
            return new Promise(function (resolve, reject) {
                repo.db.getFile(function (err, file) {
                    if (err) {
                        return reject(err)
                    }
                    resolve(file.read(true))
                })
            })
        })
    }
    return repo.read().then(function () {
        return repo.getPackage(filename)
    })
        .then(function (pack) {
            if (!pack) {
                throw new Error('No existe el paquete en la base de datos')
            }
            return new Promise(function (resolve, reject) {
                pack.download(function (err) {
                    if (err) {
                        return reject(err)
                    }
                    const fn = (/.sig$/ig.test(filename)) ? pack.getSign : pack.getFile
                    fn.apply(pack, [function (err, file) {
                        if (err) {
                            return reject(err)
                        }
                        resolve(file.read(true))
                    }])
                }, false, false, verbose)
            })
        })
}
module.exports = function (host, port, cmd) {
    host = host || '127.0.0.1'
    port = port || 8000
    var app = express()
    const dir = cmd.cachePath || process.env.MIRROR_PATH || '/var/cache/folivora/'
    const mirror = process.env.MIRROR_CONFIG || path.resolve('./repo.json')
    if (cmd.verbose) {
        app.use(logger('dev'))
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
        const isDB = filename === repo.db_name
        if (['x86_64', 'i836', 'any'].indexOf(arch) === -1) {
            return response.status(400).send('Arquitectura no soportada')
        }
        var p1 = new Promise(function (resolve, reject) {
            getinfo(root, function (err) {
                if (err) {
                    return mkdirp(root, function (err) {
                        if (err) {
                            return reject(err)
                        }
                        resolve()
                    })
                }
                resolve()
            })
        })
        p1.then(function () {
            if (!cmd.forceDownload || cmd.offline) {
                return Promise.resolve(false)
            }
            return new Promise(function (resolve) {
                repo.readState(function () {
                    resolve(Math.abs(Date.now() - repo.updated) >= 86400000)
                })
            })
        })
            .then(function (isForceUpdate) {
                getinfo(filePath, function (err, file) {
                    if (err || (isDB && isForceUpdate)) {
                        if (cmd.offline || !uri) {
                            return response.sendStatus(404)
                        }
                        return downloadPackage(repo, filename, cmd.verbose, isDB)
                            .then(function (stream) {
                                stream.pipe(response)
                            })
                            .catch(function (err) {
                                console.log(err)
                                response.status(503).send('No se pudo descargar el archivo')
                            })
                    }
                    file.read(true).pipe(response)
                })
            })
            .catch(function (err) {
                response.status(500).send(err.toString())
            })
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
