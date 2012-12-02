jQuery.getJSON("firstbatch.json",function(data) {
  parse(data.data.items);
});

float[] latdata = {
  40.111909,
};
float[] londata = {
  -88.221039,
};

places = [];
placescache = {};
history = [];

void parse(var data) {
  console.log(data);
  findPlaces(data, 0.001);
  //drawonce();
}

function findPlaces(var data, var cluster) {
  for (index in data) {
    var item = data[index];
    var hashloc = makeHash(item, cluster);
    //console.log("Looking for "+hashloc+" in "+placescache);
    var bestplace = findPlaceInCache(item, placescache, cluster);
    if (bestplace) {
      bestplace.updatePlace(item);
      //console.log("Updating old place");
    } else {
      console.log("making new place");
      bestplace = new Place(item);
      bestplace.initPlace(item);
      //console.log("place centerlon: "+bestplace.centerlon);
      places.push(bestplace);
      if (!placescache[hashloc])
        placescache[hashloc] = [bestplace, bestplace];
      placescache[hashloc].push([bestplace]);
    }
  }
}

function makeHash(var item, var cluster) {
  var hashloc = str(round(item.latitude/cluster/2.0));
  hashloc += str(round(item.longitude/cluster/2.0));
  return hashloc;
}

function findPlaceInCache(var item, var placescache, var cluster) {
  var hashloc = makeHash(item, cluster);
  if (hashloc in placescache) {
    for (placeindex in placescache[hashloc]) {
      var place = placescache[hashloc][placeindex];
      //console.log("checking "+place.centerlat+", "+place.centerlon);
      //console.log(place);
      var distance = dist(place.centerlat, place.centerlon, item.latitude, item.longitude);
      //console.log("distance: "+distance);
      if (dist(place.centerlat,place.centerlon, item.latitude,item.longitude) < cluster) {
        //console.log("Found a good place");
        return place;
      } 
    }
  }
}


class Place {
  float centerlat;
  float centerlon;
  var items;
  void initPlace(var item) {
    this.centerlat = item.latitude;
    this.centerlon = item.longitude;
    this.items = [item];
    //console.log("my centerlat: "+this.centerlat);
  }

  void updatePlace(var item) {
    this.items.push(item);
    this.centerlat = ((this.centerlat*this.items.length)+item.latitude)/(this.items.length+1);
    this.centerlon = ((this.centerlon*this.items.length)+item.longitude)/(this.items.length+1);
    //console.log("Updating. new latlon: "+this.centerlat+" , "+this.centerlon);
  }

  float getX(var left, var scale) {
    return width -((this.centerlon-left+scale)/scale)*width;
  }
  float getY(var top, var scale) {
    return ((this.centerlat-top )/scale)*height;
  }
}

void setup() {
  size(800,800);
  background(100);
  smooth(8);
}


float[] data = new float[latdata.length*2];
float latmin = min(latdata);
float lonmin = min(londata);
float latscale = 1/(max(latdata)-latmin);
float lonscale = 1/(max(londata)-lonmin);
float padding = 20;
float sizex = width-padding*2;
float sizey = height-padding*2;

for (int i=0; i<latdata.length; i++) {
  float lat = latdata[i];
  float lon = londata[i];
  lat = abs((lat - latmin)*latscale);
  lon = abs((lon - lonmin)*lonscale);
  lat = height-(padding+(lat * sizey));
  lon = padding+(lon * sizex);
  data[i*2+0] = lat;
  data[i*2+1] = lon;
}

void draw() {
  background(0);
  fill(200,200);
  noStroke();
  for (i in places) {
    var place = places[i];
    //println("Drawing place at "+place.centerlon+", "+place.centerlat);
    ellipse(place.getX(-88.2, 0.05), place.getY(40.1, 0.05), int(frameCount)%20, 10); 
  }
}

void draw2() {

  noFill();
  stroke(150,100);
  strokeWeight(3);
  float lastlat=data[0],lastlon=data[1];
  for (int i=0; i<data.length; i+=2) {
    float lat = data[i];
    float lon = data[i+1];
    line(lastlon,lastlat,lon,lat);  
    lastlat = lat;
    lastlon = lon;
  }

  //fill(200,50);
  //stroke(250,50);
  //strokeWeight(3);
  //for (int i=0; i<data.length; i+=2) {
  //  ellipse(data[i+1],data[i],30,30);  
  //  ellipse(data[i+1],data[i],31,31);  
  //}

  fill(200,50);
  noStroke();
  for (int i=0; i<data.length; i+=2) {
    ellipse(data[i+1],data[i],10,10);  
  }
  fill(200,5);
  noStroke();
  for (int i=0; i<data.length; i+=2) {
    float radius = (pow(2,random(1,2))-2)*25;
    ellipse(data[i+1],data[i],radius,radius);  
    radius = (pow(2,random(1,2))-2)*25;
    ellipse(data[i+1],data[i],radius,radius);  
    radius = (pow(2,random(1,2))-2)*25;
    ellipse(data[i+1],data[i],radius,radius);  
  }

}

