var assert = require("assert"),
    path = require("path"),
    mockery = require("mockery"),
    nock = require('nock'),
    httpMocks = require('node-mocks-http'),
    EventEmitter = require('events').EventEmitter


describe("Repository", function () {
    var mirror = "http://quantum-mirror.hu/mirrors/pub/manjaro/stable/"
    nock(mirror)
        .get('/repo/x86_64/repo.db.tar.gz')
        .reply(200, {
            message: "hola"
        });    
    const Repository = require("../src/repo")

    it("Create repo object", function () {
        var repo = new Repository("repo", {
            path: path.resolve("./test/repo"),
            arch: "x86_64",
            mirror: mirror
        });
        return repo.read().then(function (files) {
            // comprueba que repo tenga 4 archivos.
            assert.equal(files.count(), 4)
        })
    })
    it("create repo object failed. (not exist path)", function () {
        var repo = new Repository("repo", {
            path: path.resolve("/tmp/file"),
            arch: "x86_64",
            mirror: mirror
        });
        return repo.read().catch(function (err) {
            // Verificar que no existe el directorio
            assert.equal(err.code, "ENOENT")
            assert.equal(err.path, repo.path)
        })
    })
    it("create repo database invalid", function () {
        var repo = new Repository("notfound", {
            path: path.resolve("./test/repo"),
            arch: "x86_64",
            mirror: mirror
        });
        return repo.read().catch(function (error) {
            assert.equal(error.code, "ENOENT")
            assert.equal(error.path, repo.path + "/" + repo.db_name)
        })
    })
    it("download database", function () {
        var repo = new Repository("repo", {
            path: path.resolve("/tmp"),
            arch: "x86_64",
            mirror: mirror
        });
        return repo.updateDatabase().then(function () {
            assert.ok(repo.db, "No existe el objeto de la base de datos")
            return new Promise(function (resolve, reject) {
                repo.db.getFile(function (err, file) {
                    if (err) {
                        return reject(err)
                    }
                    resolve(file)
                })
            })
        })
    })
})