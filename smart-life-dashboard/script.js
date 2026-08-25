// --- CENTRAL APPLICATION STATE ---
let state = {
    theme: 'dark',
    notifications: true,
    budget: 1000,
    tasks: [],
    expenses: [],
    goals: [],
    habits: [],
    notes: [],
    pomodoro: { sessions: 0 }
};

// --- DATA ENGINE PERSISTENCE ---
function loadState() {
    const localData = localStorage.getItem('smart_life_state_v2');
    if (localData) {
        try {
            state = JSON.parse(localData);
        } catch(e) {
            saveState();
        }
    } else {
        saveState();
    }
}

function saveState() {
    localStorage.setItem('smart_life_state_v2', JSON.stringify(state));
    updateDashboardUI();
}

// --- APP CORE ORCHESTRATION ---
document.addEventListener("DOMContentLoaded", () => {
    loadState();
    initApplicationView();
    bindActionEventListeners();
    updateDashboardUI();
    setInterval(renderLiveDateTime, 1000);
    renderCanvasAnalytics();
});

function initApplicationView() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeBtnIcon = document.getElementById('theme-toggle-btn').querySelector('i');
    if(state.theme === 'light') {
        themeBtnIcon.className = "fa-solid fa-sun";
    }
    document.getElementById('budget-input').value = state.budget;
    document.getElementById('opt-noti').innerText = state.notifications ? "Disable" : "Enable";
    renderLiveDateTime();
    refreshTasksList();
    refreshExpensesList();
    refreshGoalsList();
    refreshHabitsList();
    refreshNotesGrid();
}

// --- LIVE CLOCK MODULE ---
function renderLiveDateTime() {
    const timeNode = document.getElementById('current-date-time');
    const msgNode = document.getElementById('greeting-msg');
    if (!timeNode) return;
    
    const now = new Date();
    timeNode.innerText = now.toLocaleString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });

    const hours = now.getHours();
    if (hours < 12) msgNode.innerText = "Good Morning!";
    else if (hours < 17) msgNode.innerText = "Good Afternoon!";
    else msgNode.innerText = "Good Evening!";
}

// --- VIEWS NAV & ATTACHMENTS ---
function bindActionEventListeners() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            
            const selectedBtn = e.currentTarget;
            selectedBtn.classList.add('active');
            document.getElementById(selectedBtn.dataset.target).classList.add('active');
            if(selectedBtn.dataset.target === 'dashboard-view') {
                renderCanvasAnalytics();
            }
        });
    });

    // Global Top Bar Switches
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        document.getElementById('theme-toggle-btn').querySelector('i').className = state.theme === 'dark' ? "fa-solid fa-moon" : "fa-solid fa-sun";
        saveState();
        renderCanvasAnalytics();
    });

    document.getElementById('noti-toggle-btn').addEventListener('click', () => {
        if(Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
        alert(`Notifications mode state active status is: ${state.notifications ? 'ON' : 'OFF'}`);
    });

    // Form Event Attachment Links
    document.getElementById('todo-form').addEventListener('submit', handleTaskSubmission);
    document.getElementById('todo-filter').addEventListener('change', refreshTasksList);
    document.getElementById('todo-search').addEventListener('input', refreshTasksList);
    document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmission);
    document.getElementById('budget-input').addEventListener('input', (e) => { state.budget = Number(e.target.value) || 0; saveState(); refreshExpensesList(); });
    document.getElementById('goal-form').addEventListener('submit', handleGoalSubmission);
    document.getElementById('habit-form').addEventListener('submit', handleHabitSubmission);
    document.getElementById('note-form').addEventListener('submit', handleNoteSubmission);
    document.getElementById('note-search').addEventListener('input', refreshNotesGrid);

    // Operational Settings Triggers
    document.getElementById('opt-noti').addEventListener('click', (e) => {
        state.notifications = !state.notifications;
        e.target.innerText = state.notifications ? "Disable" : "Enable";
        saveState();
        if(state.notifications && Notification.permission !== "granted") Notification.requestPermission();
    });
    document.getElementById('opt-clear').addEventListener('click', () => {
        if(confirm("Factory Reset: Are you sure you want to permanently format all board entries?")) { 
            localStorage.clear(); 
            location.reload(); 
        }
    });
    document.getElementById('opt-export').addEventListener('click', downloadStateBackupFile);
    document.getElementById('opt-import').addEventListener('change', uploadStateBackupFile);

    initializePomodoroTimerLogic();
}

