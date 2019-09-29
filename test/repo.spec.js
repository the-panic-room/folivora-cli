const assert = require('assert')
const fs = require('fs')
const path = require('path')
const nock = require('nock')

describe('Repository', function () {
    var mirror = 'http://quantum-mirror.hu/mirrors/pub/manjaro/stable/'
    var responseContent = 'hola'
    const responseHeader = {
        'content-length': responseContent.length
    }
    nock(mirror)
        .get('/repo/x86_64/repo.db.tar.gz')
        .reply(200, responseContent, responseHeader)
    const Repository = require('../src/repo')

    it('Create repo object', function () {
        var repo = new Repository('repo', {
            path: path.resolve('./example'),
            arch: 'x86_64',
            mirror: mirror
        })
        return repo.read().then(function (files) {
            // comprueba que repo tenga 4 archivos.
            assert.strictEqual(files.count(), 4)
        })
    })
    it('create repo object failed. (not exist path)', function () {
        var repo = new Repository('repo', {
            path: path.resolve('/tmp/file'),
            arch: 'x86_64',
            mirror: mirror
        })
        return repo.read().catch(function (err) {
            // Verificar que no existe el directorio
            assert.strictEqual(err.code, 'ENOENT')
            assert.strictEqual(err.path, repo.path)
        })
    })
    it('create repo database invalid', function () {
        var repo = new Repository('notfound', {
            path: path.resolve('./example'),
            arch: 'x86_64',
            mirror: mirror
        })
        return repo.read().catch(function (error) {
            assert.strictEqual(error.code, 'ENOENT')
            assert.strictEqual(error.path, repo.path + '/' + repo.db_name)
        })
    })
    it('download database', function () {
        var repo = new Repository('repo', {
            path: path.resolve('/tmp'),
            arch: 'x86_64',
            mirror: mirror
        })
        return repo.updateDatabase()
            .then(function () {
                assert.ok(repo.db, 'No existe el objeto de la base de datos')
                return new Promise(function (resolve, reject) {
                    repo.db.read(function (err, file) {
                        if (err) {
                            return reject(err)
                        }
                        resolve(file)
                    })
                })
            })
            .then(function () {
                return new Promise(function (resolve, reject) {
                    fs.unlink(repo.db.path, function (err) {
                        if (err) {
                            return reject(err)
                        }
                        resolve()
                    })
                })
            })
    })
})
