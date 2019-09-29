const assert = require('assert')
const path = require('path')
const ListDirectory = require('../src/listdirectory')
const Directory = require('../src/directory')
const InfoBase = require('../src/infobase')
const File = require('../src/file')

describe('Directory', function () {
    // Pruebas de directorio.
    it('loop path: good', function (done) {
        var dir = new ListDirectory(path.resolve('./example/'), ['./', './'])
        var event = dir.loop()
        event.on('data', function (data, next) {
            assert.ok(data instanceof Directory)
            next()
        })
        event.on('close', function () {
            done()
        })
        event.on('error', function (err) {
            done(err)
        })
    })
    // Pruebas de directorio callback.
    it('loop path callback: good', function (done) {
        var dir = new ListDirectory(path.resolve('./example/'), ['./', './'])
        dir.loop(function (err, data) {
            if (err) {
                done(err)
            }
            assert.ok(data instanceof Directory)
        }, done)
    })

    // Pruebas de directorio reemplazo.
    it('loop path: good replace', function (done) {
        var dir = new ListDirectory(path.resolve('./example/'), ['./', './'])
        var event = dir.loop()
        event.on('data', function (data, next) {
            var index = dir.index
            var replace = '/tmp'
            assert.ok(data instanceof Directory)
            next(null, replace)
            assert.strictEqual(dir.getRawIndex(index), replace)
        })
        event.on('close', function () {
            done()
        })
        event.on('error', function (err) {
            done(err)
        })
    })

    // Pruebas de directorio reemplazo callback.
    it('loop path callback: good replace', function (done) {
        var dir = new ListDirectory(path.resolve('./example/'), ['./', './'])
        dir.loop(function (err, data) {
            if (err) {
                done(err)
            }
            assert.ok(data instanceof Directory)
            return '/tmp'
        }, function () {
            for (var i = 0, n = dir.count(); i < n; i++) {
                assert.strictEqual(dir.getRawIndex(i), '/tmp')
            }
            done()
        })
    })

    // No existe el directorio
    it('loop path: not exist', function (done) {
        var dir = new ListDirectory(path.resolve('./example/'), ['./', './pe'])
        var event = dir.loop()
        event.on('data', function (data, next) {
            assert.ok(data instanceof Directory)
            next()
        })
        event.on('close', function () {
            done('Debe arrojar error de apertura')
        })
        event.on('error', function (err) {
            assert.strictEqual(err.code, 'ENOENT')
            done()
        })
    })

    // filtar directorios.
    it('loop path: good', function (done) {
        var dir = new ListDirectory(path.resolve('./example/'), ['./', './'])
        var event = dir.filter()
        event.on('data', function (data, next) {
            assert.ok(data instanceof Directory)
            next(null, dir.index === 0)
        })
        event.on('close', function (obj) {
            assert.strictEqual(obj.count(), 1)
            done()
        })
        event.on('error', function (err) {
            done(err)
        })
    })
    // Pruebas de directorio callback.
    it('loop path callback: good', function (done) {
        var dir = new ListDirectory(path.resolve('./example/'), ['./', './'])
        dir.filter(function (err, data, index) {
            if (err) {
                done(err)
            }
            assert.ok(data instanceof Directory)
            return index === 0
        }, function (obj) {
            assert.strictEqual(obj.count(), 1)
            done()
        })
    })
})
describe('Utils Directory', function () {
    it('InfoBase:constructor', function () {
        var url = '/tmp'
        var obj = new InfoBase(url, {
            size: 1000
        })
        assert.strictEqual(obj.name, 'tmp')
        assert.strictEqual(obj.path, url)
        assert.strictEqual(obj.ext, '')
        assert.strictEqual(obj.dir, '/')
        assert.strictEqual(obj.isDir(), false)
        assert.strictEqual(obj.isFile(), false)
    })
    it('Directory:constructor', function () {
        var url = '/tmp'
        var obj = new Directory(url)
        assert.strictEqual(obj.name, 'tmp')
        assert.strictEqual(obj.path, url)
        assert.strictEqual(obj.ext, '')
        assert.strictEqual(obj.dir, '/')
        assert.strictEqual(obj.isDir(), true)
        assert.strictEqual(obj.isFile(), false)
    })
    it('Directory:list', function () {
        var url = './example'
        var obj = new Directory(url)
        return obj.list().then(function (dirs) {
            assert.ok(dirs instanceof ListDirectory)
            return Promise.all([
                dirs.find('acl-2.2.53-1-x86_64.pkg.tar.xz'),
                dirs.find('acl-2.2.53-1-x86_64.pkg.tar.x')
            ])
        })
            .then(function (data) {
                assert.ok(data[0])
                assert.ok(!data[1])
            })
    })
    it('File: Constructor', function () {
        var url = './example/acl-2.2.53-1-x86_64.pkg.tar.xz'
        var obj = new File(url, {
            size: 135020 // bytes
        })
        assert.strictEqual(obj.name, 'acl-2.2.53-1-x86_64.pkg.tar')
        assert.strictEqual(obj.path, path.resolve(url))
        assert.strictEqual(obj.ext, '.tar')
        assert.strictEqual(obj.dir, path.resolve('./example/'))
        assert.strictEqual(obj.isDir(), false)
        assert.strictEqual(obj.isFile(), true)
        assert.strictEqual(obj.isCompress(), true)
    })
    it('File: listCompress', function () {
        var url = './example/extra.db.tar.gz'
        var obj = new File(url, {
            size: 135020 // bytes
        })
        obj.listCompress().on('entry', function (data) {
            assert.ok(data)
        })
    })
    it('File: read', function (done) {
        var url = './example/extra.db.tar.gz'
        var obj = new File(url, {
            size: 135020 // bytes
        })
        obj.read().on('entry', function (data) {
            assert.ok(data)
            done()
        }).on('error', done)
    })
})
