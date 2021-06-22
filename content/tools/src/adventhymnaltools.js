const path = require('path');
require = require('esm')(module /*, options*/ );
// import {Midi} from './Midi'
const Midi = require('./Midi')
const fs = require('fs-extra');
const {
    convertArrayToCSV
} = require('convert-array-to-csv');

// export {instrumentByPatchID, instrumentFamilyByID, drumKitByPatchID} from './instrumentMaps'

class voice {
    constructor() {
        return {
            notes: [],
            lyrics: []
        };
    }
}

class adventhymnaltools {

    constructor() {
        this.header = {
            //defaults
            bpm: 120,
            timeSignature: [4, 4],
            PPQ: 480
        }

        this.tracks = []
    }

    getChord = (notes) => {

    }

    getNotefromNumber = (number) => {
        let knownNote = ['C4', 60];
        let noteSequence = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B']
        let notesbetween = number - knownNote[1];
        let index = 0;
        let note;
        let scale = knownNote[0][1];
        let currentNoteNumber = knownNote[1]
        let currentNote = knownNote[0][0];
        // if (number > currentNoteNumber) {
        // console.log(`${number}::: ${currentNote}`)
        while (number > currentNoteNumber) {
            currentNoteNumber++;
            index++;
            if (index === 12) {
                index = 0;
                scale++;
            }
            currentNote = noteSequence[index];
        }
        while (number < currentNoteNumber) {
            currentNoteNumber--;
            index--;
            if (index === -1) {
                index = 11;
                scale--;
            }
            currentNote = noteSequence[index];
        }
        currentNote = `${currentNote}${scale}`
        return currentNote;
        // }
        /*
         * notesbetween can be positive or negative
         */

    }

    addRow = (rows, time) => {
        // let rows_ = [...rows]
        let rows_ = JSON.parse(JSON.stringify(rows));
        let row0 = rows_[0];
        for (let i in row0) row0[i] = ''
        row0[0] = parseFloat(time);
        rows.push(row0)
        return rows;
    }

    hasTime = (rows, time) => {
        // let rowNum = 0;
        for (let i in rows) {
            // console.log(rows[i][0])
            // console.log(`${rows[i][0]} for ${time}`)
            if (rows[i][0] === parseFloat(time)) return i
        }
        return false;
    }

    addVoice = (rows, voice, voiceNumber) => {
        for (let i in voice.notes) {
            let vVoice = voice.notes[i]
            if (vVoice === undefined) continue;
            let rowNum = this.hasTime(rows, vVoice.time);
            // console.log(`${rowNum} for ${vVoice.time}`)
            if (!rowNum) rows = this.addRow(rows, vVoice.time)
            rowNum = this.hasTime(rows, vVoice.time);
            // console.log(`==>${rowNum} for ${vVoice.time}`)
            let noteNumber = vVoice.midi;
            let note = this.getNotefromNumber(noteNumber);
            let noteIndex = rows[0].indexOf(note);
            rows[rowNum][noteIndex] = vVoice.duration

            // console.log(vSop)
        }
        return rows;
    }

    getLeadingBlanks = (empyRows) => {
        let prevIndex = empyRows[0]
        let thisIndex = empyRows[1]
        let index = 0;

        for (let i in empyRows) {
            if (parseInt(i) === 0) continue;
            thisIndex = empyRows[i]
            if (thisIndex - prevIndex === 1) index++;
            else break;
            prevIndex = thisIndex;
        }
        // console.log(index)
        let ret = [];
        let i = 0;
        while (i <= index) {
            ret.push(empyRows[i])
            i++;
        }

        empyRows = empyRows.reverse();
        prevIndex = empyRows[0]
        index = 0;
        for (let i in empyRows) {
            if (parseInt(i) === 0) continue;
            thisIndex = empyRows[i]
            if (thisIndex - prevIndex === -1) index++;
            else break;
            prevIndex = thisIndex;
        }

        let ret_ = [];
        i = 0;
        while (i <= index) {
            ret_.push(empyRows[i])
            i++;
        }
        ret_ = ret_.reverse();
        for (let i in ret_) ret.push(ret_[i])


        return ret;
    }

