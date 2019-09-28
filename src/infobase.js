const path = require('path')

/**
 * @class InfoBase
 * @description Clase Base para gestionar archivos y directorios.
 * @version 0.0.1
 * @author Jhonny Mata
 */
class InfoBase {
    /**
     * @constructor
     * @param {String} uri ruta del archivo o directoro.
     * @param {Object} stat informacion adicional.
     */
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

    /**
     * @method
     * @function isFile
     * @description retorna true si el objeto es un archivo.
     * @returns {Boolean}
     */
    isFile () {
        return false
    }

    /**
     * @method
     * @function isDir
     * @description retorna true si el objeto es un directorio.
     * @returns {Boolean}
     */
    isDir () {
        return false
    }
}

module.exports = InfoBase
