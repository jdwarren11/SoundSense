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
        $('body').css('background', 'url("../images/hexabump.png")');
        $("#charts").show();

    });

    $(document).on('click', '.addition', function(e) {
        e.preventDefault();
        var selection = $(this).val();
        // console.log(selection);
        bl.addSong(selection);
        $selectForm.hide();
        $(".song-select").hide();
        $("#input").val('');
    });

    $(document).on('click', '.sentiment-button', function(e) {
        var $commentsContainer = $(this).parent('.all-comments');
        var $allSentimentContainers = $commentsContainer.find('.sentiment-list');
        var $sentimentContainer = $commentsContainer.find('.sentiment-list[data-sentiment="' + $(this).attr('data-sentiment') + '"]');
        $allSentimentContainers.hide();
        $sentimentContainer.show();
    });

    // $('#run-example').on('click', function(e) {
    //     bl.runExample();
    // });

    $('.navtext.home').on('click', function(e) {
        e.preventDefault();
        window.location = '';
    });

    $('.navtext.example').on('click', function(e) {
        e.preventDefault();
        $(".searchformbox").hide();
        $(".analyze-form-box").hide();
        $('body').css('background', 'url("../images/hexabump.png")');
        $("#charts").show();
        bl.runExample();
    });

    $(document).on('click', '.remove-link', function(e) {
        e.preventDefault();
        $(this).parent('li').remove();
    })



// $('.analyze ul li').map(function (idx, elem) { return $(elem).data('id') })
// [158827653, 119190675]


})();