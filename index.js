#!/usr/bin/env node

const Tail = require('tail').Tail;
const chalk = require('chalk');
const keypress = require('keypress');

const getCenter = (total, inner) => Math.ceil((total - inner) / 2);

const title = name => `Are you still watching "${name}"?`;
const choices = ['Continue watching', 'Exit'];
const buttonSize = choices.sort((a, b) => b.length > a.length)[0].length + 2;
const wrappedChoices = choices.map(choice => {
	const diff = getCenter(buttonSize, choice.length);
	return [
		...new Array(diff).fill(' ').join(''),
		choice,
		...new Array(diff).fill(' ').join(''),
	].join('');
});

const center = str =>
	new Array(getCenter(process.stdout.columns, str.length)).fill(' ').join('');

const draw = (active, filename) => {
	const height = 2 + choices.length;
	const paddingTop = getCenter(process.stdout.rows, height);
	const paddingBottom = process.stdout.rows - height - paddingTop;

	new Array(paddingTop).fill(' ').forEach(() => {
		console.log('');
	});

	console.log(center(title(filename)) + title(filename));
	console.log('');

	wrappedChoices.map((choice, i) => {
		i === active
			? console.log(center(choice) + chalk.bgWhite.black(choice))
			: console.log(center(choice) + choice);
	});

	new Array(paddingBottom).fill(' ').forEach(() => {
		console.log('');
	});
};

const prompt = filename =>
	new Promise(yay => {
		keypress(process.stdin);

		let active = 0;
		draw(active, filename);

		process.stdin.on('keypress', function(ch, key) {
			if (key && key.name === 'down') {
				if (active >= choices.length - 1) {
					active = 0;
				} else {
					active += 1;
				}
				draw(active, filename);
			}
			if (key && key.name === 'up') {
				if (active <= 0) {
					active = choices.length - 1;
				} else {
					active -= 1;
				}
				draw(active, filename);
			}
			if (key && key.name === 'return') {
				process.stdin.setRawMode(false);
				process.stdout.write('\033c');
				if (active === 0) {
					yay();
				} else {
					process.exit();
				}
			}
			if (key && key.ctrl && key.name == 'c') {
				process.stdin.setRawMode(false);
			}
		});

		process.stdin.setRawMode(true);
		process.stdin.resume();
	});

const log = file => {
	const tail = new Tail(file);

	let count = 0;
	let buffer = [];

	tail.on('line', function(data) {
		count++;
		if (count === 4) {
			buffer.push(data);
			prompt(file).then(() => {
				buffer.forEach(line => {
					console.log(line);
				});
				buffer = [];
				count = 0;
			});
		} else if (count >= 4) {
			buffer.push(data);
		} else {
			console.log(data);
		}
	});

	tail.on('error', function(error) {
		console.log('ERROR: ', error);
	});
};

log(process.argv[process.argv.length - 1]);
