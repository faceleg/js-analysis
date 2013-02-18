var async = require('async');

/**
 * @param {User} user
 * @param {String} repositoryName
 * @param {node-github} github
 * @param {Function} progressUpdateCallback Callback to allow caller to provide feedback to user.
 * @param {Function} callback Called on completion.
 */
module.exports.updateRepositoryDetails = function(user, repositoryName, github, progressFeedback, callback) {
    async.waterfall([
        function gitRepositoryInformation(callback) {
            github.repos.get({
                user: user.github.login,
                repo: repositoryName
            }, callback);
        },
        function saveRepositoryInformation(data, callback) {
            progressFeedback({
                message: 'Repository data retrieved',
                repository: data
            });
            GithubRepository.findOneAndUpdate(data, data, { upsert: true }, callback);
        },
        function retrieveTree(githubRepository, callback) {
            github.gitdata.getTree({
                user: githubRepository.owner.login,
                repo: githubRepository.name,
                sha: 'master',
                recursive: true
            }, function(error, tree) {
                callback(error, githubRepository, tree);
            });
        },
        function saveTree(githubRepository, tree, callback) {
            progressFeedback({
                message: 'Repository file tree retrieved'
            });
            githubRepository.getAndUpdateFiles(tree, function(error, githubRepositoryTree) {
                callback(error, githubRepository, githubRepositoryTree);
            });
        }],
        function processTree(error, githubRepository, githubRepositoryTree) {
            if (error) throw error;
            if (typeof callback !== 'undefined') {
                callback(githubRepository, githubRepositoryTree);
            }
        });
};
