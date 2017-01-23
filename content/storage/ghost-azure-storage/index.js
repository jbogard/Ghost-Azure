'use strict';
var azure = require('azure-storage'),
    fs = require('fs'),
    path = require('path'),
    when = require('when'),
    nodefn = require('when/node'),
    url = require('url'),
    options = {};
var util = require('util');
var BaseStore;

try {
    BaseStore = require('ghost/core/server/storage/base');
} catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
    BaseStore = require(path.join(process.cwd(), 'core/server/storage/base'));
}

function azurestore(config) {
    BaseStore.call(this);
    options = config || {};
    options.connectionString = options.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
    options.container = options.container || 'ghost';
    options.useHttps = options.useHttps == 'true';
};

util.inherits(azurestore, BaseStore);

azurestore.prototype.save = function save(image) {
    var fileService = azure.createBlobService(options.connectionString);
    var uniqueName = new Date().getMonth() + "/" + new Date().getFullYear() + "/" + image.name;
    return nodefn.call(fileService.createContainerIfNotExists.bind(fileService), options.container, { publicAccessLevel: 'blob' })
    .then(nodefn.call(fileService.createBlockBlobFromLocalFile.bind(fileService), options.container, uniqueName, image.path))
    .delay(500) //todo: this was placed here per issue #4 (aka sometimes things 404 right after upload) figure out a better way than just adding a delay
    .then(function () {
        var urlValue = fileService.getUrl(options.container, uniqueName);

        if(!options.cdnUrl){
            return urlValue;    
        }

        var parsedUrl = url.parse(urlValue, true, true);
        var protocol = (options.useHttps ? "https" : "http") + "://";

        return protocol + options.cdnUrl  + parsedUrl.path;
    });
};

azurestore.prototype.serve = function serve() {
    return function (req, res, next) {
        next();
    };
};

azurestore.prototype.exists = function exists() {};

azurestore.prototype.delete = function deleteFile() {};



module.exports = azurestore;
