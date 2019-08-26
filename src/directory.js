const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const tar = require('tar')

class InfoBase {
    constructor (uri, stat) {
        stat = stat || {}
        this.path = path.resolve(uri)
        var datapath = path.parse(this.path)
        this.name = datapath.name
        this.ext = datapath.ext
        this.dir = datapath.dir
        this.basename = path.basename(this.path)
        this.size = stat.size
    }

    isFile () {
        return false
    }

    isDir () {
        return false
    }
}

class File extends InfoBase {
    constructor (uri, stat) {
        super(uri, stat)
        this.ext = path.extname(this.name)
    }

    isFile () {
        return true
    }

    isCompress () {
        const compress = ['.zip', '.tar', '.gz', '.xz', '.rar']
        return compress.indexOf(this.ext) !== -1
    }

    listCompress () {
        if (!this.isCompress()) {
            throw new Error('Solo puede listarse archivos comprimidos')
        }
        if (this.ext !== '.tar') {
            return this.read()
        }
        return this.read(true).pipe(tar.t())
    }

    read (only) {
        let file = fs.createReadStream(this.path)
        if (!only && this.isCompress()) {
            if (['.zip', '.tar'].indexOf(this.ext) !== -1) {
                file = file.pipe(zlib.Unzip())
            }
            if (this.ext === '.tar') {
                file = file.pipe(new tar.Parse())
            }
        }
        return file
    }

    write (data) {
        let file = fs.createWriteStream(this.path)
        if (this.isCompress()) {
            if (this.ext === '.zip') {
                file = file.pipe(zlib.createGzip())
            }
            if (this.ext === '.tar') {
                const Tar = tar.c
                file = file.pipe(new Tar())
            }
        }
        return file
    }
}

class Directory extends InfoBase {
    isDir () {
        return true
    }

    list () {
        var self = this
        return new Promise(function (resolve, reject) {
            fs.readdir(self.path, function (err, dirs) {
                if (err) {
                    return reject(err)
                }
                resolve(new ListDirectory(self.path, dirs, self))
            })
        })
    }
}

class ListDirectory {
    constructor (parent, dirs, info) {
        this.index = 0
        this.parent = parent
        this.__paths__ = dirs || []
        this.info = info
    }

    isLoadedIndex (index) {
        return this.__paths__[index] instanceof InfoBase
    }

    count () {
        return this.__paths__.length
    }

    getIndex (index) {
        var self = this
        if (typeof this.__paths__[index] === 'undefined' || self.isLoadedIndex(index)) {
            return self.__paths__[index]
        }
        return new Promise(function (resolve, reject) {
            getInfo(path.join(self.parent, self.__paths__[index]), function (err, info) {
                if (err) {
                    return reject(err)
                }
                self.__paths__[index] = info
                resolve(info)
            })
        })
    }

    next () {
        return this.getIndex(this.index)
    }

    isLast () {
        return typeof this.__paths__[this.index] === 'undefined'
    }

    __loop (callback, replace, edit, exclude) {
        var self = this
        var results = []
        self.index = 0
        return new Promise(function (resolve, reject) {
            function getResultLoop (result, index) {
                if (result instanceof Promise) {
                    return result.then(function (data) {
                        if (replace && (data || !exclude)) {
                            results.push((edit) ? data : self.getIndex(index))
                        }
                        self.index++
                        return loop()
                    })
                        .catch(function (err) {
                            reject(err)
                        })
                }
                if (replace && (result || !exclude)) {
                    results.push((edit) ? result : self.getIndex(index))
                }
                self.index++
                return loop()
            }
            function loop () {
                if (self.isLast()) {
                    return resolve((replace) ? results : null)
                }
                var result = self.next()
                if (result instanceof Promise) {
                    return result.then(function (data) {
                        getResultLoop(callback(data, self.index), self.index)
                    })
                        .catch(function (err) {
                            reject(err)
                        })
                }
                getResultLoop(callback(result, self.index), self.index)
            }
            loop()
        })
    }

    map (callback) {
        return this.__loop(callback, true, true, false)
    }

    forEach (callback) {
        return this.__loop(callback, false)
    }

    filter (callback) {
        var self = this
        return self.__loop(callback, true, false, true)
            .then(function (results) {
                return new ListDirectory(self.parent, results, self.info)
            })
    }
}

function getInfo (uri, callback) {
    fs.stat(uri, function (err, info) {
        if (err) {
            return callback(err)
        }
        var Instance = InfoBase
        if (info.isDirectory()) {
            Instance = Directory
        }
        if (info.isFile()) {
            Instance = File
        }
        callback(null, new Instance(uri, info))
    })
}

module.exports.InfoBase = InfoBase
module.exports.File = File
module.exports.Directory = Directory
module.exports.ListDirectory = ListDirectory
module.exports.getInfo = getInfo
