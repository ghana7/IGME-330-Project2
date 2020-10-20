/*
    The purpose of this file is to take in the analyser node and a <canvas> element: 
      - the module will create a drawing context that points at the <canvas> 
      - it will store the reference to the analyser node
      - in draw(), it will loop through the data in the analyser node
      - and then draw something representative on the canvas
      - maybe a better name for this file/module would be *visualizer.js* ?
*/

import * as utils from './utils.js';

let ctx, ctxOverlay, canvasWidth, canvasHeight, gradient, radGradient, analyserNode, audioData, prevAudioData, deltaVolume, lastDeltaVolume, framesSinceLastBeat;

let intensity = 1;
let borderWidth = 0.7;
let x = 0;
function setupCanvas(canvasElement, overlayCanvasElement, analyserNodeRef) {
    // create drawing context
    ctx = canvasElement.getContext("2d");
    ctxOverlay = overlayCanvasElement.getContext("2d");
    canvasWidth = canvasElement.width;
    canvasHeight = canvasElement.height;
    

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
}

function totalVolume(aData) {
    let sum = 0;
    for(let i = 0; i < aData.length; i++) {
        sum += aData[i];
    }
    return sum;
}

function totalLowVolume(aData) {
    let sum = 0;
    for(let i = 0; i < aData.length / 2; i++) {
        sum += aData[i];
    }
    return sum;
}

function totalHighVolume(aData) {
    let sum = 0;
    for(let i = aData.length / 2; i < aData.length; i++) {
        sum += aData[Math.floor(i)];
    }
    return sum;
}
function draw(params = {}) {
    // 1 - populate the audioData array with the frequency data from the analyserNode
    // notice these arrays are passed "by reference" 
    for(let i = 0; i < audioData.length; i++) {
        prevAudioData[i] = audioData[i];
        if(!prevAudioData[i]){ 
            prevAudioData[i] = 0;
        }
    }

    lastDeltaVolume = deltaVolume;
    analyserNode.getByteFrequencyData(audioData);

    let volume = totalVolume(audioData);
    let lowVolume = totalLowVolume(audioData);
    let highVolume = totalHighVolume(audioData);
    deltaVolume = totalLowVolume(audioData) - totalLowVolume(prevAudioData);
    

    ctxOverlay.save();
    ctxOverlay.fillStyle = "white";
    ctxOverlay.fillRect(x, canvasHeight - ((volume / 20000) * canvasHeight), 2, 2);
    ctxOverlay.fillStyle = "yellow";
    ctxOverlay.fillRect(x, canvasHeight - ((lowVolume / 20000) * canvasHeight), 2, 2);
    ctxOverlay.fillStyle = "red";
    ctxOverlay.fillRect(x, canvasHeight - ((highVolume / 20000) * canvasHeight), 2, 2);
    ctxOverlay.fillStyle = "orange";
    if(deltaVolume > 0 && lastDeltaVolume < 0 && deltaVolume > 200) {
        ctxOverlay.fillRect(x, 0, 1, canvasHeight);
        console.log(framesSinceLastBeat);
        framesSinceLastBeat = 0;
    } else {
        framesSinceLastBeat++;
    }

    ctxOverlay.restore();
    x += 1;
    if(x > canvasWidth) {
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

    // 3 - draw gradient
    if (params.showGradient) {
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    }
    // 4 - draw bars
    if (params.showBars) {
        let barSpacing = 4;
        let margin = 5;
        let screenWidthForBars = canvasWidth - (audioData.length * barSpacing) - margin * 2;
        let barWidth = screenWidthForBars / audioData.length;
        let barHeight = 200;
        let topSpacing = 100;

        ctx.save();
        ctx.fillStyle = "rgba(255,255,255, 0.50)";
        ctx.strokeStyle = "rgba(0,0,0,0.50)";

        for (let i = 0; i < audioData.length; i++) {
            ctx.fillRect(margin + i * (barWidth + barSpacing), topSpacing + 256 - audioData[i], barWidth, barHeight);
            ctx.strokeRect(margin + i * (barWidth + barSpacing), topSpacing + 256 - audioData[i], barWidth, barHeight);
        }
        ctx.restore();
    }
    // 5 - draw circles
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
            ctx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius, 0, 2 * Math.PI, false);
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
            ctx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius * 0.5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }
        ctx.restore();
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
            if (Math.random() < 0.05) {
                // data[i] is the red channel
                // data[i+1] is the green channel
                // data[i+2] is the blue channel
                // data[i+3] is the alpha channel
                data[i] = data[i + 1] = data[i + 2] = 0;// zero out the red and green and blue channels
                data[i] = 255;// make the red channel 100% red
            } // end if
        } // end for
    }

    if(params.showInvert) {
        for(let i = 0; i < length; i += 4) {
            let red = data[i], green = data[i+1], blue = data[i+2];
            data[i] = 255 - red; //set red value
            data[i + 1] = 255 - green; //set green value
            data[i + 2] = 255 - blue; //set blue value
            //data[i+3] is the alpha but we're leaving that alone
        }
    }

    if(params.showEmboss) {
        //note we are stepping through each sub-pixel
        for(let i = 0; i < length; i++) {
            if(i % 4 == 3) continue; //skip alpha channel
            data[i] = 127 + 2*data[i] - data[i+4] - data[i + width * 4];
            //data[i+3] is the alpha but we're leaving that alone
        }
    }
    // D) copy image data back to canvas
    ctx.putImageData(imageData, 0, 0);
}

export { setupCanvas, draw };