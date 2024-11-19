const piggyBanksContainer = document.getElementById('piggy-banks-container');
const addPiggyBankForm = document.getElementById('add-piggy-bank');
const piggyBankNameInput = addPiggyBankForm.querySelector('#piggy-bank-name');
const piggyBankGoalInput = addPiggyBankForm.querySelector('#piggy-bank-goal');
const piggyBankStartInput = addPiggyBankForm.querySelector('#piggy-bank-start');
const piggyBankGoalDateInput = addPiggyBankForm.querySelector('#piggy-bank-goal-date');
const piggyBankImageInput = addPiggyBankForm.querySelector('#piggy-bank-image');
const piggyBankImagePreview = addPiggyBankForm.querySelector('#piggy-bank-image-preview');
const piggyBankDescriptionInput = addPiggyBankForm.querySelector('#piggy-bank-description');
const piggyBankIdInput = addPiggyBankForm.querySelector('#piggy-bank-id');
const savePiggyBankBtn = addPiggyBankForm.querySelector('#save-piggy-bank');
const cancelPiggyBankBtn = addPiggyBankForm.querySelector('#cancel-piggy-bank');
const themeSwitchCheckbox = document.getElementById('theme-switch-checkbox');
const nameFilterInput = document.getElementById('name-filter');
const goalFilterSelect = document.getElementById('goal-filter');
const applyFiltersBtn = document.getElementById('apply-filters');
const totalAmountEl = document.getElementById('total-amount');
const averageAmountEl = document.getElementById('average-amount');
const piggyBankCountEl = document.getElementById('piggy-bank-count');
const goalReachedCountEl = document.getElementById('goal-reached-count');
const avgDailyTransactionsEl = document.getElementById('avg-daily-transactions');
const leaderboardList = document.getElementById('leaderboard-list');
const distributionChartCanvas = document.getElementById('distributionChart');
const updateChartsButton = document.getElementById('update-charts');
const loadingIndicator = updateChartsButton.querySelector('.loading-indicator');

// Данные
let piggyBanks = [];
let transactionsCharts = {};

const achievements = {
    'Золотая свинья': 10000,
    'Серебряная свинья': 5000,
    'Бронзовая свинья': 2500,
};

// Генерация UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Создание копилки
function createPiggyBank(name, goal, start, image, description, id, goalDate) {
    const goalNum = parseFloat(goal);
    const startNum = parseFloat(start);

    // Исправленная проверка ввода:
    if (!name.trim() || isNaN(goalNum) || isNaN(startNum) || goalNum <= 0 || startNum < 0) {
        console.error('Некорректный ввод. Убедитесь, что все поля заполнены корректными значениями.');
        return;
    }

    const newPiggyBank = {
        name,
        goal: goalNum,
        current: startNum,
        image,
        description,
        id: id || generateUUID(),
        points: 0,
        transactions: [],
        goalDate: goalDate ? new Date(goalDate) : null
    };
    if (id) {
        piggyBanks = piggyBanks.map(p => p.id === id ? newPiggyBank : p);
    } else {
        piggyBanks.push(newPiggyBank);
    }
    renderPiggyBanks();
    clearForm();
    savePiggyBanks();
}

// Отрисовка копилок
function renderPiggyBanks(filteredBanks = piggyBanks) {
    piggyBanksContainer.innerHTML = '';

    filteredBanks.forEach(piggyBank => {
        const piggyBankEl = createPiggyBankElement(piggyBank);
        piggyBanksContainer.appendChild(piggyBankEl);

        // Добавляем обработчики событий только один раз для каждой копилки
        attachPiggyBankListeners(piggyBankEl, piggyBank);

        // Создаем/обновляем график истории транзакций
        createTransactionsChart(piggyBank);
    });

    updateStatistics(filteredBanks);
    updateLeaderboard();
    createDistributionChart(filteredBanks);
}

