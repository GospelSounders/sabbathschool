const Decoder = require('midi-file-parser')
const Encoder = require('jsmidgen')
const Util = require('./Util')
const {
	Track
} = require('./Track')
const {
	parseHeader
} = require('./Header')

const scales = [
	[ // major scale
		['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', '', '', '', '', '', ''], // flats
		['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', '', '', ''] //sharps
	],
	[ // minor
		['A','D','G','C','F','Bb','Eb','Ab','','','','','','',''],
		['A','E','B','F#','C#','G#','D#','A#','','','','','','','']
	]
]
// import * as Decoder from 'midi-file-parser'
// import * as Encoder from 'jsmidgen'
// import * as Util from './Util'
// import {Track} from './Track'
// import {parseHeader} from './Header'

/**
 * @class The Midi object. Contains tracks and the header info.
 */
class Midi {
	/**
	 * Convert JSON to Midi object
	 * @param {object} json
	 * @static
	 * @returns {Midi}
	 */
	static fromJSON(json) {
		var midi = new Midi()

		midi.header = json.header
		json.tracks.forEach((track) => {
			var newTrack = Track.fromJSON(track)
			midi.tracks.push(newTrack)
		})

		return midi
	}

	constructor() {

		this.header = {
			//defaults
			bpm: 120,
			timeSignature: [4, 4],
			PPQ: 480
		}

		this.tracks = []
	}

	/**
	 * Load the given url and parse the midi at that url
	 * @param  {String}   url
	 * @param {*} data Anything that should be sent in the XHR
	 * @param {String} method Either GET or POST
	 * @return {Promise}
	 */
	load(url, data = null, method = 'GET') {
		return new Promise((success, fail) => {
			var request = new XMLHttpRequest()
			request.open(method, url)
			request.responseType = 'arraybuffer'
			// decode asynchronously
			request.addEventListener('load', () => {
				if (request.readyState === 4 && request.status === 200) {
					success(this.decode(request.response))
				} else {
					fail(request.status)
				}
			})
			request.addEventListener('error', fail)
			request.send(data)
		}).catch(function (error) {
			console.log(error);
		});
	}

