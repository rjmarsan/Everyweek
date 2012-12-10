self.onmessage= function(event) {
	p = {};
	p.width = event.data.width;
	p.height = event.data.height;
	parse(event.data.data);
}
function floor(x) {
  return Math.floor(x);
}
function dist(x1,y1,x2,y2) {
  return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}

g_lon = -88.2; //12;
g_lon_scale = 0.05; //2;
g_lat = 40.077; //05;
g_lat_scale = 0.05; //2;


var parse = function(data) {
  //for (var x=0; x<700; x++) data.pop();
  data.reverse();
  //console.log(data);
  processAll(data);
  //console.log(data);
  //findPlaces(data, 0.003);
  //drawonce();
  weeks = makeWeekLists(data);
  //while (weeks.length > 1) weeks.pop();
  //console.log(weeks);
  var weektimelines = makeWeekTimelines(weeks);
  var timeline = new History();
  timeline.setHistory(data);
  guessScale(weektimelines);
  timeline.findCenter();
  timeline.findBestBoundingBox(.99);
  var bestbox = timeline.bestbox;
  //initActivity();
  //initWeeks();
  //dataisready = true;
  
  var data = {};
  data.timeline = timeline;
  data.weeks = weeks;
  data.weektimelines = weektimelines;
  data.g_lon = g_lon;
  data.g_lon_scale = g_lon_scale;
  data.g_lat = g_lat;
  data.g_lat_scale = g_lat_scale;
  data.g_lon = bestbox.r;
  data.g_lon_scale = bestbox.r-bestbox.l;
  data.g_lat = bestbox.t;
  data.g_lat_scale = bestbox.b-bestbox.t;
  self.postMessage(data);
};

function processAll(data) {
  for (index in data) processItem(data[index]);
}

function processItem(item) {
  var timestamp = new Number(item.timestampMs);
  //println("asdfasdf:"+timestamp);
  var date = new Date(timestamp);
  item.timestamp = floor(item.timestampMs/1000);
  item.hour = date.getHours();
  item.dayofweek = date.getDay();
  //println(date);
  //println(item.dayofweek);
  var hourofweek = item.dayofweek * 24 + item.hour;
  if (ishourweekend(hourofweek)) {
    item.weekend = 1;
    //println("WEEKENDDDDDD "+item.dayofweek);
  } else {
    item.weekend = 0;
    //println("WEEK "+item.dayofweek);
  }
//*/
}

function ishourweekend(hourofweek) {
  return hourofweek < 24 || hourofweek >= 5.7*24;
}

function makeWeekLists(history) {
  //println("Calling makeWeekLists with "+history.length);
  var current_day = 0;
  var weeks = [];
  var current_week = [];
  for (index in history) {
    var item = history[index];
    if (item.dayofweek < current_day) {
      weeks.push(current_week);
      current_week = [];
      //println("New week: "+weeks.length);
    }
    current_day = item.dayofweek;
    current_week.push(item);
  }
  weeks.push(current_week);
  return weeks;
}

function getStartOfWeek(timestamp) {
  var day = new Date(timestamp);
  day.setDate(day.getDate()-day.getDay());
  day.setHours(0,0,0);
  return day.getTime();
}

function makeWeekTimelines(weeks) {
  var timelines = [];
  for (index in weeks) {
    var week = weeks[index];
    var timeline = new History();
    timeline.setHistory(week);
    if (timeline.areAnyInRange()) {
      timelines.push(timeline);
    } else {
      //println("Have to remove week "+index);
    }
  
  }
  return timelines;
}

function guessScale(weeks) {
  var width = 0.07;
  var height = 0.045;
  //console.log(weeks[0]);

  var index = ransac(weeks);
  var centerlon = weeks[index].mostpoplon;
  var centerlat = weeks[index].mostpoplat;
  g_lon = centerlon+width/2;
  g_lat = centerlat-height/2;
  g_lon_scale = width;
  g_lat_scale = height;

  //console.log(" New: g_lon:"+g_lon+", g_lat:"+g_lat+" g_lon_scale:"+g_lon_scale+" g_lat_scale:"+g_lat_scale);
}

function ransac(weeks) {
  var best = [0,10000000];
  for (var x=0; x<10; x++) {
    var option = ransacIter(weeks);
    if (option[1] < best[1]) 
      best = option;
  }
  return best[0];
}