    removeBlankRows = (rows) => {
        let numRows = rows.length;
        let fullRows = [];
        let empyRows = [];
        let headerRows = JSON.parse(JSON.stringify(rows[0]));
        for (let i in headerRows) fullRows[i] = 0;
        for (let i in rows) {
            // console.log(i)
            if (i === 0 || i === '0') {
                continue;
            }
            let row = rows[i];
            for (let j in row) {
                if(parseInt(j) === 0)fullRows[j] = 30;
                if (fullRows[j]) continue;
                if (row[j] !== '') fullRows[j] = row[j];
            }
        }
        for (let i in fullRows)
            if (!parseInt(fullRows[i])) empyRows.push(parseInt(i))
            // if (!parseInt(fullRows[i])) empyRows.push(parseInt(i))
        // empyRows = getLeadingBlanks(empyRows);
        console.log(empyRows)
        console.log(fullRows)
        empyRows = this.getLeadingBlanks(empyRows)
        console.log(empyRows);
        let removedCount = 0;
        for (let i in rows) {
            removedCount = 0;
            for (let j in empyRows) {
                // console.log(empyRows[j])
                console.log()
                rows[i].splice(empyRows[j] - removedCount, 1)
                removedCount++;
            }
        }

        
        // console.log(ret)
        return rows;
    }



