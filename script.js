class CaffeineSource {
    constructor(name, amountMg) {
        this.name = name;
        this.amountMg = amountMg;
    }
}

class CaffeineConsumption {
    constructor(source, quantity, consumptionTime) {
        this.source = source;
        this.quantity = quantity;
        this.consumptionTime = consumptionTime;
    }

    getTotalCaffeine() {
        return this.source.amountMg * this.quantity;
    }
}

class CaffeineCalculator {
    constructor(consumptions) {
        this.consumptions = consumptions;
        this.halfLifeHours = 5;
    }

    calculateCaffeineAtTime(targetTime) {
        let totalCaffeine = 0;

        for (const consumption of this.consumptions) {
            const hoursPassed = (targetTime - consumption.consumptionTime) / (1000 * 60 * 60);

            if (hoursPassed >= 0) {
                const initialCaffeine = consumption.getTotalCaffeine();
                const remainingCaffeine = initialCaffeine * Math.pow(0.5, hoursPassed / this.halfLifeHours);
                totalCaffeine += remainingCaffeine;
            }
        }

        return totalCaffeine;
    }

    generateTimeSeriesData(startTime, endTime, intervalMinutes = 15) {
        const data = [];
        const labels = [];

        let currentTime = new Date(startTime);
        const end = new Date(endTime);

        while (currentTime <= end) {
            const caffeineLevel = this.calculateCaffeineAtTime(currentTime);

            const hours = currentTime.getHours().toString().padStart(2, '0');
            const minutes = currentTime.getMinutes().toString().padStart(2, '0');

            labels.push(`${hours}:${minutes}`);
            data.push(caffeineLevel);

            currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
        }

        return {
            labels,
            data
        };
    }
}

let caffeineSources = {};
let consumptions = [];
let chart = null;
let userSettings = {
    gender: 'male',
    weight: 70,
    age: 30,
    height: 170,
    wakeTime: '07:00',
    sleepTime: '23:00'
};

let personas = {};

const today = new Date();
today.setHours(0, 0, 0, 0);

async function loadPersonas() {
    try {
        const response = await fetch('data/personas.json');
        personas = await response.json();
    } catch (error) {
        console.error('Error loading personas:', error);
    }
}

function loadPersona() {
    const personaKey = document.getElementById('personaSelect').value;
    const customSettings = document.getElementById('customSettings');

    if (personaKey === 'custom') {
        customSettings.style.display = 'block';
    } else {
        customSettings.style.display = 'none';

        const persona = personas[personaKey];
        if (persona) {
            userSettings = {
                ...persona
            };

            document.getElementById('gender').value = persona.gender;
            document.getElementById('weight').value = persona.weight;
            document.getElementById('age').value = persona.age;
            document.getElementById('height').value = persona.height;
            document.getElementById('wakeTime').value = persona.wakeTime;
            document.getElementById('sleepTime').value = persona.sleepTime;

            updateSettings();
        }
    }
}

function calculatePersonalizedLimits(weight, age, gender) {
    let maxDailyMg = weight * 6;

    if (gender === 'female') {
        maxDailyMg = maxDailyMg * 0.9;
    }

    if (age >= 65) {
        maxDailyMg = maxDailyMg * 0.85;
    }

    maxDailyMg = Math.min(maxDailyMg, 400);

    const sleepImpactMg = 100;

    return {
        maxDaily: maxDailyMg,
        sleepImpact: sleepImpactMg
    };
}

async function loadCaffeineSources() {
    try {
        const response = await fetch('data/caffeine-sources.json');
        const sources = await response.json();

        sources.forEach(source => {
            caffeineSources[source.id] = new CaffeineSource(source.name, source.caffeineMg);
        });

        populateSourceDropdown(sources);

        const sampleIds = ['espresso-single', 'filter-coffee-medium'];
        const validSamples = sampleIds.filter(id => caffeineSources[id]);

        if (validSamples.length >= 2) {
            consumptions = [
                new CaffeineConsumption(caffeineSources[validSamples[0]], 1, new Date(today.getTime() + 8 * 60 * 60 * 1000)),
                new CaffeineConsumption(caffeineSources[validSamples[1]], 1, new Date(today.getTime() + 10.5 * 60 * 60 * 1000)),
            ];
        } else {
            consumptions = [];
        }

        updateConsumptionList();
        updateChart();
    } catch (error) {
        console.error('Error loading caffeine sources:', error);
        alert('Could not load caffeine sources. Please ensure caffeine-sources.json is in the same directory.');
    }
}

