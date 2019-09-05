require('colors')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const Repository = require('./repo')
const getInfo = require('./infofile')
const utils = require('./utils')

module.exports.check = function (name, dir, cmd) {
    var repo = new Repository(name, {
        path: dir,
        arch: cmd.arch,
        mirror: cmd.mirror
    })
    return repo.read()
        .then(function () {
            return repo.check()
        })
        .then(function (errors) {
            if (cmd.test) {
                return errors
            }
            if (errors.length) {
                process.stdout.write(('El repositorio posee ' + errors.length + ' errores').red)
                process.stdout.write('\n\n')
                errors.forEach(function (_package) {
                    process.stdout.write(('[' + _package.package.name + ']').red)
                    process.stdout.write('\n\n')
                    _package.errors.forEach(function (error) {
                        var pathLog = error.path || _package.package.path
                        process.stdout.write('    ')
                        process.stdout.write(pathLog.red)
                        process.stdout.write('\n    ')
                        process.stdout.write(utils.errorMessages[error.code].red)
                        process.stdout.write('\n\n')
                    })
                })
                process.stdout.write('Use el comando \'mirror-cli fix <repo-name> <repo-path>\' para reparar las dependencias dañadas\n'.yellow)
            }
        })
        .catch(function (err) {
            if (cmd.test) {
                return err
            }
            process.stdout.write('Error: \n\n')
            process.stdout.write(utils.errorMessages[err.code].red + '\n')
        })
}

module.exports.download = function (name, dir, cmd) {
    var repo = new Repository(name, {
        path: dir,
        arch: cmd.arch,
        mirror: cmd.mirror
    })
    repo.read()
        .then(function () {
            return new Promise(function (resolve, reject) {
                getInfo(dir, function (err) {
                    if (err) {
                        return mkdirp(dir, function (err) {
                            if (err) {
                                return reject(err)
                            }
                            resolve()
                        })
                    }
                    resolve()
                })
            })
        })
        .then(function () {
            return repo.updateDatabase()
        })
        .then(function () {
            return repo.packages.asyncForeach(function (pkg) {
                return new Promise(function (resolve, reject) {
                    pkg.download(function (err, file) {
                        if (cmd.verbose && err) {
                            process.stdout.write(('No se pudo descargar el archivo ' + pkg.filename).red + '\n')
                        }
                        resolve(err)
                    }, false, false, cmd.verbose)
                })
            })
        })
        .catch(function (err) {
            if (!cmd.verbose) {
                return err
            }
            process.stdout.write(err.toString().red + '\n')
        })
}

module.exports.copy = function (name, src, dest, cmd) {
    var repo = new Repository(name, {
        path: src
    })
    return repo.read()
        .then(function () {
            return new Promise(function (resolve, reject) {
                getInfo(dest, function (err) {
                    if (err) {
                        return mkdirp(dest, function (err) {
                            if (err) {
                                return reject(err)
                            }
                            resolve()
                        })
                    }
                    resolve()
                })
            })
        })
        .then(function () {
            return new Promise(function (resolve, reject) {
                fs.copyFile(repo.db.path, path.resolve(dest, repo.db_name), function (err) {
                    if (err) {
                        return reject(err)
                    }
                    resolve()
                })
            })
        })
        .then(function () {
            return repo.packages.asyncForeach(function (pkg) {
                return new Promise(function (resolve, reject) {
                    pkg.checkSum(function (err, hash) {
                        if (err) {
                            return reject(err)
                        }
                        if (hash !== pkg.md5) {
                            err = new Error('El archivo esta corrupto o dañado')
                            err.code = 'CORRUPT'
                            return reject(err)
                        }
                        fs.copyFile(pkg.path, path.resolve(dest, pkg.filename), function (err) {
                            if (err) {
                                return reject(err)
                            }
                            fs.copyFile(pkg.pathSig, path.resolve(dest, pkg.filename + '.sig'), function (err) {
                                if (err) {
                                    return reject(err)
                                }
                                resolve()
                            })
                        })
                    })
                })
                    .catch(function (err) {
                        process.stdout.write((utils.errorMessages[err.code] + ' ' + pkg.path + '\n').red + '\n')
                    })
            })
        })
        .catch(function (err) {
            process.stdout.write(err.toString().red)
        })
}

// module.exports.fixFunc = function (dir, cmd) {
//     dir = dir || process.cwd()
//     console.log(dir)
//     getInfo(dir, function (err, info) {
//         if (err) {
//             throw err
//         }
//         if (!info.isDir()) {
//             throw new Error("'origin' debe ser un directorio valido")
//         }
//         // listar directorios del origen
//         info.list()
//             .then(function (dirs) {
//                 // obtener directorios validos del origen
//                 return dirs.filter(function (dir, index) {
//                     var ignore = !dir.isDir() || utils.REPO_AVAILABLE.indexOf(dir.name) === -1
//                     if (ignore) {
//                         if (cmd.verbose) {
//                             console.warn("Ignorando directorio o archivo '" + dir.name + "' no es un repositorio valido")
//                         }
//                     }
//                     return !ignore
//                 })
//             })
//             .then(function (dirs) {
//                 // listar todos los archivos del directorio
//                 return dirs.map(function (dir) {
//                     return dir.list()
//                         .then(function (files) {
//                             return files.filter(function (file) {
//                                 return !(/\.sig$/.test(file.path))
//                             })
//                         })
//                 })
//             })
//             .then(function (dirs) {
//                 // recorrer el repositorio de origen
//                 return dirs.forEach(function (repo) {
//                     if (cmd.verbose) {
//                         console.info('Ingresando al repositorio ' + repo.info.name)
//                     }
//                     // recorrer los archivos del repo actual del origen
//                     return repo.forEach(function (file, index) {
//                         if (!file.isFile()) {
//                             if (cmd.verbose) {
//                                 console.warn('Ignorando directorio ' + file.name)
//                             }
//                             return
//                         }
//                         return new Promise(function (resolve, reject) {
//                             var pathSign = file.path + '.sig'
//                             getInfo(pathSign, function (err, info) {
//                                 if (err) {
//                                     console.warn('El paquete %s no posee un signature', file.name)
//                                     return fs.unlink(file.path, function (err) {
//                                         if (err) {
//                                             reject(err)
//                                         }
//                                         resolve()
//                                     })
//                                 }
//                                 resolve(info)
//                             })
//                         })
//                     })
//                 })
//             })
//             .catch(function (err) {
//                 console.error(err)
//             })
//     })
// }
