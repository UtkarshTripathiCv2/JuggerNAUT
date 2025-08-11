// --- DOM Elements ---
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const feedbackText = document.getElementById('feedbackText');
const repCountText = document.getElementById('repCountText');
const successOverlay = document.getElementById('successOverlay');
const precautionOverlay = document.getElementById('precautionOverlay');
const complimentBox = document.getElementById('complimentBox');
const exerciseControls = document.getElementById('exercise-controls');
const warmupControls = document.getElementById('warmup-controls');
const aiFeedbackSection = document.getElementById('aiFeedbackSection');
const aiFeedbackResult = document.getElementById('aiFeedbackResult');
const aiLoadingSpinner = document.getElementById('aiLoadingSpinner');
const backBtn = document.getElementById('backBtn');

// --- App State Management ---
let appState = 'IDLE'; 
let currentView = 'home-view'; 
let repCounter = 0;
let stage = null; 
let feedback = '';
let complimentInterval;
let isWarmupComplete = false;

// --- Data Storage ---
const workoutSummary = { "BICEP CURLS": 0, "PUSHUPS": 0, "SQUATS": 0, "SHOULDER_PRESS": 0, "PULLUPS": 0 };
const warmupExercises = [
    { name: "FINGER SPREADS", reps_required: 5, precaution: false },
    { name: "NECK TURNS (L/R)", reps_required: 10, precaution: true, countdown: true },
    { name: "SMILE", reps_required: 1, precaution: false }
];
let currentExerciseIndex = 0;
const compliments = ['Great Form!', 'Keep Pushing!', 'You Got This!', 'Awesome Work!', 'Feel the Burn! 🔥'];
const motivationalPhrases = ['Keep pushing!', 'Great power!', 'You got this!', 'Unstoppable!', 'Feel that burn!', 'More reps!', 'Light weight!'];

// --- Core Functions ---
function switchView(viewId) {
    document.getElementById(currentView).classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
    currentView = viewId;

    // Update back button visibility and functionality
    if (viewId === 'home-view') {
        backBtn.classList.add('hidden');
    } else {
        backBtn.classList.remove('hidden');
    }

    if (viewId === 'menu-view') {
        document.querySelectorAll('#exercise-menu-grid button').forEach(btn => {
            btn.disabled = !isWarmupComplete;
        });
        document.getElementById('menu-subtitle').textContent = isWarmupComplete ? 'Choose your poison. 💪' : 'Complete your warmup first! ⚠️';
    }
}

function calculateAngle(a, b, c) {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    return angle > 180.0 ? 360 - angle : angle;
}

function updateUI() {
    feedbackText.textContent = feedback;
    repCountText.textContent = repCounter;
}

function showWarmupSuccess() {
    appState = 'SUCCESS';
    isWarmupComplete = true;
    successOverlay.classList.add('visible');
    speak("Warmup complete! Light weight baby!");
    setTimeout(() => {
        successOverlay.classList.remove('visible');
        switchView('menu-view');
        appState = 'IDLE';
        warmupControls.classList.add('hidden');
    }, 3000);
}

function showCompliment() {
    const compliment = compliments[Math.floor(Math.random() * compliments.length)];
    complimentBox.textContent = compliment;
    complimentBox.style.animation = 'fadeIn 0.5s ease-out forwards';
    setTimeout(() => {
        complimentBox.style.animation = 'fadeOut 0.5s ease-in forwards';
    }, 2000);
}

function startCompliments() {
    if (complimentInterval) clearInterval(complimentInterval);
    complimentInterval = setInterval(showCompliment, 7000);
}

function stopCompliments() {
    clearInterval(complimentInterval);
}

function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    window.speechSynthesis.speak(utterance);
}

function motivate(reps) {
    if (reps > 0 && reps % 5 === 0) {
        const phrase = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
        setTimeout(() => speak(phrase), 400);
    }
}

// --- MediaPipe Initialization ---
const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });

async function onResults(results) {
    if (!videoElement.videoWidth) return;
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    const poseLandmarks = results.poseLandmarks;
    const handLandmarks = results.multiHandLandmarks;

    if (poseLandmarks) {
        drawConnectors(canvasCtx, poseLandmarks, POSE_CONNECTIONS, { color: '#f97316', lineWidth: 4 });
        drawLandmarks(canvasCtx, poseLandmarks, { color: '#ffffff', lineWidth: 2 });
    }
    if (handLandmarks) {
        for (const landmarks of handLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#fb923c', lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks, { color: '#fed7aa', lineWidth: 2 });
        }
    }

    try {
        if (appState === 'WARMUP') {
             handleWarmup(poseLandmarks, handLandmarks);
        } else if (appState !== 'IDLE' && appState !== 'SUCCESS') {
            handleExercise(poseLandmarks);
        }
    } catch (error) { /* Silently ignore errors */ }
    
    updateUI();
    canvasCtx.restore();
}

