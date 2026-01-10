// ChineseClass System - Main Application
// รวมทุกไฟล์ JavaScript เป็นไฟล์เดียวเพื่อหลีกเลี่ยงปัญหา ES6 modules

// ================ UTILITY FUNCTIONS ================
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getThaiDateISO() {
    const now = new Date();
    // Convert to Thailand time (UTC+7)
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    const year = thaiTime.getUTCFullYear();
    const month = String(thaiTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(thaiTime.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

function formatThaiDate(dateString) {
    if (!dateString) return "-";
    
    try {
        let date;
        
        if (dateString.includes('T') || dateString.includes('Z')) {
            // ISO format
            date = new Date(dateString);
        } else if (dateString.includes('-')) {
            // YYYY-MM-DD format
            const [year, month, day] = dateString.split('-');
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
            return dateString;
        }
        
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        const thaiYear = date.getFullYear() + 543;
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        
        return `${thaiYear}/${monthStr}/${dayStr}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

function calGrade(score) {
    const numericScore = Number(score);
    
    if (isNaN(numericScore)) return 0;
    if (numericScore >= 80) return 4;
    if (numericScore >= 75) return 3.5;
    if (numericScore >= 70) return 3;
    if (numericScore >= 65) return 2.5;
    if (numericScore >= 60) return 2;
    if (numericScore >= 55) return 1.5;
    if (numericScore >= 50) return 1;
    return 0;
}

function calculateScores(studentId, tasks, scores) {
    // Initialize chapter data for 6 chapters
    let chapterData = Array(6).fill().map(() => ({ earned: 0, max: 0 }));
    let midtermScore = 0;
    let finalScore = 0;
    let specialScore = 0;
    
    if (!tasks || !scores) {
        return {
            chapScores: Array(6).fill(0),
            midterm: 0,
            final: 0,
            total: 0
        };
    }
    
    tasks.forEach(task => {
        if (!task) return;
        
        const scoreRecord = scores.find(s => s.studentId == studentId && s.taskId == task.id);
        const earnedScore = scoreRecord ? Number(scoreRecord.score) : 0;
        const maxScore = Number(task.maxScore) || 0;
        
        if (task.category === 'accum') {
            // Accumulated scores for chapters
            const chapters = task.chapter ? task.chapter.toString().split(',') : [];
            
            if (chapters.length > 0 && maxScore > 0) {
                const scorePerChapter = earnedScore / chapters.length;
                const maxPerChapter = maxScore / chapters.length;
                
                chapters.forEach(chapter => {
                    const chapterIndex = parseInt(chapter) - 1;
                    if (chapterIndex >= 0 && chapterIndex < 6) {
                        chapterData[chapterIndex].earned += scorePerChapter;
                        chapterData[chapterIndex].max += maxPerChapter;
                    }
                });
            }
        } else if (task.category === 'midterm') {
            midtermScore += earnedScore;
        } else if (task.category === 'final') {
            finalScore += earnedScore;
        } else if (task.category === 'special') {
            specialScore += earnedScore;
        }
    });
    
    // Calculate chapter scores (out of 10)
    const chapterScores = chapterData.map(chapter => {
        if (chapter.max > 0) {
            const score = (chapter.earned / chapter.max) * 10;
            return parseFloat(score.toFixed(1));
        }
        return 0;
    });
    
    // Calculate total score
    const chapterTotal = chapterScores.reduce((sum, score) => sum + score, 0);
    const totalScore = chapterTotal + midtermScore + finalScore + specialScore;
    
    return {
        chapScores: chapterScores,
        midterm: midtermScore,
        final: finalScore,
        total: parseFloat(totalScore.toFixed(1))
    };
}

// ================ API FUNCTIONS ================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQNjMSE06u5xO4dtyipa5P-YzoaicppubdwlUgMpaX4L4TUjk3-xY2PRnzhS42AxZe/exec";

async function fetchData() {
    try {
        console.log('Fetching data from:', GOOGLE_SCRIPT_URL);
        
        // Add cache busting parameter
        const url = `${GOOGLE_SCRIPT_URL}?action=getData&t=${new Date().getTime()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            console.error('Network response not ok:', response.status, response.statusText);
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data fetched successfully');
        return data;
        
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

async function sendData(payload) {
    try {
        console.log('Sending data:', payload.action);
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            console.error('Send response not ok:', response.status, response.statusText);
            throw new Error(`Send response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Send successful:', data);
        return data;
        
    } catch (error) {
        console.error('Send Error:', error);
        throw error;
    }
}

// ================ UI FUNCTIONS ================
function showToast(message, type = 'success') {
    if (typeof Swal === 'undefined') {
        console.log(`${type}: ${message}`);
        return;
    }
    
    const Toast = Swal.mixin({
        toast: true, 
        position: 'bottom', 
        showConfirmButton: false, 
        timer: 3000,
        background: type === 'error' ? '#7f1d1d' : (type === 'warning' ? '#78350f' : '#064e3b'), 
        color: '#fff'
    });
    
    Toast.fire({ 
        icon: type, 
        title: message 
    });
}

function showLoading(show = true) {
    const loader = document.getElementById('global-loader');
    if(loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function renderDropdown(id, list, placeholder = "-- เลือก --") {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element #${id} not found`);
        return;
    }
    
    const currentValue = element.value;
    element.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
    
    if (!list || !Array.isArray(list)) {
        console.warn(`Invalid list for dropdown #${id}:`, list);
        return;
    }
    
    list.forEach(item => {
        const option = document.createElement('option');
        option.value = escapeHtml(item.id);
        option.textContent = escapeHtml(item.name || item.title || '');
        element.appendChild(option);
    });
    
    // Restore previous value if it exists in new list
    if(currentValue && list.some(item => String(item.id) === String(currentValue))) {
        element.value = currentValue;
    }
}

function renderAdminMaterials(materials, subjects) {
    const container = document.getElementById('admin-mat-list');
    if(!container) return;
    
    container.innerHTML = '';
    
    if(!materials || materials.length === 0) {
        container.innerHTML = '<div class="text-center text-white/50 py-10">ไม่มีเนื้อหา</div>';
        return;
    }
    
    materials.forEach(material => {
        const subject = subjects.find(s => s.id == material.subjectId);
        const subjectName = subject ? subject.name : '-';
        
        container.innerHTML += `
            <div class="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center hover:bg-white/10 transition-all">
                <div class="flex-1">
                    <div class="text-xs text-yellow-400 mb-1">${escapeHtml(subjectName)}</div>
                    <div class="font-bold text-sm text-white mb-1">
                        ${escapeHtml(material.title)}
                    </div>
                    <a href="${escapeHtml(material.link)}" target="_blank" class="text-blue-300 text-xs hover:underline truncate block">
                        ${escapeHtml(material.link)}
                    </a>
                </div>
                <button onclick="app.deleteMaterial('${material.id}')" class="text-red-400 hover:text-red-300 ml-2 p-2 rounded-full hover:bg-red-400/10 transition-all">
                    <i class="fa-solid fa-trash text-sm"></i>
                </button>
            </div>`;
    });
}

function renderScheduleList(schedules, classes) {
    const container = document.getElementById('schedule-list');
    if(!container) return;
    
    container.innerHTML = '';
    
    if(!schedules || schedules.length === 0) {
        container.innerHTML = '<div class="text-center text-white/50 py-4">ไม่มีตารางสอน</div>';
        return;
    }
    
    const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
    
    // Sort by day and period
    schedules.sort((a,b) => (a.day - b.day) || (a.period - b.period)).forEach(schedule => {
        const className = classes.find(cls => cls.id == schedule.classId)?.name || '?';
        
        container.innerHTML += `
            <div class="flex justify-between items-center text-xs text-white/70 bg-white/5 p-2 rounded border border-white/5 mb-1 hover:bg-white/10 transition-all">
                <div class="flex items-center gap-2">
                    <span class="text-yellow-400">${days[schedule.day]} คาบ ${schedule.period}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-white font-bold">${escapeHtml(className)}</span>
                    <button onclick="app.deleteSchedule('${schedule.id}')" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-all">
                        <i class="fa-solid fa-times text-xs"></i>
                    </button>
                </div>
            </div>`;
    });
}

// ================ MAIN APPLICATION ================
const app = {
    // Global variables
    dataState: { 
        subjects: [], 
        classes: [], 
        students: [], 
        tasks: [], 
        scores: [], 
        attendance: [], 
        materials: [], 
        submissions: [], 
        returns: [], 
        schedules: [] 
    },
    scoreMode: 'manual',
    attMode: null,
    pendingScore: null,
    smartClassId: null,
    
    PERIODS: [
        { p: 1, start: "08:30", end: "09:20" }, { p: 2, start: "09:20", end: "10:10" },
        { p: 3, start: "10:10", end: "11:00" }, { p: 4, start: "11:00", end: "11:50" },
        { p: 5, start: "11:50", end: "12:40" }, { p: 6, start: "12:40", end: "13:30" },
        { p: 7, start: "13:30", end: "14:20" }, { p: 8, start: "14:20", end: "15:10" }
    ],
    
    // Initialize application
    init() {
        console.log('Initializing ChineseClass app...');
        
        this.initEventListeners();
        this.loadLocalData();
        
        // Set current date in attendance input
        if (document.getElementById('att-date-input')) {
            document.getElementById('att-date-input').value = getThaiDateISO();
        }
        
        // Check if admin is logged in
        const savedSession = localStorage.getItem('wany_admin_session');
        if (savedSession) {
            this.showAdminPanel(true);
        } else {
            this.switchMainTab('student');
            this.appSync();
        }
        
        // Initialize score buttons
        this.renderScoreButtons();
        
        // Check smart schedule every minute
        setInterval(() => this.checkSmartSchedule(), 60000);
        
        console.log('App initialized successfully');
        
        // Make app globally available
        window.app = this;
    },
    
    // Sync data with server
    async appSync() {
        try {
            console.log('Syncing data with server...');
            const json = await fetchData();
            if (json) {
                this.dataState = json;
                if(!this.dataState.schedules) this.dataState.schedules = [];
                this.saveLocalData();
                this.refreshUI();
                showToast("ข้อมูลอัพเดทแล้ว", "success");
            }
        } catch (e) {
            console.warn('Sync failed, using local data:', e);
            showToast("โหมด Offline (ใช้ข้อมูลในเครื่อง)", "warning");
        }
    },
    
    // Save data locally
    saveLocalData() { 
        localStorage.setItem('wany_data_backup', JSON.stringify({ 
            timestamp: Date.now(), 
            data: this.dataState 
        })); 
    },
    
    // Load data from local storage
    loadLocalData() {
        const backup = localStorage.getItem('wany_data_backup');
        if (backup) { 
            const parsed = JSON.parse(backup); 
            this.dataState = parsed.data; 
            console.log('Loaded local data from backup');
        }
    },
    
    // Show admin panel
    showAdminPanel(auto = false) {
        document.getElementById('admin-login-wrapper').classList.add('hidden');
        document.getElementById('admin-content-wrapper').classList.remove('hidden');
        this.refreshUI();
        if (!auto) this.appSync();
    },
    
    // Refresh all UI components
    refreshUI() {
        console.log('Refreshing UI...');
        
        // Render dropdowns
        renderDropdown('class-subject-ref', this.dataState.subjects);
        renderDropdown('student-class', this.dataState.classes);
        renderDropdown('scan-class-select', this.dataState.classes);
        renderDropdown('task-subject-filter', this.dataState.subjects);
        renderDropdown('report-class', this.dataState.classes);
        renderDropdown('att-class-select', this.dataState.classes);
        renderDropdown('mat-subject', this.dataState.subjects);
        renderDropdown('sch-class', this.dataState.classes);
        
        // Render schedule and check smart schedule
        renderScheduleList(this.dataState.schedules || [], this.dataState.classes);
        this.checkSmartSchedule();
        
        // Update inbox badge
        this.updateInboxBadge();
        
        console.log('UI refreshed');
    },
    
    // Handle saving data (optimistic update)
    async handleSave(payload) {
        console.log('Saving data:', payload.action);
        
        // Optimistic local update
        this.updateLocalState(payload);
        this.refreshUI();
        
        try {
            // Send to server
            const result = await sendData(payload);
            console.log('Save successful:', result);
        } catch(e) {
            console.error('Save failed:', e);
            showToast("บันทึกไม่สำเร็จ (รอ Sync)", "error");
        }
    },
    
    // Update local state based on action
    updateLocalState(p) {
        switch(p.action) {
            case 'addSubject':
                if(!this.dataState.subjects.some(s => s.id === p.id)) {
                    this.dataState.subjects.push({id: p.id, name: p.name});
                }
                break;
                
            case 'addClass':
                if(!this.dataState.classes.some(c => c.id === p.id)) {
                    this.dataState.classes.push({id: p.id, name: p.name, subjectId: p.subjectId});
                }
                break;
                
            case 'addStudent':
                if(!this.dataState.students.some(s => s.id === p.id)) {
                    this.dataState.students.push({
                        id: p.id, 
                        classId: p.classId, 
                        no: p.no, 
                        code: p.code, 
                        name: p.name
                    });
                }
                break;
                
            case 'addTask':
                p.classIds.forEach((cid, idx) => {
                    const chapStr = Array.isArray(p.chapter) ? p.chapter.join(',') : p.chapter;
                    const taskId = p.id + '-' + idx;
                    if(!this.dataState.tasks.some(t => t.id === taskId)) {
                        this.dataState.tasks.push({
                            id: taskId, 
                            classId: cid, 
                            subjectId: p.subjectId, 
                            category: p.category, 
                            chapter: chapStr, 
                            name: p.name, 
                            maxScore: p.maxScore, 
                            dueDateISO: p.dueDateISO
                        });
                    }
                });
                break;
                
            case 'addScore':
                const scoreIndex = this.dataState.scores.findIndex(s => s.studentId == p.studentId && s.taskId == p.taskId);
                if(scoreIndex >= 0) {
                    this.dataState.scores[scoreIndex].score = p.score;
                } else {
                    this.dataState.scores.push({
                        studentId: p.studentId, 
                        taskId: p.taskId, 
                        score: p.score
                    });
                }
                this.updateInboxBadge();
                break;
                
            case 'addAttendance':
                const attIndex = this.dataState.attendance.findIndex(a => a.studentId == p.studentId && a.date == p.date);
                if(attIndex >= 0) {
                    this.dataState.attendance[attIndex].status = p.status;
                } else {
                    this.dataState.attendance.push({
                        studentId: p.studentId, 
                        classId: p.classId, 
                        date: p.date, 
                        status: p.status
                    });
                }
                break;
                
            case 'submitTask':
                p.studentIds.forEach(sid => {
                    const subIndex = this.dataState.submissions.findIndex(s => s.studentId == sid && s.taskId == p.taskId);
                    if(subIndex >= 0) { 
                        this.dataState.submissions[subIndex].link = p.link; 
                        this.dataState.submissions[subIndex].timestampISO = new Date().toISOString();
                        this.dataState.submissions[subIndex].comment = p.comment;
                    } else {
                        this.dataState.submissions.push({
                            taskId: p.taskId, 
                            studentId: sid, 
                            link: p.link, 
                            timestampISO: new Date().toISOString(), 
                            comment: p.comment
                        });
                    }
                });
                this.updateInboxBadge();
                break;
                
            case 'addSchedule':
                if(!this.dataState.schedules.some(s => s.id === p.id)) {
                    this.dataState.schedules.push({
                        id: p.id, 
                        day: p.day, 
                        period: p.period, 
                        classId: p.classId
                    });
                }
                break;
                
            case 'addMaterial':
                if(!this.dataState.materials.some(m => m.id === p.id)) {
                    this.dataState.materials.push({
                        id: p.id, 
                        subjectId: p.subjectId, 
                        title: p.title, 
                        link: p.link
                    });
                }
                break;
        }
        
        // Save to local storage
        this.saveLocalData();
    },
    
    // Initialize all event listeners
    initEventListeners() {
        console.log('Initializing event listeners...');
        
        // Tab buttons
        document.getElementById('tab-btn-admin').addEventListener('click', () => this.switchMainTab('admin'));
        document.getElementById('tab-btn-student').addEventListener('click', () => this.switchMainTab('student'));
        
        // Admin logout
        document.getElementById('btn-admin-logout').addEventListener('click', () => this.handleAdminLogout());
        
        // Admin menu buttons
        document.getElementById('menu-basic').addEventListener('click', () => this.switchAdminSubTab('basic'));
        document.getElementById('menu-scan').addEventListener('click', () => this.switchAdminSubTab('scan'));
        document.getElementById('menu-report').addEventListener('click', () => this.switchAdminSubTab('report'));
        document.getElementById('menu-homework').addEventListener('click', () => this.switchAdminSubTab('homework'));
        document.getElementById('menu-attendance').addEventListener('click', () => this.switchAdminSubTab('attendance'));
        document.getElementById('menu-material').addEventListener('click', () => this.switchAdminSubTab('material'));
        
        // Admin login form
        document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            showLoading(true);
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            
            try {
                const res = await sendData({ action: 'login', username: username, password: password });
                showLoading(false);
                if (res.status === 'success') {
                    localStorage.setItem('wany_admin_session', res.token);
                    this.showAdminPanel();
                    showToast("เข้าสู่ระบบสำเร็จ", "success");
                } else {
                    showToast('รหัสผ่านไม่ถูกต้อง', 'error');
                }
            } catch (e) {
                showLoading(false);
                showToast('การเชื่อมต่อล้มเหลว', 'error');
            }
        });
        
        // Forms
        document.getElementById('form-subject').addEventListener('submit', (e) => { 
            e.preventDefault(); 
            const subjectName = document.getElementById('subject-name').value.trim();
            if (!subjectName) {
                showToast("กรุณากรอกชื่อวิชา", "warning");
                return;
            }
            this.handleSave({ action:'addSubject', id:Date.now(), name:subjectName }); 
            e.target.reset();
            showToast("เพิ่มวิชาสำเร็จ", "success");
        });
        
        document.getElementById('form-class').addEventListener('submit', (e) => { 
            e.preventDefault(); 
            const className = document.getElementById('class-name').value.trim();
            const subjectId = document.getElementById('class-subject-ref').value;
            if (!className || !subjectId) {
                showToast("กรุณากรอกชื่อห้องและเลือกวิชา", "warning");
                return;
            }
            this.handleSave({ action:'addClass', id:Date.now(), name:className, subjectId:subjectId }); 
            e.target.reset();
            showToast("เพิ่มห้องเรียนสำเร็จ", "success");
        });
        
        document.getElementById('form-student').addEventListener('submit', (e) => { 
            e.preventDefault(); 
            const classId = document.getElementById('student-class').value;
            const studentNo = document.getElementById('student-no').value;
            const studentId = document.getElementById('student-id').value.trim();
            const studentName = document.getElementById('student-name').value.trim();
            
            if (!classId || !studentNo || !studentId || !studentName) {
                showToast("กรุณากรอกข้อมูลให้ครบ", "warning");
                return;
            }
            
            this.handleSave({ 
                action: 'addStudent', 
                id: Date.now(), 
                classId: classId, 
                no: studentNo, 
                code: studentId, 
                name: studentName 
            }); 
            e.target.reset();
            showToast("เพิ่มนักเรียนสำเร็จ", "success");
        });
        
        document.getElementById('form-task').addEventListener('submit', (e) => { 
            e.preventDefault();
            const classCbs = document.querySelectorAll('#task-class-checkboxes input:checked');
            const chapCbs = document.querySelectorAll('.chapter-checkbox:checked');
            const subjectId = document.getElementById('task-subject-filter').value;
            const category = document.getElementById('task-category').value;
            const taskName = document.getElementById('task-name').value.trim();
            const maxScore = document.getElementById('task-max').value;
            
            if(classCbs.length === 0) {
                showToast("กรุณาเลือกห้องเรียน", 'warning');
                return;
            }
            
            if (!subjectId) {
                showToast("กรุณาเลือกวิชา", 'warning');
                return;
            }
            
            if (!taskName) {
                showToast("กรุณากรอกชื่องาน", 'warning');
                return;
            }
            
            const selectedChaps = Array.from(chapCbs).map(cb => cb.value);
            
            this.handleSave({ 
                action: 'addTask', 
                id: Date.now(), 
                classIds: Array.from(classCbs).map(c => c.value), 
                subjectId: subjectId, 
                category: category, 
                chapter: selectedChaps, 
                name: taskName, 
                maxScore: maxScore, 
                dueDateISO: getThaiDateISO() 
            });
            e.target.reset();
            showToast("สร้างงานสำเร็จ", "success");
        });
        
        document.getElementById('form-schedule').addEventListener('submit', (e) => {
            e.preventDefault();
            const day = document.getElementById('sch-day').value;
            const period = document.getElementById('sch-period').value;
            const classId = document.getElementById('sch-class').value;
            
            if (!day || !period || !classId) {
                showToast("กรุณากรอกข้อมูลให้ครบ", "warning");
                return;
            }
            
            this.handleSave({
                action: 'addSchedule',
                id: Date.now(),
                day: day,
                period: period,
                classId: classId
            });
            e.target.reset();
            showToast("บันทึกตารางสอนสำเร็จ", "success");
        });
        
        document.getElementById('form-material').addEventListener('submit', (e) => {
            e.preventDefault();
            const subjectId = document.getElementById('mat-subject').value;
            const title = document.getElementById('mat-title').value.trim();
            const link = document.getElementById('mat-link').value.trim();
            
            if (!subjectId || !title || !link) {
                showToast("กรุณากรอกข้อมูลให้ครบ", "warning");
                return;
            }
            
            this.handleSave({
                action: 'addMaterial',
                id: Date.now(),
                subjectId: subjectId,
                title: title,
                link: link
            });
            e.target.reset();
            showToast("บันทึกเนื้อหาสำเร็จ", "success");
        });
        
        // Student login
        document.getElementById('btn-student-login').addEventListener('click', () => this.handleStudentLogin());
        
        // Student logout
        document.getElementById('btn-student-logout').addEventListener('click', () => this.logoutStudent());
        
        // Scan score input
        document.getElementById('scan-score-input').addEventListener('keydown', (e) => {
            if(e.key === 'Enter') {
                const val = e.target.value.trim();
                const cid = document.getElementById('scan-class-select').value;
                const tid = document.getElementById('scan-task-select').value;
                
                if(!cid || !tid) {
                    showToast("กรุณาเลือกห้องและงานก่อน", "warning");
                    return;
                }
                
                const student = this.dataState.students.find(st => (st.code == val || st.no == val) && st.classId == cid);
                if(student) {
                    const task = this.dataState.tasks.find(x => x.id == tid);
                    if(this.scoreMode !== 'manual') {
                        this.handleSave({action:'addScore', studentId:student.id, taskId:task.id, score:this.scoreMode});
                        showToast(`${student.name} : ${this.scoreMode}`, "success");
                        e.target.value = '';
                    } else {
                        this.pendingScore = { student, task };
                        document.getElementById('score-modal').classList.remove('hidden');
                        document.getElementById('modal-task-name').textContent = task.name;
                        document.getElementById('modal-student-name').textContent = student.name;
                        document.getElementById('modal-max-score').textContent = task.maxScore;
                        document.getElementById('modal-score-input').value = '';
                        setTimeout(() => document.getElementById('modal-score-input').focus(), 100);
                    }
                    e.target.value = '';
                } else { 
                    showToast("ไม่พบนักเรียน", "error"); 
                    e.target.value=''; 
                }
            }
        });
        
        // Attendance scan input
        document.getElementById('att-scan-input').addEventListener('keydown', (e) => {
            if(e.key === 'Enter') {
                const val = e.target.value.trim();
                const cid = document.getElementById('att-class-select').value;
                const date = document.getElementById('att-date-input').value;
                
                if(!cid) {
                    showToast("กรุณาเลือกห้องก่อน", "warning");
                    return;
                }
                
                const student = this.dataState.students.find(st => (st.code == val || st.no == val) && st.classId == cid);
                if(student && this.attMode) {
                    this.handleSave({action:'addAttendance', studentId:student.id, classId:cid, date:date, status:this.attMode});
                    showToast(`${student.name} : ${this.attMode}`, "success");
                    e.target.value = '';
                } else if(!this.attMode) {
                    showToast("เลือกสถานะก่อน (มา/ลา/ขาด)", "warning");
                } else {
                    showToast("ไม่พบนักเรียน", "error");
                    e.target.value='';
                }
            }
        });
        
        // Attendance mode buttons
        document.getElementById('btn-att-present').addEventListener('click', () => this.setAttMode('มา'));
        document.getElementById('btn-att-leave').addEventListener('click', () => this.setAttMode('ลา'));
        document.getElementById('btn-att-absent').addEventListener('click', () => this.setAttMode('ขาด'));
        
        // Smart class button
        document.getElementById('btn-use-smart-class').addEventListener('click', () => this.useSmartClass());
        
        // Export buttons
        document.getElementById('btn-export-attendance-csv').addEventListener('click', () => this.exportAttendanceCSV());
        document.getElementById('btn-print-report').addEventListener('click', () => this.printOfficialReport());
        document.getElementById('btn-export-grade-csv').addEventListener('click', () => this.exportGradeCSV());
        
        // Modal buttons
        document.getElementById('btn-modal-cancel').addEventListener('click', () => {
            document.getElementById('score-modal').classList.add('hidden');
        });
        
        document.getElementById('btn-modal-save').addEventListener('click', () => {
            const val = document.getElementById('modal-score-input').value;
            if(!val || Number(val) > Number(this.pendingScore.task.maxScore)) {
                showToast("คะแนนไม่ถูกต้อง", "error");
                return;
            }
            this.handleSave({action:'addScore', studentId:this.pendingScore.student.id, taskId:this.pendingScore.task.id, score:val});
            document.getElementById('score-modal').classList.add('hidden');
            showToast("บันทึกคะแนนสำเร็จ", "success");
        });
        
        document.getElementById('modal-score-input').addEventListener('keydown', (e) => { 
            if(e.key === 'Enter') document.getElementById('btn-modal-save').click(); 
        });
        
        // Submit modal buttons
        document.getElementById('btn-submit-cancel').addEventListener('click', () => {
            document.getElementById('submit-modal').classList.add('hidden');
        });
        
        document.getElementById('form-submit-work').addEventListener('submit', (e) => {
            e.preventDefault();
            const taskId = document.getElementById('submit-task-id').value;
            const studentId = document.getElementById('submit-student-id').value;
            const link = document.getElementById('submit-link-input').value.trim();
            const comment = document.getElementById('submit-comment-input').value.trim();
            
            if (!link) {
                showToast("กรุณากรอกลิงก์งาน", "warning");
                return;
            }
            
            // Get selected friends
            const selectedFriends = Array.from(document.querySelectorAll('#friend-selector-container input:checked')).map(cb => cb.value);
            const studentIds = [studentId, ...selectedFriends];
            
            this.handleSave({
                action: 'submitTask',
                taskId: taskId,
                studentIds: studentIds,
                link: link,
                comment: comment
            });
            
            document.getElementById('submit-modal').classList.add('hidden');
            e.target.reset();
            showToast("ส่งงานเรียบร้อยแล้ว", "success");
        });
        
        // Select change events
        document.getElementById('scan-class-select').addEventListener('change', () => { 
            this.updateScanTaskDropdown(); 
            this.renderScoreRoster(); 
        });
        
        document.getElementById('scan-task-select').addEventListener('change', () => this.renderScoreRoster());
        document.getElementById('att-class-select').addEventListener('change', () => this.renderAttRoster());
        document.getElementById('att-date-input').addEventListener('change', () => this.renderAttRoster());
        document.getElementById('report-class').addEventListener('change', () => this.renderGradeReport());
        document.getElementById('task-subject-filter').addEventListener('change', () => this.renderTaskClassCheckboxes());
        
        console.log('Event listeners initialized');
    },
    
    // Update scan task dropdown
    updateScanTaskDropdown() {
        const cid = document.getElementById('scan-class-select').value;
        if (!cid) return;
        
        const classTasks = this.dataState.tasks.filter(t => t.classId == cid);
        const taskOptions = classTasks.reverse().map(t => ({
            id: t.id, 
            name: `${t.name} (Max ${t.maxScore})`
        }));
        
        renderDropdown('scan-task-select', taskOptions, "-- เลือกงาน --");
    },
    
    // Render score roster
    renderScoreRoster() {
        const cid = document.getElementById('scan-class-select').value;
        const taskId = document.getElementById('scan-task-select').value;
        const div = document.getElementById('score-roster-grid');
        
        div.innerHTML = ''; 
        if(!cid || !taskId) return;
        
        const students = this.dataState.students
            .filter(s => s.classId == cid)
            .sort((a,b) => Number(a.no) - Number(b.no));
        
        students.forEach(student => { 
            const score = this.dataState.scores.find(x => x.studentId == student.id && x.taskId == taskId);
            const scoreValue = score ? score.score : '-';
            
            const el = document.createElement('div'); 
            el.className = `status-box ${score ? 'status-done' : 'status-none'} p-2 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all`; 
            el.addEventListener('click', () => { 
                this.pendingScore = { student, task: this.dataState.tasks.find(t => t.id == taskId) }; 
                document.getElementById('score-modal').classList.remove('hidden'); 
                document.getElementById('modal-task-name').textContent = this.pendingScore.task.name; 
                document.getElementById('modal-student-name').textContent = student.name; 
                document.getElementById('modal-max-score').textContent = this.pendingScore.task.maxScore; 
                document.getElementById('modal-score-input').value = scoreValue == '-' ? '' : scoreValue; 
                setTimeout(() => document.getElementById('modal-score-input').focus(), 100); 
            });
            
            el.innerHTML = `
                <div class="text-xs opacity-70">No. ${student.no}</div>
                <div class="font-bold text-center text-xs truncate w-full">${student.name}</div>
                <div class="text-xl font-bold mt-1">${scoreValue}</div>
            `; 
            div.appendChild(el); 
        }); 
    },
    
    // Render attendance roster
    renderAttRoster() {
        const cid = document.getElementById('att-class-select').value;
        const div = document.getElementById('att-roster-grid');
        const date = document.getElementById('att-date-input').value;
        
        div.innerHTML = ''; 
        if(!cid) return;
        
        let presentCount = 0, leaveCount = 0, absentCount = 0;
        
        const students = this.dataState.students
            .filter(s => s.classId == cid)
            .sort((a,b) => Number(a.no) - Number(b.no));
        
        students.forEach(student => {
            const attendance = this.dataState.attendance.find(x => x.studentId == student.id && x.date.startsWith(date));
            const status = attendance ? attendance.status : 'none';
            
            // Update counts
            if(status == 'มา') presentCount++; 
            if(status == 'ลา') leaveCount++; 
            if(status == 'ขาด') absentCount++;
            
            // Determine status class
            let statusClass = 'status-none';
            let statusText = status === 'none' ? '-' : status;
            
            if(status == 'มา') {
                statusClass = 'status-done';
            } else if(status == 'ลา') {
                statusClass = 'bg-yellow-500/20 border-yellow-500 text-yellow-500';
            } else if(status == 'ขาด') {
                statusClass = 'bg-red-500/20 border-red-500 text-red-500';
            }
            
            const el = document.createElement('div'); 
            el.className = `status-box ${statusClass} p-3 flex flex-col items-center justify-center cursor-pointer border hover:bg-white/5 transition-all`;
            el.addEventListener('click', () => { 
                if(this.attMode) {
                    this.handleSave({action:'addAttendance', studentId:student.id, classId:cid, date:date, status:this.attMode});
                } else {
                    showToast("เลือกสถานะก่อน (มา/ลา/ขาด)", "warning");
                }
            });
            
            el.innerHTML = `
                <div class="text-xs opacity-70">No. ${student.no}</div>
                <div class="font-bold text-center text-sm truncate w-full">${student.name}</div>
                <div class="text-[10px] mt-1">${statusText}</div>
            `; 
            div.appendChild(el);
        });
        
        // Update statistics
        document.getElementById('stat-present').textContent = presentCount; 
        document.getElementById('stat-leave').textContent = leaveCount; 
        document.getElementById('stat-absent').textContent = absentCount;
    },
    
    // Render grade report
    renderGradeReport() {
        const cid = document.getElementById('report-class').value;
        const tbody = document.getElementById('report-table-body');
        
        tbody.innerHTML = ''; 
        if(!cid) return;
        
        const tasks = this.dataState.tasks.filter(t => t.classId == cid);
        const students = this.dataState.students
            .filter(s => s.classId == cid)
            .sort((a,b) => Number(a.no) - Number(b.no));
        
        students.forEach((student, idx) => {
            const { chapScores, midterm, final, total } = calculateScores(student.id, tasks, this.dataState.scores);
            const grade = calGrade(total);
            
            tbody.innerHTML += `
                <tr class="hover:bg-white/5">
                    <td class="text-center text-white/50">${student.no || idx+1}</td>
                    <td class="px-2 py-3 text-white text-xs">${student.name}</td>
                    ${chapScores.map(score => `<td class="text-center text-yellow-400 font-mono">${score}</td>`).join('')}
                    <td class="text-center text-blue-400 font-bold">${midterm}</td>
                    <td class="text-center text-red-400 font-bold">${final}</td>
                    <td class="text-center font-bold text-white bg-white/10">${total}</td>
                    <td class="text-center text-green-400 font-bold text-lg">${grade}</td>
                </tr>
            `;
        });
    },
    
    // Render incoming submissions
    renderIncomingSubmissions() {
        const container = document.getElementById('incoming-list'); 
        container.innerHTML = '';
        
        const pending = this.dataState.submissions.filter(submission => 
            !this.dataState.scores.some(score => score.taskId == submission.taskId && score.studentId == submission.studentId)
        );
        
        if(pending.length === 0) { 
            container.innerHTML = '<div class="text-center text-white/50 py-10">ไม่มีงานที่รอตรวจ</div>'; 
            return; 
        }
        
        pending.sort((a,b) => new Date(b.timestampISO) - new Date(a.timestampISO)).forEach(submission => {
            const task = this.dataState.tasks.find(t => t.id == submission.taskId);
            const student = this.dataState.students.find(s => s.id == submission.studentId);
            
            if(!task || !student) return;
            
            const className = this.dataState.classes.find(c => c.id == student.classId)?.name || '-';
            
            container.innerHTML += `
                <div class="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded font-bold">
                                ${className}
                            </span>
                            <h4 class="font-bold text-white text-sm mt-1">${task.name}</h4>
                            <p class="text-xs text-yellow-400">${student.name} (No.${student.no})</p>
                            ${submission.comment ? `<p class="text-xs text-white/60 mt-1">📝 ${submission.comment}</p>` : ''}
                            <p class="text-[10px] text-white/40 mt-1">${new Date(submission.timestampISO).toLocaleString('th-TH')}</p>
                        </div>
                        <a href="${submission.link}" target="_blank" class="text-blue-400 text-xs hover:underline hover:text-blue-300">
                            เปิดงาน <i class="fa-solid fa-external-link-alt ml-1"></i>
                        </a>
                    </div>
                    <div class="flex gap-2 items-center">
                        <input id="grade-${submission.id}" type="number" class="glass-input rounded px-2 py-1 text-xs w-20 text-center" placeholder="Max ${task.maxScore}" max="${task.maxScore}">
                        <button onclick="app.submitGrade('${submission.id}', '${submission.studentId}', '${submission.taskId}', ${task.maxScore})" class="btn-blue px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 transition-all">
                            ให้คะแนน
                        </button>
                    </div>
                </div>`;
        });
    },
    
    // ================ PUBLIC METHODS ================
    
    // Switch main tab
    switchMainTab(tab) {
        console.log('Switching to tab:', tab);
        
        // Hide all sections
        document.getElementById('section-admin').classList.add('hidden');
        document.getElementById('section-student').classList.add('hidden');
        
        // Show selected section
        document.getElementById(`section-${tab}`).classList.remove('hidden');
        
        // Update tab buttons
        const adminBtn = document.getElementById('tab-btn-admin');
        const studentBtn = document.getElementById('tab-btn-student');
        
        if(tab === 'admin'){
            adminBtn.className = "px-6 py-2 rounded-full text-sm font-bold bg-white text-blue-900 shadow-lg"; 
            studentBtn.className = "px-6 py-2 rounded-full text-sm font-bold text-white/50 hover:text-white transition-all";
            
            // Check if admin is logged in
            const savedSession = localStorage.getItem('wany_admin_session');
            if (!savedSession) {
                document.getElementById('admin-login-wrapper').classList.remove('hidden');
                document.getElementById('admin-content-wrapper').classList.add('hidden');
            } else {
                document.getElementById('admin-login-wrapper').classList.add('hidden');
                document.getElementById('admin-content-wrapper').classList.remove('hidden');
                this.refreshUI();
            }
        } else { 
            studentBtn.className = "px-6 py-2 rounded-full text-sm font-bold bg-white text-blue-900 shadow-lg"; 
            adminBtn.className = "px-6 py-2 rounded-full text-sm font-bold text-white/50 hover:text-white transition-all";
            
            // Show student login by default
            document.getElementById('student-login-wrapper').classList.remove('hidden');
            document.getElementById('student-dashboard').classList.add('hidden');
        }
    },
    
    // Switch admin sub-tab
    switchAdminSubTab(tab) {
        console.log('Switching to admin sub-tab:', tab);
        
        // Hide all panels
        document.querySelectorAll('.admin-panel').forEach(panel => panel.classList.add('hidden'));
        
        // Show selected panel
        document.getElementById(`admin-panel-${tab}`).classList.remove('hidden');
        
        // Update menu buttons
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.className = "menu-btn glass-ios hover:bg-white/10 text-white/70 rounded-2xl py-3 font-bold";
        });
        
        const menuBtn = document.getElementById(`menu-${tab}`);
        if(menuBtn) {
            menuBtn.className = "menu-btn btn-blue rounded-2xl py-3 font-bold shadow-lg text-white";
        }
        
        // Refresh specific UI components
        switch(tab) {
            case 'homework':
                this.renderIncomingSubmissions();
                break;
            case 'material':
                renderAdminMaterials(this.dataState.materials, this.dataState.subjects);
                break;
            case 'scan':
                this.updateScanTaskDropdown();
                this.renderScoreRoster();
                break;
            case 'attendance':
                this.renderAttRoster();
                break;
            case 'report':
                this.renderGradeReport();
                break;
        }
    },
    
    // Handle admin logout
    handleAdminLogout() {
        Swal.fire({ 
            title: 'ออกจากระบบ?', 
            text: 'คุณต้องการออกจากระบบหรือไม่?',
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonText: 'ใช่, ออกจากระบบ', 
            cancelButtonText: 'ยกเลิก',
            background: '#1e293b',
            color: '#e2e8f0'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('wany_admin_session');
                localStorage.removeItem('wany_data_backup');
                showToast("ออกจากระบบสำเร็จ", "success");
                setTimeout(() => location.reload(), 1000);
            }
        });
    },
    
    // Render score buttons
    renderScoreButtons() { 
        const container = document.getElementById('score-buttons-container'); 
        if(!container) return; 
        
        container.innerHTML=''; 
        
        [5,6,7,8,9,10].forEach(score => { 
            const button = document.createElement('button'); 
            button.textContent = score; 
            button.className = "btn-score py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all"; 
            button.addEventListener('click', () => this.setScoreMode(score)); 
            container.appendChild(button); 
        }); 
    },
    
    // Set score mode
    setScoreMode(mode) {
        this.scoreMode = mode; 
        
        // Update score buttons
        document.querySelectorAll('.btn-score').forEach(button => {
            button.classList.remove('btn-score-active');
            if(button.textContent == mode) {
                button.classList.add('btn-score-active');
            }
        });
        
        // Update manual button
        const manualBtn = document.getElementById('btn-score-manual');
        if(manualBtn) {
            if(mode === 'manual') {
                manualBtn.classList.add('btn-score-active');
            } else {
                manualBtn.classList.remove('btn-score-active');
            }
        }
        
        // Focus on scan input
        const scanInput = document.getElementById('scan-score-input'); 
        if(scanInput) scanInput.focus();
    },
    
    // Set attendance mode
    setAttMode(mode) {
        this.attMode = mode;
        
        // Reset all buttons
        document.getElementById('btn-att-present').classList.remove('btn-att-active-present');
        document.getElementById('btn-att-leave').classList.remove('btn-att-active-leave');
        document.getElementById('btn-att-absent').classList.remove('btn-att-active-absent');
        
        // Activate selected button
        if(mode === 'มา') {
            document.getElementById('btn-att-present').classList.add('btn-att-active-present');
        } else if(mode === 'ลา') {
            document.getElementById('btn-att-leave').classList.add('btn-att-active-leave');
        } else if(mode === 'ขาด') {
            document.getElementById('btn-att-absent').classList.add('btn-att-active-absent');
        }
        
        // Focus on scan input
        const attInput = document.getElementById('att-scan-input'); 
        if(attInput) attInput.focus();
    },
    
    // Render task class checkboxes
    renderTaskClassCheckboxes() {
        const subjectId = document.getElementById('task-subject-filter').value; 
        const container = document.getElementById('task-class-checkboxes'); 
        
        container.innerHTML='';
        
        if(!subjectId) return;
        
        const classList = this.dataState.classes.filter(cls => cls.subjectId == subjectId);
        
        if(classList.length === 0) {
            container.innerHTML = '<div class="text-center text-white/50 text-xs p-2">ไม่มีห้องเรียนสำหรับวิชานี้</div>';
            return;
        }
        
        classList.forEach(cls => { 
            container.innerHTML += `
                <label class="flex items-center gap-2 p-2 rounded hover:bg-white/10 cursor-pointer transition-all">
                    <input type="checkbox" value="${cls.id}" class="accent-yellow-500 w-4 h-4 rounded">
                    <span class="text-xs text-white/80">${cls.name}</span>
                </label>`; 
        });
    },
    
    // Submit grade
    submitGrade(subId, studentId, taskId, maxScore) {
        const input = document.getElementById(`grade-${subId}`);
        if(!input) return;
        
        const score = input.value;
        if(!score || Number(score) > Number(maxScore)) {
            showToast("คะแนนไม่ถูกต้อง", "error");
            return;
        }
        
        this.handleSave({ action:'addScore', studentId: studentId, taskId: taskId, score: score });
        input.value = '';
        showToast("ให้คะแนนเรียบร้อย", "success");
        
        // Refresh the submissions list
        this.renderIncomingSubmissions();
    },
    
    // Update inbox badge
    updateInboxBadge() {
        let count = 0; 
        this.dataState.submissions.forEach(submission => { 
            if(!this.dataState.scores.some(score => score.taskId == submission.taskId && score.studentId == submission.studentId)) {
                count++; 
            }
        });
        
        const badge = document.getElementById('badge-homework'); 
        if(!badge) return;
        
        if(count > 0) {
            badge.classList.remove('hidden'); 
            badge.textContent = count > 99 ? '99+' : count;
        } else {
            badge.classList.add('hidden');
        }
    },
    
    // Check smart schedule
    checkSmartSchedule() {
        if(!this.dataState.schedules || this.dataState.schedules.length === 0) {
            const banner = document.getElementById('smart-att-banner');
            if(banner) banner.classList.add('hidden');
            return;
        }
        
        const now = new Date(); 
        const day = now.getDay(); // 0=อาทิตย์, 1=จันทร์, ...
        const timeStr = now.toTimeString().slice(0,5); 
        
        const currentPeriod = this.PERIODS.find(period => timeStr >= period.start && timeStr <= period.end);
        const banner = document.getElementById('smart-att-banner');
        
        if(currentPeriod && banner) {
            // Adjust day for schedule (schedule uses 1=จันทร์, but getDay() returns 0=อาทิตย์)
            let scheduleDay = day;
            if(scheduleDay === 0) scheduleDay = 6; // อาทิตย์ -> 6
            else scheduleDay = scheduleDay - 1; // จันทร์(1) -> 0
            
            const match = this.dataState.schedules.find(schedule => schedule.day == scheduleDay && schedule.period == currentPeriod.p);
            if(match) {
                const cls = this.dataState.classes.find(c => c.id == match.classId);
                if(cls) {
                    banner.classList.remove('hidden');
                    document.getElementById('smart-period').textContent = currentPeriod.p;
                    document.getElementById('smart-class-name').textContent = cls.name;
                    this.smartClassId = cls.id;
                    return;
                }
            }
        }
        
        if(banner) banner.classList.add('hidden'); 
        this.smartClassId = null;
    },
    
    // Use smart class
    useSmartClass() { 
        if(this.smartClassId) { 
            const select = document.getElementById('att-class-select');
            if(select) {
                select.value = this.smartClassId; 
                this.renderAttRoster();
                showToast(`เลือกห้อง ${this.dataState.classes.find(c => c.id == this.smartClassId)?.name} แล้ว`, "success");
            }
        } 
    },
    
    // Handle student login
    handleStudentLogin() {
        if (!this.dataState.students || this.dataState.students.length === 0) {
            showToast("กำลังโหลดข้อมูล...", "info");
            return;
        }
        
        const studentCode = document.getElementById('student-login-id').value.trim();
        if(!studentCode) {
            showToast("กรุณากรอกรหัสนักเรียน", "warning");
            return;
        }
        
        const student = this.dataState.students.find(s => s.code == studentCode || Number(s.code) == Number(studentCode));
        if(!student) {
            showToast("ไม่พบรหัสนักเรียนนี้", "error");
            return;
        }
        
        // Show student dashboard
        document.getElementById('student-login-wrapper').classList.add('hidden');
        document.getElementById('student-dashboard').classList.remove('hidden');
        document.getElementById('std-dash-name').textContent = student.name;
        
        const className = this.dataState.classes.find(c => c.id == student.classId)?.name || '-';
        document.getElementById('std-dash-class').textContent = "ห้อง " + className;
        
        this.renderStudentDashboard(student);
        showToast("เข้าสู่ระบบสำเร็จ", "success");
    },
    
    // Render student dashboard
    renderStudentDashboard(student) {
        const container = document.getElementById('std-subjects-container'); 
        container.innerHTML = '';
        
        // Get student's class
        const studentClass = this.dataState.classes.find(c => c.id == student.classId);
        if (!studentClass) {
            container.innerHTML = '<div class="text-center text-white/50 py-10">ไม่พบข้อมูลห้องเรียน</div>';
            return;
        }
        
        // Get subject for this class
        const subject = this.dataState.subjects.find(s => s.id == studentClass.subjectId);
        if (!subject) {
            container.innerHTML = '<div class="text-center text-white/50 py-10">ไม่พบข้อมูลวิชา</div>';
            return;
        }
        
        // Get tasks for this class
        const tasks = this.dataState.tasks.filter(t => t.classId == student.classId && t.subjectId == subject.id);
        
        // Calculate scores
        const { chapScores, midterm, final, total } = calculateScores(student.id, tasks, this.dataState.scores);
        const grade = calGrade(total);
        
        // Render subject card
        container.innerHTML += `
            <div class="glass-ios p-5 rounded-3xl border border-white/10 mb-4 fade-in">
                <h3 class="font-bold text-lg text-white mb-3 border-l-4 border-yellow-500 pl-3 flex justify-between">
                    ${subject.name}
                    <span class="text-sm bg-white/10 px-2 rounded">Grade ${grade}</span>
                </h3>
                <div class="overflow-x-auto mb-4 bg-black/20 rounded-xl">
                    <table class="w-full text-sm text-center text-white/80">
                        <thead class="bg-white/5 text-xs">
                            <tr>
                                <th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>C5</th><th>C6</th>
                                <th class="text-blue-400">Mid</th>
                                <th class="text-red-400">Fin</th>
                                <th>Tot</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                ${chapScores.map(score => `<td>${score}</td>`).join('')}
                                <td>${midterm}</td>
                                <td>${final}</td>
                                <td class="font-bold">${total}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                    ${this.renderStudentTasks(student, tasks)}
                </div>
            </div>`;
        
        // Render attendance
        const attBody = document.getElementById('std-att-body');
        if(attBody) {
            const attendanceRecords = this.dataState.attendance
                .filter(a => a.studentId == student.id)
                .sort((a,b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10); // Show only last 10 records
            
            if(attendanceRecords.length === 0) {
                attBody.innerHTML = '<tr><td colspan="2" class="text-center text-white/50 py-4">ไม่มีประวัติการเข้าเรียน</td></tr>';
            } else {
                attBody.innerHTML = attendanceRecords.map(record => `
                    <tr class="hover:bg-white/5">
                        <td class="px-3 py-2 text-white/50">${formatThaiDate(record.date)}</td>
                        <td class="px-3 py-2 text-center ${record.status=='มา'?'text-green-400':record.status=='ลา'?'text-yellow-400':'text-red-400'}">
                            ${record.status}
                        </td>
                    </tr>
                `).join('');
            }
        }
    },
    
    // Render student tasks
    renderStudentTasks(student, tasks) {
        if(!tasks || tasks.length === 0) {
            return '<div class="col-span-4 text-center text-white/50 py-2">ไม่มีงาน</div>';
        }
        
        return tasks.map(task => {
            const score = this.dataState.scores.find(s => s.studentId == student.id && s.taskId == task.id);
            const submission = this.dataState.submissions.find(s => s.studentId == student.id && s.taskId == task.id);
            
            let status = '';
            if(score) {
                status = `<span class="text-green-400 font-bold">${score.score}</span>`;
            } else if(submission) {
                status = '<span class="text-blue-400 text-xs">รอตรวจ</span>';
            } else {
                status = `<button class="bg-white/10 px-2 py-1 rounded text-[10px] hover:bg-white/20 transition-all" onclick="app.openSubmitModal('${task.id}','${student.id}')">
                    ส่งงาน
                </button>`;
            }
            
            return `
                <div class="bg-white/5 p-2 rounded text-center hover:bg-white/10 transition-all">
                    <div class="text-[10px] truncate mb-1" title="${task.name}">${task.name}</div>
                    <div class="text-xs">${status}</div>
                </div>`;
        }).join('');
    },
    
    // Open submit modal
    openSubmitModal(taskId, studentId) {
        const task = this.dataState.tasks.find(t => t.id == taskId);
        const student = this.dataState.students.find(s => s.id == studentId);
        
        if(!task || !student) {
            showToast("ไม่พบข้อมูลงาน", "error");
            return;
        }
        
        document.getElementById('submit-task-id').value = taskId;
        document.getElementById('submit-student-id').value = studentId;
        
        const className = this.dataState.classes.find(c => c.id == student.classId)?.name || '-';
        document.getElementById('submit-modal-title').textContent = `${task.name} (ห้อง ${className})`;
        
        // Render friend selector
        const container = document.getElementById('friend-selector-container');
        container.innerHTML = '';
        
        // Get classmates (excluding the student)
        const classmates = this.dataState.students
            .filter(s => s.classId == student.classId && s.id != studentId)
            .sort((a,b) => Number(a.no) - Number(b.no));
        
        if(classmates.length === 0) {
            container.innerHTML = '<div class="text-center text-white/50 text-xs py-2">ไม่มีเพื่อนร่วมห้อง</div>';
        } else {
            classmates.forEach(friend => {
                container.innerHTML += `
                    <label class="flex items-center gap-2 p-1 hover:bg-white/5 rounded cursor-pointer transition-all">
                        <input type="checkbox" value="${friend.id}" class="accent-blue-500">
                        <span class="text-xs text-white/80">${friend.name} (No.${friend.no})</span>
                    </label>`;
            });
        }
        
        document.getElementById('submit-modal').classList.remove('hidden');
    },
    
    // Logout student
    logoutStudent() { 
        Swal.fire({ 
            title: 'ออกจากระบบ?', 
            text: 'คุณต้องการออกจากระบบหรือไม่?',
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonText: 'ใช่, ออกจากระบบ', 
            cancelButtonText: 'ยกเลิก',
            background: '#1e293b',
            color: '#e2e8f0'
        }).then((result) => {
            if (result.isConfirmed) {
                showToast("ออกจากระบบสำเร็จ", "success");
                setTimeout(() => location.reload(), 1000);
            }
        });
    },
    
    // Print official report
    printOfficialReport() {
        const classId = document.getElementById('report-class').value;
        if(!classId) {
            showToast("กรุณาเลือกห้องก่อน", "warning");
            return;
        }
        
        const cls = this.dataState.classes.find(c => c.id == classId);
        const subject = cls ? this.dataState.subjects.find(s => s.id == cls.subjectId) : null;
        
        document.getElementById('print-subtitle').textContent = 
            `${subject ? subject.name : ''} ${cls ? cls.name : ''} - ${getThaiDateISO()}`;
        
        const tbody = document.getElementById('print-table-body');
        tbody.innerHTML = '';
        
        const tasks = this.dataState.tasks.filter(t => t.classId == classId);
        const students = this.dataState.students
            .filter(s => s.classId == classId)
            .sort((a,b) => Number(a.no) - Number(b.no));
        
        students.forEach((student, idx) => {
            const { chapScores, midterm, final, total } = calculateScores(student.id, tasks, this.dataState.scores);
            const grade = calGrade(total);
            
            tbody.innerHTML += `<tr>
                <td>${student.no || idx+1}</td>
                <td>${student.code || ''}</td>
                <td>${student.name}</td>
                ${chapScores.map(score => `<td>${score}</td>`).join('')}
                <td>${midterm}</td>
                <td>${final}</td>
                <td>${total}</td>
                <td>${grade}</td>
            </tr>`;
        });
        
        // Trigger print
        setTimeout(() => {
            window.print();
        }, 500);
    },
    
    // Export attendance CSV
    exportAttendanceCSV() {
        const classId = document.getElementById('att-class-select').value;
        const date = document.getElementById('att-date-input').value;
        
        if(!classId) {
            showToast("กรุณาเลือกห้องก่อน", "warning");
            return;
        }
        
        const students = this.dataState.students
            .filter(s => s.classId == classId)
            .sort((a,b) => Number(a.no) - Number(b.no));
        
        let csv = "เลขที่,รหัสนักเรียน,ชื่อ-นามสกุล,สถานะ,วันที่\n";
        
        students.forEach(student => {
            const attendance = this.dataState.attendance.find(a => 
                a.studentId == student.id && a.date.startsWith(date));
            const status = attendance ? attendance.status : 'ไม่มีการบันทึก';
            
            csv += `${student.no},${student.code},"${student.name}",${status},${date}\n`;
        });
        
        // Create and download CSV file
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const className = this.dataState.classes.find(c => c.id == classId)?.name || 'class';
        link.setAttribute('download', `attendance_${className}_${date}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast("ดาวน์โหลดไฟล์ CSV เรียบร้อย", "success");
    },
    
    // Export grade CSV
    exportGradeCSV() {
        const classId = document.getElementById('report-class').value;
        if(!classId) {
            showToast("กรุณาเลือกห้องก่อน", "warning");
            return;
        }
        
        const tasks = this.dataState.tasks.filter(t => t.classId == classId);
        const students = this.dataState.students
            .filter(s => s.classId == classId)
            .sort((a,b) => Number(a.no) - Number(b.no));
        
        let csv = "เลขที่,รหัสนักเรียน,ชื่อ-นามสกุล,บท1,บท2,บท3,บท4,บท5,บท6,กลางภาค,ปลายภาค,รวม,เกรด\n";
        
        students.forEach(student => {
            const { chapScores, midterm, final, total } = calculateScores(student.id, tasks, this.dataState.scores);
            const grade = calGrade(total);
            
            csv += `${student.no},${student.code},"${student.name}",${chapScores.join(',')},${midterm},${final},${total},${grade}\n`;
        });
        
        // Create and download CSV file
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const className = this.dataState.classes.find(c => c.id == classId)?.name || 'class';
        link.setAttribute('download', `grades_${className}_${getThaiDateISO()}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast("ดาวน์โหลดไฟล์ CSV เรียบร้อย", "success");
    },
    
    // Delete material
    deleteMaterial(materialId) {
        Swal.fire({
            title: 'ลบเนื้อหา?',
            text: 'คุณต้องการลบเนื้อหานี้หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
            background: '#1e293b',
            color: '#e2e8f0'
        }).then((result) => {
            if (result.isConfirmed) {
                // Remove from local state
                const index = this.dataState.materials.findIndex(m => m.id == materialId);
                if (index !== -1) {
                    this.dataState.materials.splice(index, 1);
                    this.saveLocalData();
                    this.refreshUI();
                    showToast("ลบเนื้อหาเรียบร้อย", "success");
                }
            }
        });
    },
    
    // Delete schedule
    deleteSchedule(scheduleId) {
        Swal.fire({
            title: 'ลบตารางสอน?',
            text: 'คุณต้องการลบรายการนี้จากตารางสอนหรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
            background: '#1e293b',
            color: '#e2e8f0'
        }).then((result) => {
            if (result.isConfirmed) {
                // Remove from local state
                const index = this.dataState.schedules.findIndex(s => s.id == scheduleId);
                if (index !== -1) {
                    this.dataState.schedules.splice(index, 1);
                    this.saveLocalData();
                    this.refreshUI();
                    showToast("ลบตารางสอนเรียบร้อย", "success");
                }
            }
        });
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Make app available globally
window.app = app;
