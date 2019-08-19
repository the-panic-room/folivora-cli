const getInfo = require("./directory").getInfo,
    Repository = require("./repo"),
    fs = require("fs"),
    path = require("path"),
    utils = require("./utils")

require('colors')


module.exports.moveFunc = function (origin, cmd) {
    var destiny = cmd.path || process.cwd(),
        ext = ".sig",        
        destinyDirs = []

    Promise.all([
        // Obtener info del origen
        new Promise(function (resolve, reject) {
            getInfo(origin, function (err, info) {
                if (err) {
                    return reject(err)
                }
                resolve(info)
            })
        }),
        // Obtener info del destino
        new Promise(function (resolve, reject) {
            getInfo(destiny, function (err, info) {
                if (err) {
                    return reject(err)
                }
                destiny = info
                // listar todos los directorios del destino
                info.list().then(function (dirs) {
                    resolve(dirs)
                })
            })
        })
    ])
    .then(function (rows) {
        var info = rows[0]
        destinyDirs = rows[1]
        if (!info.isDir()) {
            throw new Error("'origin' debe ser un directorio valido")
        }
        // listar directorios del origen
        info.list()
        .then(function (dirs) {
            // obtener directorios validos del origen
            return dirs.filter(function (dir, index) {
                var ignore = !dir.isDir() || utils.REPO_AVAILABLE.indexOf(dir.name) === -1
                if (ignore) {
                    if (cmd.verbose) {
                        console.warn("Ignorando directorio o archivo '" + dir.name + "' no es un repositorio valido")
                    }
                }
                return !ignore
            })
        })
        .then(function (dirs) {
            // listar todos los archivos del directorio
            return dirs.map(function (dir) {
                return dir.list()
                .then(function (files) {
                    return files.filter(function (file) {
                        return !(/\.sig$/.test(file.path))
                    })
                })
            })
        })
        .then(function (dirs) {
            // recorrer el repositorio de origen
            return dirs.forEach(function (repo) {
                if (cmd.verbose) {
                    console.info("Ingresando al repositorio " + repo.info.name)
                }
                // recorrer los archivos del repo actual del origen
                return repo.forEach(function (file, index) {
                    if (!file.isFile()) {
                        if (cmd.verbose) {
                            console.warn("Ignorando directorio " + file.name)
                        }
                        return
                    }
                    var package = utils.parsePackage(file.name)
                    // recorrer directorios del destino
                    return destinyDirs.forEach(function (dirDestiny) {
                        if (!dirDestiny.isDir() || dirDestiny.name !== repo.info.name) {
                            return
                        }
                        // listar todos los archivos del repositorio destino igual al origen
                        return dirDestiny.list()
                        .then(function (dirsDestiny) {
                            // filtra los archivos duplicados del repositorio destino igual al origen
                            let isNew = true
                            return Promise.all([
                                dirsDestiny.filter(function (file2) {
                                    var package2 = utils.parsePackage(file2.name),
                                        isEqual = !(/\.sig$/.test(file2.path)) && file2.isFile() && package2.name === package.name
                                    if (isEqual) {
                                        isNew = false
                                    }
                                    return isEqual && package.version != package2.version
                                }),
                                new Promise(function (resolve2, reject) {
                                    getInfo(file.path + ext, function (err) {
                                        resolve2(!err)
                                    })
                                })
                            ])
                            .then(function (data) {
                                // terminado recorrido de los archivos del repositorio destino
                                var apply = [], files = data[0], isExistSign = data[1]
                                if (!isExistSign) {
                                    console.warn("El paquete %s no posee un signature confiable", file.name)
                                    return
                                }
                                if (files.count()) {
                                    console.log("Existe una nueva versión para el paquete %s", file.name)
                                    if (cmd.upgrade) {
                                        apply.push (
                                            new Promise(function (resolve, reject) {
                                                fs.copyFile(file.path, path.join(files.info.path, file.basename), function (err) {
                                                    if (err) {
                                                        return reject(err)
                                                    }
                                                    fs.copyFile(file.path + ext, path.join(files.info.path, file.basename) + ext, function (err) {
                                                        if (err) {
                                                            return reject(err)
                                                        }
                                                        files.forEach(function (tempfile) {
                                                            return Promise.all([
                                                                new Promise(function (resolve2, reject2) {
                                                                    fs.unlink(tempfile.path, function (err2) {
                                                                        if (err2) {
                                                                            return reject(err2)
                                                                        }
                                                                        resolve2()
                                                                    })
                                                                }),
                                                                new Promise(function (resolve2, reject2) {
                                                                    fs.unlink(tempfile.path + ext, function (err2) {
                                                                        if (err2) {
                                                                            return reject(err2)
                                                                        }
                                                                        resolve2()
                                                                    })
                                                                })
                                                            ])
                                                        })
                                                        .then(function () {
                                                            resolve()
                                                        })
                                                    })
                                                })
                                            })
                                        )
                                    }
                                } else {
                                    console.log("Existe un nuevo paquete en el repositorio %s", file.name)
                                    apply.push(
                                        new Promise(function (resolve, reject) {
                                            fs.copyFile(file.path, path.join(files.info.path, file.basename), function (err) {
                                                var ext = ".sig"
                                                if (err) {
                                                    return reject(err)
                                                }
                                                fs.copyFile(file.path + ext, path.join(files.info.path, file.basename) + ext, function (err) {
                                                    if (err) {
                                                        return reject(err)
                                                    }                                                    
                                                    resolve()
                                                })
                                            })
                                        })
                                    )
                                }
                                return Promise.all(apply)
                            })
                            .catch(function (err) {
                                console.error(err.toString())
                            })
                        })
                        .catch(function (err) {
                            console.error(err.toString())
                        })
                    })
                })
                .catch(function (err) {
                    console.error(err.toString())
                })
            })
        })
        .then(function () {
            console.log("Cambios aplicados")
        })
        .catch(function (err) {
            console.error(err)
        })
    })
}


