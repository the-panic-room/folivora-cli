var Repository = require("../src/repo"),
    assert = require("assert"),
    path = require("path")


describe("Repository", function () {
    it("Create repo object", function () {
        var repo = new Repository("repo", {
          path: path.resolve("./test/repo"),
          arch: "x86_64",
          mirror: "http://quantum-mirror.hu/mirrors/pub/manjaro/stable/"
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
            mirror: "http://quantum-mirror.hu/mirrors/pub/manjaro/stable/"
        });
        repo.read().catch(function (err) {
            // Verificar que no existe el directorio
            assert.equal(err.code, "ENOENT")
            assert.equal(err.path, repo.path)
        })
    })
})