// --- SYSTEM REMINDER ENGINE ---
function pushSystemNotification(title, message) {
    if (state.notifications && Notification.permission === "granted") {
        new Notification(title, { body: message });
    }
}
// --- TO DO OPERATIONS ---
function handleTaskSubmission(e) {
    e.preventDefault();
    const taskItem = {
        id: Date.now(),
        title: document.getElementById('todo-input').value.trim(),
        priority: document.getElementById('todo-priority').value,
        date: document.getElementById('todo-date').value,
        completed: false
    };
    state.tasks.push(taskItem);
    saveState();
    refreshTasksList();
    document.getElementById('todo-form').reset();
    pushSystemNotification("Task Assigned", `"${taskItem.title}" has been successfully added to records.`);
}

// --- TASKS SYNC MANAGER ---
function refreshTasksList() {
    const filterOption = document.getElementById('todo-filter').value;
    const query = document.getElementById('todo-search').value.toLowerCase();
    const listUI = document.getElementById('todo-list');
    if (!listUI) return;
    listUI.innerHTML = '';

    state.tasks.filter(t => {
        const checkQuery = t.title.toLowerCase().includes(query);
        if (filterOption === 'completed') return t.completed && checkQuery;
        if (filterOption === 'pending') return !t.completed && checkQuery;
        return checkQuery;
    }).forEach(t => {
        const item = document.createElement('li');
        item.className = `list-item ${t.completed ? 'completed' : ''}`;
        item.innerHTML = `
            <div><strong>[${t.priority}]</strong> ${t.title} <br><small style="color:var(--text-muted);"><i class="fa-solid fa-calendar-days"></i> Due: ${t.date}</small></div>
            <div class="item-actions">
                <button onclick="commitToggleTask(${t.id})" class="btn-primary"><i class="fa-solid fa-check"></i></button>
                <button onclick="commitDeleteTask(${t.id})" class="btn-danger"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        listUI.appendChild(item);
    });
}
window.commitToggleTask = (id) => { state.tasks.forEach(t => { if(t.id === id) t.completed = !t.completed; }); saveState(); refreshTasksList(); };
window.commitDeleteTask = (id) => { state.tasks = state.tasks.filter(t => t.id !== id); saveState(); refreshTasksList(); };

// --- EXPENSE MANAGEMENT METRICS ---
function handleExpenseSubmission(e) {
    e.preventDefault();
    const expenseItem = {
        id: Date.now(),
        title: document.getElementById('exp-title').value.trim(),
        amount: Math.abs(Number(document.getElementById('exp-amount').value)) || 0,
        category: document.getElementById('exp-category').value,
        date: document.getElementById('exp-date').value
    };
    state.expenses.push(expenseItem);
    saveState();
    refreshExpensesList();
    document.getElementById('expense-form').reset();
    
    const totalOutflow = state.expenses.reduce((s, curr) => s + curr.amount, 0);
    if(totalOutflow > state.budget) {
        pushSystemNotification("Budget Alert!", "Your overall logged wallet expenses have exceeded your customized target allocation!");
    }
}

function refreshExpensesList() {
    const container = document.getElementById('expense-list');
    if (!container) return;
    container.innerHTML = '';
    let accumulatedSum = 0;

    state.expenses.forEach(exp => {
        accumulatedSum += exp.amount;
        const entry = document.createElement('li');
        entry.className = 'list-item';
        entry.innerHTML = `
            <div><strong>${exp.category}</strong>: ${exp.title} <br><small style="color:var(--text-muted);">$${exp.amount.toFixed(2)} | ${exp.date}</small></div>
            <button onclick="commitDeleteExpense(${exp.id})" class="btn-danger"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(entry);
    });

    document.getElementById('total-spent-val').innerText = `$${accumulatedSum.toFixed(2)}`;
    document.getElementById('remaining-budget-val').innerText = `$${(state.budget - accumulatedSum).toFixed(2)}`;
}
window.commitDeleteExpense = (id) => { state.expenses = state.expenses.filter(e => e.id !== id); saveState(); refreshExpensesList(); };

