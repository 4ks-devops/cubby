'use strict';

exports = module.exports = {
    add,
    get,
    update,
    remove
};

var assert = require('assert'),
    debug = require('debug')('cubby:routes:fs'),
    files = require('../files.js'),
    util = require('util'),
    MainError = require('../mainerror.js'),
    HttpError = require('connect-lastmile').HttpError,
    HttpSuccess = require('connect-lastmile').HttpSuccess;

function boolLike(arg) {
    if (!arg) return false;
    if (util.isNumber(arg)) return !!arg;
    if (util.isString(arg) && arg.toLowerCase() === 'false') return false;

    return true;
}

async function add(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    var directory = boolLike(req.query.directory);
    var filePath = req.query.path;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));
    if (!(req.files && req.files.file) && !directory) return next(new HttpError(400, 'missing file or directory'));
    if ((req.files && req.files.file) && directory) return next(new HttpError(400, 'either file or directory'));

    var mtime = req.fields && req.fields.mtime ? new Date(req.fields.mtime) : null;

    debug('add:', filePath, mtime);

    try {
        if (directory) await files.addDirectory(req.user.username, filePath);
        else await files.addFile(req.user.username, filePath, req.files.file.path, mtime);
    } catch (error) {
        if (error.reason === MainError.ALREADY_EXISTS) return next(new HttpError(409, 'already exists'));
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}

function get(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    var raw = boolLike(req.query.raw);
    var filePath = req.query.path;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    debug('get:', filePath);

    files.get(req.user.username, filePath, function (error, result) {
        if (error && error.reason === MainError.NOT_FOUND) return next(new HttpError(404, 'not found'));
        if (error) return next(new HttpError(500, error));

        if (raw) {
            if (result.isDirectory) return next(new HttpError(417, 'raw is not supported for directories'));

            return res.sendFile(result._fullFilePath);
        }

        // remove private fields
        delete result._fullFilePath;

        return next(new HttpSuccess(200, result));
    });
}

function update(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    var filePath = req.query.path;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    debug('update:', filePath);
}

async function remove(req, res, next) {
    assert.strictEqual(typeof req.user, 'object');

    var filePath = req.query.path;

    if (!filePath) return next(new HttpError(400, 'path must be a non-empty string'));

    debug('remove:', filePath);

    try {
        await files.remove(req.user.username, filePath);
    } catch (error) {
        return next(new HttpError(500, error));
    }

    next(new HttpSuccess(200, {}));
}
