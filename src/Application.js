import device;
import ui.View;
import ui.TextView;
import ui.ImageView;
import AudioManager;

exports = Class(GC.Application, function () {
	highScore = 0;
	currentScore = 0;
	sequence = new Array();
	state = "idle";
	playbackPos = 0;
	inputPos = 0;
	inputTimeout = 0;
	debounceTimeout = 0;
	audio = 0;
	currentButtonDown = "";

	Button = function(name, xPos, yPos, normalColor, dimColor, brightColor) {
		this.view = new ui.ImageView({
			superview: backgroundView,
			x: (device.width * xPos) / 480,
			y: (device.height * yPos) / 320,
			width: (device.width * 150) / 480,
			height: (device.height * 100) / 320,
			backgroundColor: normalColor,
		});

		this.name = name;
		this.dimColor = dimColor;
		this.brightColor = brightColor;
		this.normalColor = normalColor;
		
		this.light = function() {
			this.view.style.backgroundColor = brightColor;
		}

		this.dim = function() {
			this.view.style.backgroundColor = dimColor;
		}
		
		this.reset = function() {
			this.view.style.backgroundColor = normalColor;
		}
	};

	function gameOver(score) {
		running = false;
		updateHighScore(score);
		dimGameButtons();
		resetStartButton();
	};

	function dimGameButtons() {
		redButton.dim();
		greenButton.dim();
		yellowButton.dim();
		blueButton.dim();
	};

	function resetGameButtons() {
		redButton.reset();
		greenButton.reset();
		yellowButton.reset();
		blueButton.reset();
	};
	
	function dimStartButton() {
		startButton.style.backgroundColor = "#220044";
		startButtonText.updateOpts({color: "#777777"});
	};
	
	function resetStartButton() {
		startButton.style.backgroundColor = "#440088";
		startButtonText.updateOpts({color: "#ffffff"});
	};

	function buttonDown(button) {
		// We don't want fast clickers to have to wait, or to miss their
		// input.
		if (currentButtonDown !== button.name) {
			if (state === "debounce") {
				clearTimeout(debounceTimeout);
				inputDebounced();
			}

			if (state === "input") {
				button.light();
				startSound(button.name + "Button");
				// The player made their choice. They can hold the button
				// down for ages if they want.
				clearTimeout(inputTimeout);

				currentButtonDown = button.name;
			}
		}
	};

	function buttonUp(button) {
		if (state === "input" && currentButtonDown === button.name) {
			button.light();
			stopSound(button.name + "Button");
			inputButton(button.name);
		}

		currentButtonDown = "";
	};

	function startClicked() {
		if (state === "idle") {
			beginGame();
		}
	};

	function startSound(sound) {
		audio.play(sound);
	};

	function stopSound(sound) {
		audio.stop(sound);
	};

	function stopAllSounds() {
		stopSound("redButton");
		stopSound("greenButton");
		stopSound("yellowButton");
		stopSound("blueButton");
		stopSound("buzzer");
	};

	function beginGame() {
		dimStartButton();
		resetGameButtons();

		currentScore = 0;
		sequence = new Array();

		for (i = 0; i < 3; i++) {
			extendSequence();
		}

		setTimeout(bind(this, beginPlayback), 1250);
	};

	function beginPlayback() {
		state = "playback";
		playbackPos = 0;
		
		playbackCurrent();
	};

	function beginInput() {
		state = "input";
		inputPos = 0;

		inputReady();
	};

	function finishGame() {
		updateHighScore(currentScore);
		state = "idle";

		dimGameButtons();
		resetStartButton();
	};

	function playbackCurrent() {
		if (playbackPos == sequence.length) {
			beginInput();
		} else {
			setTimeout(bind(this, playbackPauseDone), 100);
		}
	};

	function playbackPauseDone() {
		resetGameButtons();
		lightTime = playbackLightTime(sequence.length);

		if (sequence[playbackPos] === "red") {
			redButton.light();
			startSound("redButton");
		} else if (sequence[playbackPos] === "green") {
			greenButton.light();
			startSound("greenButton");
		} else if (sequence[playbackPos] === "yellow") {
			yellowButton.light();
			startSound("yellowButton");
		} else {
			blueButton.light();
			startSound("blueButton");
		}

		setTimeout(bind(this, playbackLightDone), lightTime);
	};

	function playbackLightDone() {
		resetGameButtons();
		stopAllSounds();

		playbackPos++;
		playbackCurrent();
	};
	
	function playbackLightTime(length) {
		// Start at 900ms and steadily work down until we're at 150ms on the 16th round.
		lightTime = 900 - ((length - 1) * 50);

		// Make sure we're never too quick or too slow.
		if (lightTime < 150) {
			lightTime = 150;
		} else if (lightTime > 900) {
			lightTime = 900;
		}
		
		return lightTime;
	};

	function inputReady() {
		state = "input";
		resetGameButtons();
		// Allow the user 2.5 seconds to make their choice.
		inputTimeout = setTimeout(bind(this, inputTimedOut), 2500);
	};

	function inputTimedOut() {
		buzzOut();
	};

	function wrongInput() {
		buzzOut();
	};

	function buzzOut() {
		state = "ending";
		audio.play("buzzer");
		setTimeout(bind(this, finishGame), 1000);
	};
	
	function inputButton(button) {
		clearTimeout(inputTimeout);

		if (inputPos < 0 || inputPos > sequence.length) {
			wrongInput();
		} else if (sequence[inputPos] !== button) {
			wrongInput();
		} else {
			state = "debounce";
			inputPos++;
			debounceTimeout = setTimeout(bind(this, inputDebounced), 250);
		}
	};

	function inputDebounced() {
		if (inputPos == sequence.length) {
			resetGameButtons();
			state = "complete";
			setTimeout(bind(this, inputComplete), 750);
		} else {
			inputReady();
		}
	};
	
	function inputComplete() {
		currentScore = sequence.length;

		extendSequence();
		beginPlayback();
	};

	function extendSequence() {
		chosen = Math.floor(Math.random() * 4);
		
		if (chosen == 0) {
			sequence.push("red");
		} else if (chosen == 1) {
			sequence.push("green");
		} else if (chosen == 2) {
			sequence.push("yellow");
		} else {
			// Catch-all to avoid breaking the sequence.
			sequence.push("blue");
		}
	};

	function updateHighScore(score) {
		if (score > highScore) {
			highScore = score;
		}

		highScoreText.setText("High Score: " + highScore);
	}

	this.initUI = function () {
		backgroundView = new ui.View({
			superview: this.view,
			backgroundColor: "#444444",
			x: 0,
			y: 0,
			width: device.width,
			height: device.height
		});

		highScoreBar = new ui.View({
			superview: backgroundView,
			x: 0,
			y: (device.height * 5) / 320,
			width: device.width,
			height: (device.height * 18) / 320,
			backgroundColor: "black"
		});
		
		highScoreText = new ui.TextView({
			superview: highScoreBar,
			layout: "box",
			size: (device.height * 12) / 320,
			color: "#ffffff",
			horizontalAlign: "center",
		});

		redButton = new Button("red", 70, 40, "#660000", "#330000", "#ff4444");
		greenButton = new Button("green", 250, 40, "#006600", "#003300", "#44ff44");
		yellowButton = new Button("yellow", 250, 160, "#666600", "#333300", "#ffff44");
		blueButton = new Button("blue", 70, 160, "#000066", "#000033", "#4444ff");

		startButton = new ui.View({
			superview: backgroundView,
			x: (device.width * 160) / 480,
			y: (device.height * 275) / 320,
			width: (device.width * 160) / 480,
			height: (device.height * 30) / 320,
			backgroundColor: "#440088"
		});
		
		startButtonText = new ui.TextView({
			superview: startButton,
			layout: "box",
			size: (device.height * 12) / 320,
			text: "START",
			color: "white",
			horizontalAlign: "center"
		});

		audio = new AudioManager({
			path: "resources",
			files: {
				buzzer: {
					path: "audio",
					background: false
				},
				redButton: {
					path: "audio",
					background: false
				},
				greenButton: {
					path: "audio",
					background: false
				},
				yellowButton: {
					path: "audio",
					background: false
				},
				blueButton: {
					path: "audio",
					background: false
				}
			}
		});

		redButton.view.on("InputStart", bind(this, buttonDown, redButton));
		greenButton.view.on("InputStart", bind(this, buttonDown, greenButton));
		yellowButton.view.on("InputStart", bind(this, buttonDown, yellowButton));
		blueButton.view.on("InputStart", bind(this, buttonDown, blueButton));

		redButton.view.on("InputSelect", bind(this, buttonUp, redButton));
		greenButton.view.on("InputSelect", bind(this, buttonUp, greenButton));
		yellowButton.view.on("InputSelect", bind(this, buttonUp, yellowButton));
		blueButton.view.on("InputSelect", bind(this, buttonUp, blueButton));

		// What we really care about is that the button is no longer being
		// pressed.
		redButton.view.on("InputOut", bind(this, buttonUp, redButton));
		greenButton.view.on("InputOut", bind(this, buttonUp, greenButton));
		yellowButton.view.on("InputOut", bind(this, buttonUp, yellowButton));
		blueButton.view.on("InputOut", bind(this, buttonUp, blueButton));

		startButton.on("InputSelect", bind(this, startClicked));
		
		gameOver(0);
	};
	
	this.launchUI = function () {};
});