function attachPiggyBankListeners(piggyBankEl, piggyBank) {
    if (!piggyBankEl.dataset.hasEventListeners) {
        addTransactionListeners(piggyBankEl, piggyBank);
        addEditDeleteListeners(piggyBankEl, piggyBank);
        piggyBankEl.dataset.hasEventListeners = true;
    }
}

// Создание элемента копилки
function createPiggyBankElement(piggyBank) {
    const piggyBankEl = document.createElement('div');
    piggyBankEl.classList.add('piggy-bank');
    piggyBankEl.dataset.id = piggyBank.id;
    piggyBankEl.innerHTML = `
            <h3>${piggyBank.name}</h3>
            ${piggyBank.image ? `<img class="piggy-bank-image" src="${piggyBank.image}" alt="${piggyBank.name}">` : ''}
            <div class="progress-bar">
                <div class="progress-bar-fill"></div>
                <div class="progress-text"></div>
            </div>
            <p>Текущий баланс: <span class="current-balance">${piggyBank.current}</span>₽</p>
            <p>Цель: ${piggyBank.goal}₽</p>
            <p class="description">${piggyBank.description || ''}</p>
            <div class="actions-container">
                <button class="edit-button">Редактировать</button>
                <button class="delete-button">Удалить</button>
            </div>
            <div class="add-amount-container">
                <input type="number" class="add-amount" placeholder="Добавить">
                <button class="add-button">+</button>
                <input type="number" class="subtract-amount" placeholder="Убавить">
                <button class="subtract-button">-</button>
            </div>
            <div class="transactions-container">
                <h3>История транзакций:</h3>
                <ul class="transactions-list">
                    ${piggyBank.transactions.map(transaction => `
                        <li class="transaction ${transaction.type === 'add' ? 'add' : 'subtract'}">
                            <span class="transaction-date">${transaction.date.toLocaleDateString()}</span>
                            <span class="transaction-amount">${transaction.amount}₽</span>
                            <span class="transaction-type">${transaction.type === 'add' ? 'Пополнение' : 'Снятие'}</span>
                        </li>
                    `).join('')}
                </ul>
                <div class="chart-container">
                    <canvas data-id="${piggyBank.id}" class="transactions-chart"></canvas>
                </div>
            </div>
        `;

    // Добавляем скролл, если транзакций больше 6
    const transactionsList = piggyBankEl.querySelector('.transactions-list');
    if (piggyBank.transactions.length > 6) {
        transactionsList.classList.add('scrollable');
    }

    return piggyBankEl;
}

// Обработчики событий для добавления/вычитания
function addTransactionListeners(piggyBankEl, piggyBank) {
    const addButton = piggyBankEl.querySelector('.add-button');
    const addAmountInput = piggyBankEl.querySelector('.add-amount');
    const subtractButton = piggyBankEl.querySelector('.subtract-button');
    const subtractAmountInput = piggyBankEl.querySelector('.subtract-amount');
    const currentBalanceSpan = piggyBankEl.querySelector('.current-balance');

    addButton.addEventListener('click', () => handleTransaction(piggyBank, addAmountInput, currentBalanceSpan, 'add'));
    subtractButton.addEventListener('click', () => handleTransaction(piggyBank, subtractAmountInput, currentBalanceSpan, 'subtract'));
}

// Обработчик транзакции
function handleTransaction(bank, amountInput, balanceSpan, type) {
    const amount = parseFloat(amountInput.value);
    if (!isNaN(amount) && amount > 0) {
        bank.current += (type === 'add' ? amount : -amount);
        bank.points += (type === 'add' ? amount : -amount);
        bank.transactions.push({ amount, date: new Date(), type });
        amountInput.value = '';
        balanceSpan.textContent = bank.current;
        updateProgressBar(bank);
        updateStatistics(piggyBanks);
        updateLeaderboard();
        savePiggyBanks();

        // Обновляем список транзакций
        const transactionsList = document.querySelector(`.piggy-bank[data-id="${bank.id}"] .transactions-list`);
        transactionsList.innerHTML = bank.transactions.map(transaction => `
                <li class="transaction ${transaction.type === 'add' ? 'add' : 'subtract'}">
                    <span class="transaction-date">${transaction.date.toLocaleDateString()}</span>
                    <span class="transaction-amount">${transaction.amount}₽</span>
                    <span class="transaction-type">${transaction.type === 'add' ? 'Пополнение' : 'Снятие'}</span>
                </li>
            `).join('');

        // Добавляем скролл, если транзакций больше 6
        if (bank.transactions.length > 6) {
            transactionsList.classList.add('scrollable');
        } else {
            transactionsList.classList.remove('scrollable');
        }

        // Перерисовываем график после добавления транзакции
        createTransactionsChart(bank);
    } else {
        alert('Введите корректное число.');
    }
}