pose.onResults(onResults);
hands.onResults(onResults);

// --- Camera Setup ---
const camera = new Camera(videoElement, {
    onFrame: async () => {
        const currentWarmup = warmupExercises[currentExerciseIndex];
        if (appState === 'WARMUP' && currentWarmup && currentWarmup.name === "FINGER SPREADS") {
            await hands.send({ image: videoElement });
        } else {
            await pose.send({ image: videoElement });
        }
    },
    width: 1280,
    height: 720
});

// --- Event Listeners ---
document.getElementById('startWarmupBtn').addEventListener('click', () => {
    switchView('exercise-view');
    appState = 'WARMUP';
    currentExerciseIndex = 0;
    updateWarmupExercise();
    camera.start();
    warmupControls.classList.remove('hidden');
    startCompliments();
});

document.querySelectorAll('#exercise-menu-grid button[data-exercise]').forEach(button => {
    button.addEventListener('click', () => {
        const exercise = button.dataset.exercise;
        const exerciseNameMap = { "BICEP_CURLS": "BICEP CURLS", "PUSHUPS": "PUSHUPS", "SQUATS": "SQUATS", "SHOULDER_PRESS": "SHOULDER PRESS", "PULLUPS": "PULL-UPS"};
        appState = exercise;
        feedback = `STARTING ${exerciseNameMap[exercise]}`;
        repCounter = 0;
        stage = null;
        switchView('exercise-view');
        exerciseControls.classList.remove('hidden');
        warmupControls.classList.add('hidden');
        speak(`Starting ${exerciseNameMap[exercise]}`);
        startCompliments();
    });
});

document.getElementById('finishSetBtn').addEventListener('click', () => {
    speak("Set finished. Great work!");
    appState = 'IDLE';
    exerciseControls.classList.add('hidden');
    switchView('menu-view');
    stopCompliments();
});

backBtn.addEventListener('click', () => {
    if (currentView === 'menu-view') {
        switchView('home-view');
    } else if (currentView === 'exercise-view') {
        // If in an exercise, go to menu. If in warmup, go to home.
        const targetView = (appState === 'WARMUP') ? 'home-view' : 'menu-view';
        switchView(targetView);
        // Stop camera and compliments if going back from an active session
        camera.stop();
        stopCompliments();
        appState = 'IDLE';
        exerciseControls.classList.add('hidden');
        warmupControls.classList.add('hidden');
    }
});

function updateWarmupExercise() {
    stage = null;
    const exercise = warmupExercises[currentExerciseIndex];
    feedback = `DO: ${exercise.name}`;
    
    if (exercise.countdown) {
        repCounter = exercise.reps_required;
    } else {
        repCounter = 0;
    }
    
    speak(`Next: ${exercise.name}`);
    if (exercise.precaution) {
        precautionOverlay.classList.add('visible');
        setTimeout(() => precautionOverlay.classList.remove('visible'), 3000);
    }
}

document.getElementById('nextExBtn').addEventListener('click', () => {
    if (currentExerciseIndex < warmupExercises.length - 1) {
        currentExerciseIndex++;
        updateWarmupExercise();
    }
});

document.getElementById('prevExBtn').addEventListener('click', () => {
    if (currentExerciseIndex > 0) {
        currentExerciseIndex--;
        updateWarmupExercise();
    }
});

