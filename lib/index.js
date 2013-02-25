var async = require('async'),
    path = require('path'),
    complexityReport = require('complexity-report'),
    JSHINT = require('jshint').JSHINT,
    grade = require('grader'),
    gitBasic = require('git-basic'),
    git = require('gift');

var clonePull = require('./clone-pull'),
    treeTools = require('./tree'),
    analyser = require('./analyser');

var GithubRepository = null,
    FullReport = null,
    FullReportFile = null,
    github = null;

function createPublicRepository(user, repositoryName, progressCallback, mainCallback) {
    async.waterfall([
        function getRepository(callback) {
            progressCallback({
                message: 'Retrieving repository details',
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
            var githubRepository = new GithubRepository();
            githubRepository.updateFromGithubData(data).save(callback);
        }
    ], function finishImport(error, githubRepository) {
        mainCallback(githubRepository);
    });
}

function updateRepository(githubRepository, progressCallback, mainCallback) {

    progressCallback({
        message: 'Reviewing history',
        repository: githubRepository
    });

    async.waterfall([
        function openRepository(callback) {
            var repository = git(githubRepository.local_directory);
            callback(null, repository);
        },
        function findBranchReport(repository, callback) {
            FullReport.findOne({ repositoryId: githubRepository._id }, function(error, fullReport) {
                callback(error, repository, fullReport);
            });
        },
        function branchReportResult(repository, fullReport, callback) {
            if (fullReport === null) {
                (new FullReport({
                    repositoryId: githubRepository._id,
                    branch: githubRepository.master_branch
                })).save(function(error, newFullReport) {
                    callback(error, repository, newFullReport);
                });
            } else {
                callback(null, fullReport);
            }
        },
        function getBranchCurrentTree(repository, fullReport, callback) {
            var tree = repository.tree(githubRepository.master_branch);
            treeTools.flatten(tree, '', [], function(error, flatTree) {
                callback(error, repository, fullReport, flatTree);
            });
        },
        function applyBranchCurrentTree(repository, fullReport, flatTree, callback) {
            flatTree.forEach(function pushFiles(file) {
                fullReport.tree.push(new FullReportFile(file));
            });
            repository.commits(githubRepository.master_branch, function passCommitsThrough(error, commits) {
                callback(error, repository, fullReport, commits);
            });
        },
        function applyCommits(repository, fullReport, commits, callback) {
            var i = commits.length;
            var commitMap = {};
            commits[0].tree(function(error, tree) {
                console.log('commit tree', tree);
            });
            return;
            while(i--) {
                var historicalReport = new HistoricalReport({
                    sha: commits[i].id,
                    parents: commits[i].parents
                });
                commitMap[commits[i].id] = commits[i];
                fullReport.history.push(historicalReport);
            }
            var singleHistory = [fullReport.history[0]];
            async.each(singleHistory, function flattenAndAddTree(historicalReport, asyncCallback) {
                console.log('flattenAndAddTree', historicalReport.sha, commitMap[historicalReport.sha]);
                commitMap[historicalReport.sha].tree().contents(function flattenTree(error, tree) {
                    if (error) asyncCallback(error);
                    console.log('flattenTree');
                    treeTools.flatten(tree, '', [], function flattenTreeCallback(error, flatTree) {
                        console.log('flattenTreeCallback');
                        flatTree.each(function pushFiles(file) {
                            console.log('pushFiles');
                            historicalReport.tree.push(new FullReportFile(file));
                        });
                        asyncCallback(null);
                    });
                });
            }, function passHistoricalReportsThrough(error) {
                console.log('passHistoricalReportsThrough');
                callback(error, repository, fullReport);
            });
        },
        function saveReport(fullReport) {
            console.log(fullReport);
            fullReport.save(callback);
        }
    ], function (error, fullReport) {
        if (error) throw error;
        mainCallback(githubRepository, fullReport);
    });
    // async.each(FullReport.tree, function(file, asyncCallback) {
    //     analyseFile(user, githubRepository.name, FullReport.sha, file.path, function(report) {
    //         file.complexity = report.complexity;
    //         file.jshint = report.jshint;
    //         file.grades = grade.calculateGrades(report);
    //         FullReport.tree.addToSet(file);
    //         asyncCallback(null);
    //     });
    // }, function(error) {
    //     if (error) throw error;

    //     FullReport.grades = FullReport.calculateGrade();

    //     FullReport.save(function(error) {
    //         if (error) throw error;
    //         mainCallback(FullReport);
    //     });
    // });
}

module.exports = {
    configure: function(options) {
        GithubRepository = options.GithubRepository;
        FullReport = options.FullReport;
        FullReportFile = options.FullReportFile;
        HistoricalFullReport = options.HistoricalFullReport;
        HistoricalFullReportFile = options.HistoricalFullReportFile;
        github = options.github;
    },
    createPublicRepository: createPublicRepository,
    cloneToLocal: clonePull.cloneToLocal,
    updateRepository: updateRepository,
    analyseOutstandingItems: analyser.analyseOutstandingItems
};
