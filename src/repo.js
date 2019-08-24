const getInfo = require("./directory").getInfo,
    File = require("./directory").File,
    Package = require("./package"),
    path = require("path"),
    tmp = require('tmp'),
    fs = require('fs')


class PackageList {
    constructor(arr) {
        this.__data__ = arr || []
    }
    get(index) {
        return this.__data__[index]
    }
    set(index, val) {
        this.__data__[index] = val
    }
    count() {
        return this.__data__.length
    }
    isEnd() {
        return this.index >= this.count()
    }
    next() {
        this.index++
    }
    push(data) {
        this.__data__.push(data)
    }
    filter(callback) {
        return this.__data__.filter(callback)
    }
    foreach(callback) {
        return this.__data__.foreach(callback)
    }
    asyncForeach (callback) {
        var self = this
        return new Promise(function (resolve, reject) {
            function loop () {
                if (self.isEnd()) {
                    return resolve()
                }
                let p1 = callback(self.get(self.index), self.index)
                self.next()
                if (p1 instanceof Promise) {
                    return p1.then(loop)
                            .catch(reject)
                }
                loop()
            }
            self.index = 0
            loop()
        })
    }
    map(callback) {
        return this.__data__.map(callback)
    }
    getAll() {
        return this.__data__
    }
}


class Repository {
    constructor(name, options) {
        options = options || {}
        this.name = name
        this.path = options.path
        this.mirror = options.mirror
        this.arch = options.arch || "any"
        if (this.mirror) {
            this.mirror = (this.mirror.match(/^https?:\/\//i)) ? this.mirror : "http://" + this.mirror
        }
        this.db_name = name + ".db.tar.gz"
        if (!this.path) {
            throw new Error("Es requerido un directorio valido")
        }
    }
    updateDatabase () {
        var self = this
        return new Promise(function (resolve, reject) {
            var packageDB = new Package(self.name, {
                arch: self.arch,
                mirror: self.mirror + self.name + "/" + self.arch,
                filename: self.db_name,
                path: self.path
            })
            packageDB.download(function (err) {
                if (err) {
                    return reject(err)
                }
                self.db = packageDB
                resolve()
            }, true)
        })
    }
    read() {
        var self = this
        return new Promise(function (resolve, reject) {
            getInfo(self.path, function (err, info) {
                if (err) {
                    return reject(err)
                }
                resolve(info)
            })
        })
        .then(function (data) {
            if (!data.isDir()) {
                throw new Error("El repositorio debe ser un directorio valido")
            }
            self.dir = data
            return new Promise(function (resolve, reject) {
                getInfo(path.join(self.dir.path, self.db_name), function (err, info) {
                    if (err) {
                        return reject(err)
                    }
                    resolve(info)
                })
            })
        })
        .then(function (db) {
            self.db = db
            var files = new PackageList()
            return new Promise(function (resolve, reject) {
                db.read()
                .on("error", reject)
                .on("entry", function (file) {
                    file.collect().then(function (data) {
                        var text = data.toString(),
                            dir = file.path
                        if (text) {
                            var options = {
                                version: text.match(/\%VERSION\%\n(.*)/i)[1],
                                filename: text.match(/\%FILENAME\%\n(.*)/i)[1],
                                md5: text.match(/\%MD5SUM\%\n(.*)/i)[1],
                                arch: text.match(/\%ARCH\%\n(.*)/i)[1],
                                path: self.path
                            }
                            options.mirror = self.mirror + self.name + "/" + options.arch
                            files.push(
                                new Package(
                                    text.match(/\%NAME\%\n(.*)/i)[1],
                                    options
                                )
                            )
                        }
                    })
                })
                .on("end", function () {
                    tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
                        if (err) {
                            return reject(err)
                        }
                        self.clean = cleanupCallback
                        self.packages = files
                        fs.writeFile(path, JSON.stringify(files.getAll()), function (err) {
                            if (err) {
                                return reject(err)
                            }
                            self.fileDB = new File(path)
                            resolve(files)
                        })
                    });
                })
            })
        })
    }
    getPackage(name) {
        if (!this.packages) {
            throw new Error("Debe cargar el repositorio primero. ejecute .read()")
        }
        return this.packages.filter(function (row) {
            return row.name === name
        })[0]        
    }
    foreach(callback) {
        var self = this
        return new Promise(function (resolve, reject) {

        })
    }
    check() {
        var self = this
        var errors = []
        return self.packages.asyncForeach(function (pkg) {
            var error = {
                package: pkg,
                errors: []
            }
            return new Promise(function (resolve, reject) {
                pkg.check(function (errs) {
                    if (errs.length) {
                        error.errors = errs
                        errors.push(error)
                    }
                    resolve(errs)
                })
            })
        })
        .then(function () {
            return errors
        })
    }
}


function _getPackage(obj, files, name) {
    var isFile = files.filter(function (row) {
        return row.name === name
    })[0]
    if (!isFile) {
        return null
    }
    return new Promise(function (resolve, reject) {
        getInfo(path.join(obj.path, isFile.filename), function (err, info) {
            if (err) {
                isFile.exist = false
            } else {
                isFile.exist = true
                isFile.file = info
            }
            resolve(isFile)
        })
    })
}

module.exports = Repository