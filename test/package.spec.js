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
        path: path.resolve('./test/repo/')
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
                done(error)
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
            path: path.resolve('./test/repo/')
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
        var opt = Object.assign({
            path: path.resolve('/tmp/'),
            md5: '4d186321c1a7f0f354b297e8914ab240',
            mirror: mirror + 'repo/x86_64'
        }, options)
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
            done()
        })
    })
})
