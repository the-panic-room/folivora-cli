require('colors')
const path = require('path')
const fs = require('fs')
const express = require('express')
const mkdirp = require('mkdirp')
const loadJsonFile = require('load-json-file')
const getinfo = require('./src').getinfo
const Repository = require('./src').Repository
var MIRRORS = []

function getRepo (name, arch, mirror, dir) {
    var repo = new Repository(name, {
        arch: arch,
        mirror: mirror,
        path: path.resolve(dir, name)
    })
    return repo
}
module.exports = function (host, port, cmd) {
    host = host || '127.0.0.1'
    port = port || 8000
    var app = express()
    const dir = cmd.path || process.env.MIRROR_PATH || '/var/cache/folivora/'
    const mirror = process.env.MIRROR_CONFIG || path.resolve('./repo.json')
    app.get('/:system/:canal/:name/:arch/:filename', function (request, response, next) {
        const name = request.params.name
        const arch = request.params.arch
        const filename = (request.params.filename === name) ? request.params.filename + 'db.tar.gz' : request.params.filename
        const system = request.params.system
        const canal = request.params.canal
        const uri = MIRRORS[system.toLowerCase()]
        const root = path.resolve(dir, system, canal, name, arch)
        const filePath = path.join(root, filename)
        console.log(filePath, uri)
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
            getinfo(filePath, function (err, file) {
                if (err) {
                    return response.sendStatus(404)
                }
                file.read(true).pipe(response)
            })
        })
            .catch(function (err) {
                response.status(500).send(err.toString())
            })
        // if (filename === name + 'db.tar.gz') {
        //     var repo = getRepo(name, arch, mirror, dir)
        // }
        

        // var httpMessage = '[GET] ' + request.path
        
        // repo.read().then(function () {
        //     return repo.getPackage(filename)
        // })
        //     .then(function (pack) {
        //         if (!pack) {
        //             return response.status(404).write('No existe el repositorio o archivo')
        //         }
        //         pack.getFile(function (err, file) {
        //             if (err) {
        //                 process.stdout.write((httpMessage + ' ' + 404).red + '\n')
        //                 return response.status(404).write('No existe el archivo')
        //             }
        //             process.stdout.write((httpMessage + ' ' + 200).green + '\n')
        //             file.read(true).pipe(response)
        //         })
        //     })
        //     .catch(function () {
        //         process.stdout.write((httpMessage + ' ' + 500).red + '\n')
        //         response.status(500).write('No puede procesar el archivo')
        //     })
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