module.exports.fixFunc = function (dir, cmd) {
    dir = dir || process.cwd()
    console.log(dir)
    getInfo(dir, function (err, info) {
        if (err) {
            throw err
        }
        if (!info.isDir()) {
            throw new Error("'origin' debe ser un directorio valido")
        }
        // listar directorios del origen
        info.list()
            .then(function (dirs) {
                // obtener directorios validos del origen
                return dirs.filter(function (dir, index) {
                    var ignore = !dir.isDir() || utils.REPO_AVAILABLE.indexOf(dir.name) === -1
                    if (ignore) {
                        if (cmd.verbose) {
                            console.warn("Ignorando directorio o archivo '" + dir.name + "' no es un repositorio valido")
                        }
                    }
                    return !ignore
                })
            })
            .then(function (dirs) {
                // listar todos los archivos del directorio
                return dirs.map(function (dir) {
                    return dir.list()
                    .then(function (files) {
                        return files.filter(function (file) {
                            return !(/\.sig$/.test(file.path))
                        })
                    })
                })
            })
            .then(function (dirs) {
                // recorrer el repositorio de origen
                return dirs.forEach(function (repo) {
                    if (cmd.verbose) {
                        console.info("Ingresando al repositorio " + repo.info.name)
                    }
                    // recorrer los archivos del repo actual del origen
                    return repo.forEach(function (file, index) {
                        if (!file.isFile()) {
                            if (cmd.verbose) {
                                console.warn("Ignorando directorio " + file.name)
                            }
                            return
                        }
                        return new Promise(function (resolve, reject) {
                            var pathSign = file.path + ".sig"
                            getInfo(pathSign, function (err, info) {
                                if (err) {
                                    console.warn("El paquete %s no posee un signature", file.name)
                                    return fs.unlink(file.path, function (err) {
                                        if (err) {
                                            reject(err)
                                        }
                                        resolve()
                                    })
                                }
                                resolve(info)
                            })
                        })
                    })
                })
            })
            .catch(function (err) {
                console.error(err)
            })
    })
}

let availableRepos = [
    "core",
    "extra",
    "community",
    "lib"
]

module.exports.check = function (name, dir, cmd) {
    // let path = path || process.env.REPO_PATH
    var repo = new Repository(name, { path: dir })
    return repo.read().then(function () {
        repo.check().then(function (errors) {
            if (errors.length) {
                console.log("El repositorio posee %s errores\n\n".red, errors.length)
                errors.forEach(function (package) {
                    console.log("\n[%s]\n".red, package.package.name)
                    package.errors.forEach(function (error) {
                        var pathLog = error.path || package.package.path
                        console.log(utils.errorMessages[error.code].red, pathLog)
                    })
                })
                console.log("\n\n Use el comando 'mirror-cli fix <repo-name> <repo-path>' para reparar las dependencias dañadas".yellow)
            } else {
                console.log("El repositorio no posee errores".green)
            }
            return errors
        })
    })
}