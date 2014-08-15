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
            var pageCount = Math.floor(songCount / pageSize);
            var commentPromises = [];
            var allComments = [];
            var commentTimes = [];
            for (var i = 0; i < pageCount; i += 1) {
                var promise = new Promise(function(resolve, reject) {
                    SC.get('/tracks/'+songId+'/comments', { limit: pageSize, offset: pageSize * i }, function(comments) {
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
            var songOptionsHTML = "";
            store.getSongsByTitle(songTitle, function(tracks) {
                // console.log('Found', tracks)
                for (var i in tracks) {
                    songOptionsHTML += '<input type="radio" name="song" value="'+tracks[i].id+'">' + tracks[i].title + '<br />';
                }
           
                $('.options').html(songOptionsHTML);
                $('.select-song').show();

            });
        };

        this.addSong = function(songId) {
            var song = store.getSongById(songId);
            var sentimentPromises = [];
            var sentimentsArray = [[],[],[]];
            store.getArtistInfo(songId, song.user_id); 
            $('.analyze-list').append('<li data-id="'+song.id+'">'+song.title+"</li>");
            store.getCommentsBySong(songId).then(function(comments) {
                // console.log('Got', comments.length, 'comments');
                for (var i = 0; i < comments.length; i++) {
                    var promise = new Promise(function(resolve, reject) {
                        $.ajax({
                            url: '/proxy',
                            dataType: 'json',
                            // jsonp: 'jsonp',
                            type: 'post',
                            contentType: 'application/javascript',
                            data: JSON.stringify({
                                apikey: g.alchemy_id,
                                // text: "test",
                                text: song.comment_array[i],
                                outputMode: 'json',
                                url: 'http://access.alchemyapi.com/calls/text/TextGetRankedKeywords',
                                sentiment: 1
                            }),
                            success: function(data) {
                                data = JSON.parse(data);
                                if (data["status"] === "OK") {
                                    resolve(data);
                                    // console.log("success data: ", data);
                                } else if (data["status"] === "ERROR") {
                                    reject(data);
                                    console.log("error data: ",data);
                                }
                            }, 
                            error: function(jqxhr) {
                                reject(jqxhr);
                                console.log("error data2: ", jqxhr);
                            }
                        });
                    });
                    sentimentPromises.push(promise);
                }
                return Promise.all(sentimentPromises);
            }).then(function(updateSentiment) {
                // console.log(updateSentiment);
                // console.log(updateSentiment.length);
                // console.log(updateSentiment[0].keywords[4].text);
                // var positive = [];
                // var negative = [];
                // var neutral = [];
                for (var i = 0; i < updateSentiment.length; i++) {
                    for (var j = 0; j < 50; j++) {
                        if (updateSentiment[i].keywords[j].sentiment.type === "positive") {
                            // positive.push(updateSentiment[i].keywords[j].text);
                            sentimentsArray[0].push(updateSentiment[i].keywords[j].text)
                        } else if (updateSentiment[i].keywords[j].sentiment.type === "negative") {
                            // negative.push(updateSentiment[i].keywords[j].text);
                            sentimentsArray[1].push(updateSentiment[i].keywords[j].text)
                        } else if (updateSentiment[i].keywords[j].sentiment.type === "neutral") {
                            // neutral.push(updateSentiment[i].keywords[j].text);
                            sentimentsArray[2].push(updateSentiment[i].keywords[j].text)
                        }
                    }
                }
                // sentimentsArray.push(positive);
                // sentimentsArray.push(negative);
                // sentimentsArray.push(neutral);
                store.addSentiment(songId, sentimentsArray);
                console.log(song);
            });
        };

        this.analyzeSongs = function(songIds) { 
            var songObjects = [];
            for (var i = 0; i < songIds.length; i++) {
                songObjects.push(store.getSongById(songIds[i]));
            }
            // send songObjects to charts view
            console.log(songObjects);
            // bl.barChartData(songObjects);
            bl.chartData(songObjects);
        };

        this.sendSong = function(songId) {
            store.getCommentsBySong(songId);
        };

        this.filter = function(com) {
            var filter = com.join(" ");
            var filter2 = filter.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
            var filter3 = filter2.replace(/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)?/ig, '');
            var stringLength = Math.floor(filter3.length / 5000);
            var commentArray = []

            for (var i = 0; i < stringLength; i++) {
                commentArray.push(filter3.slice(i * 5000, (i + 1) * 5000));
            }
            return commentArray;
        };

        this.timeStamp = function(comments) {
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

        this.embedSong = function(track_url) {
            // track_url = song
            song = SC.oEmbed(track_url, function(oEmbed) {
                console.log('response:' + oEmbed);
            });
            return song;
        };

        this.chartData = function(songs) {
            var songTitles = [];
            var playFollowData = [];
            var playLikeData = [];
            var followLikeData = [];
            for (var i = 0; i < songs.length; i++) {
                songTitles.push(songs[i]['title']);
                playFollowData.push(songs[i].playback_count / songs[i].followers);
                playLikeData.push(songs[i].playback_count / songs[i].favoritings_count);
                followLikeData.push(songs[i].followers / songs[i].favoritings_count);
            }

            var playsChartData = $.map(songs, function(series) {
                return {
                    name: series.title,
                    data: [
                        (series.playback_count / series.followers), 
                        (series.playback_count / series.favoritings_count)
                    ]
                };
            });

            var followsChartData = $.map(songs, function(series) {
                return {
                    name: series.title,
                    data: [
                        (series.followers / series.comment_count), 
                        (series.followers / series.favoritings_count)
                    ]
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
            

            var plays = new Highcharts.Chart({
                chart: {
                    renderTo: 'plays',
                    type: 'bar'
                },
                title: {
                    text: 'something'
                },
                xAxis: {
                    categories: ['plays/follow', 'plays/likes']
                },
                yAxis: {
                    title: {
                        text: 'something'
                    }
                },
                series: playsChartData
            });

            var follows = new Highcharts.Chart({
                chart: {
                    renderTo: 'follows',
                    type: 'bar'
                },
                title: {
                    text: 'something else'
                },
                xAxis: {
                    categories: ['follow/comments', 'follow/likes']
                },
                yAxis: {
                    title: {
                        text: 'something else'
                    }
                },
                series: followsChartData
            });

            var comments = new Highcharts.Chart({
                chart: {
                    renderTo: 'comments',
                    type: 'line'
                },
                title: {
                    text: 'stuff'
                },
                xAxis: {
                    categories: [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300]
                },
                yAxis: {
                    title: {
                        text: 'stuff'
                    }
                },
                series: commentChartData
            })

            // $('#line').highcharts({
            //     chart: { type: 'line' },
            //     title: { text: 'comments' },
            //     xAxis: { categories: [0,15,30,45,60] },
            //     yAxis: { 
            //         title: {
            //             text: "comments/time"
            //         }
            //     },
            //     series: [{
            //         name: "something",
            //         data: [100,200,250,234]
            //     }]
            // });
        };

        this.barChartData = function(songs) {
            // console.log(songs)
            var songTitles = [];
            var playFollowData = [];
            var playLikeData = [];
            var followLikeData = [];
            for (var i = 0; i < songs.length; i++) {
                songTitles.push(songs[i]['title']);
                playFollowData.push(songs[i].playback_count / songs[i].followers);
                playLikeData.push(songs[i].playback_count / songs[i].favoritings_count);
                followLikeData.push(songs[i].followers / songs[i].favoritings_count);
            }


            var pfData = {
                labels: songTitles,
                datasets: [
                    {
                        label: "My First dataset",
                        // fillColor: "rgba(220,220,220,0.5)",
                        fillColor: "blue",
                        // strokeColor: "rgba(220,220,220,0.8)",
                        strokeColor: "red",
                        // highlightFill: "rgba(220,220,220,0.75)",
                        highlightFill: "green",
                        // highlightStroke: "rgba(220,220,220,1)",
                        highlightStroke: "black",
                        data: playFollowData
                    }
                ]
            };
            var pfCtx = document.getElementById("play-follow").getContext('2d');
            new Chart(pfCtx).Bar(pfData);
            // return barData;

            var plData = {
                labels: songTitles,
                datasets: [
                    {
                        label: "My First dataset",
                        fillColor: "rgba(220,220,220,0.5)",
                        strokeColor: "rgba(220,220,220,0.8)",
                        highlightFill: "rgba(220,220,220,0.75)",
                        highlightStroke: "rgba(220,220,220,1)",
                        data: playLikeData
                    }
                ]
            };
            var plCtx = document.getElementById("play-like").getContext('2d');
            new Chart(plCtx).Bar(plData)

            var flData = {
                labels: songTitles,
                datasets: [
                    {
                        label: "My First dataset",
                        fillColor: "rgba(220,220,220,0.5)",
                        strokeColor: "rgba(220,220,220,0.8)",
                        highlightFill: "rgba(220,220,220,0.75)",
                        highlightStroke: "rgba(220,220,220,1)",
                        data: followLikeData
                    }
                ]
            };
            var flCtx = document.getElementById("follow-like").getContext('2d');
            new Chart(flCtx).Bar(flData)


        //     var commentData = [];
        //     for (var i = 0; i < songs.length; i++) {
        //         commentData.push(songs[i]['comment_times']);
        //     }
        //     console.log(commentData);

        //     var s1 = songs[0]['comment_times'];
        //     var s2 = songs[1]['comment_times'];
        //     var s3 = songs[2]['comment_times'];
        //     var s4 = songs[3]['comment_times'];
        //     var comData = {
        //         labels: [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300],
        //         datasets: [
        //             {
        //                 fillColor : "rgba(172,194,132,0.4)",
        //                 strokeColor : "#ACC26D",
        //                 pointColor : "#fff",
        //                 pointStrokeColor : "#9DB86D",
        //                 data : [
        //                     s1['15'],s1['30'],s1['45'],s1['60'],
        //                     s1['75'],s1['90'],s1['105'],s1['120'],
        //                     s1['135'],s1['150'],s1['165'],s1['180'],
        //                     s1['195'],s1['210'],s1['225'],s1['240'],
        //                     s1['255'],s1['270'],s1['285'],s1['300']
        //                 ]
        //             },
        //             {
        //                 fillColor : "rgba(172,194,132,0.4)",
        //                 strokeColor : "#ACC26D",
        //                 pointColor : "#fff",
        //                 pointStrokeColor : "#9DB86D",
        //                 data : [
        //                     s2['15'],s2['30'],s2['45'],s2['60'],
        //                     s2['75'],s2['90'],s2['105'],s2['120'],
        //                     s2['135'],s2['150'],s2['165'],s2['180'],
        //                     s2['195'],s2['210'],s2['225'],s2['240'],
        //                     s2['255'],s2['270'],s2['285'],s2['300']
        //                 ]
        //             },
        //             {
        //                 fillColor : "rgba(172,194,132,0.4)",
        //                 strokeColor : "#ACC26D",
        //                 pointColor : "#fff",
        //                 pointStrokeColor : "#9DB86D",
        //                 data : [
        //                     s3['15'],s3['30'],s3['45'],s3['60'],
        //                     s3['75'],s3['90'],s3['105'],s3['120'],
        //                     s3['135'],s3['150'],s3['165'],s3['180'],
        //                     s3['195'],s3['210'],s3['225'],s3['240'],
        //                     s3['255'],s3['270'],s3['285'],s3['300']
        //                 ]
        //             },
        //             {
        //                 fillColor : "rgba(172,194,132,0.4)",
        //                 strokeColor : "#ACC26D",
        //                 pointColor : "#fff",
        //                 pointStrokeColor : "#9DB86D",
        //                 data : [
        //                     s4['15'],s4['30'],s4['45'],s4['60'],
        //                     s4['75'],s4['90'],s4['105'],s4['120'],
        //                     s4['135'],s4['150'],s4['165'],s4['180'],
        //                     s4['195'],s4['210'],s4['225'],s4['240'],
        //                     s4['255'],s4['270'],s4['285'],s4['300']
        //                 ]
        //             }
        //         ]
        //     };
        //     var comCtx = document.getElementById("comments").getContext('2d');
        //     new Chart(comCtx).Line(comData)
        };

    };

    window.bl = new BusinessLogic();
})();




