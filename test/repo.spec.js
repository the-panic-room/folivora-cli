var Repository = require("../src/repo"),
    assert = require("assert"),
    path = require("path")


describe("Repository", function () {
    var mirror = "http://quantum-mirror.hu/mirrors/pub/manjaro/stable/"
    it("Create repo object", function () {
        var repo = new Repository("repo", {
            path: path.resolve("./test/repo"),
            arch: "x86_64",
            mirror: mirror
        });
        repo.read().then(function (files) {
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
        repo.read().catch(function (err) {
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
        repo.read().catch(function (error) {
            // comprueba que repo tenga 4 archivos.
            assert.equal(error.code, "ENOENT")
            assert.equal(error.path, repo.path + "/" + repo.db_name)
        })
    })
})