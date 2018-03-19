var H5PPresave = H5PPresave || {};

H5PPresave['H5P.CoursePresentation'] = function (content, finished) {
    var self = this;
    if( typeof content === "undefined" || !content.hasOwnProperty('presentation') || !content.presentation.hasOwnProperty('slides')){
        throw {
            name: 'Invalid Course Presentation Error',
            message: "Could not find expected semantics in content."
        };
    }

    var score = Object
        .keys(content.presentation.slides)
        .map(function (value, index) {
            var slide = content.presentation.slides[index];
            if( !slide.hasOwnProperty('elements')){
                return [];
            }
            return slide.elements;
        })
        .filter(function(elements){
            return elements.length > 0;
        })
        .reduce(function (previous, current){
            return previous.concat(current);
        }, [])
        .map(function (element) {
            if( element.hasOwnProperty('action')){
                return element.action;
            }
            return {};
        })
        .filter(function (action) {
            return action.hasOwnProperty('library') && action.hasOwnProperty('params');
        })
        .map(function (action) {
            return (new self.constructor).process(action.library, action.params).getMaxScore();
        })
        .reduce(function(currentScore, scoreToAdd){
            if( self.isInt(scoreToAdd)){
                currentScore += scoreToAdd;
            }
            return currentScore;
        }, 0);

    if( isNaN(score) || score < 0){
        throw {
            name: 'InvalidMaxScore Error',
            message: "Could not calculate the max score for this content. The max score is assumed to be 0. Contact your administrator if this isn’t correct."
        };
    }

    finished({maxScore: score});
};
