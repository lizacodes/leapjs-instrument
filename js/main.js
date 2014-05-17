Array.prototype.sortByObjProp = function(sortBy) {
    return this.sort(function(a, b) {
        var aX = a[sortBy][0];
        var bX = b[sortBy][0];

        if (aX < bX) {
            return -1;
        }
        if (aX > bX) {
            return 1;
        }
        return 0;
    });
};

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioCtx            =   new webkitAudioContext();
var windowWidth               =   window.innerWidth;
var windowHeight              =   window.innerHeight;
var stage               =   document.querySelector('#stage');
var pianoZone           =   windowHeight * 0.6; // 60% from top of stage
var circleTpl           =   document.createElement('div');
circleTpl.className     =   'circle';
var existingCircles     =   {}; // placeholder for circle visualisations
var controllerOptions   =   { enableGestures: true };
var controller          =   new Leap.Controller(controllerOptions);
var isSwiping           =   false;
var currFrameObj; // placeholder for existing Frame Objects in Leap Loop

var notes = [
    { noteName: 'c3', frequency: 130.81 },
    { noteName: 'd3', frequency: 146.83 },
    { noteName: 'e3', frequency: 164.81 },
    { noteName: 'f3', frequency: 174.61 },
    { noteName: 'g3', frequency: 196.00 },
    { noteName: 'a3', frequency: 220.00 },
    { noteName: 'b3', frequency: 246.94 },
    { noteName: 'c4', frequency: 261.63 },
    { noteName: 'd4', frequency: 293.66 },
    { noteName: 'e4', frequency: 329.63 },
    { noteName: 'f4', frequency: 349.23 },
    { noteName: 'g4', frequency: 392.00 }
];

var pianoNotes = notes.map(function(noteObj) {
    return new PianoNote(noteObj, 0.2, 0.2);
});

var swipeSound = {
    left: new SwipeSound({ startFreq: 440, endFreq: 50, decay: 0.5, type: 'triangle' }),
    right: new SwipeSound({ startFreq: 100, endFreq: 1000, decay: 0.25, type: 'square' })
};

var circleSound = new WhiteNoise();

var wobbulators = {
    left: new createWobbulator('square', { min: 10, max: 500 }),
    right: new createWobbulator('sine', { min: 50, max: 800 })
};

var beats = [
    {
        source: new Oscillator({ frequency: 100, type: 'sawtooth'}),
        sourceConfig: function() {
            this.source.gainNode.gain.value = 1;
            this.source.osc.connect(this.source.gainNode);
        },
        envelope: function() {
            this.source.gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime);
            this.source.gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.001);
            this.source.gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
            this.source.gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.5);
            this.source.gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.9);
        },
        playOnStart: true,
        interval: 2000,
        timeout: 0
    },
    {
        source: new Oscillator({ frequency: 440, type: 'triangle'}),
        sourceConfig: function() {
            var filter = audioCtx.createBiquadFilter();

            filter.type = 'highpass';
            filter.frequency.value = 660;
            filter.Q.value = 10;

            this.source.osc.connect(filter);
            filter.connect(this.source.gainNode);
        },
        envelope: function() {
            this.source.gainNode.connect(audioCtx.destination);
            this.source.gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime);
            this.source.gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.001);
            this.source.gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.05);
        },
        playOnStart: false,
        interval: 2000,
        timeout: 1000
    }
];

function PianoNote(noteObj, attack, release) {
    this.noteName = noteObj.noteName;
    this.note = new Oscillator({ frequency: noteObj.frequency, type: 'square' });
    this.attack = attack || 0;
    this.release = release || 0;

    var filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 440;
    filter.Q.value = 1;

    this.note.gainNode.gain.value = 2;
    this.note.osc.connect(filter);
    filter.connect(this.note.gainNode);
    this.note.gainNode.connect(audioCtx.destination);
}

PianoNote.prototype.play = function() {
    var now = audioCtx.currentTime;

    this.note.gainNode.gain.cancelScheduledValues(now);
    this.note.gainNode.gain.linearRampToValueAtTime(1, now + this.attack);
};

PianoNote.prototype.stop = function() {
    var now = audioCtx.currentTime;

    this.note.gainNode.gain.linearRampToValueAtTime(0, now + this.release);
};

function Oscillator(config) {
    var now = audioCtx.currentTime;

    this.pressed = false;
    this.osc = audioCtx.createOscillator();
    this.gainNode = audioCtx.createGainNode();

    // set defaults
    if(typeof config !== 'undefined') {
        this.osc.frequency.value = config.frequency || 440;
        this.osc.type = config.type || 'triangle';
    }

    this.osc.start(0);
    this.gainNode.gain.setValueAtTime(0, now);
}

