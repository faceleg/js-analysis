var async = require('async');

function analyseOutstandingItems(githubRepository, fullReport, progressCallback, mainCallback) {
    progressCallback({
        message: 'Analysing & grading outstanding items',
        repository: githubRepository
    });
    async.waterfall([
        function analyseFullReport(callback) {
            if (fullReport.grades) {
                callback();
            }
            async.each(fullReport.tree, function(file, asyncCallback) {
                // analyseFile()
            }, function(error) {
                callback(error, fullReport);
            });
        }
    ], function finaliseAnalysis(error, fullReport) {
        mainCallback(githubRepository, fullReport);
    });
}

/**
 * function analyseFile(user, repository, sha, path, mainCallback) {
    async.waterfall([
        function getFileContent(callback) {
            github.repos.getContent({
                user: user.github.login,
                repo: repository,
                path: path,
                ref: sha
            }, function(error, fileContent) {
                if (error) throw error;
                callback(error, new Buffer(fileContent.content, 'base64').toString('utf8'));
            });
        },
        function generateReport(fileContent, callback) {
            var complexityReportOptions = {
                logicalor: true,
                switchcase: true,
                forin: false,
                trycatch: false,
                newmi: true
            };

            var jsHintOptions = {
                bitwise: true,
                curly: true,
                eqeqeq: true,
                immed: true,
                newcap: true,
                noarg: true,
                noempty: true,
                nonew: true,
                nomen: true,
                onevar: true,
                plusplus: true,
                regexp: true,
                undef: true,
                strict: true,
                white: true
            };

            JSHINT(fileContent, jsHintOptions);

            var complexity = null;
            try {
                complexity = complexityReport.run(fileContent, complexityReportOptions);
            } catch (e) {
                throw e;
            }

            var report = {
                complexity: complexity,
                // @todo define options, globals
                jshint: JSHINT.errors
            };
            callback(null, report);
        }
    ], function reportGenerated(error, report) {
        if (error) throw error;
        mainCallback(report);
    });
}
 */

module.exports = {
    analyseOutstandingItems: analyseOutstandingItems
};
