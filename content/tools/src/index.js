const program = require('commander');

// require = require('esm')(module /*, options*/);
// const functions = new( require('./adventhymnaltools'))();
import functions from './adventhymnaltools'
functions = new functions();

export function run() {
    program
        .version('0.0.1')
        .description('Tools for developing Advent Hymnals');

    program
        .option('-i, --input <file>', 'input file')
        .option('-o, --output <file>', 'output file')
        .option('-r, --root <dir>', 'input files name root')
        .option('-s, --start <integer>', 'input files start number')
        .option('-e, --stop <integer>', 'input files start number')
        .option('-x, --extension <string>', 'input files extension')

    program
        .command('extractvoices')
        .alias('e')
        .description('Extract voices from midi file')
        .action(() => { functions.extractvoices(program)});

    // program
    //   .command('getContact <name>')
    //   .alias('r')
    //   .description('Get contact')
    //   .action(name => getContact(name));


    program
        .command('addContact') // No need of specifying arguments here
        .alias('a')
        .description('Add a contact')
        .action(() => {
            prompt(questions).then(answers =>
                addContact(answers));
        });

    program.parse(process.argv);
}