// --- Modal Logic ---
function openModal(modalId) { document.getElementById(modalId).classList.add('visible'); }
function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    modal.classList.remove('visible');
    if (modalId === 'reportModal') { aiFeedbackSection.classList.add('hidden'); aiFeedbackResult.textContent = ''; }
    if (modalId === 'dietModal') { document.getElementById('dietResultSection').classList.add('hidden'); document.getElementById('dietResult').textContent = '';}
}
document.getElementById('reportBtn').addEventListener('click', () => {
    document.getElementById('reportContent').innerHTML = Object.entries(workoutSummary)
        .map(([exercise, count]) => `<div class="flex justify-between items-center bg-gray-800 p-3 rounded-lg"><span class="font-semibold text-gray-300">${exercise}</span><span class="font-black text-2xl text-white">${count}</span></div>`)
        .join('') || '<p class="text-center text-gray-400">No workout data yet. Go crush a set! 💪</p>';
    openModal('reportModal');
});
document.getElementById('bmiBtn').addEventListener('click', () => openModal('bmiModal'));
document.getElementById('calorieBtn').addEventListener('click', () => openModal('calorieModal'));
document.getElementById('dietBtn').addEventListener('click', () => {
    document.getElementById('dietAge').value = document.getElementById('calorieAge').value;
    document.getElementById('dietHeight').value = document.getElementById('calorieHeight').value;
    document.getElementById('dietWeight').value = document.getElementById('calorieWeight').value;
    document.getElementById('dietGender').value = document.getElementById('calorieGender').value;
    openModal('dietModal');
});
document.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.modalClose)));
document.getElementById('printBtn').addEventListener('click', () => {
    const reportHTML = `<html><head><title>JaggerNAUT Workout Report</title><style>body{font-family:sans-serif;margin:40px}h1{text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:12px;text-align:left}th{background-color:#f2f2f2}</style></head><body><h1>JaggerNAUT Workout Report</h1><table><thead><tr><th>Exercise</th><th>Repetitions</th></tr></thead><tbody>${Object.entries(workoutSummary).map(([ex, count]) => `<tr><td>${ex}</td><td>${count}</td></tr>`).join('')}</tbody></table></body></html>`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.print();
});
document.getElementById('calculateBmiBtn').addEventListener('click', () => {
    const height = parseFloat(document.getElementById('bmiHeight').value), weight = parseFloat(document.getElementById('bmiWeight').value), resultEl = document.getElementById('bmiResult');
    if (height > 0 && weight > 0) {
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        let category = (bmi < 18.5) ? 'Underweight' : (bmi < 24.9) ? 'Normal weight' : (bmi < 29.9) ? 'Overweight' : 'Obesity';
        resultEl.innerHTML = `<p class="text-xl">Your BMI: <span class="font-bold text-2xl accent-text">${bmi}</span></p><p class="text-gray-400">Category: ${category}</p>`;
    } else { resultEl.innerHTML = `<p class="text-red-500">Please enter valid height and weight.</p>`; }
});
document.getElementById('calculateCalorieBtn').addEventListener('click', () => {
    const age = parseInt(document.getElementById('calorieAge').value), height = parseFloat(document.getElementById('calorieHeight').value), weight = parseFloat(document.getElementById('calorieWeight').value), gender = document.getElementById('calorieGender').value, activity = parseFloat(document.getElementById('calorieActivity').value), resultEl = document.getElementById('calorieResult');
    if (age > 0 && height > 0 && weight > 0) {
        let bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161);
        const maintenance = Math.round(bmr * activity);
        resultEl.innerHTML = `<p class="text-lg">Maintenance: <span class="font-bold text-xl accent-text">${maintenance}</span> kcal/day</p><p class="text-gray-400 text-sm">Weight Loss: ~${maintenance - 500} kcal | Weight Gain: ~${maintenance + 500} kcal</p>`;
    } else { resultEl.innerHTML = `<p class="text-red-500">Please fill in all fields correctly.</p>`; }
});

// --- Gemini API Integration (Client-Side) ---
async function getAiApiResponse(prompt) {
    const serverUrl = 'http://localhost:3000/get-ai-response';
    const payload = { prompt: prompt };
    const response = await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error(`Server request failed with status ${response.status}`);
    }
    return response.json();
}

document.getElementById('getAiFeedbackBtn').addEventListener('click', async () => {
    const workoutString = Object.entries(workoutSummary).filter(([, reps]) => reps > 0).map(([exercise, reps]) => `${exercise}: ${reps} reps`).join(', ');
    if (!workoutString) {
        aiFeedbackResult.textContent = "You haven't completed any exercises yet. Do a set and come back for feedback!";
        aiFeedbackSection.classList.remove('hidden');
        return;
    }
    const prompt = `You are JaggerNAUT, a hyper-motivational and knowledgeable AI fitness coach. Your tone is energetic and encouraging (use emojis like 💪, 🔥, 🚀). Based on the following workout summary, provide feedback in three short sections using markdown for formatting: 1. **THE PUMP:** Give some positive reinforcement about the work done. 2. **NEXT LEVEL:** Suggest one specific thing to focus on next time (like a new exercise, more reps, or better form). 3. **FUEL UP:** Recommend a simple, healthy post-workout meal idea. Keep the entire response concise and easy to read. Here's the workout: ${workoutString}`;
    aiLoadingSpinner.classList.remove('hidden');
    aiFeedbackSection.classList.add('hidden');
    try {
        const result = await getAiApiResponse(prompt);
        const feedbackText = result.candidates[0].content.parts[0].text;
        aiFeedbackResult.innerHTML = feedbackText.replace(/\*\*(.*?)\*\*/g, '<strong class="accent-text">$1</strong>').replace(/\n/g, '<br>');
    } catch (error) {
        console.error("AI Feature Error:", error);
        aiFeedbackResult.textContent = "Sorry, the AI coach is currently unavailable. Please make sure your server is running and try again.";
    } finally {
        aiLoadingSpinner.classList.add('hidden');
        aiFeedbackSection.classList.remove('hidden');
    }
});

