# SoundSense

A web application to listen and compare different songs and their associated SoundCloud analytics. Performs sentiment analysis on the comments of each selected song using Alchemy's API and visualizes the extracted keywords by their relevance and sentiment score on a scatter plot. Also displays four other graphs comparing analytics ratios such as plays, likes, followers and comments over the length of the song.

- Enter a song title or artist in the search bar to search SoundCloud
- Click "add" button to add song to analyze queue
- Once one or multiple songs are added, click "analyze" button to listen and compare
 
#### Tab Output
- Play Songs: Listen to the selected songs
- Sentiment Analysis: Scatter plot of all comments plotted by relevance and score. Hover over each point to see the comment, or click sentiment buttons to see list of all comments
- Graph 1: Ratio comparison of Plays vs. Followers
- Graph 2: Ratio comparison of Likes vs. Comments
- Graph 3: Ratio comparison of Followers vs Likes+Comments
- Graph 4: Total comments over length of songs
- Graph 5: Comparison of total number of "positive", "negative", and "neutral" comments for each song


Live Site: http://soundsense.herokuapp.com

Technologies: JavaScript, jQuery, Highcharts, Foundation, Sinatra, SoundCloud API, Alchemy API, Heroku