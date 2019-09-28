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
                self.setIndex(index, info)
                resolve(info)
            })
        })
    }

    setIndex (index, val) {
        this.__paths__[index] = val
    }

    append (val) {
        this.__paths__.push(val)
    }

    next () {
        this.index++
    }

    getCurrent () {
        return this.getIndex(this.index)
    }

    setCurrent (val) {
        this.setIndex(this.index, val)
    }

    isLast () {
        return typeof this.__paths__[this.index] === 'undefined'
    }

    getRawIndex (index) {
        if (!this.isLoadedIndex(index)) {
            return this.__paths__[index]
        }
        return (!this.__paths__[index]) ? null : this.__paths__[index].path
    }

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
