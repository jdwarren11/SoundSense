# SoundSense
------------
A web application to listen and comparte different songs and their SoundCloud analytics. Performs sentiment analysis on the comments of each selected song using Alchemy's API and visualizes the extracted keywords by their relevance and sentiment score. Also displays graphs comparing other analystics such as plays, likes, and followers.

- Enter a song title or artist in the search bar to search SoundCloud
- Click "add" button to add to analyze queue
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

Technologies: JavaScript, jQuery, Foundation, Sinatra, SoundCloud API, Alchemy API, Heroku