// Обработчики событий для редактирования/удаления
function addEditDeleteListeners(piggyBankEl, piggyBank) {
    const editButton = piggyBankEl.querySelector('.edit-button');
    const deleteButton = piggyBankEl.querySelector('.delete-button');

    editButton.addEventListener('click', () => populateForm(piggyBank));
    deleteButton.addEventListener('click', () => {
        if (confirm("Вы уверены, что хотите удалить копилку?")) {
            // Фильтруем массив копилок и обновляем глобальную переменную
            piggyBanks = piggyBanks.filter(p => p.id !== piggyBank.id);

            // Сохраняем обновленный массив копилок в localStorage
            savePiggyBanks();

            // Обновляем отображение копилок
            renderPiggyBanks();
        }
    });
}

// Обновление progress bar
function updateProgressBar(piggyBank) {
    const piggyBankEl = document.querySelector(`.piggy-bank[data-id="${piggyBank.id}"]`);
    const progressBarFill = piggyBankEl.querySelector('.progress-bar-fill');
    const progressText = piggyBankEl.querySelector('.progress-text');
    const progressWidth = ((piggyBank.current / piggyBank.goal) * 100).toFixed(2);
    progressBarFill.style.width = `${progressWidth}%`;
    progressText.textContent = `${progressWidth}%`;
    updateGoalClass(piggyBankEl, piggyBank);
}

// Обновление класса цели
function updateGoalClass(piggyBankEl, piggyBank) {
    piggyBankEl.classList.remove('over-goal', 'double-over-goal', 'triple-over-goal', 'quadruple-over-goal');
    if (piggyBank.current > piggyBank.goal) {
        piggyBankEl.classList.add('over-goal');
        if (piggyBank.current > piggyBank.goal * 2) {
            piggyBankEl.classList.add('double-over-goal');
        }
        if (piggyBank.current > piggyBank.goal * 3) {
            piggyBankEl.classList.add('triple-over-goal');
        }
        if (piggyBank.current > piggyBank.goal * 4) {
            piggyBankEl.classList.add('quadruple-over-goal');
        }
    }
}

// Заполнение формы
function populateForm(piggyBank) {
    piggyBankNameInput.value = piggyBank.name;
    piggyBankGoalInput.value = piggyBank.goal;
    piggyBankStartInput.value = piggyBank.current;
    piggyBankDescriptionInput.value = piggyBank.description;
    piggyBankIdInput.value = piggyBank.id;
    piggyBankGoalDateInput.value = piggyBank.goalDate ? piggyBank.goalDate.toISOString().slice(0, 10) : '';
    piggyBankImagePreview.src = piggyBank.image;
    piggyBankImagePreview.style.display = 'block';

    savePiggyBankBtn.textContent = 'Сохранить';
    cancelPiggyBankBtn.style.display = 'block';
}

// Очистка формы
function clearForm() {
    piggyBankNameInput.value = '';
    piggyBankGoalInput.value = '';
    piggyBankStartInput.value = '';
    piggyBankDescriptionInput.value = '';
    piggyBankIdInput.value = '';
    piggyBankImagePreview.src = '#';
    piggyBankImagePreview.style.display = 'none';
    savePiggyBankBtn.textContent = 'Создать';
    cancelPiggyBankBtn.style.display = 'none';
}