// --- GOALS AND HABIT SYSTEMS ---
function handleGoalSubmission(e) {
    e.preventDefault();
    state.goals.push({
        id: Date.now(),
        title: document.getElementById('goal-title').value.trim(),
        target: Math.max(1, Number(document.getElementById('goal-target').value)),
        current: 0
    });
    saveState(); refreshGoalsList(); document.getElementById('goal-form').reset();
}
function refreshGoalsList() {
    const root = document.getElementById('goals-list'); if (!root) return; root.innerHTML = '';
    state.goals.forEach(g => {
        const calculatedPercentage = Math.min(100, Math.round((g.current / g.target) * 100));
        const component = document.createElement('li'); component.className = 'list-item';
        component.innerHTML = `
            <div style="flex:1;"><strong>${g.title}</strong><div style="font-size:12px; color:var(--text-muted);">Progress: ${g.current}/${g.target} (${calculatedPercentage}%)</div></div>
            <div class="item-actions">
                <button onclick="incrementGoalCounter(${g.id})" class="btn-primary">+</button>
                <button onclick="commitDeleteGoal(${g.id})" class="btn-danger"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        root.appendChild(component);
    });
}
window.incrementGoalCounter = (id) => { state.goals.forEach(g => { if(g.id === id && g.current < g.target) g.current++; }); saveState(); refreshGoalsList(); };
window.commitDeleteGoal = (id) => { state.goals = state.goals.filter(g => g.id !== id); saveState(); refreshGoalsList(); };

function handleHabitSubmission(e) {
    e.preventDefault();
    state.habits.push({
        id: Date.now(),
        title: document.getElementById('habit-title').value.trim(),
        streak: 0,
        completedToday: false
    });
    saveState(); refreshHabitsList(); document.getElementById('habit-form').reset();
}
function refreshHabitsList() {
    const uiNode = document.getElementById('habits-list'); if (!uiNode) return; uiNode.innerHTML = '';
    state.habits.forEach(h => {
        const item = document.createElement('li'); item.className = `list-item ${h.completedToday ? 'completed' : ''}`;
        item.innerHTML = `
            <div><strong>${h.title}</strong> <br><small style="color:var(--text-muted);">Streak Counter: ${h.streak} Days 🔥</small></div>
            <div class="item-actions">
                <button onclick="commitToggleHabit(${h.id})" class="btn-primary"><i class="fa-solid fa-fire"></i> Done</button>
                <button onclick="commitDeleteHabit(${h.id})" class="btn-danger"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        uiNode.appendChild(item);
    });
}
window.commitToggleHabit = (id) => { 
    state.habits.forEach(h => { 
        if(h.id === id) { 
            h.completedToday = !h.completedToday; 
            h.streak = h.completedToday ? h.streak + 1 : Math.max(0, h.streak - 1); 
        } 
    }); 
    saveState(); refreshHabitsList(); 
};
window.commitDeleteHabit = (id) => { state.habits = state.habits.filter(h => h.id !== id); saveState(); refreshHabitsList(); };
// --- POMODORO AUTOMATION LOOP ---
let runtimeIntervalRef = null, remainingSessionSeconds = 1500, timerExecutionActive = false, workingSessionMode = 'Focus';
function initializePomodoroTimerLogic() {
    const viewDisplay = document.getElementById('timer-display');
    const structuralStatus = document.getElementById('timer-status');
    if(!viewDisplay) return;

    document.getElementById('timer-start').addEventListener('click', () => {
        if(timerExecutionActive) return; 
        timerExecutionActive = true;
        structuralStatus.innerText = workingSessionMode === 'Focus' ? "Concentration Cycle Running" : "Rest Period Running";
        
        runtimeIntervalRef = setInterval(() => {
            if(remainingSessionSeconds <= 0) {
                clearInterval(runtimeIntervalRef); 
                timerExecutionActive = false;
                if(workingSessionMode === 'Focus') {
                    state.pomodoro.sessions++; 
                    workingSessionMode = 'Break'; 
                    remainingSessionSeconds = 300; 
                    viewDisplay.innerText = "05:00";
                    pushSystemNotification("Focus Session Finished", "Outstanding work! Take a 5 minute break.");
                } else {
                    workingSessionMode = 'Focus'; 
                    remainingSessionSeconds = 1500; 
                    viewDisplay.innerText = "25:00";
                    pushSystemNotification("Break Ended", "Rest cycle completed. Time to focus again.");
                }
                saveState(); 
                document.getElementById('completed-sessions').innerText = state.pomodoro.sessions;
                initializePomodoroTimerLogic();
            } else {
                remainingSessionSeconds--;
                let allocationMinutes = Math.floor(remainingSessionSeconds / 60), allocationSeconds = remainingSessionSeconds % 60;
                viewDisplay.innerText = `${allocationMinutes.toString().padStart(2,'0')}:${allocationSeconds.toString().padStart(2,'0')}`;
            }
        }, 1000);
    });

    document.getElementById('timer-pause').addEventListener('click', () => { 
        clearInterval(runtimeIntervalRef); 
        timerExecutionActive = false; 
        structuralStatus.innerText = "Session Paused";
    });
    
    document.getElementById('timer-reset').addEventListener('click', () => { 
        clearInterval(runtimeIntervalRef); 
        timerExecutionActive = false; 
        workingSessionMode = 'Focus'; 
        remainingSessionSeconds = 1500; 
        viewDisplay.innerText = "25:00"; 
        structuralStatus.innerText = "Ready to Focus"; 
    });
}