function ransacIter(weeks) {
  var randomindex = Math.floor(Math.random()*weeks.length);
  var lon = weeks[randomindex].mostpoplon;
  var lat = weeks[randomindex].mostpoplat;
  var disttotal = 0;
  for (i in weeks) {
    var week = weeks[i];
    var lon2 = week.mostpoplon;
    var lat2 = week.mostpoplat;
    var d = dist(lon, lat, lon2, lat2);
    disttotal += d;
  }
  disttotal = disttotal / weeks.length;
  return [randomindex, disttotal];
}



function getLonX(lon, left, scale) {
    return ((lon-left+scale)/scale)*p.width;
}
function getLatY(lat, top, scale) {
  return p.height-((lat-top )/scale)*p.height;
}
function getX(lon) {
    return getLonX(lon, g_lon, g_lon_scale);
}
function getY(lat) {
    return getLatY(lat, g_lat, g_lat_scale);
}


function History() {
  this.history = [];
  this.firsttime = 0;
  this.now = 0;
  this.currentindex = 0;
  this.curitem = 0;
  this.nextitem = 0;
  this.progress = 0;
  this.duration = 0;
  this.lastlat = -Infinity;
  this.lastlon = -Infinity;
  this.isnewlocation = 0;
  this.curlat = 0;
  this.curlon = 0;
  this.distance = 0;
  this.mostpoplon = 0;
  this.mostpoplat = 0;
}
History.prototype.setHistory = function(list) {
    this.history = list;
    this.firsttime = this.history[0].timestampMs;
    this.currentindex = 0;
    this.now = getStartOfWeek(new Number(this.firsttime));
    this.firsttime = this.now;
    this.findCenter(list);
    //console.log("First time: "+this.firsttime+ " now "+this.now);
};
History.prototype.update = function(amount) {
    this.now += amount;
    if (!this.history || this.currentindex+1 >= this.history.length) { 
      this.finish();
      return; 
    }
    //println("starting update by "+amount+" now at "+this.now+" with curindex attt "+this.currentindex);
    this.isnewlocation = false;
    while (this.history[this.currentindex+1].timestampMs < this.now) {
      //println("Not there yet: "+this.currentindex+" looking for "+this.now+" and got "+history[this.currentindex+1].timestampMs);
      this.currentindex += 1;
      this.isnewlocation = true;
      if (this.currentindex+2 >= this.history.length) { 
	this.finish();
	return; 
      }
    }
   // println("Calling update by "+amount+" now at "+this.now+" with curindex attt "+this.currentindex);
    this.curitem = this.history[this.currentindex];
    this.nextitem = this.history[this.currentindex+1];
    this.duration = this.nextitem.timestampMs - this.curitem.timestampMs;
    this.progress = (this.now - this.curitem.timestampMs)/(this.duration+0.0);
    this.lastlat = this.curlat;
    this.lastlon = this.curlon;
    this.curlat = this.getInterpLat();
    this.curlon = this.getInterpLon();
    this.distance = dist(this.lastlat, this.lastlon, this.curlat, this.curlon);
};
History.prototype.finish = function() {
    this.isnewlocation = false;
    this.distance = 0;
    this.nextitem = 0;
};
History.prototype.isOkToInterp = function() {
    return (this.nextitem && this.duration < 1000*60*60*6 && this.curitem.timestampMs <= this.now);
};
History.prototype.isAtEnd = function() {
    return (this.now - this.firsttime) > (1000*60*60*24*7);
};
History.prototype.reset = function() {
    this.currentindex = 0;
    this.now = this.firsttime;
};
History.prototype.getInterpLon = function() {
    var lon1 = getLonX(this.curitem.longitude, g_lon, g_lon_scale);
    var lon2 = getLonX(this.nextitem.longitude, g_lon, g_lon_scale);
    var curlon = lerp(lon1, lon2, this.progress);
    return curlon;
};
History.prototype.getInterpLat = function() {
    var lat1 = getLatY(this.curitem.latitude, g_lat, g_lat_scale);
    var lat2 = getLatY(this.nextitem.latitude, g_lat, g_lat_scale);
    var curlat = lerp(lat1, lat2, this.progress);
    return curlat;
};

History.prototype.areAnyInRange = function() {
    for (i in this.history) {
      var x = getX(this.history[i].longitude);
      var y = getY(this.history[i].latitude);
      if (x > 0 && x < p.width && y > 0 && y < p.height)
	return true;
    }
    return false;
};

