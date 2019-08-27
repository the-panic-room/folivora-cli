const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const tar = require('tar')
const InfoBase = require('./infobase')

class File extends InfoBase {
    constructor (uri, stat) {
        super(uri, stat)
        this.ext = path.extname(this.name)
    }

    isFile () {
        return true
    }

    isCompress () {
        const compress = ['.zip', '.tar', '.gz', '.xz', '.rar']
        return compress.indexOf(this.ext) !== -1
    }

    listCompress () {
        if (!this.isCompress()) {
            throw new Error('Solo puede listarse archivos comprimidos')
        }
        if (this.ext !== '.tar') {
            return this.read()
        }
        return this.read(true).pipe(tar.t())
    }

    read (only) {
        let file = fs.createReadStream(this.path)
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

    write (data) {
        let file = fs.createWriteStream(this.path)
        if (this.isCompress()) {
            if (this.ext === '.zip') {
                file = file.pipe(zlib.createGzip())
            }
            if (this.ext === '.tar') {
                const Tar = tar.c
                file = file.pipe(new Tar())
            }
        }
        return file
    }
}
module.exports = File