// --- NOTES MANAGER INFRASTRUCTURE ---
function handleNoteSubmission(e) {
    e.preventDefault();
    state.notes.push({
        id: Date.now(),
        title: document.getElementById('note-title').value.trim(),
        content: document.getElementById('note-content').value.trim(),
        pinned: false
    });
    saveState(); refreshNotesGrid(); document.getElementById('note-form').reset();
}
function refreshNotesGrid() {
    const gridNode = document.getElementById('notes-grid'); if(!gridNode) return; gridNode.innerHTML = '';
    const searchString = document.getElementById('note-search').value.toLowerCase();
    
    state.notes.filter(n => n.title.toLowerCase().includes(searchString) || n.content.toLowerCase().includes(searchString))
               .sort((x, y) => y.pinned - x.pinned).forEach(note => {
        const itemBlock = document.createElement('div'); 
        itemBlock.className = `note-item ${note.pinned ? 'pinned' : ''}`;
        itemBlock.innerHTML = `
            <i class="fa-solid fa-thumbtack note-pin-btn ${note.pinned ? 'active' : ''}" onclick="commitToggleNotePin(${note.id})"></i>
            <h4>${note.title}</h4>
            <p style="font-size:13px; color:var(--text-muted); margin-top:8px; word-wrap: break-word;">${note.content}</p>
            <button onclick="commitDeleteNote(${note.id})" class="btn-danger" style="padding:4px 8px; font-size:11px; margin-top:14px; border-radius:4px;"><i class="fa-solid fa-trash"></i></button>
        `;
        gridNode.appendChild(itemBlock);
    });
}
window.commitToggleNotePin = (id) => { state.notes.forEach(n => { if(n.id === id) n.pinned = !n.pinned; }); saveState(); refreshNotesGrid(); };
window.commitDeleteNote = (id) => { state.notes = state.notes.filter(n => n.id !== id); saveState(); refreshNotesGrid(); };

// --- METRIC AGGREGATION HANDLERS ---
function updateDashboardUI() {
    const finishedCount = state.tasks.filter(t => t.completed).length;
    const universalCount = state.tasks.length;
    document.getElementById('stat-tasks').innerText = `${finishedCount}/${universalCount}`;

    const structuralOutflow = state.expenses.reduce((s, c) => s + c.amount, 0);
    document.getElementById('stat-expenses').innerText = `$${(state.budget - structuralOutflow).toFixed(2)}`;

    const optimalStreakValue = state.habits.reduce((high, h) => h.streak > high ? h.streak : high, 0);
    document.getElementById('stat-streak').innerText = `${optimalStreakValue} Days 🔥`;

    const operationalProductivityRatio = universalCount > 0 ? Math.round((finishedCount / universalCount) * 100) : 0;
    document.getElementById('stat-productivity').innerText = `${operationalProductivityRatio}%`;
    document.getElementById('completed-sessions').innerText = state.pomodoro.sessions || 0;
}