// Обработчик изменения изображения
piggyBankImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            piggyBankImagePreview.src = e.target.result;
            piggyBankImagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        piggyBankImagePreview.src = '#';
        piggyBankImagePreview.style.display = 'none';
    }
});

// Валидация формы
function validateForm() {
    let isValid = true;
    const name = piggyBankNameInput.value.trim();
    const goal = parseFloat(piggyBankGoalInput.value);
    const start = parseFloat(piggyBankStartInput.value);

    const nameFormGroup = piggyBankNameInput.closest('.form-group');
    const goalFormGroup = piggyBankGoalInput.closest('.form-group');
    const startFormGroup = piggyBankStartInput.closest('.form-group');

    if (!name) {
        piggyBankNameInput.setCustomValidity('Поле обязательно для заполнения');
        nameFormGroup.classList.add('error');
        isValid = false;
    } else {
        piggyBankNameInput.setCustomValidity('');
        nameFormGroup.classList.remove('error');
    }

    if (isNaN(goal) || goal <= 0) {
        piggyBankGoalInput.setCustomValidity('Должно быть числом больше 0');
        goalFormGroup.classList.add('error');
        isValid = false;
    } else {
        piggyBankGoalInput.setCustomValidity('');
        goalFormGroup.classList.remove('error');
    }

    if (isNaN(start) || start < 0) {
        piggyBankStartInput.setCustomValidity('Должно быть числом больше или равно 0');
        startFormGroup.classList.add('error');
        isValid = false;
    } else {
        piggyBankStartInput.setCustomValidity('');
        startFormGroup.classList.remove('error');
    }

    return isValid;
}

// Сохранение копилки
savePiggyBankBtn.addEventListener('click', () => {
    if (validateForm()) {
        const name = piggyBankNameInput.value;
        const goal = parseFloat(piggyBankGoalInput.value);
        const start = parseFloat(piggyBankStartInput.value);
        const image = piggyBankImagePreview.src !== '#' ? piggyBankImagePreview.src : null;
        const description = piggyBankDescriptionInput.value;
        const id = piggyBankIdInput.value;
        const goalDate = piggyBankGoalDateInput.value;
        createPiggyBank(name, goal, start, image, description, id, goalDate);
    }
});

// Отмена создания копилки
cancelPiggyBankBtn.addEventListener('click', clearForm);

// Переключение темы
themeSwitchCheckbox.addEventListener('change', (event) => {
    document.body.classList.toggle('dark', event.target.checked);
    document.querySelector('.theme-switch label').classList.toggle('dark', event.target.checked);
    document.getElementById('add-piggy-bank').classList.toggle('dark', event.target.checked);
    document.getElementById('statistics').classList.toggle('dark', event.target.checked);
    document.getElementById('leaderboard').classList.toggle('dark', event.target.checked);
    document.getElementById('piggy-banks-container').classList.toggle('dark', event.target.checked);
});

// Применение фильтров
applyFiltersBtn.addEventListener('click', () => {
    const nameFilter = nameFilterInput.value.toLowerCase();
    const goalFilter = goalFilterSelect.value;

    const filteredPiggyBanks = piggyBanks.filter(piggyBank => {
        const nameMatch = nameFilter === '' || piggyBank.name.toLowerCase().includes(nameFilter);
        const goalMatch = goalFilter === '' ||
            (goalFilter === 'less' && piggyBank.current < piggyBank.goal) ||
            (goalFilter === 'more' && piggyBank.current > piggyBank.goal);
        return nameMatch && goalMatch;
    });
    renderPiggyBanks(filteredPiggyBanks);
});

