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
        bl.addSong(selection);
        $selectForm.hide();
        $(".song-select").hide();
        $("#input").val('');
    });



// $('.analyze ul li').map(function (idx, elem) { return $(elem).data('id') })
// [158827653, 119190675]


})();