// --- PURE CANVAS ANALYTICS ENGINES ---
function renderCanvasAnalytics() {
    const canvas1 = document.getElementById('productivityChart');
    const canvas2 = document.getElementById('expenseChart');
    if(!canvas1 || !canvas2) return;

    // 1. Productivity Canvas Rendering (Bar Chart)
    const ctx1 = canvas1.getContext('2d');
    ctx1.clearRect(0, 0, 400, 220);
    ctx1.fillStyle = state.theme === 'dark' ? '#1e293b' : '#f1f5f9';
    ctx1.fillRect(0, 0, 400, 220);
    
    const doneVal = state.tasks.filter(t => t.completed).length;
    const activeVal = state.tasks.length - doneVal;
    
    ctx1.fillStyle = '#6366f1';
    ctx1.fillRect(60, 160, 80, -Math.max(15, doneVal * 25));
    ctx1.fillStyle = '#f59e0b';
    ctx1.fillRect(240, 160, 80, -Math.max(15, activeVal * 25));
    
    ctx1.fillStyle = state.theme === 'dark' ? '#ffffff' : '#0f172a';
    ctx1.font = "bold 13px Inter";
    ctx1.fillText(`Completed (${doneVal})`, 55, 185);
    ctx1.fillText(`Pending (${activeVal})`, 240, 185);

    // 2. Expense Category Analytics Rendering (Pie Chart)
    const ctx2 = canvas2.getContext('2d');
    ctx2.clearRect(0, 0, 400, 220);
    ctx2.fillStyle = state.theme === 'dark' ? '#1e293b' : '#f1f5f9';
    ctx2.fillRect(0, 0, 400, 220);
    
    const categoriesList = ['Food', 'Transport', 'Bills', 'Shopping', 'Education', 'Other'];
    const distributionColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#64748b'];
    const calculationTotal = state.expenses.reduce((s, curr) => s + curr.amount, 0);
    
    if(calculationTotal === 0) {
        ctx2.fillStyle = '#94a3b8'; ctx2.beginPath(); ctx2.arc(200, 105, 55, 0, 2 * Math.PI); ctx2.fill();
        ctx2.fillStyle = state.theme === 'dark' ? '#fff' : '#000'; ctx2.font = "13px Inter"; ctx2.fillText("No Active Cost Entry Logs Found", 105, 190);
        return;
    }

    let dynamicInitialAngle = 0;
    categoriesList.forEach((category, idx) => {
        const sectorAggregate = state.expenses.filter(e => e.category === category).reduce((s,c) => s+c.amount, 0);
        if(sectorAggregate > 0) {
            const explicitSliceAngle = (sectorAggregate / calculationTotal) * 2 * Math.PI;
            ctx2.fillStyle = distributionColors[idx];
            ctx2.beginPath(); ctx2.moveTo(200, 100);
            ctx2.arc(200, 100, 55, dynamicInitialAngle, dynamicInitialAngle + explicitSliceAngle);
            ctx2.closePath(); ctx2.fill();
            dynamicInitialAngle += explicitSliceAngle;
        }
    });
}

// --- ADMINISTRATIVE DATA SYSTEM DATA IO ---
function downloadStateBackupFile() {
    const cleanOutputBlob = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const structuralAnchorElement = document.createElement('a');
    structuralAnchorElement.setAttribute("href", cleanOutputBlob);
    structuralAnchorElement.setAttribute("download", "smartlife_enterprise_backup.json");
    document.body.appendChild(structuralAnchorElement); 
    structuralAnchorElement.click(); 
    structuralAnchorElement.remove();
}

function uploadStateBackupFile(e) {
    const fileReaderInstance = new FileReader();
    if(!e.target.files.length) return;
    fileReaderInstance.onload = function(event) {
        try {
            const parsedObject = JSON.parse(event.target.result);
            if(parsedObject.tasks && parsedObject.expenses) {
                state = parsedObject; 
                saveState(); 
                location.reload();
            } else {
                alert("Import Error: Structure mismatch on incoming backup file mapping definitions!");
            }
        } catch(err) { 
            alert("Fatal Exception: Invalid formatting signature discovered on input target stream."); 
        }
    };
    fileReaderInstance.readAsText(e.target.files);
}