// Обновление статистики
function updateStatistics(piggyBanksToDisplay) {
    if (piggyBanksToDisplay.length === 0) {
        totalAmountEl.textContent = '0';
        averageAmountEl.textContent = '0';
        piggyBankCountEl.textContent = '0';
        goalReachedCountEl.textContent = '0';
        avgDailyTransactionsEl.textContent = '0';
        return;
    }

    const totalAmount = piggyBanksToDisplay.reduce((sum, piggyBank) => sum + piggyBank.current, 0);
    const averageAmount = totalAmount / piggyBanksToDisplay.length || 0;
    const piggyBankCount = piggyBanksToDisplay.length;
    const goalReachedCount = piggyBanksToDisplay.filter(piggyBank => piggyBank.current >= piggyBank.goal).length;

    let totalTransactions = 0;
    let totalAddedAmount = 0;
    piggyBanksToDisplay.forEach(bank => {
        totalTransactions += bank.transactions.length;
        bank.transactions.forEach(transaction => {
            if (transaction.type === 'add') {
                totalAddedAmount += transaction.amount;
            }
        });
    });
    const avgDaily = totalTransactions / piggyBanksToDisplay.length || 0;
    const averageAddAmount = totalAddedAmount / totalTransactions || 0;

    totalAmountEl.textContent = totalAmount.toFixed(2);
    averageAmountEl.textContent = averageAddAmount.toFixed(2);
    piggyBankCountEl.textContent = piggyBankCount;
    goalReachedCountEl.textContent = goalReachedCount;
    avgDailyTransactionsEl.textContent = avgDaily.toFixed(2);
}

// Обновление таблицы лидеров
function updateLeaderboard() {
    const sortedPiggyBanks = piggyBanks.sort((a, b) => b.points - a.points);
    leaderboardList.innerHTML = '';

    sortedPiggyBanks.forEach((piggyBank, index) => {
        const listItem = document.createElement('li');
        const achievementsHTML = Object.entries(achievements)
            .map(([achievementName, achievementGoal]) => {
                const progress = Math.min(100, (piggyBank.points / achievementGoal) * 100);
                return `
                    <div class="achievement" data-achievement="${achievementName}" data-goal="${achievementGoal}">
                        ${progress === 100 ? `<img src="images/${achievementName.toLowerCase().replace(' ', '-')}.png" alt="${achievementName}">` : ''}
                        <div class="achievement-progress" style="width: ${progress}%;">${progress === 100 ? '' : `До ${achievementName} осталось ${achievementGoal - piggyBank.points}`}</div>
                    </div>
                `;
            })
            .join('');
        listItem.innerHTML = `
            <span>${index + 1}. </span>
            <span>${piggyBank.name}</span> - 
            <span>${piggyBank.current.toFixed(2)}</span>
            <div class="achievements">${achievementsHTML}</div>
        `;
        leaderboardList.appendChild(listItem);
    });
    addAchievementListeners();
}

function addAchievementListeners() {
    leaderboardList.querySelectorAll('.achievement').forEach(achievement => {
        achievement.addEventListener('click', () => {
            const achievementName = achievement.dataset.achievement;
            const achievementGoal = parseFloat(achievement.dataset.goal);
            alert(`Награда: ${achievementName}\nЦель: ${achievementGoal}`);
        });
    });
}

// Загрузка копилок из localStorage
function loadPiggyBanks() {
    const storedPiggyBanks = localStorage.getItem('piggyBanks');
    if (storedPiggyBanks) {
        piggyBanks = JSON.parse(storedPiggyBanks).map(bank => ({
            ...bank,
            transactions: bank.transactions.map(t => ({
                amount: t.amount,
                date: new Date(t.date),
                type: t.type
            })),
            goalDate: bank.goalDate ? new Date(bank.goalDate) : null
        }));
        if (piggyBanks.length > 0) {
            createProgressChart(piggyBanks[0]);
            createDistributionChart(piggyBanks);
        }
    }
}

// Сохранение копилок в localStorage
function savePiggyBanks() {
    localStorage.setItem('piggyBanks', JSON.stringify(piggyBanks));
}

