//gloale Variablen
var video, canvas, canvasContext, streamVideo, buttonOverlay, infoMeasurement, valueMeasurement ;
var fps = 25;
var dataWindowLength = 2; //in sekunden. Zeitfesnter, der Datenspeciherung
var cameraOk  = false; //Kamerazugriff erlaubt?

//gloable Bildwert Variablen
var graySum = 0;
var dataArray = [];
var dataArrayH = [];
var dataArrayV = [];
var beatArray = []; 
var fingerOnCamera = false;
var valueStable = false;
var readyToMeasure = false;
var measurementRunning = false;
var measurementRun= false;
var peakSensingWidth = 3;
var fakeBeat = [-1,0,0,0,0,1,2,3,5,2,0,0,0,0,0,0,0,0]; 
var fakeBeatIndex = 0;




//Gloable Plot Variablen
var chart, dps, xVal, yVal;

//globale Rechenvariablen
var lastBeat = 0;
var beatMeasurements = [];
var beatMeasurementsConti = [];
var measurementTime = 15; //sekunden
var passedCyles = 0;


//globale anzeigeVariablen
var measuredBeat = 0;
var passedMeasureTime = 0;
var heightPlot = 39;

console.log("Skript wird ausgeführt");


//Funktionen:
setup();
readyToMeasure= true;
browserCheck();

//cameraSetup();
//testInput();
mainLoop(); //Starte Loop



function debug(){ //Debug Knopf

	debugArray(beatArray);
	arraySort(beatArray);
	debugArray(beatArray);

}




//loop in FPS
function animationLoop(){

		fakeBeatIndex++;
		if(fakeBeatIndex > fakeBeat.length - 1)fakeBeatIndex = 0;

		arrayLength = dataArray.unshift(fakeBeat[fakeBeatIndex]);
		if(arrayLength > fps * dataWindowLength){ //array voll
			dataArray.pop();
		}
		peakSensing(dataArray);
		//plotSimpleGraph(0.3);
}

function mainLoop(){

	htmlTextFill();


	this.setTimeout(mainLoop, 1/fps * 1000); //wiederholung //rekusiev /0.5sek

}
function browserCheck(){
	if (hasGetUserMedia()) {
		// Good to go!
	} else {
		alert('Browser nicht kompatibel mit Website. Messung unmöglich');
	}

}


//Einstellungen laden und HTML Elemente übernehmen
function setup(){
	video = document.getElementById('video'); //Videoobjekt der Seite
	canvas = document.getElementById('Canvas_Item');
	buttonOverlay = document.getElementById('Button_measurement');
	infoMeasurement = document.getElementById('infoMeasurement');
	valueMeasurement = document.getElementById('valueMeasurement');


	canvasContext = canvas.getContext('2d');
	arrayPrep();
}

