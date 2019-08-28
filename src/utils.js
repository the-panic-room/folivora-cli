const EXP_ARQUITECT = /x86_64|i318|any/ig
const EXP_EXT = /\.pkg\.tar(\.xz)?/i
const EXP_VERSION = /([0-9]+\.?-?){2,}/i
const ERROR_MESSAGES = {
    ENOENT: 'No existe el archivo o directorio',
    ENOTDIR: 'No es un directorio valido'
}
const REPO_AVAILABLE = [
    'core',
    'community',
    'extra',
    'multilib',
    'AUR'
]

function removeExt (str) {
    return str.replace(EXP_EXT, '')
}

function getArquitect (str) {
    var match = str.match(EXP_ARQUITECT, '$1')
    if (!match) {
        return
    }
    return match[0]
}

function removeSpecial (str) {
    const exp = /[-.?_]/
    if (!str || !str.length) {
        return str
    }
    if (exp.test(str[0])) {
        str = str.substring(1)
    }
    if (str.length && exp.test(str[str.length - 1])) {
        str = str.substring(0, str.length - 1)
    }
    return str
}

function getVersion (str) {
    var match = str.match(EXP_VERSION)
    if (!match) {
        return
    }
    return removeSpecial(match[0])
}

function parsePackage (basename) {
    var parse = {
        version: getVersion(basename),
        machine: getArquitect(basename)
    }
    parse.name = removeSpecial(
        removeSpecial(
            removeExt(basename)
                .replace(parse.machine, '')
        )
            .replace(parse.version, '')
    )
    return parse
}

module.exports.removeExt = removeExt
module.exports.getArquitect = getArquitect
module.exports.getVersion = getVersion
module.exports.parsePackage = parsePackage
module.exports.REPO_AVAILABLE = REPO_AVAILABLE
module.exports.errorMessages = ERROR_MESSAGES
