const fs = require('fs')
const InfoBase = require('./infobase')
const ListDirectory = require('./listdirectory')

class Directory extends InfoBase {
    isDir () {
        return true
    }

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
