require('colors')
const fs = require('fs')
const path = require('path')
const Repository = require('./repo')
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
    return repo.updateDatabase()
        .then(function () {
            return repo.read()
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
                fs.copyFile(repo.db.path, path.resolve(dest, repo.db.filename), function (err) {
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
                            process.stdout.write(('Error al procesar archivo' + pkg.path).red)
                            return resolve()
                        }
                        if (hash !== pkg.md5) {
                            process.stdout.write(('El archivo esta corrupto o dañado ' + pkg.path).red)
                            return resolve()
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
            })
        })
        .catch(function () {
            process.stdout.write('No existe la base de datos'.red)
        })
}
// const fs = require('fs')
// const path = require('path')
// const utils = require('./utils')
// const getInfo = require('./directory').getInfo
// const Repository = require('./repo')
// require('colors')

// module.exports.moveFunc = function (origin, cmd) {
//     var destiny = cmd.path || process.cwd()
//     const ext = '.sig'
//     var destinyDirs = []

//     Promise.all([
//         // Obtener info del origen
//         new Promise(function (resolve, reject) {
//             getInfo(origin, function (err, info) {
//                 if (err) {
//                     return reject(err)
//                 }
//                 resolve(info)
//             })
//         }),
//         // Obtener info del destino
//         new Promise(function (resolve, reject) {
//             getInfo(destiny, function (err, info) {
//                 if (err) {
//                     return reject(err)
//                 }
//                 destiny = info
//                 // listar todos los directorios del destino
//                 info.list().then(function (dirs) {
//                     resolve(dirs)
//                 })
//             })
//         })
//     ])
//         .then(function (rows) {
//             var info = rows[0]
//             destinyDirs = rows[1]
//             if (!info.isDir()) {
//                 throw new Error('\'origin\' debe ser un directorio valido')
//             }
//             // listar directorios del origen
//             info.list()
//                 .then(function (dirs) {
//                     // obtener directorios validos del origen
//                     return dirs.filter(function (dir, index) {
//                         var ignore = !dir.isDir() || utils.REPO_AVAILABLE.indexOf(dir.name) === -1
//                         if (ignore) {
//                             if (cmd.verbose) {
//                                 console.warn('Ignorando directorio o archivo \'' + dir.name + '\' no es un repositorio valido')
//                             }
//                         }
//                         return !ignore
//                     })
//                 })
//                 .then(function (dirs) {
//                     // listar todos los archivos del directorio
//                     return dirs.map(function (dir) {
//                         return dir.list()
//                             .then(function (files) {
//                                 return files.filter(function (file) {
//                                     return !(/\.sig$/.test(file.path))
//                                 })
//                             })
//                     })
//                 })
//                 .then(function (dirs) {
//                     // recorrer el repositorio de origen
//                     return dirs.forEach(function (repo) {
//                         if (cmd.verbose) {
//                             console.info('Ingresando al repositorio ' + repo.info.name)
//                         }
//                         // recorrer los archivos del repo actual del origen
//                         return repo.forEach(function (file, index) {
//                             if (!file.isFile()) {
//                                 if (cmd.verbose) {
//                                     console.warn('Ignorando directorio ' + file.name)
//                                 }
//                                 return
//                             }
//                             var _package = utils.parsePackage(file.name)
//                             // recorrer directorios del destino
//                             return destinyDirs.forEach(function (dirDestiny) {
//                                 if (!dirDestiny.isDir() || dirDestiny.name !== repo.info.name) {
//                                     return
//                                 }
//                                 // listar todos los archivos del repositorio destino igual al origen
//                                 return dirDestiny.list()
//                                     .then(function (dirsDestiny) {
//                                         // filtra los archivos duplicados del repositorio destino igual al origen
//                                         return Promise.all([
//                                             dirsDestiny.filter(function (file2) {
//                                                 var package2 = utils.parsePackage(file2.name)
//                                                 var isEqual = !(/\.sig$/.test(file2.path)) && file2.isFile() && package2.name === _package.name
//                                                 return isEqual && _package.version !== package2.version
//                                             }),
//                                             new Promise(function (resolve, reject) {
//                                                 getInfo(file.path + ext, function (err) {
//                                                     resolve(!err)
//                                                 })
//                                             })
//                                         ])
//                                             .then(function (data) {
//                                                 // terminado recorrido de los archivos del repositorio destino
//                                                 var apply = []
//                                                 var files = data[0]
//                                                 var isExistSign = data[1]
//                                                 if (!isExistSign) {
//                                                     console.warn('El paquete %s no posee un signature confiable', file.name)
//                                                     return
//                                                 }
//                                                 if (files.count()) {
//                                                     console.log('Existe una nueva versión para el paquete %s', file.name)
//                                                     if (cmd.upgrade) {
//                                                         apply.push(
//                                                             new Promise(function (resolve, reject) {
//                                                                 fs.copyFile(file.path, path.join(files.info.path, file.basename), function (err) {
//                                                                     if (err) {
//                                                                         return reject(err)
//                                                                     }
//                                                                     fs.copyFile(file.path + ext, path.join(files.info.path, file.basename) + ext, function (err) {
//                                                                         if (err) {
//                                                                             return reject(err)
//                                                                         }
//                                                                         files.forEach(function (tempfile) {
//                                                                             return Promise.all([
//                                                                                 new Promise(function (resolve) {
//                                                                                     fs.unlink(tempfile.path, function (err2) {
//                                                                                         if (err2) {
//                                                                                             return reject(err2)
//                                                                                         }
//                                                                                         resolve()
//                                                                                     })
//                                                                                 }),
//                                                                                 new Promise(function (resolve) {
//                                                                                     fs.unlink(tempfile.path + ext, function (err2) {
//                                                                                         if (err2) {
//                                                                                             return reject(err2)
//                                                                                         }
//                                                                                         resolve()
//                                                                                     })
//                                                                                 })
//                                                                             ])
//                                                                         })
//                                                                             .then(function () {
//                                                                                 resolve()
//                                                                             })
//                                                                     })
//                                                                 })
//                                                             })
//                                                         )
//                                                     }
//                                                 } else {
//                                                     console.log('Existe un nuevo paquete en el repositorio %s', file.name)
//                                                     apply.push(
//                                                         new Promise(function (resolve, reject) {
//                                                             fs.copyFile(file.path, path.join(files.info.path, file.basename), function (err) {
//                                                                 var ext = '.sig'
//                                                                 if (err) {
//                                                                     return reject(err)
//                                                                 }
//                                                                 fs.copyFile(file.path + ext, path.join(files.info.path, file.basename) + ext, function (err) {
//                                                                     if (err) {
//                                                                         return reject(err)
//                                                                     }
//                                                                     resolve()
//                                                                 })
//                                                             })
//                                                         })
//                                                     )
//                                                 }
//                                                 return Promise.all(apply)
//                                             })
//                                             .catch(function (err) {
//                                                 console.error(err.toString())
//                                             })
//                                     })
//                                     .catch(function (err) {
//                                         console.error(err.toString())
//                                     })
//                             })
//                         })
//                             .catch(function (err) {
//                                 console.error(err.toString())
//                             })
//                     })
//                 })
//                 .then(function () {
//                     console.log('Cambios aplicados')
//                 })
//                 .catch(function (err) {
//                     console.error(err)
//                 })
//         })
// }

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
