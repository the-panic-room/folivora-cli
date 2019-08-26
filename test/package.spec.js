var assert = require("assert"),
    path = require("path"),
    Package = require("../src/package")


describe("Package", function () {
    it("new Package", function () {
        var options = {
            version: "2.2.53-1",
            filename: "acl-2.2.53-1-x86_64.pkg.tar.xz",
            md5: "aaaea535e603f2b55cb320a42cc70397",
            arch: "x86_64",
            path: path.resolve("./test/repo/")
        }
        var pack = new Package("acl", options)
        assert.equal(pack.filename, options.filename)
        assert.equal(pack.version, options.version)
        assert.equal(pack.md5, options.md5)
        assert.equal(pack.arch, options.arch)
        assert.equal(pack.path, path.join(options.path, options.filename))
        assert.equal(pack.pathSig, path.join(options.path, options.filename + ".sig"))
    })
    it("package checkSum", function (done) {
        var options = {
            version: "2.2.53-1",
            filename: "acl-2.2.53-1-x86_64.pkg.tar.xz",
            md5: "aaaea535e603f2b55cb320a42cc70397",
            arch: "x86_64",
            path: path.resolve("./test/repo/")
        }
        var pack = new Package("acl", options)
        pack.checkSum(function (error, hash) {
            if (error) {
                done(error)
            }
            assert.equal(hash, pack.md5)
            done()
            // aqui va assert
        })
    })
})