/*
    The purpose of this file is to take in the analyser node and a <canvas> element: 
      - the module will create a drawing context that points at the <canvas> 
      - it will store the reference to the analyser node
      - in draw(), it will loop through the data in the analyser node
      - and then draw something representative on the canvas
      - maybe a better name for this file/module would be *visualizer.js* ?
*/

import * as utils from './utils.js';

let ctx, ctxOverlay, canvasWidth, canvasHeight, gradient, radGradient, analyserNode, audioData, prevAudioData, waveData, deltaVolume, lastDeltaVolume, timeSinceLastBeat, beatFrames, lastTime, deltaTime;

lastTime = Date.now();
beatFrames = [];
let randomData;
let intensity = 1;
let borderWidth = 0.7;
let burstFade = 0;
let beatTimer = 0;
let onBeat;
let beatFade = 0;
let currentBeat = 1000000;
let x = 0;
function setupCanvas(canvasElement, overlayCanvasElement, analyserNodeRef) {
    // create drawing context
    ctx = canvasElement.getContext("2d");
    ctxOverlay = overlayCanvasElement.getContext("2d");
    canvasWidth = canvasElement.width;
    canvasHeight = canvasElement.height;

    randomData = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
    for (let i = 0; i < randomData.length; i++) {
        randomData[i] = Math.random() * 255;
        randomData[i + 1] = Math.random() * 255;
        randomData[i + 2] = Math.random() * 255;
        randomData[i + 3] = Math.random() * 255;
    }
    // create a gradient that runs top to bottom
    gradient = utils.getLinearGradient(ctx, 0, 0, 0, canvasHeight, [{ percent: 0, color: "blue" }, { percent: .25, color: "cyan" }, { percent: .5, color: "green" }, { percent: .75, color: "blue" }, { percent: 1, color: "black" }]);
    radGradient = ctxOverlay.createRadialGradient(canvasWidth / 2, canvasHeight / 2, 0, canvasWidth / 2, canvasHeight / 2, canvasWidth / 2);
    radGradient.addColorStop(0, "rgba(0,0,0,0)");
    radGradient.addColorStop(1, "rgba(0,0,0,0.5)");
    // keep a reference to the analyser node
    analyserNode = analyserNodeRef;
    // this is the array where the analyser data will be stored
    audioData = new Uint8Array(analyserNode.fftSize / 2);
    prevAudioData = new Uint8Array(analyserNode.fftSize / 2);

    waveData = new Uint8Array(analyserNode.fftSize / 2);
}

function totalVolume(aData) {
    let sum = 0;
    for (let i = 0; i < aData.length; i++) {
        sum += aData[i];
    }
    return sum;
}

function totalLowVolume(aData) {
    let sum = 0;
    for (let i = 0; i < aData.length / 2; i++) {
        sum += aData[i];
    }
    return sum;
}

function totalHighVolume(aData) {
    let sum = 0;
    for (let i = aData.length / 2; i < aData.length; i++) {
        sum += aData[Math.floor(i)];
    }
    return sum;
}

function estimateBeat(numSamples) {
    let recentBeatFrames = beatFrames.slice(Math.max(beatFrames.length - numSamples, 0));
    let errorAmounts = [];

    for (let i = 0; i < numSamples; i++) {

        errorAmounts[i] = 0;
        for (let j = 0; j < numSamples; j++) {
            errorAmounts[i] += testNumberCloseness(recentBeatFrames[i], recentBeatFrames[j]);
        }
    }

    let minError = Number.MAX_VALUE;
    let minIndex = 0;
    for (let i = 0; i < numSamples; i++) {
        if (errorAmounts[i] < minError) {
            minError = errorAmounts[i];
            minIndex = i;
        }
    }

    return recentBeatFrames[minIndex];
}