function populateSourceDropdown(sources) {
    const sourceSelect = document.getElementById('sourceSelect');
    sourceSelect.innerHTML = '';

    const categories = {};
    sources.forEach(source => {
        if (!categories[source.category]) {
            categories[source.category] = [];
        }
        categories[source.category].push(source);
    });

    Object.keys(categories).sort().forEach(category => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;

        categories[category].forEach(source => {
            const option = document.createElement('option');
            option.value = source.id;
            option.textContent = `${source.name} (${source.caffeineMg}mg)`;
            optgroup.appendChild(option);
        });

        sourceSelect.appendChild(optgroup);
    });
}

function populateTimeDropdown(selectId, includeAllDay = false) {
    const timeSelect = document.getElementById(selectId);
    timeSelect.innerHTML = '';

    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const hourStr = hour.toString().padStart(2, '0');
            const minuteStr = minute.toString().padStart(2, '0');
            const timeValue = `${hourStr}:${minuteStr}`;

            const option = document.createElement('option');
            option.value = timeValue;
            option.textContent = timeValue;

            timeSelect.appendChild(option);
        }
    }
}

function initializeTimeInput() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const roundedMinute = Math.round(currentMinute / 15) * 15;
    const adjustedHour = roundedMinute === 60 ? currentHour + 1 : currentHour;
    const finalMinute = roundedMinute === 60 ? 0 : roundedMinute;

    const currentTimeStr = `${adjustedHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`;

    updateTimeDropdownOptions();

    const timeSelect = document.getElementById('time');
    const options = Array.from(timeSelect.options);
    const currentOption = options.find(opt => opt.value === currentTimeStr);
    if (currentOption) {
        currentOption.selected = true;
    }
}

function updateTimeDropdownOptions() {
    const timeSelect = document.getElementById('time');
    timeSelect.innerHTML = '';

    const [wakeHour, wakeMinute] = userSettings.wakeTime.split(':').map(Number);
    const [sleepHour, sleepMinute] = userSettings.sleepTime.split(':').map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMinute;
    const sleepMinutes = sleepHour * 60 + sleepMinute;

    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const totalMinutes = hour * 60 + minute;

            let inRange = false;
            if (sleepMinutes > wakeMinutes) {
                inRange = totalMinutes >= wakeMinutes && totalMinutes < sleepMinutes;
            } else {
                inRange = totalMinutes >= wakeMinutes || totalMinutes < sleepMinutes;
            }

            if (inRange) {
                const hourStr = hour.toString().padStart(2, '0');
                const minuteStr = minute.toString().padStart(2, '0');
                const timeValue = `${hourStr}:${minuteStr}`;

                const option = document.createElement('option');
                option.value = timeValue;
                option.textContent = timeValue;

                timeSelect.appendChild(option);
            }
        }
    }
}

function updateSettings() {
    userSettings.gender = document.getElementById('gender').value;
    userSettings.weight = parseFloat(document.getElementById('weight').value);
    userSettings.age = parseFloat(document.getElementById('age').value);
    userSettings.height = parseFloat(document.getElementById('height').value);
    userSettings.wakeTime = document.getElementById('wakeTime').value;
    userSettings.sleepTime = document.getElementById('sleepTime').value;

    updateTimeDropdownOptions();
    updateChart();

    const limits = calculatePersonalizedLimits(userSettings.weight, userSettings.age, userSettings.gender);
    document.getElementById('criticalLevelText').textContent = `${Math.round(limits.maxDaily)}mg`;
}

