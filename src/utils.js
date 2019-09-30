const tmp = require('tmp')
const fs = require('fs')
const request = require('request')
const ProgressBar = require('progress')
const EventEmitter = require('events').EventEmitter
const EXP_ARQUITECT = /x86_64|i318|any/ig
const EXP_EXT = /\.pkg\.tar(\.xz)?/i
const EXP_VERSION = /([0-9]+\.?-?){2,}/i
const ERROR_MESSAGES = {
    ENOENT: 'No existe el archivo o directorio',
    ENOTDIR: 'No es un directorio valido',
    CORRUPT: 'El archivo esta corrupto o dañado'
}
const REPO_AVAILABLE = [
    'core',
    'community',
    'extra',
    'multilib',
    'AUR'
]

function removeExt (str) {
    return str.replace(EXP_EXT, '')
}

function getArquitect (str) {
    var match = str.match(EXP_ARQUITECT, '$1')
    if (!match) {
        return
    }
    return match[0]
}

function removeSpecial (str) {
    const exp = /[-.?_]/
    if (!str || !str.length) {
        return str
    }
    if (exp.test(str[0])) {
        str = str.substring(1)
    }
    if (str.length && exp.test(str[str.length - 1])) {
        str = str.substring(0, str.length - 1)
    }
    return str
}

function getVersion (str) {
    var match = str.match(EXP_VERSION)
    if (!match) {
        return
    }
    return removeSpecial(match[0])
}

function parsePackage (basename) {
    var parse = {
        version: getVersion(basename),
        machine: getArquitect(basename)
    }
    parse.name = removeSpecial(
        removeSpecial(
            removeExt(basename)
                .replace(parse.machine, '')
        )
            .replace(parse.version, '')
    )
    return parse
}

/**
     * @function downloadFile
     * @description descarga el contenido de la url.
     * @param {String} url funcion de escucha.
     * @param {Boolean} verbose mostrar mas detalles en consola.
     */
function downloadFile (url, verbose, replace) {
    var event = new EventEmitter()
    event.once('temp-file', function (dir, clean) {
        var stream = fs.createWriteStream(dir)
            .on('close', function () {
                event.emit('close', dir, clean)
            })
        var response = request.get(url)
        var bar = null
        if (verbose) {
            process.stdout.write('Descargando paquete. ' + url + '\n')
        }
        response.on('response', function (response) {
            const count = parseInt(response.headers['content-length'], 10)
            bar = new ProgressBar('  downloading [:bar] :rate/kbps :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: count / 1024
            })
            if (response.statusCode !== 200) {
                const error = {
                    status: response.statusCode,
                    text: response.statusMessage
                }
                return event.emit('error', error)
            }
            event.emit('success', response)
            response.on('end', function () {
                if (verbose) {
                    process.stdout.write('Descarga completada: ' + url + '\n')
                }
            })
                .pipe(stream)
        })
            .on('data', function (data) {
                const receive = data.length / 1024
                if (verbose) {
                    bar.tick(receive)
                }
            })
            .on('error', function (err) {
                event.emit('error', err)
            })
        event.emit('response', response)
    })
    if (!replace) {
        tmp.file(function _tempFileCreated (err, path, fd, cleanupCallback) {
            if (err) {
                event.emit('error', err)
                return
            }
            event.emit('temp-file', path, cleanupCallback)
        })
    } else {
        event.emit('temp-file', replace)
    }
    return event
}

module.exports.removeExt = removeExt
module.exports.getArquitect = getArquitect
module.exports.getVersion = getVersion
module.exports.parsePackage = parsePackage
module.exports.REPO_AVAILABLE = REPO_AVAILABLE
module.exports.errorMessages = ERROR_MESSAGES
module.exports.downloadFile = downloadFile