var DIST_THRESH = 1; //good radius.
History.prototype.findCenter = function() {
  var best = [0,0,0,0];
  var bestcount = 0;
  for (var x=0; x<10; x++) {
    var calc = this.findCenterInner();
    var count = calc[3];
    //console.log("For run "+x+" got "+calc);
    if (count > bestcount) {
      best = calc;
      bestcount = count;
    }
  }

  //console.log("FINAL "+best);
  this.mostpoplon = best[0];
  this.mostpoplat = best[1];
  this.mostpopcount = bestcount;
};
History.prototype.findCenterInner= function() {
    var randindex = Math.floor(Math.random()*this.history.length);
    var plon = this.history[randindex].longitude;
    var plat = this.history[randindex].latitude;
    var pdist = 0;
    var goodcount = 1;
    for (var i=0; i<this.history.length; i++) {
      var lon = this.history[i].longitude;
      var lat = this.history[i].latitude;
      var d = dist(lon, lat, plon, plat);
      if (d < DIST_THRESH) {
	plon = (plon*goodcount+lon)/(goodcount+1);
	plat = (plat*goodcount+lat)/(goodcount+1);
	pdist = (pdist*goodcount+d)/(goodcount+1);
	goodcount += 1;
      }
    }
    return [plon,plat,pdist,goodcount];
};

History.prototype.isInRange = function() {
    var x = this.curlat;//getX(this.curitem.longitude);
    var y = this.curlon;//getY(this.curitem.latitude);
    if (x > 0 && x < p.width && y > 0 && y < p.height)
      return true;
    else
      return false;
};

History.prototype.findRandomBoundingBox = function(percentage) {
    var l = Infinity;
    var r = -Infinity;
    var t = Infinity;
    var b = -Infinity;
    for (var x = 0; x<this.history.length*percentage; x++) {
      var randomindex = Math.floor(Math.random()*this.history.length);
      var item = this.history[randomindex];
      var d = dist(item.longitude, item.latitude, this.mostpoplon, this.mostpoplat);
      if (d < DIST_THRESH) {
	l = item.longitude < l ? item.longitude : l; 
	r = item.longitude > r ? item.longitude : r;
	t = item.latitude  < t ? item.latitude  : t;
	b = item.latitude  > b ? item.latitude  : b;
      }
    }
    return {l:l,r:r,t:t,b:b};
}

History.prototype.evaluateBoundingBoxes = function(boxes) {
  var passed = [];
  var failed = [];
  var results = [];
  for (var b = 0; b<boxes.length; b++) {
    results.push(0);
    passed.push(0);
    failed.push(0);
  }
  for (var x = 0; x<this.history.length; x++) {
    var item = this.history[x];
    var d = dist(item.longitude,item.latitude, this.mostpoplon, this.mostpoplat);
    if (d < DIST_THRESH) {
      for (var b = 0; b<boxes.length; b++) {
	if (evaluateBox(boxes[b], item)) {
	  passed[b] += 1;
	} else {
	  failed[b] += 1;
	}
      }
    }
  }
  for (var b = 0; b<boxes.length; b++) {
    results[b] = passed[b]/(passed[b]+failed[b]+0.0);
  }
  return results;
}

History.prototype.findBestBoundingBox = function(threshold) {
  var boxes = [];
  for (var b = 0; b<100; b++) {
    boxes.push(this.findRandomBoundingBox(.03));
  }
  results = this.evaluateBoundingBoxes(boxes);
  passed = [];
  for (var b=0; b<boxes.length; b++) {
    if (results[b] > threshold) {
      passed.push(boxes[b]);
    }
  }
  if (passed.length == 0) {
    var bestindex = 0;
    var bestval = 0;
    for (var i=0;i<results.length;i++)  {
      if (results[i] > bestval) {
	bestval = results[i];
	bestindex = i;
      }
    }
    passed.push(boxes[i]);
  }
  this.boxes = boxes;
  this.results = results;
  this.passed = passed;
  this.bestbox = smallestBox(passed);
}

function evaluateBox(box, item) {
  var x = item.longitude;
  var y = item.latitude;
  return box.r >= x && box.l <= x && box.t <= y && box.b >= y;
}

function boxSize(box) {
  return (box.r-box.l)+(box.b-box.t);
}

function smallestBox(boxes) {
  if (boxes.length <= 0) return null;
  var bestsize = Infinity;
  var bestbox = boxSize(boxes[0]);
  for (var b = 0; b<boxes.length; b++) {
    var size = boxSize(boxes[b]);
    if (bestsize > size) {
      bestsize = size;
      bestbox = boxes[b];
    }
  }
  return bestbox;
}











