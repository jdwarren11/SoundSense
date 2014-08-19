(function() {
    var $searchForm = $('.search-song');
    var $selectForm = $('.select-song');
    var $analyzeForm = $('.analyze-form');

    $searchForm.on('submit', function(e) {
        e.preventDefault();
        var input = $('#input').val();
        bl.searchForSongs(input);

    });

    $selectForm.on('submit', function(e) {
        e.preventDefault();
        var selection = $('input[name=song]:checked').val();
        bl.addSong(selection);
        $selectForm.hide();
        // $('.analyze-form-box').show();
        $('#input').val('');
    });

    $analyzeForm.on('submit', function(e) {
        e.preventDefault();
        var songIds = $('.analyze-form ol li').map(function (index, elem) {
            return $(elem).data('id');
        });
        // console.log(songIds);
        bl.analyzeSongs(songIds);
        $(".searchformbox").hide();
        $(".analyze-form-box").hide();
        $('body').css('background', 'black');
        $("#charts").show();

    });

    $(document).on('click', '.addition', function(e) {
        e.preventDefault();
        var selection = $(".addition").val();
        console.log(selection);
        bl.addSong(selection);
        $selectForm.hide();
        $(".song-select").hide();
        $("#input").val('');
    });

    $(document).on('click', '.pos-button', function(e) {
        e.preventDefault();
        var songId = $(".pos-button").val();
        var comments = bl.getComments(songId);
        if ($('.pos-button').parent().find('li').length > 0) {
            $('.positive-list').show();
            $('.negative-list').hide();
            $('.neutral-list').hide();
        } else {
            for (var i = 0; i < comments[0].length; i++) {
                $('.positive-list').show();
                $('.negative-list').hide();
                $('.neutral-list').hide();
                $(".positive-list").append('<li>'+comments[0][i].text+'</li>');
            }
        }
    });

    $(document).on('click', '.neg-button', function(e) {
        e.preventDefault();
        var songId = $(".neg-button").val();
        var comments = bl.getComments(songId);
        if ($('.neg-button').parent().find('li').length > 0) {
            $('.negative-list').show();
            $('.positive-list').hide();
            $('.neutral-list').hide();
        } else {
            for (var i = 0; i < comments[0].length; i++) {
                $('.negative-list').show();
                $('.positive-list').hide();
                $('.neutral-list').hide();
                $('.negative-list').append('<li>'+comments[0][i].text+'</li>');
            }
        }
    });

    $(document).on('click', '.neut-button', function(e) {
        e.preventDefault();
        var songId = $(".neut-button").val();
        var comments = bl.getComments(songId);
        if ($('.neut-button').parent().find('li').length > 0) {
            $('.neutral-list').show();
            $('.negative-list').hide();
            $('.positive-list').hide();
        } else {
            for (var i = 0; i < comments[0].length; i++) {
                $('.neutral-list').show();
                $('.negative-list').hide();
                $('.positive-list').hide();
                $(".neutral-list").append('<li>'+comments[0][i].text+'</li>');
            }
        }
    });



// $('.analyze ul li').map(function (idx, elem) { return $(elem).data('id') })
// [158827653, 119190675]


})();