const fs = require('fs')
const path = require('path')
const assert = require('assert')
const nock = require('nock')
const commands = require('../src/commands')

describe('command: check package', function () {
    it('evaluar con errores exito', function () {
        return commands.check('repo', './example', {
            test: true
        })
            .then(function (errors) {
                assert.ok(Array.isArray(errors), 'Error interno')
                assert.ok(
                    errors.length,
                    'Faltan paquetes en el repositorio y no muestra'
                )
            })
    })
    it('evaluar una carpeta no existente', function () {
        return commands.check('repo', './example/notfound', {
            test: true
        })
            .then(function (errors) {
                assert.ok(typeof errors === 'object')
                assert.strictEqual(errors.code, 'ENOENT')
            })
    })
})
describe('command: download package', function () {
    const dirPath = '/tmp/'
    const mirror = 'http://quantum-mirror.hu/mirrors/pub/manjaro/stable/'
    const dbname = 'extra.db.tar.gz'
    const baseURI = '/extra/x86_64/'
    const responseContent = 'hola'
    // before(function (done) {
    //     fs.copyFile(path.resolve('./example/' + dbname), path.join(dirPath, dbname), function (err) {
    //         done(err)
    //     })
    // })
    it('download sucess', function () {
        nock(mirror)
            .get(baseURI + dbname)
            .replyWithFile(200, path.resolve(__dirname, '../example/', dbname))
            .get(baseURI + 'acl-2.2.53-1-x86_64.pkg.tar.xz.sig')
            .reply(200, responseContent)
            .get(baseURI + 'acl-2.2.53-1-x86_64.pkg.tar.xz')
            .reply(200, responseContent)
            .get('/extra/x86_64/amd-ucode-20190726.dff98c6-1-any.pkg.tar.xz.sig')
            .reply(200, responseContent)
            .get('/extra/x86_64/amd-ucode-20190726.dff98c6-1-any.pkg.tar.xz')
            .reply(200, responseContent)
            .get('/extra/x86_64/archlinux-keyring-20190805-1-any.pkg.tar.xz.sig')
            .reply(200, responseContent)
            .get('/extra/x86_64/archlinux-keyring-20190805-1-any.pkg.tar.xz')
            .reply(200, responseContent)
            .get(baseURI + 'argon2-20190702-1-x86_64.pkg.tar.xz.sig')
            .reply(200, responseContent)
            .get(baseURI + 'argon2-20190702-1-x86_64.pkg.tar.xz')
            .reply(200, responseContent)
        return commands.download('extra', dirPath, {
            test: true,
            mirror: mirror,
            verbose: false,
            arch: 'x86_64'
        })
            .then(function (err) {
                console.log(err)
                assert.ok(typeof err === 'undefined')
            })
    })
    after(function (done) {
        fs.unlink(path.join(dirPath, 'extra.db.tar.gz'), function (err) {
            done(err)
        })
    })
})
