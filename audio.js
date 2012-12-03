/**
var context;
if (typeof AudioContext == "function") {
        context = new AudioContext();
} else if (typeof webkitAudioContext == "function") {
        context = new webkitAudioContext();
} else {
        throw new Error('AudioContext not supported. :(');
}
**/


function Audio() {
    this.ready = false;
    this.audiolet = new Audiolet();
    this.envelope = new ADSREnvelope(this.audiolet, 0, 2, 0.1, 1, 2);
    this.gain = new Gain(this.audiolet, 0);
    this.reverb = new Reverb(this.audiolet, 0.8, 0.8, 0.2);
    this.delay = new FeedbackDelay(this.audiolet, 0.5, 0.5, 0.25, 0.3);
    this.volume = new Gain(this.audiolet, 0);
    this.onoff = new Gain(this.audiolet, 0);
    this.out = this.gain;

    this.gain.connect(this.delay);
    this.delay.connect(this.reverb);
    this.envelope.connect(this.gain, 0, 1);
    this.reverb.connect(this.volume);
    this.volume.connect(this.audiolet.output);


    this.Synth = function(audiolet, frequency, vol, type) {
        AudioletGroup.apply(this, [audiolet, 0, 1]);

        if (type == 0) 
            this.sine = new Sine(this.audiolet, frequency);
        else if (type == 1) 
            this.sine = new Sine(this.audiolet, frequency);
        else if (type == 2) 
            this.sine = new Triangle(this.audiolet, frequency);
        else  
            this.sine = new Triangle(this.audiolet, frequency);
        this.gain = new Gain(this.audiolet);
        this.gain2 = new Gain(this.audiolet);
        this.gain2.gain.setValue(vol);
        this.envelope = new PercussiveEnvelope(this.audiolet, 1, 0.1, 0.1,
          function() {
              this.audiolet.scheduler.addRelative(0,
                                                  this.remove.bind(this));
          }.bind(this)
        );

        this.envelope.connect(this.gain, 0, 1);
        this.sine.connect(this.gain);
        this.gain.connect(this.gain2)
        this.gain2.connect(this.outputs[0])
    };
    extend(this.Synth, AudioletGroup);

    this.Noise = function(audiolet) {
        AudioletGroup.apply(this, [audiolet, 0, 1]);
        this.noise = new WhiteNoise(this.audiolet);
        this.noisefilter = new BandPassFilter(this.audiolet, 100);
        this.noisegain = new Gain(this.audiolet, 0.4);
        
        this.noise.connect(this.noisefilter);
        this.noisefilter.connect(this.noisegain);
        this.noisegain.connect(this.outputs[0]);
    };
    extend(this.Noise, AudioletGroup);
    this.noise = new this.Noise(this.audiolet);
    this.noise.connect(this.out);

    this.ready = true;
}

Audio.prototype.ping = function(midinote, volume, type) {
    var freq = Math.pow(2, (midinote-69)/12)*440;
    var synth = new this.Synth(this.audiolet, freq, volume, type);
    synth.connect(this.out);
};

Audio.prototype.setVolume = function(vol) {
    this.volume.gain.setValue(vol);
};

Audio.prototype.turnOnOff = function(val) {
    this.envelope.gate.setValue(val);
};

Audio.prototype.updateTime = function(hourinweek) {
    var hour = hourinweek % 24;
    hour = (hour+11)%24; //shift over
    hour = Math.abs(12-hour)*2;


    var dayinweek = Math.floor(hourinweek/7);
    var hournote = 24+hour*2;
    var hourfreq = Math.pow(2, (hournote-69)/12)*440;
    this.noise.noisefilter.frequency.setValue(hourfreq);
    var volume = (1-hour/24)*0.7 + 0.3;
    this.noise.noisegain.gain.setValue(volume);
    console.log("Setting hour "+hourinweek+ " to "+hour+" and "+hourfreq+" and "+volume);
};





function Sonification() {
    this.start = function () {
        if (audio && audio.ready) {
            audio.turnOnOff(1);
        }
    };
    this.stop = function () {
        if (audio && audio.ready) {
            audio.turnOnOff(0);
        }
    };
    this.volume = function(vol) {
        if (audio && audio.ready) {
            audio.setVolume(vol);
        }
    };
    this.getVolume = function() {
        if (audio && audio.ready) {
            return audio.volume.gain.getValue();
        }
        return 1;
    }
    this.setWeekProgress = function(progress) {
        if (audio && audio.ready) {
            audio.updateTime(progress*7*24);
        }
    }
    this.ping = function(x1, y1, x2, y2, vel) {
        var x = (x1+x2)/2;
        var y = (y1+y2)/2;
        if (x < 0 || x > 1 || y < 0 || y > 1) return;
        var size = notes.length;
        var xcoord = Math.floor(x*size);
        var ycoord = Math.floor(y*size);
        //console.log("for "+x1+", "+y1+"  and  "+x2+","+y2+" we picked "+x+", "+y+" which is "+xcoord+","+ycoord); 
        var note = notegrid[ycoord][xcoord];
        var offset = 60;
        var vol = Math.min(1, vel/200);
        console.log("Volume: "+vol);
        if (audio && audio.ready) {
            audio.ping(offset+note, vol);
        }
    }

    this.ping = function(x1, y1, x2, y2, vel, ismain, week) {
        var x = (x1+x2)/2;
        var y = (y1+y2)/2;
        if (x < 0 || x > 1 || y < 0 || y > 1) return;
        var vel = Math.min(1, Math.abs(vel));
        var velindex = Math.floor(vel*notes.length);
        var note = notes[velindex];
        var range = 3-(week)%4;
        var offset = (range+3)*12;
        var type = 3-range; //square, saw, etc.
        console.log("offset: "+offset+" for range: "+range+" and type: "+type);
        if (audio && audio.ready) {
            audio.ping(offset+note, Math.sqrt(vel), type);
        }
    }
}



var notes = [0, 5, 7, 9, 12, 17, 19, 21, 24, 29, 31, 33, 36];
var notes = [0, 3, 5, 9];
var origlength = notes.length;
for (var x=0; x<origlength*1.5; x++) {
    notes.push(notes[x]+12);
}
//notes = notes.concat(notes);
//notes = notes.concat(notes);
//notes = notes.concat(notes);
console.log(notes);
function makeGrid() {
    var notegrid = [];
    var size = notes.length;
    for (var y=0; y<size; y++) {
        notegrid.push([]);
        for (var x=0; x<size; x++) {
            notegrid[y].push(notes[(x+y)%size]);
        }
    }
    console.log(notegrid);
    return notegrid;
}

var notegrid = makeGrid();


var audio = new Audio();
var sonification = new Sonification();
audio.turnOnOff(1);


function toggleMute() {
    if (sonification.getVolume() <= 0) {
        sonification.volume(1);
    } else {
        sonification.volume(0);
    }

    if (sonification.getVolume() <= 0) {
        $("#volume-button").text("unmute");
    } else {
        $("#volume-button").text("mute");
    }
}