document.getElementById('getAiDietBtn').addEventListener('click', async () => {
    const age = document.getElementById('dietAge').value, height = document.getElementById('dietHeight').value, weight = document.getElementById('dietWeight').value, gender = document.getElementById('dietGender').value, goal = document.getElementById('dietGoal').value;
    if (!age || !height || !weight) {
        alert("Please fill in your Age, Height, and Weight.");
        return;
    }
    const prompt = `You are JaggerNAUT, a specialist AI nutrition coach. Create a simple, sample one-day meal plan for a user with the following details: Age: ${age}, Height: ${height}cm, Weight: ${weight}kg, Gender: ${gender}, Primary Goal: ${goal}. Structure the response with clear headings for Breakfast, Lunch, Dinner, and Snacks. Provide simple, healthy meal ideas (not complex recipes). Start with a short, motivational sentence. Keep the entire plan concise and easy to follow.`;
    const dietLoadingSpinner = document.getElementById('dietLoadingSpinner');
    const dietResultSection = document.getElementById('dietResultSection');
    const dietResult = document.getElementById('dietResult');

    dietLoadingSpinner.classList.remove('hidden');
    dietResultSection.classList.add('hidden');
    try {
        const result = await getAiApiResponse(prompt);
        const dietText = result.candidates[0].content.parts[0].text;
        dietResult.innerHTML = dietText.replace(/\*\*(.*?)\*\*/g, '<strong class="accent-text">$1</strong>').replace(/\n/g, '<br>');
    } catch (error) {
        console.error("AI Feature Error:", error);
        dietResult.textContent = "Sorry, the AI nutritionist is busy. Please make sure your server is running and try again.";
    } finally {
        dietLoadingSpinner.classList.add('hidden');
        dietResultSection.classList.remove('hidden');
    }
});

// --- Exercise Logic Handlers ---
function handleWarmup(poseLandmarks, handLandmarks) {
    if (!poseLandmarks && !handLandmarks) return;
    if (currentExerciseIndex >= warmupExercises.length) { if(appState !== 'SUCCESS') showWarmupSuccess(); return; }
    const currentExercise = warmupExercises[currentExerciseIndex];
    
    const isComplete = currentExercise.countdown ? repCounter <= 0 : repCounter >= currentExercise.reps_required;

    if (isComplete) {
        if (currentExerciseIndex < warmupExercises.length - 1) {
            currentExerciseIndex++;
            updateWarmupExercise();
        } else if (appState !== 'SUCCESS') {
            showWarmupSuccess();
        }
        return;
    }

    if (currentExercise.name === "FINGER SPREADS") {
        if (handLandmarks && handLandmarks.length > 0) {
            const lm = handLandmarks[0];
            if (lm[8].y < lm[6].y) stage = "open";
            if (lm[8].y > lm[6].y && stage === 'open') { stage = "closed"; repCounter++; speak(repCounter); }
        } else { feedback = "SHOW YOUR HAND"; }
    } else if (poseLandmarks) {
        const lm = poseLandmarks;
        
        if (currentExercise.name === "NECK TURNS (L/R)") {
            const shoulderMidX = (lm[11].x + lm[12].x) / 2;
            const turnThreshold = Math.hypot(lm[2].x - lm[5].x, lm[2].y - lm[5].y) * 0.5;
            const isTurnedRight = lm[0].x > shoulderMidX + turnThreshold;
            const isTurnedLeft = lm[0].x < shoulderMidX - turnThreshold;
            if (isTurnedRight && stage !== 'right') {
                if (stage === 'left') { 
                    repCounter--; 
                    speak(repCounter); 
                }
                stage = 'right';
            } else if (isTurnedLeft && stage !== 'left') {
                if (stage === 'right') { 
                    repCounter--;
                    speak(repCounter); 
                }
                stage = 'left';
            }
        } else if (currentExercise.name === "SMILE") {
            feedback = "NOW SMILE! 😄";
            const mouthWidth = Math.hypot(lm[9].x - lm[10].x, lm[9].y - lm[10].y);
            const eyeWidth = Math.hypot(lm[2].x - lm[5].x, lm[2].y - lm[5].y);
            if ((mouthWidth / eyeWidth) > 0.7) { repCounter = 1; stage = "smiling"; }
        }
    }
}

