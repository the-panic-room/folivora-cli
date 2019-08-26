class PackageList {
    constructor (arr) {
        this.__data__ = arr || []
    }

    get (index) {
        return this.__data__[index]
    }

    set (index, val) {
        this.__data__[index] = val
    }

    count () {
        return this.__data__.length
    }

    isEnd () {
        return this.index >= this.count()
    }

    next () {
        this.index++
    }

    push (data) {
        this.__data__.push(data)
    }

    filter (callback) {
        return this.__data__.filter(callback)
    }

    foreach (callback) {
        return this.__data__.foreach(callback)
    }

    asyncForeach (callback) {
        var self = this
        return new Promise(function (resolve, reject) {
            function loop () {
                if (self.isEnd()) {
                    return resolve()
                }
                const p1 = callback(self.get(self.index), self.index)
                self.next()
                if (p1 instanceof Promise) {
                    return p1.then(loop)
                        .catch(reject)
                }
                loop()
            }
            self.index = 0
            loop()
        })
    }

    map (callback) {
        return this.__data__.map(callback)
    }

    getAll () {
        return this.__data__
    }
}

module.exports = PackageList
