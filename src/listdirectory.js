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
            return self.__paths__[index]
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
        var results = []
        self.index = 0
        function loop () {
            if (self.isLast()) {
                // Final del ciclo.
                event.emit('close')
            }
            event.emit('data', self.getCurrent(), function (err) {
                // Ejecuta para continuar.
                if (err) {
                    return event.emit('error', err)
                }
                self.next()
                loop()
            })
        }
        loop()
        if (typeof callback !== 'undefined') {
            return event.on('data', callback)
        }
        return event
        // return new Promise(function (resolve, reject) {
        //     function getResultLoop (result, index) {
        //         if (result instanceof Promise) {
        //             return result.then(function (data) {
        //                 if (replace && (data || !exclude)) {
        //                     results.push((edit) ? data : self.getIndex(index))
        //                 }
        //                 self.index++
        //                 return loop()
        //             })
        //                 .catch(function (err) {
        //                     reject(err)
        //                 })
        //         }
        //         if (replace && (result || !exclude)) {
        //             results.push((edit) ? result : self.getIndex(index))
        //         }
        //         self.index++
        //         return loop()
        //     }
        //     function loop () {
        //         if (self.isLast()) {
        //             return resolve((replace) ? results : null)
        //         }
        //         var result = self.next()
        //         if (result instanceof Promise) {
        //             return result.then(function (data) {
        //                 getResultLoop(callback(data, self.index), self.index)
        //             })
        //                 .catch(function (err) {
        //                     reject(err)
        //                 })
        //         }
        //         getResultLoop(callback(result, self.index), self.index)
        //     }
        //     loop()
        // })
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