function WhiteNoise() {
    var now = audioCtx.currentTime;

    this.noise = generateSoundSource(function(bufferData) {
        var n = bufferData.length;

        for (var i = 0; i < n; i++) {
            bufferData[i] = Math.random();
        }
    });

    this.gainNode = audioCtx.createGainNode();
    this.gainNode.gain.setValueAtTime(0, now);

    this.noise.connect(this.gainNode);
    this.gainNode.connect(audioCtx.destination);

    this.noise.start(0);
}

WhiteNoise.prototype.play = function() {
    var _self = this;
    var now = audioCtx.currentTime;

   this.gainNode.gain.cancelScheduledValues(now);

   // play sound
   this.gainNode.gain.linearRampToValueAtTime(1, now + 0.002);
   this.gainNode.gain.linearRampToValueAtTime(0, now + 0.200);
};

function SwipeSound(config) {
    this.config = config;
    this.isPlaying = false;

    this.note = new Oscillator({ type: this.config.type });
    this.note.osc.connect(this.note.gainNode);
    this.note.gainNode.connect(audioCtx.destination);
}

SwipeSound.prototype.play = function() {
    var now = audioCtx.currentTime;
    var _self = this;

    if(!this.isPlaying) {
      this.isPlaying = true;

      this.note.osc.frequency.cancelScheduledValues(now);
      this.note.gainNode.gain.cancelScheduledValues(now);

      // play sound
      this.note.osc.frequency.setValueAtTime(this.config.startFreq, now);
      this.note.osc.frequency.linearRampToValueAtTime(this.config.endFreq, now + this.config.decay);

      this.note.gainNode.gain.setValueAtTime(0, now);
      this.note.gainNode.gain.linearRampToValueAtTime(1, now + 0.001);
      this.note.gainNode.gain.linearRampToValueAtTime(0, now + this.config.decay);

      setTimeout(function() {
        _self.isPlaying = false;
      }, this.config.decay);
    }
};

function createWobbulator(type, range) {
    var oscillator = new Oscillator({ frequency: 440, type: type });
    var modulator = new Oscillator({ frequency: 10, type: 'sine' });

    modulator.gainNode.gain.setValueAtTime(100, audioCtx.currentTime);

    modulator.gainNode.connect(oscillator.osc.frequency);
    oscillator.osc.connect(oscillator.gainNode);
    oscillator.gainNode.connect(audioCtx.destination);

    return {
        oscillator: oscillator,
        modulator: modulator,
        range: range
    };
}

function generateSoundSource(generator) {
    // Create sample as audio source
    var sample = audioCtx.createBufferSource();
    var buffer = audioCtx.createBuffer(1, 4096, audioCtx.sampleRate);
    var bufferData = buffer.getChannelData(0);

    // Fill audio buffer with sound generator
    generator(bufferData);

    // Set buffer on source
    sample.buffer = buffer;

    // Loop source
    sample.loop = true;

    return sample;
}

function playBeat(beat) {
    beat.sourceConfig();

    if(beats.playOnStart === true) {
        beat.setInterval = setInterval(function() {
            beat.envelope();
            beat.source.gainNode.connect(audioCtx.destination);
        }, beat.interval);
    } else {
        beat.setTimeout = setTimeout(function() {
            beat.setInterval = setInterval(function() {
                beat.envelope();
                beat.source.gainNode.connect(audioCtx.destination);
            }, beat.interval);
        }, beat.timeout);
    }
}

function twoPointLine(value, minFreq, maxFreq) {
    return (value / -100 * (maxFreq - minFreq) + minFreq).toFixed(2);
}

function visualiseFrameObject(frameObjInfo) {
    currFrameObj[frameObjInfo.id] = true;
    addCircle(frameObjInfo.id, frameObjInfo.type);
    moveCircle(frameObjInfo.id, frameObjInfo.coords);
}

function moveCircle(id, coords) {
    existingCircles[id].style.left = coords.x + 'px';
    existingCircles[id].style.top = coords.y + 'px';
}

function addCircle(id, type) {
    var pointer = existingCircles[id];
    if(!pointer) {
        pointer = circleTpl.cloneNode(true);

        switch(type) {
            case 'hand':
                pointer.className += ' palm';
                break;
            default:
                pointer.className += ' tip';
        }

        stage.appendChild(pointer);
        existingCircles[id] = pointer;
    }
    return pointer;
}