function addConsumption() {
    const sourceKey = document.getElementById('sourceSelect').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    const timeString = document.getElementById('time').value;

    if (!timeString) {
        alert('Please select a time');
        return;
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    const consumptionTime = new Date(today.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);

    const source = caffeineSources[sourceKey];
    const consumption = new CaffeineConsumption(source, quantity, consumptionTime);

    consumptions.push(consumption);
    consumptions.sort((a, b) => a.consumptionTime - b.consumptionTime);

    updateConsumptionList();
    updateChart();
}

function removeConsumption(index) {
    consumptions.splice(index, 1);
    updateConsumptionList();
    updateChart();
}

function updateConsumptionList() {
    const listContainer = document.getElementById('consumptionList');
    listContainer.innerHTML = '<h2>Today\'s Consumptions</h2>';

    if (consumptions.length === 0) {
        listContainer.innerHTML += '<p style="color: #999;">No consumptions added yet.</p>';
        return;
    }

    consumptions.forEach((consumption, index) => {
        const hours = consumption.consumptionTime.getHours().toString().padStart(2, '0');
        const minutes = consumption.consumptionTime.getMinutes().toString().padStart(2, '0');
        const totalCaffeine = consumption.getTotalCaffeine();

        const item = document.createElement('div');
        item.className = 'consumption-item';
        item.innerHTML = `
                    <span>
                        <strong>${consumption.source.name}</strong> 
                        (${totalCaffeine.toFixed(0)}mg) 
                        × ${consumption.quantity} 
                        at ${hours}:${minutes}
                    </span>
                    <button onclick="removeConsumption(${index})">Remove</button>
                `;
        listContainer.appendChild(item);
    });
}

function updateChart() {
    const calculator = new CaffeineCalculator(consumptions);

    const [wakeHour, wakeMinute] = userSettings.wakeTime.split(':').map(Number);
    const [sleepHour, sleepMinute] = userSettings.sleepTime.split(':').map(Number);

    const startTime = new Date(today.getTime() + wakeHour * 60 * 60 * 1000 + wakeMinute * 60 * 1000);
    const endTime = new Date(today.getTime() + sleepHour * 60 * 60 * 1000 + sleepMinute * 60 * 1000);

    const timeSeriesData = calculator.generateTimeSeriesData(startTime, endTime, 15);

    const limits = calculatePersonalizedLimits(userSettings.weight, userSettings.age, userSettings.gender);
    const sleepLevel = Array(timeSeriesData.labels.length).fill(limits.sleepImpact);
    const criticalLevel = Array(timeSeriesData.labels.length).fill(limits.maxDaily);

    const sleepTimeMinus4Hours = new Date(endTime.getTime() - 4 * 60 * 60 * 1000);
    const cutoffHour = sleepTimeMinus4Hours.getHours().toString().padStart(2, '0');
    const cutoffMinute = sleepTimeMinus4Hours.getMinutes().toString().padStart(2, '0');
    const cutoffTimeLabel = `${cutoffHour}:${cutoffMinute}`;

    if (chart) {
        chart.data.labels = timeSeriesData.labels;
        chart.data.datasets[0].data = timeSeriesData.data;
        chart.data.datasets[1].data = sleepLevel;
        chart.data.datasets[2].data = criticalLevel;

        chart.options.plugins.annotation.annotations.sleepCutoff.xMin = cutoffTimeLabel;
        chart.options.plugins.annotation.annotations.sleepCutoff.xMax = cutoffTimeLabel;
        chart.options.plugins.annotation.annotations.sleepCutoff.label.content = `Sleep in 4h (${cutoffTimeLabel})`;

        chart.update();
    } else {
        const ctx = document.getElementById('caffeineChart').getContext('2d');

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeSeriesData.labels,
                datasets: [{
                        label: 'Caffeine Level',
                        data: timeSeriesData.data,
                        borderColor: 'rgb(139, 69, 19)',
                        backgroundColor: 'rgba(139, 69, 19, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0,
                        borderWidth: 3,
                        order: 1
                    },
                    {
                        label: 'Sleep Impact Level',
                        data: sleepLevel,
                        borderColor: 'rgb(255, 193, 7)',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false,
                        order: 2
                    },
                    {
                        label: 'Health Critical Level',
                        data: criticalLevel,
                        borderColor: 'rgb(244, 67, 54)',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false,
                        order: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return `Caffeine: ${context.parsed.y.toFixed(1)} mg`;
                                }
                                return context.dataset.label;
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            sleepCutoff: {
                                type: 'line',
                                xMin: cutoffTimeLabel,
                                xMax: cutoffTimeLabel,
                                borderColor: 'rgb(156, 39, 176)',
                                borderWidth: 2,
                                borderDash: [10, 5],
                                label: {
                                    display: true,
                                    content: `Sleep in 4h (${cutoffTimeLabel})`,
                                    position: 'start',
                                    backgroundColor: 'rgba(156, 39, 176, 0.8)',
                                    color: 'white',
                                    font: {
                                        size: 11,
                                        weight: 'bold'
                                    },
                                    padding: 4
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time of Day'
                        },
                        ticks: {
                            maxTicksLimit: 20,
                            autoSkip: true
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Caffeine Level (mg)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(0) + ' mg';
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
}

populateTimeDropdown('wakeTime', true);
populateTimeDropdown('sleepTime', true);

document.getElementById('wakeTime').value = '07:00';
document.getElementById('sleepTime').value = '23:00';

function toggleAccordion(accordionId) {
    const content = document.getElementById(accordionId);
    const icon = document.getElementById(accordionId + 'Icon');

    content.classList.toggle('open');
    icon.classList.toggle('open');
}

loadPersonas();
loadCaffeineSources().then(() => {
    initializeTimeInput();
    const limits = calculatePersonalizedLimits(userSettings.weight, userSettings.age, userSettings.gender);
    document.getElementById('criticalLevelText').textContent = `${Math.round(limits.maxDaily)}mg`;
});