// Линейный график
function createProgressChart(piggyBank) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    const data = {
        labels: piggyBank.transactions.map(transaction => transaction.date.toLocaleDateString()),
        datasets: [{
            label: piggyBank.name,
            data: piggyBank.transactions.map(transaction => piggyBank.current - transaction.amount),
            borderColor: '#3e95cd',
            backgroundColor: 'rgba(53, 149, 205, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#3e95cd',
            pointHoverRadius: 8,
            pointHoverBackgroundColor: 'white',
            pointHitRadius: 10
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Прогресс копилки: ${piggyBank.name}`,
                    font: {
                        size: 16,
                        family: 'Arial',
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value}₽`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Дата',
                        font: {
                            size: 14,
                            family: 'Arial'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Сумма (₽)',
                        font: {
                            size: 14,
                            family: 'Arial'
                        }
                    }
                }
            }
        }
    };

    new Chart(ctx, config);
}

// Круговая диаграмма
let distributionChart;
let distributionChartLoading = false; // Флаг загрузки графика

function createDistributionChart(piggyBanks) {
    const ctx = distributionChartCanvas.getContext('2d');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.classList.add('chart-loading');
    loadingIndicator.textContent = 'Обновление...';

    // Очистить холст, если нет копилок
    if (piggyBanks.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (distributionChart) {
            distributionChart.destroy(); // Удаляем старый график, если он есть
            distributionChart = null;
        }
        return;
    }

    // Показать индикатор загрузки
    if (!distributionChartLoading) {
        distributionChartLoading = true;
        ctx.canvas.parentNode.appendChild(loadingIndicator);
    }

    const data = {
        labels: piggyBanks.map(piggyBank => piggyBank.name),
        datasets: [{
            label: 'Средства',
            data: piggyBanks.map(piggyBank => piggyBank.current),
            backgroundColor: generateColors(piggyBanks.length),
            hoverOffset: 4,
            cutout: '70%'
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500, //  Анимация обновления
                easing: 'easeInOutCubic'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 14,
                            family: 'Arial'
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Распределение средств',
                    font: {
                        size: 16,
                        family: 'Arial',
                        weight: 'bold'
                    }
                }
            },
            cutout: '70%'
        }
    };

    // Обновление графика, если он уже существует
    if (distributionChart) {
        distributionChart.data.datasets[0].data = data.datasets[0].data;
        distributionChart.data.datasets[0].backgroundColor = generateColors(piggyBanks.length);
        distributionChart.update();
    } else {
        // Создание нового графика
        distributionChart = new Chart(ctx, config);
    }

    // Скрыть индикатор загрузки после обновления
    setTimeout(() => {
        loadingIndicator.remove();
        distributionChartLoading = false;
    }, 600);
}