function testNumberCloseness(a, b) {
    let max = Math.max(a, b);
    let min = Math.min(a, b);

    let div = max / min;

    let error = Math.abs(div - Math.floor(div));
    return error;
}
function draw(params = {}) {
    deltaTime = Date.now() - lastTime;
    lastTime = Date.now();
    // 1 - populate the audioData array with the frequency data from the analyserNode
    // notice these arrays are passed "by reference" 
    for (let i = 0; i < audioData.length; i++) {
        prevAudioData[i] = audioData[i];
        if (!prevAudioData[i]) {
            prevAudioData[i] = 0;
        }
    }

    lastDeltaVolume = deltaVolume;
    analyserNode.getByteFrequencyData(audioData);
    analyserNode.getByteTimeDomainData(waveData);

    let volume = totalVolume(audioData);
    let lowVolume = totalLowVolume(audioData);
    let highVolume = totalHighVolume(audioData);
    deltaVolume = totalLowVolume(audioData) - totalLowVolume(prevAudioData);

    if(volume ==0) {
        currentBeat = 0;
    }
    /*
        ctxOverlay.save();
        ctxOverlay.fillStyle = "white";
        ctxOverlay.fillRect(x, canvasHeight - ((volume / 20000) * canvasHeight), 2, 2);
        ctxOverlay.fillStyle = "yellow";
        ctxOverlay.fillRect(x, canvasHeight - ((lowVolume / 20000) * canvasHeight), 2, 2);
        ctxOverlay.fillStyle = "red";
        ctxOverlay.fillRect(x, canvasHeight - ((highVolume / 20000) * canvasHeight), 2, 2);
        ctxOverlay.fillStyle = "orange";*/
    if (deltaVolume > 0 && lastDeltaVolume < 0 && deltaVolume > 170) {
        //ctxOverlay.fillRect(x, 0, 1, canvasHeight);
        if (timeSinceLastBeat) {

            beatFrames.push(timeSinceLastBeat);
        }
        let estimatedBeat = estimateBeat(params.sensitivity)
        console.log(params.sensitivity);

        //beats faster than this create bad visualizations, even if accurate
        if (estimatedBeat > 500) {
            //check to see if the new beat found is a multiple of the existing one
            if (testNumberCloseness(currentBeat, estimatedBeat) < 0.1) {
                //if it is, that means we're on the same beat - only switch if it's to a beat that's more likely the quarter note
                if (Math.abs(currentBeat - 1000) > Math.abs(estimateBeat - 1000)) {
                    currentBeat = estimatedBeat;
                    console.log("beat switch to " + currentBeat);
                }
            } else {
                //if it isn't, switch no matter what - the tempo likely changed.
                currentBeat = estimatedBeat;
                console.log("beat switch to " + currentBeat);
            }
        }


        timeSinceLastBeat = 0;
        burstFade = params.beatIntensity * 4;
    } else {
        timeSinceLastBeat += deltaTime;
        burstFade -= deltaTime;
        if (burstFade < 0) {
            burstFade = 0;
        }
        beatFade -= deltaTime;
        if (beatFade < 0) {
            beatFade = 0;
        }
    }

    beatTimer += deltaTime;
    onBeat = false;
    if (beatTimer > currentBeat) {
        beatTimer = 0;
        onBeat = true;
        beatFade = Number(params.beatIntensity);
    }

    ctxOverlay.restore();
    x += 1;
    if (x > canvasWidth) {
        x = 0;
    }
    // OR
    //analyserNode.getByteTimeDomainData(audioData); // waveform data



    // 2 - draw background
    ctx.save();
    ctx.fillStyle = "black";
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    //draw progress bar 
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(canvasWidth - 20, 0, canvasWidth, canvasHeight * params.percentDone);
    
    if (params.showGradient) {
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    }

    if (params.showCircles) {
        let maxRadius = canvasHeight / 4;
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < audioData.length; i++) {
            //red-ish circles
            let percent = audioData[i] / 255;

            let circleRadius = percent * maxRadius;
            ctx.beginPath();
            ctx.fillStyle = utils.makeColor(111, 255, 111, .34 - percent / 3.0);
            ctx.arc(canvasWidth / 2 - ((i / (audioData.length / 2) * (canvasWidth / 2) * (burstFade / 1000))), canvasHeight / 2, circleRadius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            //blue-ish circles, bigger, more transparent
            ctx.beginPath();
            ctx.fillStyle = utils.makeColor(0, 0, 255, .10 - percent / 10.0);
            ctx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius * 1.5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            //yellow-ish circles, smaller
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = utils.makeColor(0, 200, 200, .5 - percent / 5.0);
            ctx.arc(canvasWidth / 2 + ((i / (audioData.length / 2) * (canvasWidth / 2) * (burstFade / 1000))), canvasHeight / 2, circleRadius * 0.5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }
        ctx.restore();
    }

    if (params.showCurves) {
        let spacing = 4;
        let margin = 5;
        let screenWidthForCurves = canvasWidth - (audioData.length * spacing) - margin * 2;
        let curveWidth = screenWidthForCurves / audioData.length;
        let curveHeight = 200;
        let topSpacing = 100;

        ctx.save();
        ctx.fillStyle = "rgba(255,255,255, 0.50)";
        ctx.lineWidth = 10;



        //high part
        for (let i_f = audioData.length / 3; i_f < 2 * audioData.length / 3; i_f += 2) {
            let i = Math.floor(i_f);
            ctx.beginPath();
            ctx.moveTo(margin + (i - audioData.length / 3 - 2) * (curveWidth + spacing) * 3, canvasHeight - audioData[i - 2]);
            ctx.strokeStyle = "hsl(" + (120 + 120.0 * (i / audioData.length)) + ", 100%, 75%)";
            ctx.quadraticCurveTo(margin + (i - audioData.length / 3 - 1) * (curveWidth + spacing) * 3, canvasHeight - audioData[i - 1], margin + (i - audioData.length / 3) * (curveWidth + spacing) * 3, canvasHeight - audioData[i]);
            ctx.stroke();
        }

        //low part
        for (let i_f = 2; i_f < audioData.length / 3; i_f += 2) {
            let i = Math.floor(i_f);
            ctx.beginPath();
            ctx.moveTo(margin + (i - 2) * (curveWidth + spacing) * 3, audioData[i - 2]);
            ctx.strokeStyle = "hsl(" + (120 + 120.0 * (i / audioData.length)) + ", 100%, 25%)";
            ctx.quadraticCurveTo(margin + (i - 1) * (curveWidth + spacing) * 3, audioData[i - 1], margin + i * (curveWidth + spacing) * 3, audioData[i]);
            ctx.stroke();
        }

        ctx.restore();
    }

    if (params.showBoxes) {
        if (volume > 0 && currentBeat != 0) {

            let maxSize = (100 + Number(params.beatIntensity)) / 3;
            let size = (100 + beatFade) / 3;

            //there is some bug that makes the beatboxes sometimes fill the screen, this fixes it
            if(size > maxSize) {
                size = maxSize;
            }
            ctx.save();
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fillRect(maxSize - size / 2, maxSize - size / 2, size, size);
            ctx.fillRect(canvasWidth - maxSize - size / 2, maxSize - size / 2, size, size);
            ctx.fillRect(maxSize - size / 2, canvasHeight - maxSize - size / 2, size, size);
            ctx.fillRect(canvasWidth - maxSize - size / 2, canvasHeight - maxSize - size / 2, size, size);
            ctx.restore();
        }
    }

    if(params.showPoints) {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        let numStrings = 6;
        for(let x = -canvasWidth / (numStrings * 2); x < canvasWidth; x += canvasWidth / numStrings) {
            for(let i = 0; i < waveData.length; i++) {
                ctx.fillRect(x + waveData[i], (i / waveData.length) * canvasHeight, 2, 2);
            }
        }
        
        ctx.restore;
    }
    // 6 - bitmap manipulation
    // TODO: right now. we are looping though every pixel of the canvas (320,000 of them!), 
    // regardless of whether or not we are applying a pixel effect
    // At some point, refactor this code so that we are looping though the image data only if
    // it is necessary

    // A) grab all of the pixels on the canvas and put them in the `data` array
    // `imageData.data` is a `Uint8ClampedArray()` typed array that has 1.28 million elements!
    // the variable `data` below is a reference to that array 
    let imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    let data = imageData.data;
    let length = data.length;
    let width = imageData.width;

    if (params.showNoise) {
        // B) Iterate through each pixel, stepping 4 elements at a time (which is the RGBA for 1 pixel)
        for (let i = 0; i < length; i += 4) {
            // C) randomly change every 20th pixel to red
            if (randomData[i] / 255 < burstFade / 2000) {
                // data[i] is the red channel
                // data[i+1] is the green channel
                // data[i+2] is the blue channel
                // data[i+3] is the alpha channel
                //data[i] = data[i + 1] = data[i + 2] = 255;// white out the red and green and blue channels
                data[i] *= 1.5;
                data[i + 1] *= 1.5;
                data[i + 2] *= 1.5;

            } // end if
        } // end for
    }

    if (params.showInvert) {
        for (let i = 0; i < length; i += 4) {
            let red = data[i], green = data[i + 1], blue = data[i + 2];
            data[i] = 255 - red; //set red value
            data[i + 1] = 255 - green; //set green value
            data[i + 2] = 255 - blue; //set blue value
            //data[i+3] is the alpha but we're leaving that alone
        }
    }

    if (params.showEmboss) {
        //note we are stepping through each sub-pixel
        for (let i = 0; i < length; i++) {
            if (i % 4 == 3) continue; //skip alpha channel
            data[i] = 127 + 2 * data[i] - data[i + 4] - data[i + width * 4];
            //data[i+3] is the alpha but we're leaving that alone
        }
    }
    // D) copy image data back to canvas
    ctx.putImageData(imageData, 0, 0);
}

export { setupCanvas, draw };