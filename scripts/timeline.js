var timeline = {};

(function() {

  // Shorthand
  var tm = timeline;


  // Tweet related data
  var tweetData,
  numTweets,
  earliestTweetDate,
  totalHours,
  maxRetweets;

  // SVG related data
  var svg,
  svgContainer = $("#svgcontainer"),  
  vizContainer = $("#container"),
  tweetContainer = $("#tweetContainer"),
  numTweetsDisplay = $("#container").find("h2 b"),
  startLegend = vizContainer.find("b.start"),
  endLegend = vizContainer.find("b.end"),
  height = 10,
  viewport = 800,
  padding = 10,
  totalHeight,
  xAxis,
  color = d3.interpolateRgb("#8CD", "#301E1E"),
  rectData = [];
  hourRectMap = {},
  cumulativeRetweetCount = {};

  tm.drawTimeline = function(data) {

    // Process tweet data
    tweetData = data;
    earliestTweetDate = moment(data[0].created_at);
    totalHours = diffTopOfHour(moment(),earliestTweetDate);
    maxRetweets = _.max(tweetData,function(d) { return d.numRetweets }).numRetweets;
    
    // Write start and end legend 
    startLegend.text(earliestTweetDate.from(moment()));  
    endLegend.text("now");    

    vizContainer.width(viewport);
    numTweetsDisplay.text(tweetData.length);

    // Initialize SVG
    var svgWidth = viewport - (startLegend.outerWidth() + endLegend.outerWidth() - 10);    
    xAxis = d3.scale.linear().range([0, svgWidth]).domain([0, totalHours+1]),
    totalHeight = (height + padding)*tweetData.length;
    
    
    svg = d3.select(svgContainer[0]).append("svg")
      .attr("width", svgWidth)
      .attr("height",  totalHeight)
      .on("click", function() { 
        tweetContainer.removeClass("show"); 
        d3.event.stopPropagation(); 
      })
      .append("g");


    // Start drawing
    drawHour(0);
 };


  function drawHour(hour) {
    updateRectData(hour);
    addAdditionalRects();
    var totalRects = rectData.length;
    var numRectsTransitioned = 0;
    // Increment width of all existing rects
    svg.selectAll("rect")
      .transition()
      .duration(10)
      .attr("width", function(d, i) {
        var that = d3.select(this);
        return parseFloat(that.attr("width") || 0) + xAxis(1);
      })
      .each("end",function() {
        numRectsTransitioned++;
        if (hour < totalHours) {
          if (numRectsTransitioned == totalRects) {
            drawHour(hour+1);
          } 
        }
      });
  };

  function addAdditionalRects() {
    // Add any additional rects that might have been created
    svg.selectAll("rect")
      .data(rectData)
      .enter()
      .append("svg:rect")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", function(d) {return color(d.retweetCount/maxRetweets); })
      .attr("y", function(d) { return d["tweetIndex"] * (height + padding); })
      .attr("x", function(d) {
        return xAxis(d.startHour);
      })
      .attr("height", height)
      .attr("width",  0)
      .on("click", displayTweetForRect);
  }


  // Update the rect data for the specific hour
  // by looking at retweet counts
  function updateRectData(hour) {
    _.each(tweetData, function(t,idx) {
      var tweetHour = diffTopOfHour(moment(t.created_at), earliestTweetDate);
      if (tweetHour > hour) {
        //nothing to do
        return;
      }

      var count = t.hourlyRetweetCount[hour - tweetHour] || 0;
      if (tweetHour < hour) {
        // Tweet has happened.
        if (count > 0) {
          cumulativeRetweetCount[t.id] += count;
          rectData.push({ "tweet" : t, "startHour" : hour, "tweetIndex": idx, "retweetCount": cumulativeRetweetCount[t.id] });
        }
      }

      if (tweetHour == hour) {
        cumulativeRetweetCount[t.id] = count;
        // Tweet happened this hour.
        rectData.push({ "tweet" : t, "startHour" : hour, "tweetIndex": idx , "retweetCount": count });
      }
    });
  };

  function displayTweetForRect(d, i) {
    var that = d3.select(this);
    var tweetHour = diffTopOfHour(moment(d.tweet.created_at), earliestTweetDate);
    var link = tweetContainer.find("a");
    if(link.attr("href") != d.tweet.permalink) {
      //hide and show correctly with queue
      tweetContainer.removeClass("show").delay(100).queue(function() {
        
        //Adding tweet data and sublimal color matching
        var tweetText = d.tweet.text + "<p style='color:" + that.attr('fill') + "'><b>tweeted " + moment(d.tweet.created_at).fromNow() + "</b> with " + "<b class=retweetCount>" + cumulativeRetweetCount[d.tweet.id] + "</b> retweets</p>";

        link.attr("href", d.tweet.permalink).html(tweetText);

        tweetContainer.css({
          "left": xAxis(tweetHour) + startLegend.outerWidth() + "px",
          "top": (+that.attr('y') + height) + "px"
        });  
      
        tweetContainer.addClass("show");                           
        $(this).dequeue();                            
      });

      

    }   
    
    d3.event.stopPropagation();
  };
  // calculates the difference in hours
  // between two moment values from the top
  // of hour
  function diffTopOfHour(a,b) {
    return a.minutes(0).diff(b.minutes(0),"hours");
  }

})(timeline);

// Fetch the data
$.ajax({
  url: "./json/ebbflow.json",
  success: function(data) {
    timeline.drawTimeline(data);
  }
});