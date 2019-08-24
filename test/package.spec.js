var assert = require("assert"),
    Package = require("../src/package")


describe("Package", function () {
    it("new Package", function () {
        var options = {
            version: "2.2.53-1",
            filename: "acl-2.2.53-1-x86_64.pkg.tar.xz",
            md5: "aaaea535e603f2b55cb320a42cc70397",
            arch: "x86_64"
        }
        var pack = new Package("acl", options)
        assert.equal(pack.filename, options.filename)
        assert.equal(pack.version, options.version)
        assert.equal(pack.md5, options.md5)
        assert.equal(pack.arch, options.arch)
    })
})