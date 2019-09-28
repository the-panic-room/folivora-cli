const assert = require('assert')
const path = require('path')
const ListDirectory = require('../src/listdirectory')
const Directory = require('../src/directory')

describe('Directory', function () {
    // Pruebas de directorio.
    it('loop path', function (done) {
        var dir = new ListDirectory(path.resolve('./example/'), ['./', './'])
        var event = dir.forEach()
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
})
