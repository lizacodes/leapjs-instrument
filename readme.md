#LeapJS instrument with Web Audio
I made a one-person-band instrument for the Leap Motion controller comprised of sci-fi-ish sounds generated with the Web Audio API. I did this by associating these sounds with certain interactions and gestures.

I did a talk at MelbJS May 2014 to accompany the demo. It covers the basics of Leap JS, Web Audio and how you can combine the two: http://noogn.github.io/leapjs-webaudio-talk/

##How to play it

If you have a controller plugged in, try it out here: http://noogn.github.io/leapjs-instrument/

* Weird laser - swipe gesture (left)
* Weird laser 2 - swipe gesture (right)
* Wobbulating theremin 1 - on the left side of the controller, move hand towards and past it
* Wobbulating theremin 2 - on the right side of the controller, move hand towards and past it
* Hihat - circle gesture
* Piano - move fingers past the "piano zone" (the grey block on the page) and it will play a note corresponding to the visible fingers. Eg. 1st finger from the left plays C, 2nd: D, 3rd: E, etc.

On top of that, the "Play beat" button just plays 2 sounds at certain intervals, acting as a metronome of sorts, just for fun.

##Further reading

* [A Young Person's Guide to the Principles of Music Synthesis](http://beausievers.com/synth/synthbasics/) - Weird title, but a great primer for those with little to zero knowledge on digital audio.
* [Web Audio API](http://chimera.labs.oreilly.com/books/1234000001552/index.html) - The first book on the Web Audio API published online in full.
* [LeapJS documentation](https://developer.leapmotion.com/leapjs/welcome) - Get to know LeapJS better. Please note that I've linked to the v1 docs. v2 was only released a few days after I presentented the demo!


###Todo

* Display note names when playing piano notes
* Create a "play" method for the wobbulating theremin
* Reduce instances of magic numbers - this will result in slightly more configurable sounds
* Any upgrades/changes necessary for Leap Motion SDK 2.0