	/**
	 * Decode the bytes
	 * @param  {String|ArrayBuffer} bytes The midi file encoded as a string or ArrayBuffer
	 * @return {Midi}       this
	 */
	decode(bytes) {

		let gsMusic = [];
		let gsMusicObject = {
			"header": {
				title: "",
				composer: "",
				piece: "",
				subtitle: ""
			},
			"version": "2.18.2",
			"global": {
				"key": "",
				"scale": "",
				"time": "",
				"tempo": "",
				"partial": ""
			},
			"individualVoices": {
				"soprano": "",
				"alto": "",
				"tenor": "",
				"bass": "",
			},
			"lyrics": {
				"chorus": "",
				"stanzas": []
			},
		};


		let knownNote = ['C4', 60]; // c4 is middle C
        let noteSequence = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B']

		// if (bytes instanceof ArrayBuffer){
		// 	var byteArray = new Uint8Array(bytes)
		// 	bytes = String.fromCharCode.apply(null, byteArray)
		// }
		var byteArray = new Uint8Array(bytes)
		bytes = String.fromCharCode.apply(null, byteArray)
		const midiData = Decoder(bytes)
		this.header = parseHeader(midiData)
		// console.log(this.header); // => { PPQ: 192, bpm: 80, timeSignature: [ 12, 8 ] }
		gsMusicObject.global.time = `${this.header.timeSignature[0]}/${this.header.timeSignature[1]}`
		this.tracks = []

		let eventTypes = {};
		let subtypes = {};

		let endNumber = 0;
		let trackEventsCount = [];
		let trackEvents = [];
		let trackEventsSubtypes = [];


		midiData.tracks.forEach((trackData, i) => {
			if (!trackEventsCount[i]) trackEventsCount[i] = 0;
			if (!trackEvents[i]) trackEvents[i] = [];
			if (!trackEventsSubtypes[i]) trackEventsSubtypes[i] = [];

			const track = new Track()
			track.id = i
			this.tracks.push(track)



			let absoluteTime = 0

			trackData.forEach((event) => {
				// if(i ===0)console.log(event)
				eventTypes[event.type] = event.type;
				subtypes[event.subtype] = event.subtype;
				// if(i ==1)console.log(`${event.type}:: ${event.subtype}`)
				absoluteTime += Util.ticksToSeconds(event.deltaTime, this.header)
				if (event.type === 'meta' && event.subtype === 'trackName') {
					track.name = Util.cleanName(event.text)
				} else if (event.subtype === 'noteOn') {
					console.log(event)    // what is the duration of the note?
					// console.log(`${absoluteTime}:${event.deltaTime}`)
					track.noteOn(event.noteNumber, absoluteTime, event.velocity / 127)

					if (track.channelNumber === -1) {
						track.channelNumber = event.channel
					}
				} else if (event.subtype === 'noteOff') {
					console.log(event)
					track.noteOff(event.noteNumber, absoluteTime)
				} else if (event.subtype === 'controller' && event.controllerType) {
					track.cc(event.controllerType, absoluteTime, event.value / 127)
				} else if (event.type === 'meta' && event.subtype === 'instrumentName') {
					track.instrument = event.text
				} else if (event.type === 'channel' && event.subtype === 'programChange') {
					// console.log(event)
					track.patch(event.programNumber)
					track.channelNumber = event.channel
				} else if (event.type === 'meta' && event.subtype === 'lyrics') {
					// console.log(event);
					track.lyric(event)
				} else if (event.subtype === 'text') {
					// console.log(event)
				} else if (event.subtype === 'copyrightNotice') {
					// console.log(event)
				} else if (event.subtype === 'setTempo') {
					// console.log(event)
				} else if (event.subtype === 'timeSignature') {
					// console.log(event)
				} else if (event.subtype === 'keySignature') {
					let scale = event.scale;
					let key_ = event.key;
					let key;
					key = scales[scale];
					let row = key_ < 0? 0:1;
					console.log(row)
					key = key[row][Math.abs(key_)]
					gsMusicObject.global.key = key
					gsMusicObject.global.scale = !scale? 'major': 'minor';
					console.log(key)
					console.log(event)
				} else if (event.subtype === 'endOfTrack') {
					// console.log(event)
				} else if (event.subtype === 'unknown') {
					// console.log(event)
				}
				trackEventsCount[i]++
				if (!trackEvents[i].includes(event.type)) trackEvents[i].push(event.type)
				if (!trackEventsSubtypes[i].includes(event.subtype)) trackEventsSubtypes[i].push(event.subtype)
			})




			//if the track is empty, then it is the file name
			if (!this.header.name && !track.length && track.name) {
				this.header.name = track.name;
			}
		})

		// console.log(trackEventsCount);
		// console.log(trackEventsSubtypes);
		// console.log(trackEvents);
		console.log(gsMusicObject)
		process.exit();
		// console.log(this.tracks); process.exit();
		console.log(eventTypes)
		console.log(subtypes)
		process.exit();

		return this
	}

	/**
	 * Encode the Midi object as a Buffer String
	 * @returns {String}
	 */
	encode() {
		const output = new Encoder.File({
			ticks: this.header.PPQ
		})

		const firstEmptyTrack = this.tracks.filter(track => !track.length)[0];

		if (this.header.name && !(firstEmptyTrack && firstEmptyTrack.name === this.header.name)) {
			const track = output.addTrack()
			track.addEvent(
				new Encoder.MetaEvent({
					time: 0,
					type: Encoder.MetaEvent.TRACK_NAME,
					data: this.header.name
				})
			)
		}

		this.tracks.forEach((track) => {
			const trackEncoder = output.addTrack()
			trackEncoder.setTempo(this.bpm)

			if (track.name) {
				trackEncoder.addEvent(
					new Encoder.MetaEvent({
						time: 0,
						type: Encoder.MetaEvent.TRACK_NAME,
						data: track.name
					})
				)
			}

			track.encode(trackEncoder, this.header)
		})
		return output.toBytes()
	}

