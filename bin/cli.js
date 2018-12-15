#!/usr/bin/env node

const spawn = require('child_process').spawn;
const electron = require('electron');
const join = require('path').join;

const argv = process.argv.slice(2);
argv.unshift(join(__dirname, '..', 'dist', 'main.js'));

spawn(electron, argv, { stdio: 'inherit' });
