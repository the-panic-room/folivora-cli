const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const tar = require('tar')
const InfoBase = require('./infobase')

/**
 * @class File
 * @description Manejo de archivos.
 * @version 0.0.1
 * @author Jhonny Mata
 */
class File extends InfoBase {
    /**
     * @constructor
     * @param {String} uri ruta del archivo o directoro.
     * @param {Object} stat informacion adicional.
     */
    constructor (uri, stat) {
        super(uri, stat)
        this.ext = path.extname(this.name)
    }

    /**
     * @function isFile
     * @description retorna true si es un archivo.
     * @returns {Boolean}
     */
    isFile () {
        return true
    }

    /**
     * @function isCompress
     * @description retorna true si es un fichero comprimido.
     * @returns {Boolean}
     */
    isCompress () {
        const compress = ['.zip', '.tar', '.gz', '.xz', '.rar']
        return compress.indexOf(this.ext) !== -1
    }

    /**
     * @function listCompress
     * @description Listar archivos de un fichero comprimido.
     * @returns {ReadStream|internal.Writable}
     */
    listCompress () {
        if (!this.isCompress()) {
            throw new Error('Solo puede listarse archivos comprimidos')
        }
        if (this.ext !== '.tar') {
            return this.read()
        }
        return this.read(true).pipe(tar.t())
    }

    /**
     * @function read
     * @description Obtiene los datos de un archivo.
     * @param {Boolean} only retornar dato en bruto si es true.
     * @returns {ReadStream|internal.Writable}
     */
    read (only, options) {
        let file = fs.createReadStream(this.path, options)
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

    // write (data) {
    //     let file = fs.createWriteStream(this.path)
    //     if (this.isCompress()) {
    //         if (this.ext === '.zip') {
    //             file = file.pipe(zlib.createGzip())
    //         }
    //         if (this.ext === '.tar') {
    //             const Tar = tar.c
    //             file = file.pipe(new Tar())
    //         }
    //     }
    //     return file
    // }
}
module.exports = File