function removeCircles(currFrameObj) {
    for(var id in existingCircles) {
        if(!currFrameObj[id]) {
            stage.removeChild(existingCircles[id]);
            delete existingCircles[id];
        }
    }
}

function translateToStage(coords) {
    return {
        x: windowWidth / 2 + coords[0] * 3,
        y: windowHeight - coords[1] * 3
    };
}

controller.loop(function(frame) {
    var hands = frame.hands;
    var gestures = frame.gestures;
    var fingers = frame.fingers;
    var now = audioCtx.currentTime;

    currFrameObj = {}; // clear previously stored frame

    if(hands.length) {
        var sortedHands = hands.sortByObjProp('palmPosition');

        sortedHands.forEach(function(hand, index) {
            var coords = translateToStage(hand.palmPosition);
            var handY = coords.y;
            var handZ = hand.palmPosition[2];
            var freq;
            var currWobbulator;

            visualiseFrameObject({
                id: hand.id,
                coords: coords,
                type: 'hand'
            });

            // Wobbulators use the 'Z' position of the palm to figure out what frequency or
            // how loudly to play
            if(index < 2) {
                if(hand.stabilizedPalmPosition[0] < 0) {
                    // left of controller
                    currWobbulator = wobbulators.left;
                    freq = twoPointLine(handZ, currWobbulator.range.min, currWobbulator.range.max);
                } else {
                    // right of controller
                    currWobbulator = wobbulators.right;
                    freq = twoPointLine(handZ, currWobbulator.range.min, currWobbulator.range.max);

                }

                if(handZ < 0 && handZ > -100 && handY < pianoZone) {
                    var gain = (handZ / -100).toFixed(2);

                    existingCircles[hand.id].className = "circle palm screen-touch";

                    currWobbulator.oscillator.gainNode.gain.cancelScheduledValues(now);
                    currWobbulator.oscillator.gainNode.gain.setValueAtTime(gain, now);
                    currWobbulator.oscillator.osc.frequency.setValueAtTime(freq, now);
                } else {
                    existingCircles[hand.id].className = "circle palm";

                    currWobbulator.oscillator.gainNode.gain.linearRampToValueAtTime(0, now + 1);
                }
            }
        });

        removeCircles(currFrameObj);
    }

    if(fingers.length) {
        var sortedFingers = fingers.sortByObjProp('tipPosition');

        sortedFingers.forEach(function(finger, index) {
            var coords = translateToStage(finger.tipPosition);
            var now = audioCtx.currentTime;
            var pianoNote = pianoNotes[index];

            visualiseFrameObject({
                id: finger.id,
                coords: coords,
                type: 'finger'
            });

            if(typeof pianoNote !== 'undefined') {
                if(coords.y >= pianoZone) {
                    pianoNote.play();
                } else {
                    pianoNote.stop();
                }
            }
        });

        removeCircles(currFrameObj);
    }
});

controller.on('gesture', function(gesture, frame) {
    switch(gesture.type) {
        case 'circle':
            if(gesture.state === 'stop') {
                if(gesture.center[1] < pianoZone && gesture.radius > 80) {
                    circleSound.play();
                }
            }
        break;

        case 'swipe':
            isSwiping = true;

            if(gesture.state === 'stop') {
                isSwiping = false;

                if(gesture.speed > 1400) {
                    var startPos = gesture.startPosition;
                    var stopPos = gesture.position;

                    // Check if the swipe is above the piano area
                    if(startPos[1] < pianoZone && stopPos[1] < pianoZone) {
                        if(startPos[0] > stopPos[0]) {
                            // swipe left
                            swipeSound.left.play();
                        } else {
                            // swipe right
                            swipeSound.right.play();
                        }
                    }
                }
            }
        break;
    }
});

window.addEventListener('load', function() {
    var beatsPlaying = false;
    var beatToggle = document.getElementById('beat-toggle');

    beatToggle.addEventListener('click', function() {
        var i = 0;

        if(beatsPlaying) {
            beatsPlaying = false;
            for(i; i < beats.length; i++) {
                clearInterval(beats[i].setInterval);
                clearTimeout(beats[i].setTimeout);
            }
            beatToggle.innerHTML = 'Play beat';
        } else {
            beatsPlaying = true;

            for(i; i < beats.length; i++) {
                playBeat(beats[i]);
            }
            beatToggle.innerHTML = 'Stop beat';
        }
    });
});