	/**
	 * Convert the output encoding into an Array
	 * @return {Array}
	 */
	toArray() {
		const encodedStr = this.encode()
		const buffer = new Array(encodedStr.length)
		for (let i = 0; i < encodedStr.length; i++) {
			buffer[i] = encodedStr.charCodeAt(i)
		}
		return buffer
	}

	/**
	 *  Convert all of the fields to JSON
	 *  @return  {Object}
	 */
	toJSON() {
		const ret = {
			header: this.header,
			startTime: this.startTime,
			duration: this.duration,
			tracks: (this.tracks || []).map(
				track => track.toJSON()
			)
		}

		if (!ret.header.name)
			ret.header.name = ''

		return ret
	}

	/**
	 * Add a new track.
	 * @param {String=} name Optionally include the name of the track
	 * @returns {Track}
	 */
	track(name) {
		const track = new Track(name)
		this.tracks.push(track)
		return track
	}

	/**
	 * Get a track either by it's name or track index
	 * @param  {Number|String} trackName
	 * @return {Track}
	 */
	get(trackName) {
		if (Util.isNumber(trackName)) {
			return this.tracks[trackName]
		} else {
			return this.tracks.find((t) => t.name === trackName)
		}
	}

	/**
	 * Slice the midi file between the startTime and endTime. Returns a copy of the
	 * midi
	 * @param {Number} startTime
	 * @param {Number} endTime
	 * @returns {Midi} this
	 */
	slice(startTime = 0, endTime = this.duration) {
		const midi = new Midi()
		midi.header = this.header
		midi.tracks = this.tracks.map((t) => t.slice(startTime, endTime))
		return midi
	}

	/**
	 * the time of the first event
	 * @type {Number}
	 */
	get startTime() {
		const startTimes = this.tracks.map((t) => t.startTime)

		if (!startTimes.length)
			return 0

		return Math.min.apply(Math, startTimes) || 0
	}

	/**
	 * The bpm of the midi file in beats per minute
	 * @type {Number}
	 */
	get bpm() {
		return this.header.bpm
	}
	set bpm(bpm) {
		const prevTempo = this.header.bpm
		this.header.bpm = bpm
		//adjust the timing of all the notes
		const ratio = prevTempo / bpm
		this.tracks.forEach((track) => track.scale(ratio))

	}

	/**
	 * The timeSignature of the midi file
	 * @type {Array}
	 */
	get timeSignature() {
		return this.header.timeSignature
	}
	set timeSignature(timeSig) {
		this.header.timeSignature = timeSig
	}

	/**
	 * The duration is the end time of the longest track
	 * @type {Number}
	 */
	get duration() {
		const durations = this.tracks.map((t) => t.duration)

		if (!durations.length)
			return 0

		return Math.max.apply(Math, durations) || 0
	}
}

module.exports = new Midi()
// export {Midi}

