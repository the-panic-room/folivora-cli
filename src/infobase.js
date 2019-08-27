const path = require('path')

class InfoBase {
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

    isFile () {
        return false
    }

    isDir () {
        return false
    }
}

module.exports = InfoBase
