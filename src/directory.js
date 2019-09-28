const fs = require('fs')
const InfoBase = require('./infobase')
const ListDirectory = require('./listdirectory')

/**
 * @class Directory
 * @description Manejo de directorios.
 * @version 0.0.1
 * @author Jhonny Mata
 */
class Directory extends InfoBase {
    /**
     * @method
     * @function isDir
     * @description retorna true si el objeto es un directorio.
     * @returns {Boolean}
     */
    isDir () {
        return true
    }

    /**
     * @method
     * @function list
     * @description Listar los archivos y directorios enlazadas.
     * @return {Promise<ListDirectory>}
     */
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

module.exports = Directory
