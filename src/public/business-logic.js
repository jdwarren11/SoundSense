SC.initialize({
    client_id: g.client_id,
    redirect_uri: 'http://google.com'
});

(function() {
    var DataStore = function () {
        var songCache = {};

        this.getSongsByTitle = function (songTitle, callback) {
            SC.get("/tracks", {q: songTitle, limit: 5 }, function(tracks) {
                // console.log(tracks);
                var results = []
                for (i = 0; i < 5; i++) {
                    var track = {
                        id: tracks[i].id,
                        title: tracks[i].title,
                        user_id: tracks[i].user_id,
                        username: tracks[i].user.username,
                        playback_count: tracks[i].playback_count,
                        favoritings_count: tracks[i].favoritings_count,
                        duration: tracks[i].duration,
                        comment_count: tracks[i].comment_count,
                        permalink_url: tracks[i].permalink_url,
                        stream_url: tracks[i].stream_url
                    }
                    songCache[tracks[i].id] = track;
                    results.push(track)
                }
                callback(results);

            });
        };

        this.getSongById = function(songId) {
            return songCache[songId];
        };

        this.getArtistInfo = function(songId, artistId, callback) {
            SC.get('/users/'+artistId, function(user) {
                songCache[songId]['followers'] = user.followers_count;
            });
        };

        this.getCommentsBySong = function(songId) {
            var songCount = this.getSongById(songId).comment_count;
            var pageSize = 200;
            var pageCount = Math.ceil(songCount / pageSize);
            var commentPromises = [];
            var allComments = [];
            var commentTimes = [];
            for (var i = 0; i < pageCount; i++) {
                var promise = new Promise(function(resolve, reject) {
                    SC.get('/tracks/'+songId+'/comments', { offset: pageSize * i }, function(comments) {
                        resolve(comments);
                    });
                    // console.log("Delivering promise");
                    // resolve("some value");
                });
                commentPromises.push(promise);
            }
            
            return Promise.all(commentPromises).then(function(commentsArray) {
                // console.log('After all:', commentsArray);
                for (var i = 0; i < commentsArray.length; i++) {
                    // do stuff
                    for (var j = 0; j < commentsArray[i].length; j++) {
                        allComments.push(commentsArray[i][j].body);
                        commentTimes.push(commentsArray[i][j].timestamp)
                    }
                }
                // console.log(allComments);
                // console.log(commentTimes);
                songCache[songId]['comment_array'] = bl.filter(allComments);
                // console.log(allComments);
                songCache[songId]['comment_times'] = bl.timeStamp(commentTimes);
                // console.log(commentTimes);
                return songCache[songId]['comment_array'];
            });
        };

        this.addSentiment = function(songId, sentiment) {
            songCache[songId]['sentiment'] = sentiment;
        };
    };

    window.store = new DataStore();

    var BusinessLogic = function() {


        this.searchForSongs = function(songTitle) {
            // console.log('Searching', songTitle);
            // var songOptionsHTML = "";
            var headerHTML = '<tr id="search-header"><th>Add</th><th>Track Name</th><th>User Accout</th></tr>';
            var searchHTML = "";
            store.getSongsByTitle(songTitle, function(tracks) {
                // console.log('Found', tracks)
                for (var i in tracks) {
                    // songOptionsHTML += '<input type="radio" name="song" value="'+tracks[i].id+'">' + tracks[i].title + '<br />';
                    // searchHTML +='<tr><td><button class="button tiny addition" value="'+tracks[i].id+'">+</button></td><td>'+tracks[i].title+'</td><td>'+tracks[i].username+'</td></tr>';
                    searchHTML +='<tr><td><button class="button tiny addition" value="'+tracks[i].id+'">+</button></td><td>'+tracks[i].title+'</td><td>'+tracks[i].username+'</td></tr>';
                }
           
                // $('.options').html(songOptionsHTML);
                $('.search-results').html(headerHTML + searchHTML);
                $('.song-select').show()
                // $('.select-song').show();
            });


        };

        this.addSong = function(songId) {
            var song = store.getSongById(songId);
            var sentimentPromises = [];
            var sentimentsArray = [[],[],[]];
            store.getArtistInfo(songId, song.user_id); 

            $('#adding-song-text').show();
            store.getCommentsBySong(songId).then(function(comments) {
                // console.log('Got', comments.length, 'comments');
                for (var i = 0; i < comments.length; i++) {
                    var promise = bl.retrieveComments(song, comments, i);
                    sentimentPromises.push(promise);
                }
                // console.log("Running", sentimentPromises.length)
                return Promise.all(sentimentPromises);
            }).then(function(updateSentiment) {
                // console.log("Sentiment results:", updateSentiment);
                // console.log(updateSentiment.length);
                // console.log(updateSentiment[0].keywords[4].text);
                // debugger
                for (var i = 0; i < updateSentiment.length; i++) {
                    if (!updateSentiment[i]) {
                        continue;
                    } 
                    for (var j = 0; j < updateSentiment[i].keywords.length; j++) {
                        if (updateSentiment[i].keywords[j].sentiment.type === "positive") {
                            // sentimentsArray[0].push(updateSentiment[i].keywords[j].text)
                            sentimentsArray[0].push(updateSentiment[i].keywords[j]);
                        } else if (updateSentiment[i].keywords[j].sentiment.type === "negative") {
                            // sentimentsArray[1].push(updateSentiment[i].keywords[j].text)
                            sentimentsArray[1].push(updateSentiment[i].keywords[j]);
                        } else if (updateSentiment[i].keywords[j].sentiment.type === "neutral") {
                            // sentimentsArray[2].push(updateSentiment[i].keywords[j].text)
                            sentimentsArray[2].push(updateSentiment[i].keywords[j]);
                        } 
                    }
                }
                // debugger
                store.addSentiment(songId, sentimentsArray);
                console.log(song);
                $('.analyze-list').append('<li data-id="'+song.id+'">'+song.title+"</li>");
                $('#adding-song-text').hide();
                console.log(JSON.stringify(song));
            });
        };

        this.retrieveComments = function (song, comments, index) {
            // console.log("Building promise", index);
            return new Promise(function(resolve, reject) {
                $.ajax({
                    url: '/proxy',
                    dataType: 'json',
                    // jsonp: 'jsonp',
                    type: 'post',
                    contentType: 'application/javascript',
                    data: JSON.stringify({
                        apikey: g.alchemy_id,
                        // text: "test",
                        text: song.comment_array[index],
                        outputMode: 'json',
                        url: 'http://access.alchemyapi.com/calls/text/TextGetRankedKeywords',
                        sentiment: 1
                    }),
                    success: function(data) {
                        data = JSON.parse(data);
                        if (data["status"] === "OK") {
                            resolve(data);
                            // console.log("success data: ", data);
                            // console.log("success for: ", index);
                        // } else if (data["status"] === "ERROR" && data["statusInfo"] == "unsupported-text-language") {
                        //     console.log("Blank for: ", index);
                        //     resolve(null);
                        } else if (data["status"] === "ERROR") {
                            resolve(null);
                            // reject(data);
                            alert("error adding the song");
                            console.log("error data: ", index, data);
                        }
                    }, 
                    error: function(jqxhr) {
                        reject(jqxhr);
                        alert("error adding the song");
                        console.log("Error for: ", index, jqxhr);
                    }
                });
            });
        };

        this.analyzeSongs = function(songIds) { 
            var songObjects = [];
            for (var i = 0; i < songIds.length; i++) {
                songObjects.push(store.getSongById(songIds[i]));

            }
            // send songObjects to charts view
            // console.log(songObjects);
            bl.embedSong(songObjects);
            bl.chartData(songObjects);
            // bl.commentButtons(songObjects);
        };

        this.sendSong = function(songId) {
            store.getCommentsBySong(songId);
        };

        this.runExample = function() {
            $.getJSON('example.json', function(data) {
                bl.embedSong(data);
                bl.chartData(data);
            })
        };

        this.filter = function(com) {
            var filter = com.join(" ");
            // reg ex to take out non ascii characters
            var filter2 = filter.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
            // reg ex to take out links and url's
            var filter3 = filter2.replace(/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)?/ig, '');

            // reg ex to replace if same char multiple times
            var filter5 = filter3.replace(/(.)\1{2,}/g, '$1$1');
            // reg ex to replace multiple spaces
            var filter6 = filter5.replace(/\s{2,}/g," ");
            var stringLength = Math.ceil(filter6.length / 5000);
            var commentArray = []

            for (var i = 0; i < stringLength; i++) {
                commentArray.push(filter6.slice(i * 5000, (i + 1) * 5000));
            }
            // console.log(commentArray);
            if (commentArray.length > 10) {

            } 
            return commentArray;
        };

        this.timeStamp = function(comments) {
            var maxTime = Math.max.apply(null, comments);
            var commentTimes = {
                15: 0,
                30: 0,
                45: 0,
                60: 0,
                75: 0,
                90: 0,
                105: 0,
                120: 0,
                135: 0,
                150: 0,
                165: 0,
                180: 0,
                195: 0,
                210: 0,
                225: 0,
                240: 0,
                255: 0,
                270: 0,
                285: 0,
                300: 0
            };
            for (var i = 0; i < comments.length; i++) {
                switch(true) {
                    case (comments[i] < 15000):
                        commentTimes['15'] += 1;
                        break;
                    case (comments[i] > 15000 && comments[i] < 30000):
                        commentTimes['30'] += 1;
                        break;
                    case (comments[i] > 30000 && comments[i] < 45000):
                        commentTimes['45'] += 1;
                        break;
                    case (comments[i] > 45000 && comments[i] < 60000):
                        commentTimes['60'] += 1;
                        break;
                    case (comments[i] > 60000 && comments[i] < 75000):
                        commentTimes['75'] += 1;
                        break;
                    case (comments[i] > 75000 && comments[i] < 90000):
                        commentTimes['90'] += 1;
                        break;
                    case (comments[i] > 90000 && comments[i] < 105000):
                        commentTimes['105'] += 1;
                        break;
                    case (comments[i] > 105000 && comments[i] < 120000):
                        commentTimes['120'] += 1;
                        break;
                    case (comments[i] > 120000 && comments[i] < 135000):
                        commentTimes['135'] += 1;
                        break;
                    case (comments[i] > 135000 && comments[i] < 150000):
                        commentTimes['150'] += 1;
                        break;
                    case (comments[i] > 150000 && comments[i] < 165000):
                        commentTimes['165'] += 1;
                        break;
                    case (comments[i] > 165000 && comments[i] < 180000):
                        commentTimes['180'] += 1;
                        break;
                    case (comments[i] > 180000 && comments[i] < 195000):
                        commentTimes['195'] += 1;
                        break;
                    case (comments[i] > 195000 && comments[i] < 210000):
                        commentTimes['210'] += 1;
                        break;
                    case (comments[i] > 210000 && comments[i] < 225000):
                        commentTimes['225'] += 1;
                        break;
                    case (comments[i] > 225000 && comments[i] < 240000):
                        commentTimes['240'] += 1;
                        break;
                    case (comments[i] > 240000 && comments[i] < 255000):
                        commentTimes['255'] += 1;
                        break;
                    case (comments[i] > 255000 && comments[i] < 270000):
                        commentTimes['270'] += 1;
                        break;
                    case (comments[i] > 270000 && comments[i] < 285000):
                        commentTimes['285'] += 1;
                        break;
                    case (comments[i] > 285000 && comments[i] < 300000):
                        commentTimes['300'] += 1;
                        break;
                    default:
                        commentTimes['300'] += 1;
                        break;
                }
            }
            // console.log(commentTimes);
            return commentTimes;
        };

        this.embedSong = function(songs) {
            for (var i = 0; i < songs.length; i++) {
                // $('#play-songs').append('<br /><div id="song'+i+'" style="width:350px; height:100px;"></div><br />');
                $('#play-songs').append('<div id="song'+i+'"></div>');
                SC.oEmbed(songs[i].permalink_url, document.getElementById('song'+i));

            }
        };

        this.chartData = function(songs) {
            var songTitles = [];
            var positive = [];
            var negative = [];
            var neutral = [];

            for (var i = 0; i < songs.length; i++) {
                songTitles.push(songs[i]['title']);
                positive.push(songs[i].sentiment[0].length)
                negative.push(songs[i].sentiment[1].length)
                neutral.push(songs[i].sentiment[2].length)
            }

            var playFollowData = $.map(songs, function(series) {
                return {
                    name: series.title,
                    data: [series.playback_count / series.followers]
                    // [
                        // (series.playback_count / series.favoritings_count)
                    // ]
                };
            });

            var likeCommentData = $.map(songs, function(series) {
                return {
                    name: series.title,
                    data: [series.favoritings_count / series.comment_count]
                        // (series.followers / series.favoritings_count)
                };
            });

            var followLikeComData = $.map(songs, function(series) {
                return {
                    name: series.title,
                    data: [series.followers / (series.favoritings_count + series.comment_count)]
                };
            });

            var commentChartData = $.map(songs, function(series) {
                return {
                    name: series.title,
                    data: [
                        series.comment_times['15'],series.comment_times['30'],series.comment_times['45'],series.comment_times['60'],
                        series.comment_times['75'],series.comment_times['90'],series.comment_times['105'],series.comment_times['120'],
                        series.comment_times['135'],series.comment_times['150'],series.comment_times['165'],series.comment_times['180'],
                        series.comment_times['195'],series.comment_times['210'],series.comment_times['225'],series.comment_times['240'],
                        series.comment_times['255'],series.comment_times['270'],series.comment_times['285'],series.comment_times['300']
                    ]
                };
            });


            var playFollow = new Highcharts.Chart({
                chart: {
                    renderTo: 'play-follow',
                    type: 'bar'
                },
                title: {
                    text: 'Plays vs. Followers'
                },
                xAxis: {
                    categories: ['songs']
                    // title: {
                    //     text: 'song titles'
                    // }
                },
                yAxis: {
                    title: {
                        text: 'plays/follower ratio'
                    }
                },
                legend: {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'top',
                    x: -10,
                    y: 25,
                    floating: true,
                    borderWidth: 1, 
                    shadow: true
                },
                series: playFollowData
            });

            var likeCom = new Highcharts.Chart({
                chart: {
                    renderTo: 'like-comment',
                    type: 'bar'
                },
                title: {
                    text: 'Likes vs. Comments'
                },
                xAxis: {
                    categories: ['songs']
                    // title: {
                    //     text: 'song titles'
                    // }
                },
                yAxis: {
                    title: {
                        text: 'like/comment ratio'
                    }
                },
                legend: {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'top',
                    x: -10,
                    y: 25,
                    floating: true,
                    borderWidth: 1, 
                    shadow: true
                },
                series: likeCommentData
            });

            var followLikeCom = new Highcharts.Chart({
                chart: {
                    renderTo: 'follow-like-com',
                    type: 'bar'
                },
                title: {
                    text: 'Followers vs Likes & Comments'
                },
                xAxis: {
                    categories: ['songs']
                    // title: {
                    //     text: 'something'
                    // }
                },
                yAxis: {
                    title: {
                        text: 'followers/(likes+comments) ratio'
                    }
                },
                legend: {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'top',
                    x: -10,
                    y: 25,
                    floating: true,
                    borderWidth: 1, 
                    shadow: true
                },
                series: followLikeComData
            });

            var comments = new Highcharts.Chart({
                chart: {
                    renderTo: 'comments',
                    type: 'line'
                },
                title: {
                    text: 'Comments Count'
                },
                xAxis: {
                    title: {
                        text: 'Seconds'
                    },
                    categories: [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300]
                },
                yAxis: {
                    title: {
                        text: '# Comments'
                    }
                },
                series: commentChartData
            });

            var sentiment = new Highcharts.Chart({
                chart: {
                    renderTo: 'sentiment',
                    type: 'bar'
                },
                title: {
                    text: 'Sentiment Analysis'
                },
                xAxis: {
                    categories: songTitles,
                    labels: {
                        style: {
                            width: '150px'
                        }
                    }
                },
                yAxis: {
                    title: {
                        text: '# Keywords'
                    }
                },
                series: [
                {
                    name: 'neutral',
                    data: neutral
                }, {
                    name: 'positive',
                    data: positive
                }, {
                    name: 'negative',
                    data: negative
                }
                ]
            });

            for (var i = 0; i < songs.length; i++) {
                var temp = [
                    '<div class="all-comments n'+i+'">',
                        '<p class="comment-display">Click to show comments</p>',
                        '<button class="button tiny pos sentiment-button" data-sentiment="positive" value="'+songs[i].id+'">Positive</button>',
                        '<button class="button tiny neut sentiment-button" data-sentiment="neutral" value="'+songs[i].id+'">Neutral</button>',
                        '<button class="button tiny neg sentiment-button" data-sentiment="negative" value="'+songs[i].id+'">Negative</button>',
                    '</div>'
                ].join('');

                $('#sentiment-scatter').append('<div id="scatter'+i+'" style="width:720px; height:550px;"></div><br />');
                var $commentsContainer = $(temp);
                var $commentPane = $('<div class="show-comments">');
                var $posList = $('<ul class="sentiment-list" data-sentiment="positive" style="display:none"></ul>');
                var $neuList = $('<ul class="sentiment-list" data-sentiment="neutral" style="display:none"></ul>');
                var $negList = $('<ul class="sentiment-list" data-sentiment="negative" style="display:none"></ul>');
                $commentsContainer.append($commentPane);
                $commentPane.append($posList);
                $commentPane.append($neuList);
                $commentPane.append($negList);
                var songComments = songs[i].sentiment;
                for (var j = 0; j < songComments.length; j++) {
                    for (var k = 0; k < songComments[j].length; k++) {
                        var $songSentimentComments = $('<li>' + songComments[j][k].text + '</li>');
                        switch (j) {
                            case 0:
                                $posList.append($songSentimentComments);
                                break;
                            case 1:
                                $negList.append($songSentimentComments);
                                break;
                            case 2:
                                $neuList.append($songSentimentComments);
                                break;
                            default:
                                throw new Error('Wait, what?');
                        }
                    }
                }

                $('#comments-div').append($commentsContainer);
                $commentsContainer.after('<br />');

                var posData = $.map(songs[i].sentiment[0], function(series) {
                    // return [[parseFloat(series.relevance), parseFloat(series.sentiment.score)]];
                    return {
                        name: series.text,
                        color: '#90ee7e',
                        x: parseFloat(series.relevance),
                        y: parseFloat(series.sentiment.score)
                        // data: [parseFloat(series.relevance), parseFloat(series.sentiment.score)]
                    }
                });
                // console.log(posData);
                var negData = $.map(songs[i].sentiment[1], function(series) {
                    // return [[parseFloat(series.relevance), parseFloat(series.sentiment.score)]];
                    return {
                        name: series.text,
                        color: '#f45b5b',
                        x: parseFloat(series.relevance),
                        y: parseFloat(series.sentiment.score)
                        // data: [parseFloat(series.relevance), parseFloat(series.sentiment.score)]
                    }
                });
                var neutData = $.map(songs[i].sentiment[2], function(series) {
                    // return [[parseFloat(series.relevance), 0]];
                    return {
                        name: series.text,
                        color: '#2b908f',
                        x: parseFloat(series.relevance),
                        y: 0
                        // data: [parseFloat(series.relevance), parseFloat(series.sentiment.score)]
                    }
                });

                new Highcharts.Chart({
                    chart: {
                        renderTo: 'scatter'+i,
                        type: 'scatter'
                    },
                    title: {
                        text: 'Song Title: ' + songs[i].title
                    },
                    xAxis: {
                        title: {
                            enabled: true,
                            text: 'Keyword Relevance'
                        }
                    },
                    yAxis: {
                        title: {
                            text: 'Sentiment Score'
                        }
                    },
                    tooltip: {
                        formatter: function() {
                            return this.point.name;
                        }
                    },
                    series: [
                    {
                        // name: 'neutral',
                        data: neutData,
                        showInLegend: false
                        // data: [[0.7777777, 0.63], [0.411, 0.8]]
                    }, {
                        // name: 'positive',
                        data: posData,
                        showInLegend: false
                        // data: [[0.1, -0.2], [0.15, -0.63]]
                    }, {
                        // name: 'negative',
                        data: negData,
                        showInLegend: false
                        // data: [[0.22, 0.43], [0.11, 0.55]]
                    }]
                });
            }

        };
    };

    window.bl = new BusinessLogic();
})();




