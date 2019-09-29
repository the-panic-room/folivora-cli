const path = require('path')
const fs = require('fs')
const Database = require('./database')

class Repository {
    constructor (name, options) {
        options = options || {}
        this.name = name
        this.path = options.path
        this.mirror = options.mirror
        this.arch = options.arch || 'any'
        this.updated = 0
        var database = name + '.db.tar.gz'
        this.db = new Database(database, {
            arch: this.arch,
            mirror: this.mirror + this.name + '/' + this.arch,
            filename: database,
            path: this.path
        })
        if (this.mirror) {
            this.mirror = (this.mirror.match(/^https?:\/\//i)) ? this.mirror : 'http://' + this.mirror
        }
        if (!this.path) {
            throw new Error('Es requerido un directorio valido')
        }
    }

    updateState (callback) {
        this.updated = Date.now()
        fs.writeFile(path.join(this.path, '.state'), this.updated, callback)
    }

    readState (callback) {
        var self = this
        fs.readFile(path.join(self.path, '.state'), function (err, data) {
            if (err) {
                return callback(err)
            }
            self.updated = parseInt(data.toString())
            callback(null, self.updated)
        })
    }

    updateDatabase (verbose, force) {
        var self = this
        return new Promise(function (resolve, reject) {
            self.db.download(null, verbose)
                .on('error', reject)
                .on('finish', resolve)
        })
    }

    read () {
        var self = this
        return new Promise(function (resolve, reject) {
            self.db.read()
                .once('error', reject)
                .on('finish', resolve)
        })
    }

    getPackage (name) {
        if (!this.db.packages) {
            throw new Error('Debe cargar el repositorio primero. ejecute .read()')
        }
        return this.db.packages.filter(function (row) {
            return row.name === name || row.filename === name || (row.filename + '.sig') === name
        })[0]
    }

    check () {
        var self = this
        var errors = []
        return self.db.packages.asyncForeach(function (pkg) {
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

module.exports = Repository
