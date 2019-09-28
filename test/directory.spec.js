const assert = require('assert')
const path = require('path')
const ListDirectory = require('../src/listdirectory')
const Directory = require('../src/directory')

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