    extractvoices = (args) => {
        let {
            root,
            input,
            extension
        } = args;
        let midiFile = input
        if (!root) root = '';
        if (!extension) extension = ".mid";
        midiFile = `${midiFile}${extension}`
        midiFile = path.join(__dirname, '..', 'files', root, midiFile)
        // console.log(midiFile)

        // let fileBlob = fs.readFileSync(midiFile, 'utf8')
        let fileBlob = fs.readFileSync(midiFile)
        let decoded = Midi.decode(fileBlob)
        console.log(decoded.header)
        console.log(decoded)
        process.exit();
        let voices = {};
        let lyrics = []
        for (let i in decoded.tracks) {
            if (decoded.tracks[i].notes) {
                let notes = decoded.tracks[i].notes;
                for (let j in notes) {
                    let note = JSON.parse(JSON.stringify(notes[j]))
                    let time = note.time;
                    let duration = note.duration;
                    if (!voices[time]) voices[time] = []
                    note.track = i

                    voices[time].push(note)

                }

                // console.log(voices)
            }
            if (decoded.tracks[i].lyrics) {
                console.log("============" + i)
                // console.log(decoded.tracks[i].lyrics)
                // if(!lyrics[i])lyrics[i] = []
                // lyrics[i].push(decoded.tracks[i].lyrics.text);
                if (!lyrics[i]) lyrics[i] = []
                let lyric = decoded.tracks[i].lyrics;
                console.log(lyric)
                for (let j in lyric) {
                    console.log(lyric[j].text)
                    lyrics[i].push(lyric[j].text)
                }
            }
        }
        /*
         * All notes separated (assuming 4 notes in the harmony). We don't know what will happen if there are more than four notes
         */
        // midiFile = midiFile.join('.')
        // fs.mkdirpSync(midiFile)
        // // console.log(JSON.stringify(voices[0]))
        // fs.writeFileSync(path.join(midiFile, 'voices'), JSON.stringify(voices))

        /*
         * In some cases there are less than four notes.
         */
        let sop, alto, tenor, bass;
        sop = new voice();
        alto = new voice();
        tenor = new voice();
        bass = new voice();
        // tracks = [];
        // get also the chord,,,
        for (let i in voices) {
            let harmony = voices[i];
            let numVoices = harmony.length;
            console.log(numVoices)

            let theseNotes = [];

            if (numVoices >= 4) {
                // console.log(harmony)
                // console.log(harmony[0])
                sop.notes.push(harmony[0])
                alto.notes.push(harmony[1])
                tenor.notes.push(harmony[2])
                bass.notes.push(harmony[3])
            } else {
                let notesPositions = [];
                for (let j in harmony) notesPositions.push(harmony[j].name[harmony[j].length])
                // console.log(notesPositions)
                let middleC = 4; // that is C3
                let aboveMiddleC, belowMiddleC = [];
                aboveMiddleC = belowMiddleC = [];
                for (let j in notesPositions)
                    if (notesPositions[j] >= middleC) aboveMiddleC = j;
                    else belowMiddleC = j;
                if (aboveMiddleC.length === 1) sop.notes.push(harmony[aboveMiddleC[0]])
                else {
                    sop.notes.push(harmony[aboveMiddleC[0]])
                    alto.notes.push(harmony[aboveMiddleC[1]])
                }
                if (belowMiddleC.length === 1) bass.notes.push(harmony[belowMiddleC[0]])
                else {
                    tenor.notes.push(harmony[belowMiddleC[0]])
                    bass.notes.push(harmony[belowMiddleC[1]])
                }
                /*
                 * Assumptions:: track 3
                 */
                // if(num)
                // check the track numbers....
            }
            // for(let i in harmony){
            //     theseNotes.push({})
            // }
            // for(let j in harmony){

            // }
        }
        /*
         * create csv of voice notes which can be easily editted
         */
        console.log(sop.notes)
        let csv = [];
        let rows = [
            ['Time']
        ]
        let startKey = 12;
        let stopKey = 96;
        while (startKey <= stopKey) {
            rows[0].push(this.getNotefromNumber(startKey++))
            console.log(startKey)
        }

        rows = this.addVoice(rows, sop, 0)
        rows = this.addVoice(rows, alto, 0)
        rows = this.addVoice(rows, tenor, 0)
        rows = this.addVoice(rows, bass, 0)
        // console.log(rows[0])
        // process.exit();

        
        rows = this.removeBlankRows(rows);
        let header = rows.shift();
        let sortedRows = rows.sort(function(a, b) {
            return a[0] - b[0];
          });
       
        // console.log(rows)
        console.log(header)
        let csvRows = convertArrayToCSV(rows, {
            header,
            separator: '|'
        });

        // let csvRows = 

        midiFile = midiFile.split('.')
        midiFile.pop();

        // console.log(midiFile.join('.'))
        midiFile = midiFile.join('.')
        fs.mkdirpSync(midiFile)
        // console.log(JSON.stringify(voices[0]))
        fs.writeFileSync(path.join(midiFile, 'voices.csv'), csvRows)

        /*
         * adding rows
         */

        // console.log(rows[0]);


        /*
         * Add Notes to Header
         */


        // process.exit();
        // console.log(voices)
        // for(let i in voices){
        //     console.log(voices[i].length)
        // }
        // console.log(JSON.stringify(voices))




        // console.log(lyrics)
        // let lyricsText = []
        // for(let i in lyrics)lyricsText[i] = ''
        // for(let i in lyrics) {
        //     // if(!lyricsText[i])lyricsText[i] = ''
        //     for(let j in lyrics[i]){
        //         console.log(lyrics[i][j])
        //         lyricsText[i] += lyrics[i][j].replace(/\r?\n|\r/g, " ");
        //         console.log('----------'+ i+"::"+j)
        //         console.log(lyricsText[i])
        //     }

        //     // parsing the text... -> But I need first to work on the tracks and save them....
        //     // console.log(lyricsText[i])
        //     // console.log(i)
        //     // console.log(lyrics[i].join(''))
        // }

        // console.log(lyricsText.join(''))
        // // program.float
        // // console.log(midiFile)
        // // console.log(midiFile)
        // // console.log(midiFile)
        // // console.log(midiFile)
        // // console.log(args.input)
        // midiFile = midiFile.split('.')
        // midiFile.pop();

        // // console.log(midiFile.join('.'))
        // midiFile = midiFile.join('.')
        // fs.mkdirpSync(midiFile)
        // console.log(JSON.stringify(voices[0]))
        fs.writeFileSync(path.join(midiFile, 'voices'), JSON.stringify(voices))
    }


};



module.exports = adventhymnaltools;