var async = require('async');

/**
 * Flatten a commit tree.
 *
 * @param  {Object}   tree
 * @param  {String}   path     Recursively built path, initially ''
 * @param  {Object}   flatTree The flattened tree
 * @param  {Function} callback Called with error, flatTree
 */
function flatten(tree, path, flatTree, callback) {
    tree.blobs(function(error, blobs) {
        if (error) callback(error);
        async.each(blobs, function(blob, asyncCallback) {
            flatTree.push({
                id: blob.id,
                name: blob.name,
                path: path + '/' + blob.name
            });
            asyncCallback(null);
        }, function(error) {
            if (error) callback(error);
            tree.trees(function(error, subTrees) {
                if (!subTrees.length) {
                    callback(error, flatTree);
                }
                async.each(subTrees, function(subTree, asyncCallback) {
                    flatten(subTree, path + '/' + subTree.name, flatTree, function(updatedFlatTree) {
                        if (updatedFlatTree) {
                            flatTree = flatTree.concat(updatedFlatTree);
                        }
                        asyncCallback(null);
                    });
                }, function(error) {
                    callback(error, flatTree);
                });
            });
        });
    });
}

module.exports = {
    flatten: flatten
};
