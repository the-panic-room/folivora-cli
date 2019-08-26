var assert = require("assert"),
    path = require("path"),
    Package = require("../src/package"),
    nock = require('nock')


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
        })
    })
    it("package checkSum invalid not exist file", function (done) {
        var options = {
            version: "2.2.53-1",
            filename: "acl-2.2.51-1-x86_64.pkg.tar.xz",
            md5: "aaaea535e603f2b55cb320a42cc70397",
            arch: "x86_64",
            path: path.resolve("./test/repo/")
        }
        var pack = new Package("acl", options)
        pack.checkSum(function (error, hash) {
            if (error) {
                try {
                    assert.equal(error.code, "ENOENT")
                    done()
                } catch(error) {
                    done(error)
                }
                return
            }
            done("Esperaba un error al no existir archivo")
        })
    })
    it("download package", function (done) {
        var mirror = "http://quantum-mirror.hu/mirrors/pub/manjaro/stable/"
        var baseURI = '/repo/x86_64/'
        var responseContent = "hola"
        var options = {
            version: "2.2.53-1",
            filename: "acl-2.2.51-1-x86_64.pkg.tar.xz",
            md5: "4d186321c1a7f0f354b297e8914ab240",
            arch: "x86_64",
            path: path.resolve("/tmp/"),
            mirror: mirror + 'repo/x86_64'
        }
        nock(mirror)
            .get(baseURI + options.filename)
            .reply(200, responseContent)
            .get(baseURI + options.filename + ".sig")
            .reply(200, responseContent)
        const MockPackage = require("../src/package")
        var pack = new MockPackage("acl", options)
        pack.download(function (error, file) {
            if (error) {
                return done(error)
            }
            done()
        })
    })
})