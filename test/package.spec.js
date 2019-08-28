const fs = require('fs')
const assert = require('assert')
const path = require('path')
const Package = require('../src/package')
const nock = require('nock')

describe('Package', function () {
    var options = {
        version: '2.2.53-1',
        filename: 'acl-2.2.53-1-x86_64.pkg.tar.xz',
        md5: 'aaaea535e603f2b55cb320a42cc70397',
        arch: 'x86_64',
        path: path.resolve('./example/')
    }
    var packageName = 'acl'
    var mirror = 'http://quantum-mirror.hu/mirrors/pub/manjaro/stable/'
    it('new Package', function () {
        var pack = new Package(packageName, options)
        assert.strictEqual(pack.filename, options.filename)
        assert.strictEqual(pack.version, options.version)
        assert.strictEqual(pack.md5, options.md5)
        assert.strictEqual(pack.arch, options.arch)
        assert.strictEqual(pack.path, path.join(options.path, options.filename))
        assert.strictEqual(pack.pathSig, path.join(options.path, options.filename + '.sig'))
    })
    it('package checkSum', function (done) {
        var pack = new Package(packageName, options)
        pack.checkSum(function (error, hash) {
            if (error) {
                return done(error)
            }
            assert.strictEqual(hash, pack.md5)
            done()
        })
    })
    it('package checkSum invalid not exist file', function (done) {
        var options = {
            version: '2.2.53-1',
            filename: 'acl-2.2.51-1-x86_64.pkg.tar.xz',
            md5: 'aaaea535e603f2b55cb320a42cc70397',
            arch: 'x86_64',
            path: path.resolve('./example/')
        }
        var pack = new Package(packageName, options)
        pack.checkSum(function (error, hash) {
            if (error) {
                try {
                    assert.strictEqual(error.code, 'ENOENT')
                    done()
                } catch (error) {
                    done(error)
                }
                return
            }
            done('Esperaba un error al no existir archivo')
        })
    })
    it('download package', function (done) {
        var baseURI = '/repo/x86_64/'
        var responseContent = 'hola'
        var opt = Object.assign({}, options)
        opt.path = path.resolve('/tmp/')
        opt.md5 = '4d186321c1a7f0f354b297e8914ab240'
        opt.mirror = mirror + 'repo/x86_64'
        nock(mirror)
            .get(baseURI + opt.filename)
            .reply(200, responseContent)
            .get(baseURI + opt.filename + '.sig')
            .reply(200, responseContent)
        const MockPackage = require('../src/package')
        var pack = new MockPackage(packageName, opt)
        pack.download(function (error, file) {
            if (error) {
                return done(error)
            }
            fs.unlink(pack.path, function (err) {
                if (err) {
                    return done(err)
                }
                fs.unlink(pack.pathSig, function (err) {
                    if (err) {
                        return done(err)
                    }
                    done()
                })
            })
        })
    })
    it('download package corrupt', function (done) {
        var baseURI = '/repo/x86_64/'
        var responseContent = 'hola'
        var opt = Object.assign({}, options)
        opt.path = path.resolve('/tmp/')
        opt.md5 = '4d186321c1a7f0f354b297e8924ab230'
        opt.mirror = mirror + 'repo/x86_64'
        nock(mirror)
            .get(baseURI + opt.filename)
            .reply(200, responseContent)
            .get(baseURI + opt.filename + '.sig')
            .reply(200, responseContent)
        const MockPackage = require('../src/package')
        var pack = new MockPackage(packageName, opt)
        pack.download(function (error, file) {
            if (error) {
                try {
                    assert.strictEqual(error.code, 'CORRUPT')
                    return done()
                } catch (err) {
                    return done(err)
                }
            }
            done(
                new Error('Esperado un error por integridad del archivo')
            )
        })
    })
    it('package info file', function (done) {
        var pack = new Package(packageName, options)
        pack.getFile(function (err, file) {
            if (err) {
                return done(err)
            }
            assert.strictEqual(file.path, pack.path)
            assert.strictEqual(file.name + '.xz', pack.filename)
            done()
        })
    })
    it('package info file error', function (done) {
        var opt = Object.assign({}, options)
        opt.filename = 'acl-15-20.tar.xz'
        var pack = new Package(packageName, opt)
        pack.getFile(function (err, file) {
            if (err) {
                assert.strictEqual(err.code, 'ENOENT')
                return done()
            }
            done('Esperando un error de archivos')
        })
    })
    it('package info signature', function (done) {
        var pack = new Package(packageName, options)
        pack.getSign(function (err, file) {
            if (err) {
                return done(err)
            }
            assert.strictEqual(file.path, pack.pathSig)
            assert.strictEqual(file.name, pack.filename)
            done()
        })
    })
    it('package info file signature error', function (done) {
        var opt = Object.assign({}, options)
        opt.filename = 'acl-15-20.tar.xz'
        var pack = new Package(packageName, opt)
        pack.getSign(function (err, file) {
            if (err) {
                assert.strictEqual(err.code, 'ENOENT')
                return done()
            }
            done('Esperando un error de archivos')
        })
    })
    it('package check file', function (done) {
        var pack = new Package(packageName, options)
        pack.check(function (err) {
            if (err.length) {
                return done(err)
            }
            done()
        })
    })
    it('package check file not exist', function (done) {
        var opt = Object.assign({}, options)
        opt.filename = 'acl-15-20.tar.xz'
        var pack = new Package(packageName, opt)
        pack.check(function (err, file) {
            if (err.length) {
                assert.strictEqual(err[0].code, 'ENOENT')
                return done()
            }
            done('Esperando un error de archivos')
        })
    })
    it('package check file md5 invalid', function (done) {
        var opt = Object.assign({}, options)
        opt.md5 = '4d186321c1a7f0f354b297e8521ab130'
        var pack = new Package(packageName, opt)
        pack.check(function (err, file) {
            if (err.length) {
                assert.strictEqual(err[0].code, 'CORRUPT')
                return done()
            }
            done('Esperando un error de archivos')
        })
    })
})