//Zugriff auf die Kamera und video Setup
function cameraSetup(){
	// Get access to the camera!
	if('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
		// Not adding `{ audio: true }` since we only want video now
		navigator.mediaDevices.getUserMedia({
			//Kamera Constrains:
			
			video: 
			{
				width: {ideal: 50},
				height: {ideal: 50},
				facingMode: ['environment']
			}
			}).then(function(stream) {
				streamVideo = stream;
				cameraOk = true;
				video.srcObject = stream;
				video.play();

				var track = stream.getVideoTracks()[0];
				//Taschenlampe einschalten:
				const imageCapture = new ImageCapture(track)
				const photoCapabilities = imageCapture.getPhotoCapabilities().then(() => {
					track.applyConstraints({
						advanced: [{torch: true}]
					});
				});



			});
		}


	}

	//Kamera beenden
	function cameraStop(){

		var track = streamVideo.getVideoTracks()[0];
		const imageCapture = new ImageCapture(track)
		const photoCapabilities = imageCapture.getPhotoCapabilities().then(() => {
			track.applyConstraints({
				advanced: [{torch: false}]
			});
		});

		video.pause();


	}

	function arrayPrep(){


		for(var i = 0; i < fps * dataWindowLength; i++){
			dataArray.unshift(fakeBeat[i%fakeBeat.length]);
		}
		for(var i = 0; i < (fps * dataWindowLength) - peakSensingWidth; i++){
			beatArray.unshift(0);
		}

	}


	function htmlTextFill (){

		passedMeasureTime = Math.floor(measurementTime - passedCyles * 1/fps);


		if(measurementRunning){
			buttonOverlay.style.opacity = 0;	
			if(cameraOk){
				if(fingerOnCamera){
					if(valueStable){
						infoMeasurement.innerHTML = "Messung läuft. Verbleibende Zeit:";
						valueMeasurement.innerHTML =  passedMeasureTime+"sek";
					}else{
					infoMeasurement.innerHTML = "Finger ruhiger halten";
					valueMeasurement.innerHTML =  passedMeasureTime+"sek";
					}
				}else{
				infoMeasurement.innerHTML = "Finger auf Kamera legen";
				valueMeasurement.innerHTML =  passedMeasureTime+"sek";
				}
			}else{ 
			infoMeasurement.innerHTML = "Kamerazugriff erlauben";
			}
		}else{
			buttonOverlay.style.opacity = 1;	
			animationLoop();
			infoMeasurement.innerHTML = "";
			valueMeasurement.innerHTML =  "";
			if(measurementRun){
				infoMeasurement.innerHTML = "Gemessener Puls:";
				valueMeasurement.innerHTML = measuredBeat+"bpm";
			}

		}





	}


	function arraySmoothing(inputArray){
		var output = [];



		for(var i = 2; i < inputArray.length - 3; i++){
			var ava = 0;
			for(var p = -2; p < 3; p++)
			{
				ava = ava + inputArray[i+p]
			}
			output.push(ava/5);
		}

		return output;
	}


	function arrayZero(inputArray){
		output = [];
		for(var i = 0; i < inputArray.length; i++){
			output.unshift(0);
		}
		return output;
	}


	function arraySort(inputArray){

		inputArray.sort(function(a, b) {
			return a - b;
		});

	}
	//Sinus
	function testInput(){

		var graySum = Math.sin(new Date().getTime() / 200)+2;

		var arrayLength = dataArray.unshift(graySum);

		if(arrayLength > fps * dataWindowLength){ //array voll
			dataArray.pop();
		}



	}



	//Berechnung Bildwerte
	function imageCalculation() {
		w = canvas.width,
		h = canvas.height;
		canvasContext.drawImage(video, 0, 0, w, h);



		var apx = canvasContext.getImageData(0, 0, w, h);
		var data = apx.data;

		graySum = 0;
		VSum = 0;
		for(var i = 0; i < data.length; i+=4)
		{
			var r = data[i],
			g = data[i+1],
			b = data[i+2],
			gray = (r+g+b)/3;
			graySum = graySum + gray;

			VSum = VSum + rgbToHsv(data[i], data[i+1], data[i+2])[2];
		}


		var arrayLength = dataArray.unshift(graySum/(canvas.width*canvas.height));

		if(arrayLength > fps * dataWindowLength){ //array voll
			dataArray.pop();
		}

		var arrayLengthV = dataArrayV.unshift(VSum/(canvas.width*canvas.height));

		if(arrayLengthV > fps * dataWindowLength){ //array voll
			dataArrayV.pop();
		}

		//HSV H für Tonerkennung
		var redSum = 0;
		var redSpread = 0.06;
		var redTh = 0.3;
		for(var i = 0; i < data.length; i+=4)
		{

			//Pixel Rötlich?
			if((rgbToHsv(data[i], data[i+1], data[i+2])[0]>1-redSpread/2)||
			(rgbToHsv(data[i], data[i+1], data[i+2])[0]< redSpread/2))
			redSum++;
		}

		//console.log(redSum/(canvas.width*canvas.height));
		var arrayLengthH = dataArrayH.unshift(redSum/(canvas.width*canvas.height));

		if(arrayLengthH > fps * dataWindowLength){ //array voll
			dataArrayH.pop();
		}

		if (redSum/(canvas.width*canvas.height) > redTh) fingerOnCamera = true;
		else fingerOnCamera = false;

		//fingerOnCamera = true; //DEBUG
		valueStable = valueStableTest(dataArray, 20);


	}


	//true wenn die werte des übergeben arrays nicht weiter als der spread(prozent) auseinander sind
	function valueStableTest(inputArray, spread){

		var biggest = 0;
		var smallest = 10000000;
		var output = false;
		//größten/kleinsten wert rausfinden:
		for(var i = 0; i < inputArray.length; i++){
			if(inputArray[i]>biggest) biggest = inputArray[i] ;
			if(inputArray[i]<smallest) smallest = inputArray[i] ;
		}

		if((((biggest- smallest)/biggest)*100)< spread) output = true;



		return output;


	}

	function plotSimpleGraph(opacityInput){




		var traceData = {
			line: {
				color: 'rgb(255, 255, 255)',
				width: 4,
				shape: "spline",
			},
			y: delayArray(dataArray, peakSensingWidth),
			type: 'scatter',
			opacity: opacityInput,
		};




		var traceBeats = {
			line: {
				color: 'rgb(0, 0, 0)',
				width: 4,
				shape: "spline",
			},
			y: beatArray,
			yaxis: 'y2',
			type: 'scatter',
			opacity: opacityInput,

		};

		var plotdata = [traceData, traceBeats];
		var layout = {

			showlegend : false,
			paper_bgcolor : '#fa4924',
			plot_bgcolor : '#ff4920',
			height : ((window.innerHeight/100)*heightPlot),

			margin: {
				l: 0,
				r: 0,
				b: 0,
				t: 0,
				pad: 0
			},
			xaxis: {
				autorange: true,
				showgrid: false,
				zeroline: false,
				showline: false,
				autotick: true,
				ticks: '',
				showticklabels: false
			},
			yaxis: {
				autorange: true,
				showgrid: false,
				zeroline: false,
				showline: false,
				autotick: true,
				ticks: '',
				showticklabels: false
			},
			yaxis2 : {
				overlaying: 'y',
				side: 'right',
				autorange: false,
				showgrid: false,
				zeroline: false,
				showline: false,
				autotick: true,
				ticks: '',
				showticklabels: false,
				range: [0, 2]
			}
		};

		var ctx = Plotly.newPlot('Plot_Item', plotdata, layout, {displayModeBar : true, staticPlot: true,  responsive: true});


	}

	function plotGraphs(){

		var smoothData = arraySmoothing(dataArray);

		// valueStable(smoothData, 5);

		var traceData = {
			y: dataArray,
			type: 'scatter',
		};

		var trace2 = {
			y: dataArrayV,
			type: 'scatter',
		};



		var plotdata = [traceData];
		var layout = {
			title:'RGB Data Array'
		};

		Plotly.newPlot('myDiv', plotdata, layout);





		var traceHSV = {
			y: dataArrayV,
			type: 'scatter',
		};

		var plotdata= [traceHSV];
		var layout = {
			title:'HSV Data Array'
		};

		Plotly.newPlot('myDivBeat', plotdata, layout);

		peakSensing(dataArray);

		var traceBeat = {
			y: beatArray,
			type: 'scatter',
		};



		var plotdata = [traceBeat];
		var layout = {
			title:'Erkannte Pulse'
		};

		Plotly.newPlot('myDivHeart', plotdata, layout);


	}

	function debugArray(inputArray){

		inputArray.forEach(function(item, index, array) {
			console.log(item, index);
		});
	}

	//Holt sich second sekunden Daten aus dem Datenset und filter sie
	function subDataGenerator(second, inputArray, inputfps){
		var output = [];
		for(var i = 0; i < (inputfps * second) -1; i++){
			output.push(inputArray[i]);
		}

		output = arraySmoothing(output);
		return output;
	}

	//peakerkennung um Datenpunkt 3
	function peakSensing(inputArray){

		if(readyToMeasure){


			// console.log(inputArray);
			//console.log(fps * dataWindowLength);

			var arrayLength = 0;



			//Überprüfung von Stelle 3
			//Da Sähezahnform: 2 nach links und 4 nach rechts
			if(inputArray[3]>inputArray[1] &&
				inputArray[3]>inputArray[2] &&
				inputArray[3]>inputArray[4] &&
				inputArray[3]>inputArray[5] &&
				inputArray[3]>inputArray[6] &&
			inputArray[3]>inputArray[7]){
				arrayLength = beatArray.unshift(1);
			}else{
			arrayLength = beatArray.unshift(0);
			}


			if(arrayLength > inputArray.length- peakSensingWidth ) {
				beatArray.pop();
			}



		}else{
		beatArray = arrayZero(beatArray);
		}


	}

	function beatRateCalculatio(){
		if(readyToMeasure){
			var arrayLength = 0;
			if (beatArray[0] == 1){
				if(lastBeat != 0){
					var pulse = 60/(new Date().getTime() - lastBeat) *1000;
					//console.log(pulse);
					if(pulse> 35 && pulse < 190){ //Nicht sinvolle Werte verwerfen
						arrayLength =beatMeasurements.unshift(pulse);
						beatMeasurementsConti.unshift(pulse); //Alle Werte
					}
				}
				lastBeat = new Date().getTime(); //Speicher Millisekunden

				if(arrayLength > 12){ //array voll
					beatMeasurements.pop();
				}

			}

		}

	}

	function beatAvarageCalculation(){
		var workArray = Array.from(beatMeasurements);

		var biggest =0;
		var smallest = 1000;


		for(var i = 0; i < workArray.length; i++){
			if(workArray[i]>biggest) biggest = workArray[i] ;
			if(workArray[i]<smallest) smallest = workArray[i] ;
		}
		//größten und kleinsten Wert verwerfen
		workArray.splice(workArray.indexOf(biggest),1);
		workArray.splice(workArray.indexOf(smallest),1);

		//durschnitt bilden
		var sum = 0;
		for(var i = 0; i < workArray.length; i++){
			sum = sum+ workArray[i];
		}

		return sum/ workArray.length-1 ;
	}

	function beatAvarageCalculationContinius(measurementRunning){
		var output = 0;
		var beatSum = 0;

		if(measurementRunning){
			output = 0;	
		}else{
		//extreme Werte entfernen:
		arraySort(beatMeasurementsConti);
		//brechnung Anzahl extrema (die höchsten und die niedrigsten 20% werden entfernt 
		var numberOfExtreme = Math.floor(beatMeasurementsConti.length*0.2) ; // GANZZAHLIG
		var originalLength = beatMeasurementsConti.length;
		//Entfernen der Werte aus Array
		while(beatMeasurementsConti.length > originalLength - numberOfExtreme*2 ){
			//console.log(beatMeasurementsConti.length);
			beatMeasurementsConti.pop(); //vom anfang löschen
			beatMeasurementsConti.shift(); //vom ende löschen		
		}

		console.log(beatMeasurementsConti);
		while(beatMeasurementsConti.length > 0){
			beatSum = beatSum + beatMeasurementsConti.pop(); //Array leeren und Summe berechnen
		}

		output =Math.floor(beatSum / (originalLength - numberOfExtreme*2)); //Berechnung durschnitt ohne extrema

		}


		return output;



	}


	function measurement(){

		imageCalculation();
		peakSensing(dataArray);
		measurementRunning = true;


		//Finger ist auf Kamera und Wert schwankt nicht mehr stark
		if(fingerOnCamera && valueStable && cameraOk)readyToMeasure= true;
		else readyToMeasure = false;

		if(passedCyles == 0){ //Beginn Messung
			cameraSetup();
			passedCyles++;	
		}




		plotSimpleGraph(1);


		if(readyToMeasure){


			passedCyles++;
			beatRateCalculatio();
			beatAvarageCalculation();
			measuredBeat = beatAvarageCalculationContinius(true);

		}

		if(passedCyles+1 > fps * measurementTime){
			measurementRun = true;
			passedCyles = 0;
			measuredBeat = beatAvarageCalculationContinius(false);
			passedMeasureTime = 0;
			measurementRunning = false;
			cameraStop();	
			return; //Messung zuende
		}else if(passedCyles-1 < fps * measurementTime) this.setTimeout(measurement, 1/fps * 1000); //wiederholung //rekusiev




	}

	function rgbToHsv(r, g, b) {

		r /= 255, g /= 255, b /= 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, v = max;

		var d = max - min;
		s = max == 0 ? 0 : d / max;

		if (max == min) {
			h = 0; // achromatic
		} else {
			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}

			h /= 6;
		}

		return [ h, s, v ];
	}

	function delayArray(inputArray, delay){
		var output = [];


		for(var i = delay; i < inputArray.length ; i++){
			output[i] = inputArray[i+delay];
		}

		/*
		for(var i = inputArray.length-1; i >= 0 ; i--){
		var arrayLength = output.unshift(inputArray[i]+200);
		}


		if(arrayLength > inputArray.length + delay ) {
		output.pop();
		}

		*/
		return output;

	}

	function avarageInArray(inputArray){

		var sum =0;
		for(var i = 0; i < inputArray.length-1; i++){
			sum = sum+ inputArray[i];
		}
		var output =[];

		for(var i = 0; i < inputArray.length-1; i++){
			output.push(sum/(inputArray.length-1));
		}

		return output ;

	}

	function hasGetUserMedia() {
		// Note: Opera builds are unprefixed.
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia || navigator.msGetUserMedia);
	}