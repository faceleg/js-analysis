var async = require('async'),
    complexityReport = require('complexity-report'),
    JSHINT = require('jshint').JSHINT,
    grade = require('./aggregate-grade');

var GithubRepository = null,
    GithubRepositoryReport = null,
    GithubRepositoryReportFile = null,
    github = null;

function importRepository(user, repositoryName, progressCallback, mainCallback) {
    async.waterfall([
        function getRepository(callback) {
            progressCallback({
                message: 'Retrieving repository details for',
                repository: {
                    name: repositoryName
                }
            });
            github.repos.get({
                user: user.github.login,
                repo: repositoryName
            }, callback);
        },
        function saveRepository(data, callback) {
            (new GithubRepository(data)).save(callback);
        }
    ], function finishImport(error, githubRepository) {
        progressCallback({
            message: 'Repository import complete',
            repository: githubRepository
        });
        mainCallback(githubRepository);
    });
}

function performInitialRepositoryAnalysis(user, githubRepository, progressCallback, mainCallback) {
    async.waterfall([
        function findBranchReport(callback) {
            GithubRepositoryReport.findOne({ repositoryId: githubRepository._id }, callback);
        },
        function branchReportResult(githubRepositoryReport, callback) {
            if (githubRepositoryReport === null) {
                (new GithubRepositoryReport({
                    repositoryId: githubRepository._id,
                    branch: githubRepository.master_branch,
                    parents: []
                })).save(function(error, newGithubRepositoryReport) {
                    callback(error, newGithubRepositoryReport);
                });
            } else {
                callback(null, githubRepositoryReport);
            }
        },
        function getMostRecentCommit(githubRepositoryReport, callback) {
            progressCallback({
                message: 'Getting most recent commit',
                repository: githubRepository
            });
            github.repos.getBranch({
                user: user.github.login,
                repo: githubRepository.name,
                branch: githubRepository.master_branch
            }, function callbackPassthrough(error, masterBranch) {
                githubRepositoryReport.sha = masterBranch.commit.sha;
                callback(error, githubRepositoryReport);
            });
        },
        function getMostRecentTree(githubRepositoryReport, callback) {
            progressCallback({
                message: 'Getting current tree',
                repository: githubRepository
            });
            github.gitdata.getTree({
                user: user.github.login,
                repo: githubRepository.name,
                sha: githubRepositoryReport.sha,
                recursive: true
            }, function callbackPassthrough(error, treeData) {
                callback(error, treeData, githubRepositoryReport);
            });
        },
        function saveTreeData(treeData, githubRepositoryReport, callback) {
            progressCallback({
                message: 'Processing current tree',
                repository: githubRepository,
                tree: treeData
            });
            async.each(treeData.tree, function addFile(file, asyncCallback) {
                if ((/\.js$/).test(file.path)) {
                    githubRepositoryReport.tree.push({
                        path: file.path,
                        size: file.size
                    });
                }
                asyncCallback(null);
            }, function done(error) {
                if (error) throw error;
                githubRepositoryReport.save(callback);
            });
        }
    ], function analyseTree(error, githubRepositoryReport) {
        if (error) throw error;
        performRepositoryAnalysis(user, githubRepository, githubRepositoryReport, progressCallback, function(updatedGithubRepositoryReport) {
            mainCallback(updatedGithubRepositoryReport);
        });
    });
}

function performRepositoryAnalysis(user, githubRepository, githubRepositoryReport, progressCallback, mainCallback) {
    progressCallback({
        message: 'Analysing source code',
        repository: githubRepository
    });
    async.each(githubRepositoryReport.tree, function(file, asyncCallback) {
        analyseFile(user, githubRepository.name, githubRepositoryReport.sha, file.path, function(report) {
            file.complexity = report.complexity;
            file.jshint = report.jshint;
            file.grades = grade.calculateGrades(report);
            githubRepositoryReport.tree.addToSet(file);
            asyncCallback(null);
        });
    }, function(error) {
        if (error) throw error;

        githubRepositoryReport.grades = githubRepositoryReport.calculateGrade();

        githubRepositoryReport.save(function(error) {
            if (error) throw error;
            mainCallback(githubRepositoryReport);
        });
    });
}

function analyseFile(user, repository, sha, path, mainCallback) {
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

module.exports = {
    configure: function(options) {
        GithubRepository = options.GithubRepository;
        GithubRepositoryReport = options.GithubRepositoryReport;
        GithubRepositoryReportFile = options.GithubRepositoryReportFile;
        github = options.github;
    },
    importRepository: importRepository,
    performInitialRepositoryAnalysis: performInitialRepositoryAnalysis,
    letterGradeFromNumeric: grade.letterGradeFromNumeric,
    calculateGrades: grade.calculateGrades,
    calculateAggregateGrade: grade.calculateAggregateGrade
};
