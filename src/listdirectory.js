const path = require('path')
const InfoBase = require('./infobase')
const getInfo = require('./infofile')
const EventEmitter = require('events').EventEmitter

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
            return Promise.resolve(self.__paths__[index])
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
        this.index++
    }

    getCurrent () {
        return this.getIndex(this.index)
    }

    isLast () {
        return typeof this.__paths__[this.index] === 'undefined'
    }

    __loop (callback) {
        var event = new EventEmitter()
        var self = this
        self.index = 0
        function loop () {
            if (self.isLast()) {
                // Final del ciclo.
                return event.emit('close')
            }
            self.getCurrent().then(function (data) {
                event.emit('data', data, function (err) {
                    // Ejecuta para continuar.
                    if (err) {
                        return event.emit('error', err)
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
            event.on('data', function (data) {
                callback(null, data, self.index)
            })
            event.on('error', function (err) {
                callback(err)
            })
            return
        }
        return event
    }

    map (callback) {
        return this.__loop(callback)
    }

    forEach (callback) {
        return this.__loop(callback)
    }

    filter (callback) {
        var self = this
        return self.__loop(callback, true, false, true)
            .then(function (results) {
                return new ListDirectory(self.parent, results, self.info)
            })
    }
}
module.exports = ListDirectory
