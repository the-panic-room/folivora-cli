const EXP_ARQUITECT = /x86_64|i318|any/ig,
    EXP_EXT = /\.pkg\.tar(\.xz)?/i,
    EXP_VERSION = /([0-9]+\.?\-?){2,}/i,
    REPO_AVAILABLE = [
        "core",
        "community",
        "extra",
        "multilib",
        "AUR"
    ]


function removeExt (str) {
    return str.replace(EXP_EXT, "")
}

function getArquitect (str) {
    var match = str.match(EXP_ARQUITECT, "$1")
    if (!match) {
        return
    }
    return match[0]
}

function removeSpecial(str) {
    if (!str || !str.length) {
        return str
    }
    if (/[\-\.\?\_]/.test(str[0])) {
        str = str.substring(1)
    }
    if (str.length && /[\-\.\?\_]/.test(str[str.length - 1])) {
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
                        .replace(parse.machine, "")
                    )
                    .replace(parse.version, "")
                )
    return parse
}


module.exports.removeExt = removeExt
module.exports.getArquitect = getArquitect
module.exports.getVersion = getVersion
module.exports.parsePackage = parsePackage
module.exports.REPO_AVAILABLE = REPO_AVAILABLE
module.exports.errorMessages = {
    "ENOENT": "No existe el archivo o directorio %s",
    "ENOTDIR": "'%s' No es un directorio valido"
}
