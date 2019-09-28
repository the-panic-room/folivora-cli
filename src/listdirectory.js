const path = require('path')
const InfoBase = require('./infobase')
const getInfo = require('./infofile')
const EventEmitter = require('events').EventEmitter

/**
 * @class ListDirectory
 * @description Listado de directorios.
 * @version 0.0.1
 * @author Jhonny Mata
 */
class ListDirectory {
    constructor (parent, dirs, info) {
        this.index = 0
        this.parent = parent
        this.__paths__ = dirs || []
        this.info = info
    }

    /**
     * @function isLoadedIndex
     * @description Comprobar si es una instancia InfoBase
     * @param {Number} index
     * @returns {Boolean}
     */
    isLoadedIndex (index) {
        return this.__paths__[index] instanceof InfoBase
    }

    /**
     * @function count
     * @description Retorna la cantidad de directorios almacenados.
     * @returns {Number}
     */
    count () {
        return this.__paths__.length
    }

    /**
     * @function getIndex
     * @description Obtiene un Promise con la info del directorio o archivo.
     * @param {Number} index
     * @returns {Promise}
     */
    getIndex (index) {
        var self = this
        if (typeof this.__paths__[index] === 'undefined' || self.isLoadedIndex(index)) {
            return Promise.resolve(self.__paths__[index])
        }
        return new Promise(function (resolve, reject) {
            getInfo(path.join(self.parent, self.__paths__[index]), function (err, info) {
                if (err) {
                    return reject(err)
                }
                self.setIndex(index, info)
                resolve(info)
            })
        })
    }

    /**
     * @function setIndex
     * @description Asignar un objeto al indice.
     * @param {Number} index
     * @param {String|InfoBase} val
     */
    setIndex (index, val) {
        this.__paths__[index] = val
    }

    /**
     * @function append
     * @description Agregar un nuevo objeto al listado.
     * @param {String|InfoBase} val
     */
    append (val) {
        this.__paths__.push(val)
    }

    /**
     * @function next
     * @description Actualiza el indice del registro.
     */
    next () {
        this.index++
    }

    /**
     * @function getCurrent
     * @description Obtiene el objeto del indice actual.
     * @returns {Promise}
     */
    getCurrent () {
        return this.getIndex(this.index)
    }

    /**
     * @function setCurrent
     * @description Asigna el valor del indice actual.
     * @param {String|InfoBase} val
     */
    setCurrent (val) {
        this.setIndex(this.index, val)
    }

    /**
     * @function isLast
     * @description Valida si el indice actual ha culminado el recorrido.
     * @returns {Boolean}
     */
    isLast () {
        return typeof this.__paths__[this.index] === 'undefined'
    }

    /**
     * @function getRawIndex
     * @description Obtener el valor en bruto del indice.
     * @param {Number} index
     * @returns {String}
     */
    getRawIndex (index) {
        if (!this.isLoadedIndex(index)) {
            return this.__paths__[index]
        }
        return (!this.__paths__[index]) ? null : this.__paths__[index].path
    }

    /**
     * @function loop
     * @description Recorrido o reemplazado de los directorios.
     * @param {Function} callback funcion de recorrido.
     * @param {Function} callback2 funcion de cierre o finalizado.
     * @returns {EventEmitter}
     */
    loop (callback, callback2) {
        var event = new EventEmitter()
        var self = this
        self.index = 0
        function loop () {
            if (self.isLast()) {
                // Final del ciclo.
                return event.emit('close')
            }
            self.getCurrent().then(function (data) {
                event.emit('data', data, function (err, replace) {
                    // Ejecuta para continuar.
                    if (err) {
                        return event.emit('error', err)
                    }
                    if (typeof replace !== 'undefined') {
                        self.setCurrent(replace)
                    }
                    self.next()
                    loop()
                })
            })
                .catch(function (err) {
                    event.emit('error', err)
                })
        }
        loop()
        if (typeof callback !== 'undefined') {
            event.on('data', function (data, next) {
                var result = callback(null, data, self.index)
                next(null, result)
            })
            event.on('error', function (err) {
                callback(err)
            })
            if (typeof callback2 !== 'undefined') {
                event.on('close', function () {
                    callback2()
                })
            }
            return
        }
        return event
    }

    /**
     * @function filter
     * @description Filtra el listado de directorios actual.
     * @param {Function} callback funcion de evaluacion.
     * @param {Function} callback2 funcion de cierre.
     * @returns {EventEmitter}
     */
    filter (callback, callback2) {
        var self = this
        var obj = new ListDirectory(self.parent, [], self.info)
        var parent = self.loop()
        var event = new EventEmitter()
        parent.on('data', function (data, next) {
            event.emit('data', data, function (err, isOk) {
                // Ejecuta para continuar.
                if (err) {
                    return event.emit('error', err)
                }
                if (isOk) {
                    obj.append(data)
                }
                next()
            })
        })
        parent.on('close', function () {
            event.emit('close', obj)
        })
        if (typeof callback !== 'undefined') {
            event.on('data', function (data, next) {
                var result = callback(null, data, self.index)
                next(null, result)
            })
            event.on('error', function (err) {
                callback(err)
            })
            if (typeof callback2 !== 'undefined') {
                event.on('close', function () {
                    callback2(obj)
                })
            }
            return
        }
        return event
    }
}

module.exports = ListDirectory
