/*
    main.js is primarily responsible for hooking up the UI to the rest of the application 
    and setting up the main event loop
*/

// We will write the functions in this file in the traditional ES5 way
// In this instance, we feel the code is more readable if written this way
// If you want to re-write these as ES6 arrow functions, to be consistent with the other files, go ahead!

import * as utils from './utils.js';
import * as audio from './audio.js';
import * as canvas from './canvas.js';

// 1 - here we are faking an enumeration
const DEFAULTS = Object.freeze({
    sound1: "media/Gold.mp3"
});

const drawParams = {
    showGradient: true,
    showCircles: true,
    showBoxes: true,
    showPoints: true,
    showNoise : true,
    showInvert: false,
    showEmboss: false,
    showCurves: true,
    beatIntensity: 250,
    sensitivity: 15,
    percentDone: 0,
};

function init() {
    console.log("init called");
    console.log(`Testing utils.getRandomColor() import: ${utils.getRandomColor()}`);

    audio.setupWebAudio(DEFAULTS.sound1);
    let canvasElement = document.querySelector("#mainCanvas"); // hookup <canvas> element
    let overlayCanvasElement = document.querySelector("#overlayCanvas");
    setupUI(canvasElement);
    canvas.setupCanvas(canvasElement, overlayCanvasElement, audio.analyserNode);
    loop();
}

function loop() {
    /* NOTE: This is temporary testing code that we will delete in Part II */
    requestAnimationFrame(loop);
    drawParams.percentDone = audio.getPercentDone();
    canvas.draw(drawParams);
}

function setupUI(canvasElement) {
    // A - hookup fullscreen button
    const fsButton = document.querySelector("#fsButton");

    // add .onclick event to button
    fsButton.onclick = e => {
        console.log("init called");
        utils.goFullscreen(canvasElement);
    };

    playButton.onclick = e => {
        console.log(`audioCtx.state before = ${audio.audioCtx.state}`);

        // check if context is in suspended state (autoplay policy)
        if (audio.audioCtx.state == "suspended") {
            audio.audioCtx.resume();
        }
        console.log(`audioCtx.state after = ${audio.audioCtx.state}`);

        if (e.target.dataset.playing == "no") {
            // if track is currently paused, play it
            audio.playCurrentSound();
            e.target.dataset.playing = "yes";//our CSS will set the text to "Pause"
        } else {
            //if track IS playing, pause it
            audio.pauseCurrentSound();
            e.target.dataset.playing = "no"; //our CSS will set the text to "Play"
        }
    };

    //C - hookup volume slider & label
    let volumeSlider = document.querySelector("#volumeSlider");
    let sensSlider = document.querySelector("#sensSlider");
    let beatSlider = document.querySelector("#beatSlider");
    let volumeLabel = document.querySelector("#volumeLabel");

    //add .oninput event to slider
    volumeSlider.oninput = e => {
        // set the gain
        audio.setVolume(e.target.value);
        // upgrade value of label to match value of slider
        volumeLabel.innerHTML = Math.round(e.target.value / 2 * 100);
    }

    sensSlider.oninput = e => {
        drawParams.sensitivity = e.target.value;
    }

    beatSlider.oninput = e => {
        drawParams.beatIntensity = e.target.value;
    }

    volumeSlider.dispatchEvent(new Event("input"));
    sensSlider.dispatchEvent(new Event("input"));
    beatSlider.dispatchEvent(new Event("input"));

    //D - hookup track <select>
    let trackSelect = document.querySelector("#trackSelect");
    // add .onchange event to <select>
    trackSelect.onchange = e => {
        audio.loadSoundFile(e.target.value);
        //pause the current track if it is playing
        if (playButton.dataset.playing = "yes") {
            playButton.dispatchEvent(new MouseEvent("click"));
        }
    };

    //setup checkboxes
    let gradientCheckbox = document.querySelector("#gradientCB");
    let circlesCheckbox = document.querySelector("#circlesCB");
    let boxesCheckbox = document.querySelector("#boxesCB");
    let pointsCheckbox = document.querySelector("#pointsCB");
    let noiseCheckbox = document.querySelector("#noiseCB");
    let invertCheckbox = document.querySelector("#invertCB");
    let embossCheckbox = document.querySelector("#embossCB");

    gradientCheckbox.oninput = e => {
        drawParams.showGradient = gradientCheckbox.checked;
    }
    circlesCheckbox.oninput = e => {
        drawParams.showCircles = circlesCheckbox.checked;
    }
    boxesCheckbox.oninput = e => {
        drawParams.showBoxes = boxesCheckbox.checked;
    }
    pointsCheckbox.oninput = e => {
        drawParams.showPoints = pointsCheckbox.checked;
    }
    noiseCheckbox.oninput = e => {
        drawParams.showNoise = noiseCheckbox.checked;
    }
    invertCheckbox.oninput = e => {
        drawParams.showInvert = invertCheckbox.checked;
    }
    embossCheckbox.oninput = e => {
        drawParams.showEmboss = embossCheckbox.checked;
    }

    let radioButtons = document.querySelectorAll("input[name='echo']");
    for(let rb of radioButtons) {
        rb.onchange = e => {
            audio.setEcho(e.target.value);
        }
    }
} // end setupUI

export { init };