// Линейный график истории транзакций
function createTransactionsChart(piggyBank) {
    const canvasId = `transactions-chart-${piggyBank.id}`; // Unique ID for each canvas
    const canvas = document.querySelector(`canvas[data-id="${piggyBank.id}"]`);
    if (!canvas) return;

    // Destroy existing chart if it exists
    if (transactionsCharts[piggyBank.id]) {
        transactionsCharts[piggyBank.id].destroy();
    }

    const ctx = canvas.getContext('2d');
    const data = {
        labels: piggyBank.transactions.map(transaction => transaction.date.toLocaleDateString()),
        datasets: [{
            label: piggyBank.name,
            data: piggyBank.transactions.map(transaction => transaction.amount),
            borderColor: '#3e95cd',
            backgroundColor: 'rgba(53, 149, 205, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#3e95cd',
            pointHoverRadius: 8,
            pointHoverBackgroundColor: 'white',
            pointHitRadius: 10
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `История транзакций: ${piggyBank.name}`,
                    font: {
                        size: 16,
                        family: 'Arial',
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value}₽`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Дата',
                        font: {
                            size: 14,
                            family: 'Arial'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Сумма (₽)',
                        font: {
                            size: 14,
                            family: 'Arial'
                        }
                    }
                }
            }
        }
    };

    transactionsCharts[piggyBank.id] = new Chart(ctx, config);
}

// Расчет необходимых пополнений
function calculateRequiredAmount(piggyBank) {
    if (!piggyBank.goalDate) {
        return 0; // Нет даты цели
    }

    const today = new Date();
    const daysLeft = Math.ceil((piggyBank.goalDate - today) / (1000 * 60 * 60 * 24));
    const amountLeft = piggyBank.goal - piggyBank.current;

    if (daysLeft <= 0) {
        return 0; // Дата цели уже прошла
    }

    return Math.ceil(amountLeft / daysLeft);
}

// Обновление графиков
function updateCharts() {
    if (!distributionChart || piggyBanks.length === 0) {
        alert('Невозможно обновить графики. Проверьте, что данные загружены и копилки созданы.');
        return; // Прерываем выполнение функции, если нет данных или график не создан
    }

    loadingIndicator.style.display = 'inline'; // Показываем индикатор загрузки

    distributionChart.data.datasets[0].data = piggyBanks.map(bank => bank.current);
    distributionChart.update();

    setTimeout(() => {
        loadingIndicator.style.display = 'none'; // Скрываем индикатор загрузки
    }, 600); // Задержка, чтобы анимация завершилась
}

// Генератор цветов
function generateColors(numColors) {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        colors.push(`hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`);
    }
    return colors;
}

// Загрузка данных и отрисовка
document.addEventListener('DOMContentLoaded', () => {
    loadPiggyBanks();
    renderPiggyBanks();
    createDistributionChart(piggyBanks);
});

// Обработчики событий для копилок
piggyBanksContainer.addEventListener('click', (event) => {
    const piggyBankEl = event.target.closest('.piggy-bank');
    if (!piggyBankEl) return;

    event.stopPropagation();

    const piggyBankId = piggyBankEl.dataset.id;
    const piggyBank = piggyBanks.find(bank => bank.id === piggyBankId);

    // Добавляем обработчики только один раз для каждой копилки
    attachPiggyBankListeners(piggyBankEl, piggyBank);
});

// Добавление обработчиков событий только один раз
function addTransactionListeners(piggyBankEl, piggyBank) {
    const addButton = piggyBankEl.querySelector('.add-button');
    const addAmountInput = piggyBankEl.querySelector('.add-amount');
    const subtractButton = piggyBankEl.querySelector('.subtract-button');
    const subtractAmountInput = piggyBankEl.querySelector('.subtract-amount');
    const currentBalanceSpan = piggyBankEl.querySelector('.current-balance');

    addButton.addEventListener('click', () => handleTransaction(piggyBank, addAmountInput, currentBalanceSpan, 'add'));
    subtractButton.addEventListener('click', () => handleTransaction(piggyBank, subtractAmountInput, currentBalanceSpan, 'subtract'));
}

function addEditDeleteListeners(piggyBankEl, piggyBank) {
    const editButton = piggyBankEl.querySelector('.edit-button');
    const deleteButton = piggyBankEl.querySelector('.delete-button');

    editButton.addEventListener('click', () => populateForm(piggyBank));
    deleteButton.addEventListener('click', () => {
        if (confirm("Вы уверены, что хотите удалить копилку?")) {
            piggyBanks = piggyBanks.filter(p => p.id !== piggyBank.id);
            savePiggyBanks();
            renderPiggyBanks();
        }
    });
}

// Сохранение копилки
savePiggyBankBtn.addEventListener('click', () => {
    if (validateForm()) {
        const name = piggyBankNameInput.value;
        const goal = parseFloat(piggyBankGoalInput.value);
        const start = parseFloat(piggyBankStartInput.value);
        const image = piggyBankImagePreview.src !== '#' ? piggyBankImagePreview.src : null;
        const description = piggyBankDescriptionInput.value;
        const id = piggyBankIdInput.value;
        const goalDate = piggyBankGoalDateInput.value;
        createPiggyBank(name, goal, start, image, description, id, goalDate);
    }
});

updateChartsButton.addEventListener('click', updateCharts);