function handleExercise(landmarks) {
    if (!landmarks) return;
    const lm = landmarks;
    let up_angle, down_angle, up_stage, down_stage, exName;
    
    feedback = appState.replace(/_/g, " ");

    switch(appState) {
        case "BICEP_CURLS":
            [up_angle, down_angle, up_stage, down_stage, exName] = [40, 160, "up", "down", "BICEP CURLS"];
            const leftElbowAngle = calculateAngle(lm[11], lm[13], lm[15]);
            const rightElbowAngle = calculateAngle(lm[12], lm[14], lm[16]);
            const leftArmUp = leftElbowAngle < up_angle;
            const rightArmUp = rightElbowAngle < up_angle;
            const bothArmsDown = leftElbowAngle > down_angle && rightElbowAngle > down_angle;
            if (bothArmsDown) {
                stage = down_stage;
                feedback = "BICEP CURLS";
            }
            if ((leftArmUp || rightArmUp) && stage === down_stage) {
                stage = up_stage;
                repCounter++;
                workoutSummary[exName]++;
                speak(repCounter);
                motivate(repCounter);
                if (leftArmUp && !rightArmUp && rightElbowAngle > up_angle + 20) {
                    feedback = "LIFT RIGHT ARM HIGHER";
                } else if (!leftArmUp && rightArmUp && leftElbowAngle > up_angle + 20) {
                    feedback = "LIFT LEFT ARM HIGHER";
                }
            }
            break;
        case "PUSHUPS":
            [up_angle, down_angle, up_stage, down_stage, exName] = [90, 160, "down", "up", "PUSHUPS"];
             const leftPushupAngle = calculateAngle(lm[11], lm[13], lm[15]);
             const rightPushupAngle = calculateAngle(lm[12], lm[14], lm[16]);
            if (leftPushupAngle > down_angle && rightPushupAngle > down_angle) stage = down_stage;
            if (leftPushupAngle < up_angle && rightPushupAngle < up_angle && stage === down_stage) {
                stage = up_stage;
                repCounter++;
                workoutSummary[exName]++;
                speak(repCounter);
                motivate(repCounter);
            }
            break;
        case "SQUATS":
            exName = "SQUATS";
            const leftKneeAngle = calculateAngle(lm[23], lm[25], lm[27]);
            const rightKneeAngle = calculateAngle(lm[24], lm[26], lm[28]);
            if (leftKneeAngle > 160 && rightKneeAngle > 160) stage = "up";
            if (leftKneeAngle < 90 && rightKneeAngle < 90 && stage === 'up') {
                stage = "down";
                repCounter++;
                workoutSummary[exName]++;
                speak(repCounter);
                motivate(repCounter);
            }
            break;
        case "SHOULDER_PRESS":
            exName = "SHOULDER_PRESS";
            const leftElbowAnglePress = calculateAngle(lm[11], lm[13], lm[15]);
            const rightElbowAnglePress = calculateAngle(lm[12], lm[14], lm[16]);
            if (lm[15].y > lm[11].y && lm[16].y > lm[12].y && leftElbowAnglePress < 90 && rightElbowAnglePress < 90) {
                stage = "down";
            }
            if (leftElbowAnglePress > 160 && rightElbowAnglePress > 160 && stage === 'down') {
                stage = "up";
                repCounter++;
                workoutSummary[exName]++;
                speak(repCounter);
                motivate(repCounter);
            }
            break;
        case "PULLUPS":
            exName = "PULLUPS";
            if (lm[11] && lm[12] && lm[15] && lm[16]) {
                const shoulderMidY = (lm[11].y + lm[12].y) / 2;
                const wristMidY = (lm[15].y + lm[16].y) / 2;
                const shoulderWidth = Math.abs(lm[11].x - lm[12].x);
                if (shoulderMidY > wristMidY + shoulderWidth * 0.5) {
                    stage = "down";
                }
                if (shoulderMidY <= wristMidY && stage === 'down') {
                    stage = "up";
                    repCounter++;
                    workoutSummary[exName]++;
                    speak(repCounter);
                    motivate(repCounter);
                }
            } else {
                feedback = "SHOW HANDS & SHOULDERS";
            }
            break;
    }
}
