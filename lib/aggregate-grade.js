function calculateMaintainabilityGrade(maintainability) {
    if (maintainability > 29) {
        return 1;
    }
    if (maintainability > 19) {
        return 2;
    }
    if (maintainability > 9) {
        return 3;
    }
    return 1;
}

function calculateCyclomaticGrade(cyclomatic) {
    if (cyclomatic < 11) {
        return 1;
    }
    if (cyclomatic < 21) {
        return 2;
    }
    if (cyclomatic < 51) {
        return 3;
    }
    return 4;
}

function calculateBugGrade(bugs) {
    if (bugs <= 0.7) {
        return 1;
    }
    if (bugs <= 1.5) {
        return 2;
    }
    if (bugs <= 2) {
        return 3;
    }
    return 4;
}

function calculateJSHintGrade(jsHint, lLoc) {
    var errorsPerLine = 0;

    if (jsHint.length) {
        errorsPerLine = jsHint.length / lLoc;
    }
    if (errorsPerLine <= 0.1) {
        return 1;
    }
    if (errorsPerLine <= 0.25) {
        return 2;
    }
    if (errorsPerLine <= 0.4) {
        return 3;
    }
    return 4;
}

function calculateAggregateGrade(report) {
    // console.log(report.complexity.aggregate.halstead);
    var cyclomatic = calculateCyclomaticGrade(report.complexity.aggregate.complexity.cyclomatic),
        maintainability = calculateMaintainabilityGrade(report.complexity.maintainability),
        bugs = calculateBugGrade(report.complexity.aggregate.complexity.halstead.bugs);
        jshint = calculateJSHintGrade(report.jshint, report.complexity.aggregate.complexity.sloc.logical);

    return 4 / (cyclomatic + maintainability + bugs + jshint);
}

module.exports = {
    letterGradeFromNumeric: function(numericGrade) {
        if (numericGrade <= 1) {
            return 'A';
        }
        if (numericGrade <= 2) {
            return 'B';
        }
        if (numericGrade <= 3) {
            return 'C';
        }

        return 'D';
    },
    numericGrade: function(report) {
        console.log(report);
        return calculateAggregateGrade(report);
    },
    letterGrade: function(report) {
        return letterGradeFromNumeric(numericGrade(report));
    }
};