/*

https://ccrma.stanford.edu/~craig/articles/linuxmidi/misc/essenmidi.html


 MIDI messages

    A MIDI command plus its MIDI data parameters to be called a MIDI message . The minimum size of a MIDI message is 1 byte (one command byte and no parameter bytes). The maximum size of a MIDI message (note considering 0xF0 commands) is three bytes. A MIDI message always starts with a command byte. Here is a table of the MIDI messages that are possible in the MIDI protocol:

    Command 	Meaning 	# parameters 	param 1 	param 2
    0x80 	Note-off 	2 	key 	velocity
    0x90 	Note-on 	2 	key 	veolcity
    0xA0 	Aftertouch 	2 	key 	touch
    0xB0 	Continuous controller 	2 	controller # 	controller value
    0xC0 	Patch change 	2 	instrument # 	
    0xD0 	Channel Pressure 	1 	pressure
    0xE0 	Pitch bend 	2 	lsb (7 bits) 	msb (7 bits)
    0xF0 	(non-musical commands) 			

    I won't discuss the 0xF0 set of commands (System messages) here very much, but here is a basic table of them:

    command 	meaning 	# param
    0xF0 	start of system exclusive message 	variable
    0xF1 	MIDI Time Code Quarter Frame (Sys Common)	
    0xF2 	Song Position Pointer (Sys Common)	
    0xF3 	Song Select (Sys Common) 	
    0xF4 	??? 	
    0xF5 	??? 	
    0xF6 	Tune Request (Sys Common) 	
    0xF7 	end of system exclusive message 	0
    0xF8 	Timing Clock (Sys Realtime) 	
    0xFA 	Start (Sys Realtime) 	
    0xFB 	Continue (Sys Realtime) 	
    0xFC 	Stop (Sys Realtime) 	
    0xFD 	??? 	
    0xFE 	Active Sensing (Sys Realtime) 	
    0xFF 	System Reset (Sys Realtime) 	

	Running status should be mentioned around here... 




	NOTES:::
https://www.recordingblogs.com/wiki/midi-key-signature-meta-message
	

	 MIDI Key Signature meta message

The MIDI key signature meta message specifies the key signature and scale of a MIDI file.

This message belongs to the category of MIDI meta messages. Since this is a meta message the MIDI event that carries this message may exist in MIDI files, but it is not sent over MIDI ports to a MIDI device.

This message consists of five bytes of data. The first byte is the status byte 0xFF, which shows that this is a meta message. The second byte is the meta message type 0x59, which shows that this is the key signature meta message. The third byte is 0x02, which shows that there are two remaining bytes. The fourth byte has values between -7 and 7 and specifies the key signature in terms of number of flats (if negative) or sharps (if positive). The fifth and last byte of the message specifies the scale of the MIDI file, where if this byte is 0 the scale is major and if the byte is 1 the scale is minor.




Major
Cb 	Db 	Eb 	Fb 	Gb 	Ab 	Bb 	7 flats
Gb 	Ab 	Bb 	Cb 	Db 	Eb 	F 	6 flats
Db 	Eb 	F 	Gb 	Ab 	Bb 	C 	5 flats
Ab 	Bb 	C 	Db 	Eb 	F 	G 	4 flats
Eb 	F 	G 	Ab 	Bb 	C 	D 	3 flats
Bb 	C 	D 	Eb 	F 	G 	A 	2 flats
F 	G 	A 	Bb 	C 	D 	E 	1 flat
C 	D 	E 	F 	G 	A 	B 	no flats or sharps
G 	A 	B 	C 	D 	E 	F# 	1 sharp
D 	E 	F# 	G 	A 	B 	C# 	2 sharps
A 	B 	C# 	D 	E 	F# 	G# 	3 sharps
E 	F# 	G# 	A 	B 	C# 	D# 	4 sharps
B 	C# 	D# 	E 	F# 	G# 	A# 	5 sharps
F# 	G# 	A# 	B 	C# 	D# 	E# 	6 sharps
C# 	D# 	E# 	F# 	G# 	A# 	B# 	7 sharps


Minor
Ab 	Bb 	Cb 	Db 	Eb 	Fb 	Gb 	7 flats
Eb 	F 	Gb 	Ab 	Bb 	Cb 	Db 	6 flats
Bb 	C 	Db 	Eb 	F 	Gb 	Ab 	5 flats
F 	G 	Ab 	Bb 	C 	Db 	Eb 	4 flats
C 	D 	Eb 	F 	G 	Ab 	Bb 	3 flats
G 	A 	Bb 	C 	D 	Eb 	F 	2 flats
D 	E 	F 	G 	A 	Bb 	C 	1 flat
A 	B 	C 	D 	E 	F 	G 	no flats or sharps
E 	F# 	G 	A 	B 	C 	D 	1 sharp
B 	C# 	D 	E 	F# 	G 	A 	2 sharps
F# 	G# 	A 	B 	C# 	D 	E 	3 sharps
C# 	D# 	E 	F# 	G# 	A 	B 	4 sharps
G# 	A# 	B 	C# 	D# 	E 	F# 	5 sharps
D# 	E# 	F# 	G# 	A# 	B 	C# 	6 sharps
A# 	B# 	C# 	D# 	E# 	F# 	G# 	7 sharps

	*/