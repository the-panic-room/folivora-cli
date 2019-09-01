require('colors')
const path = require('path')
const express = require('express')
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
    app.get('/:system/:name/:arch/:filename', function (request, response, next) {
        const name = request.params.name
        const arch = request.params.arch
        const filename = (request.params.filename === name) ? request.params.filename + 'db.tar.gz' : request.params.filename
        const system = request.params.system
        const uri = MIRRORS[system.toLowerCase()]
        const filePath = path.resolve(dir, system, name, arch, filename)
        console.log(filePath, uri)
        getinfo(filePath, function (err, file) {
            if (err) {
                console.log(err)
                return response.sendStatus(404)
            }
            file.read(true).pipe(response)
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
