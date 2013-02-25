var gitBasic = require('git-basic'),
    async = require('async');

function cloneToLocal(githubRepository, localDirectory, progressCallback, mainCallback) {
    async.waterfall([
        function cloneRepository(callback) {
            progressCallback({
                message: 'Cloning repository',
                repository: githubRepository
            });
            var localRepositoryDirectory = path.resolve(localDirectory + '/' + githubRepository.full_name + '/' + githubRepository.master_branch);
            gitBasic.clone(githubRepository.clone_url, localRepositoryDirectory, function() {
                githubRepository.local_directory = localRepositoryDirectory;
                githubRepository.save(callback);
            });
        }
    ], function cloneComplete(error, githubRepository) {
        if (error) throw error;
        mainCallback(githubRepository);
    });
}

module.exports = {
    cloneToLocal: cloneToLocal
};
