const Repository = require("../src/repo")


var core = new Repository("core", {
    path: "/home/repository/manjaro/temp/",
    mirror: "http://quantum-mirror.hu/mirrors/pub/manjaro/stable/",
    arch: "x86_64"
})
core.updateDatabase().then(function () {
    console.log("Core actualizado")
})
.catch(function (err) {
    console.log(err)
})