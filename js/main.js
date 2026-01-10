// Import modules
import { getThaiDateISO, formatThaiDate, calGrade, calculateScores, escapeHtml } from './utils.js';
import { fetchData, sendData } from './api.js';
import { showToast, showLoading, renderDropdown, renderScheduleList, renderAdminMaterials } from './ui.js';

// Global variables
let dataState = { subjects: [], classes: [], students: [], tasks: [], scores: [], attendance: [], materials: [], submissions: [], returns: [], schedules: [] };
let scoreMode = 'manual';
let attMode = null;
let pendingScore = null;
let smartClassId = null;

const PERIODS = [
    { p: 1, start: "08:30", end: "09:20" }, { p: 2, start: "09:20", end: "10:10" },
    { p: 3, start: "10:10", end: "11:00" }, { p: 4, start: "11:00", end: "11:50" },
    { p: 5, start: "11:50", end: "12:40" }, { p: 6, start: "12:40", end: "13:30" },
    { p: 7, start: "13:30", end: "14:20" }, { p: 8, start: "14:20", end: "15:10" }
];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initEventListeners();
    loadLocalData();
    
    // Set current date in attendance input
    if (document.getElementById('att-date-input')) {
        document.getElementById('att-date-input').value = getThaiDateISO();
    }
    
    // Check if admin is logged in
    const savedSession = localStorage.getItem('wany_admin_session');
    if (savedSession) {
        showAdminPanel(true);
    } else {
        switchMainTab('student');
        appSync();
    }
    
    // Initialize score buttons
    renderScoreButtons();
    
    // Check smart schedule every minute
    setInterval(checkSmartSchedule, 60000);
    
    console.log('App initialized successfully');
});

// Sync data with server
async function appSync() {
    try {
        console.log('Syncing data with server...');
        const json = await fetchData();
        if (json) {
            dataState = json;
            if(!dataState.schedules) dataState.schedules = [];
            saveLocalData();
            refreshUI();
            showToast("ข้อมูลอัพเดทแล้ว", "success");
        }
    } catch (e) {
        console.warn('Sync failed, using local data:', e);
        showToast("โหมด Offline (ใช้ข้อมูลในเครื่อง)", "warning");
    }
}

// Save data locally
function saveLocalData() { 
    localStorage.setItem('wany_data_backup', JSON.stringify({ 
        timestamp: Date.now(), 
        data: dataState 
    })); 
}

// Load data from local storage
function loadLocalData() {
    const backup = localStorage.getItem('wany_data_backup');
    if (backup) { 
        const parsed = JSON.parse(backup); 
        dataState = parsed.data; 
        console.log('Loaded local data from backup');
    }
}

// Show admin panel
function showAdminPanel(auto = false) {
    document.getElementById('admin-login-wrapper').classList.add('hidden');
    document.getElementById('admin-content-wrapper').classList.remove('hidden');
    refreshUI();
    if (!auto) appSync();
}

// Refresh all UI components
function refreshUI() {
    console.log('Refreshing UI...');
    
    // Render dropdowns
    renderDropdown('class-subject-ref', dataState.subjects);
    renderDropdown('student-class', dataState.classes);
    renderDropdown('scan-class-select', dataState.classes);
    renderDropdown('task-subject-filter', dataState.subjects);
    renderDropdown('report-class', dataState.classes);
    renderDropdown('att-class-select', dataState.classes);
    renderDropdown('mat-subject', dataState.subjects);
    renderDropdown('sch-class', dataState.classes);
    
    // Render schedule and check smart schedule
    renderScheduleList(dataState.schedules || [], dataState.classes);
    checkSmartSchedule();
    
    // Update inbox badge
    updateInboxBadge();
    
    console.log('UI refreshed');
}

// Handle saving data (optimistic update)
async function handleSave(payload) {
    console.log('Saving data:', payload.action);
    
    // Optimistic local update
    updateLocalState(payload);
    refreshUI();
    
    try {
        // Send to server
        const result = await sendData(payload);
        console.log('Save successful:', result);
    } catch(e) {
        console.error('Save failed:', e);
        showToast("บันทึกไม่สำเร็จ (รอ Sync)", "error");
    }
}

// Update local state based on action
function updateLocalState(p) {
    switch(p.action) {
        case 'addSubject':
            if(!dataState.subjects.some(s => s.id === p.id)) {
                dataState.subjects.push({id: p.id, name: p.name});
            }
            break;
            
        case 'addClass':
            if(!dataState.classes.some(c => c.id === p.id)) {
                dataState.classes.push({id: p.id, name: p.name, subjectId: p.subjectId});
            }
            break;
            
        case 'addStudent':
            if(!dataState.students.some(s => s.id === p.id)) {
                dataState.students.push({
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
                if(!dataState.tasks.some(t => t.id === taskId)) {
                    dataState.tasks.push({
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
            const scoreIndex = dataState.scores.findIndex(s => s.studentId == p.studentId && s.taskId == p.taskId);
            if(scoreIndex >= 0) {
                dataState.scores[scoreIndex].score = p.score;
            } else {
                dataState.scores.push({
                    studentId: p.studentId, 
                    taskId: p.taskId, 
                    score: p.score
                });
            }
            updateInboxBadge();
            break;
            
        case 'addAttendance':
            const attIndex = dataState.attendance.findIndex(a => a.studentId == p.studentId && a.date == p.date);
            if(attIndex >= 0) {
                dataState.attendance[attIndex].status = p.status;
            } else {
                dataState.attendance.push({
                    studentId: p.studentId, 
                    classId: p.classId, 
                    date: p.date, 
                    status: p.status
                });
            }
            break;
            
        case 'submitTask':
            p.studentIds.forEach(sid => {
                const subIndex = dataState.submissions.findIndex(s => s.studentId == sid && s.taskId == p.taskId);
                if(subIndex >= 0) { 
                    dataState.submissions[subIndex].link = p.link; 
                    dataState.submissions[subIndex].timestampISO = new Date().toISOString();
                    dataState.submissions[subIndex].comment = p.comment;
                } else {
                    dataState.submissions.push({
                        taskId: p.taskId, 
                        studentId: sid, 
                        link: p.link, 
                        timestampISO: new Date().toISOString(), 
                        comment: p.comment
                    });
                }
            });
            updateInboxBadge();
            break;
            
        case 'addSchedule':
            if(!dataState.schedules.some(s => s.id === p.id)) {
                dataState.schedules.push({
                    id: p.id, 
                    day: p.day, 
                    period: p.period, 
                    classId: p.classId
                });
            }
            break;
            
        case 'addMaterial':
            if(!dataState.materials.some(m => m.id === p.id)) {
                dataState.materials.push({
                    id: p.id, 
                    subjectId: p.subjectId, 
                    title: p.title, 
                    link: p.link
                });
            }
            break;
    }
    
    // Save to local storage
    saveLocalData();
}

// Initialize all event listeners
function initEventListeners() {
    console.log('Initializing event listeners...');
    
    // Tab buttons
    document.getElementById('tab-btn-admin').addEventListener('click', () => switchMainTab('admin'));
    document.getElementById('tab-btn-student').addEventListener('click', () => switchMainTab('student'));
    
    // Admin logout
    document.getElementById('btn-admin-logout').addEventListener('click', handleAdminLogout);
    
    // Admin menu buttons
    document.getElementById('menu-basic').addEventListener('click', () => switchAdminSubTab('basic'));
    document.getElementById('menu-scan').addEventListener('click', () => switchAdminSubTab('scan'));
    document.getElementById('menu-report').addEventListener('click', () => switchAdminSubTab('report'));
    document.getElementById('menu-homework').addEventListener('click', () => switchAdminSubTab('homework'));
    document.getElementById('menu-attendance').addEventListener('click', () => switchAdminSubTab('attendance'));
    document.getElementById('menu-material').addEventListener('click', () => switchAdminSubTab('material'));
    
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
                showAdminPanel();
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
        handleSave({ action:'addSubject', id:Date.now(), name:subjectName }); 
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
        handleSave({ action:'addClass', id:Date.now(), name:className, subjectId:subjectId }); 
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
        
        handleSave({ 
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
        
        handleSave({ 
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
        
        handleSave({
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
        
        handleSave({
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
    document.getElementById('btn-student-login').addEventListener('click', handleStudentLogin);
    
    // Student logout
    document.getElementById('btn-student-logout').addEventListener('click', logoutStudent);
    
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
            
            const student = dataState.students.find(st => (st.code == val || st.no == val) && st.classId == cid);
            if(student) {
                const task = dataState.tasks.find(x => x.id == tid);
                if(scoreMode !== 'manual') {
                    handleSave({action:'addScore', studentId:student.id, taskId:task.id, score:scoreMode});
                    showToast(`${student.name} : ${scoreMode}`, "success");
                    e.target.value = '';
                } else {
                    pendingScore = { student, task };
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
            
            const student = dataState.students.find(st => (st.code == val || st.no == val) && st.classId == cid);
            if(student && attMode) {
                handleSave({action:'addAttendance', studentId:student.id, classId:cid, date:date, status:attMode});
                showToast(`${student.name} : ${attMode}`, "success");
                e.target.value = '';
            } else if(!attMode) {
                showToast("เลือกสถานะก่อน (มา/ลา/ขาด)", "warning");
            } else {
                showToast("ไม่พบนักเรียน", "error");
                e.target.value='';
            }
        }
    });
    
    // Attendance mode buttons
    document.getElementById('btn-att-present').addEventListener('click', () => setAttMode('มา'));
    document.getElementById('btn-att-leave').addEventListener('click', () => setAttMode('ลา'));
    document.getElementById('btn-att-absent').addEventListener('click', () => setAttMode('ขาด'));
    
    // Smart class button
    document.getElementById('btn-use-smart-class').addEventListener('click', useSmartClass);
    
    // Export buttons
    document.getElementById('btn-export-attendance-csv').addEventListener('click', exportAttendanceCSV);
    document.getElementById('btn-print-report').addEventListener('click', printOfficialReport);
    document.getElementById('btn-export-grade-csv').addEventListener('click', exportGradeCSV);
    
    // Modal buttons
    document.getElementById('btn-modal-cancel').addEventListener('click', () => {
        document.getElementById('score-modal').classList.add('hidden');
    });
    
    document.getElementById('btn-modal-save').addEventListener('click', () => {
        const val = document.getElementById('modal-score-input').value;
        if(!val || Number(val) > Number(pendingScore.task.maxScore)) {
            showToast("คะแนนไม่ถูกต้อง", "error");
            return;
        }
        handleSave({action:'addScore', studentId:pendingScore.student.id, taskId:pendingScore.task.id, score:val});
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
        
        handleSave({
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
        updateScanTaskDropdown(); 
        renderScoreRoster(); 
    });
    
    document.getElementById('scan-task-select').addEventListener('change', renderScoreRoster);
    document.getElementById('att-class-select').addEventListener('change', renderAttRoster);
    document.getElementById('att-date-input').addEventListener('change', renderAttRoster);
    document.getElementById('report-class').addEventListener('change', renderGradeReport);
    document.getElementById('task-subject-filter').addEventListener('change', renderTaskClassCheckboxes);
    
    console.log('Event listeners initialized');
}

// Update scan task dropdown
function updateScanTaskDropdown() {
    const cid = document.getElementById('scan-class-select').value;
    if (!cid) return;
    
    const classTasks = dataState.tasks.filter(t => t.classId == cid);
    const taskOptions = classTasks.reverse().map(t => ({
        id: t.id, 
        name: `${t.name} (Max ${t.maxScore})`
    }));
    
    renderDropdown('scan-task-select', taskOptions, "-- เลือกงาน --");
}

// Render score roster
function renderScoreRoster() {
    const cid = document.getElementById('scan-class-select').value;
    const taskId = document.getElementById('scan-task-select').value;
    const div = document.getElementById('score-roster-grid');
    
    div.innerHTML = ''; 
    if(!cid || !taskId) return;
    
    const students = dataState.students
        .filter(s => s.classId == cid)
        .sort((a,b) => Number(a.no) - Number(b.no));
    
    students.forEach(student => { 
        const score = dataState.scores.find(x => x.studentId == student.id && x.taskId == taskId);
        const scoreValue = score ? score.score : '-';
        
        const el = document.createElement('div'); 
        el.className = `status-box ${score ? 'status-done' : 'status-none'} p-2 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all`; 
        el.addEventListener('click', () => { 
            pendingScore = { student, task: dataState.tasks.find(t => t.id == taskId) }; 
            document.getElementById('score-modal').classList.remove('hidden'); 
            document.getElementById('modal-task-name').textContent = pendingScore.task.name; 
            document.getElementById('modal-student-name').textContent = student.name; 
            document.getElementById('modal-max-score').textContent = pendingScore.task.maxScore; 
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
}

// Render attendance roster
function renderAttRoster() {
    const cid = document.getElementById('att-class-select').value;
    const div = document.getElementById('att-roster-grid');
    const date = document.getElementById('att-date-input').value;
    
    div.innerHTML = ''; 
    if(!cid) return;
    
    let presentCount = 0, leaveCount = 0, absentCount = 0;
    
    const students = dataState.students
        .filter(s => s.classId == cid)
        .sort((a,b) => Number(a.no) - Number(b.no));
    
    students.forEach(student => {
        const attendance = dataState.attendance.find(x => x.studentId == student.id && x.date.startsWith(date));
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
            if(attMode) {
                handleSave({action:'addAttendance', studentId:student.id, classId:cid, date:date, status:attMode});
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
}

// Render grade report
function renderGradeReport() {
    const cid = document.getElementById('report-class').value;
    const tbody = document.getElementById('report-table-body');
    
    tbody.innerHTML = ''; 
    if(!cid) return;
    
    const tasks = dataState.tasks.filter(t => t.classId == cid);
    const students = dataState.students
        .filter(s => s.classId == cid)
        .sort((a,b) => Number(a.no) - Number(b.no));
    
    students.forEach((student, idx) => {
        const { chapScores, midterm, final, total } = calculateScores(student.id, tasks, dataState.scores);
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
}

// Render incoming submissions
function renderIncomingSubmissions() {
    const container = document.getElementById('incoming-list'); 
    container.innerHTML = '';
    
    const pending = dataState.submissions.filter(submission => 
        !dataState.scores.some(score => score.taskId == submission.taskId && score.studentId == submission.studentId)
    );
    
    if(pending.length === 0) { 
        container.innerHTML = '<div class="text-center text-white/50 py-10">ไม่มีงานที่รอตรวจ</div>'; 
        return; 
    }
    
    pending.sort((a,b) => new Date(b.timestampISO) - new Date(a.timestampISO)).forEach(submission => {
        const task = dataState.tasks.find(t => t.id == submission.taskId);
        const student = dataState.students.find(s => s.id == submission.studentId);
        
        if(!task || !student) return;
        
        const className = dataState.classes.find(c => c.id == student.classId)?.name || '-';
        
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
                    <button onclick="submitGrade('${submission.id}', '${submission.studentId}', '${submission.taskId}', ${task.maxScore})" class="btn-blue px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 transition-all">
                        ให้คะแนน
                    </button>
                </div>
            </div>`;
    });
}

// Global functions
window.switchMainTab = function(tab) {
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
            refreshUI();
        }
    } else { 
        studentBtn.className = "px-6 py-2 rounded-full text-sm font-bold bg-white text-blue-900 shadow-lg"; 
        adminBtn.className = "px-6 py-2 rounded-full text-sm font-bold text-white/50 hover:text-white transition-all";
        
        // Show student login by default
        document.getElementById('student-login-wrapper').classList.remove('hidden');
        document.getElementById('student-dashboard').classList.add('hidden');
    }
};

window.switchAdminSubTab = function(tab) {
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
            renderIncomingSubmissions();
            break;
        case 'material':
            renderAdminMaterials(dataState.materials, dataState.subjects);
            break;
        case 'scan':
            updateScanTaskDropdown();
            renderScoreRoster();
            break;
        case 'attendance':
            renderAttRoster();
            break;
        case 'report':
            renderGradeReport();
            break;
    }
};

window.handleAdminLogout = function() {
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
};

window.renderScoreButtons = function() { 
    const container = document.getElementById('score-buttons-container'); 
    if(!container) return; 
    
    container.innerHTML=''; 
    
    [5,6,7,8,9,10].forEach(score => { 
        const button = document.createElement('button'); 
        button.textContent = score; 
        button.className = "btn-score py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all"; 
        button.addEventListener('click', () => setScoreMode(score)); 
        container.appendChild(button); 
    }); 
};

window.setScoreMode = function(mode) {
    scoreMode = mode; 
    
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
};

window.setAttMode = function(mode) {
    attMode = mode;
    
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
};

window.renderTaskClassCheckboxes = function() {
    const subjectId = document.getElementById('task-subject-filter').value; 
    const container = document.getElementById('task-class-checkboxes'); 
    
    container.innerHTML='';
    
    if(!subjectId) return;
    
    const classList = dataState.classes.filter(cls => cls.subjectId == subjectId);
    
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
};

window.submitGrade = function(subId, studentId, taskId, maxScore) {
    const input = document.getElementById(`grade-${subId}`);
    if(!input) return;
    
    const score = input.value;
    if(!score || Number(score) > Number(maxScore)) {
        showToast("คะแนนไม่ถูกต้อง", "error");
        return;
    }
    
    handleSave({ action:'addScore', studentId: studentId, taskId: taskId, score: score });
    input.value = '';
    showToast("ให้คะแนนเรียบร้อย", "success");
    
    // Refresh the submissions list
    renderIncomingSubmissions();
};

window.updateInboxBadge = function() {
    let count = 0; 
    dataState.submissions.forEach(submission => { 
        if(!dataState.scores.some(score => score.taskId == submission.taskId && score.studentId == submission.studentId)) {
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
};

window.checkSmartSchedule = function() {
    if(!dataState.schedules || dataState.schedules.length === 0) {
        const banner = document.getElementById('smart-att-banner');
        if(banner) banner.classList.add('hidden');
        return;
    }
    
    const now = new Date(); 
    const day = now.getDay(); // 0=อาทิตย์, 1=จันทร์, ...
    const timeStr = now.toTimeString().slice(0,5); 
    
    const currentPeriod = PERIODS.find(period => timeStr >= period.start && timeStr <= period.end);
    const banner = document.getElementById('smart-att-banner');
    
    if(currentPeriod && banner) {
        // Adjust day for schedule (schedule uses 1=จันทร์, but getDay() returns 0=อาทิตย์)
        let scheduleDay = day;
        if(scheduleDay === 0) scheduleDay = 6; // อาทิตย์ -> 6
        else scheduleDay = scheduleDay - 1; // จันทร์(1) -> 0
        
        const match = dataState.schedules.find(schedule => schedule.day == scheduleDay && schedule.period == currentPeriod.p);
        if(match) {
            const cls = dataState.classes.find(c => c.id == match.classId);
            if(cls) {
                banner.classList.remove('hidden');
                document.getElementById('smart-period').textContent = currentPeriod.p;
                document.getElementById('smart-class-name').textContent = cls.name;
                smartClassId = cls.id;
                return;
            }
        }
    }
    
    if(banner) banner.classList.add('hidden'); 
    smartClassId = null;
};

window.useSmartClass = function() { 
    if(smartClassId) { 
        const select = document.getElementById('att-class-select');
        if(select) {
            select.value = smartClassId; 
            renderAttRoster();
            showToast(`เลือกห้อง ${dataState.classes.find(c => c.id == smartClassId)?.name} แล้ว`, "success");
        }
    } 
};

window.handleStudentLogin = function() {
    if (!dataState.students || dataState.students.length === 0) {
        showToast("กำลังโหลดข้อมูล...", "info");
        return;
    }
    
    const studentCode = document.getElementById('student-login-id').value.trim();
    if(!studentCode) {
        showToast("กรุณากรอกรหัสนักเรียน", "warning");
        return;
    }
    
    const student = dataState.students.find(s => s.code == studentCode || Number(s.code) == Number(studentCode));
    if(!student) {
        showToast("ไม่พบรหัสนักเรียนนี้", "error");
        return;
    }
    
    // Show student dashboard
    document.getElementById('student-login-wrapper').classList.add('hidden');
    document.getElementById('student-dashboard').classList.remove('hidden');
    document.getElementById('std-dash-name').textContent = student.name;
    
    const className = dataState.classes.find(c => c.id == student.classId)?.name || '-';
    document.getElementById('std-dash-class').textContent = "ห้อง " + className;
    
    renderStudentDashboard(student);
    showToast("เข้าสู่ระบบสำเร็จ", "success");
};

window.renderStudentDashboard = function(student) {
    const container = document.getElementById('std-subjects-container'); 
    container.innerHTML = '';
    
    // Get student's class
    const studentClass = dataState.classes.find(c => c.id == student.classId);
    if (!studentClass) {
        container.innerHTML = '<div class="text-center text-white/50 py-10">ไม่พบข้อมูลห้องเรียน</div>';
        return;
    }
    
    // Get subject for this class
    const subject = dataState.subjects.find(s => s.id == studentClass.subjectId);
    if (!subject) {
        container.innerHTML = '<div class="text-center text-white/50 py-10">ไม่พบข้อมูลวิชา</div>';
        return;
    }
    
    // Get tasks for this class
    const tasks = dataState.tasks.filter(t => t.classId == student.classId && t.subjectId == subject.id);
    
    // Calculate scores
    const { chapScores, midterm, final, total } = calculateScores(student.id, tasks, dataState.scores);
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
                ${renderStudentTasks(student, tasks)}
            </div>
        </div>`;
    
    // Render attendance
    const attBody = document.getElementById('std-att-body');
    if(attBody) {
        const attendanceRecords = dataState.attendance
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
};

function renderStudentTasks(student, tasks) {
    if(!tasks || tasks.length === 0) {
        return '<div class="col-span-4 text-center text-white/50 py-2">ไม่มีงาน</div>';
    }
    
    return tasks.map(task => {
        const score = dataState.scores.find(s => s.studentId == student.id && s.taskId == task.id);
        const submission = dataState.submissions.find(s => s.studentId == student.id && s.taskId == task.id);
        
        let status = '';
        if(score) {
            status = `<span class="text-green-400 font-bold">${score.score}</span>`;
        } else if(submission) {
            status = '<span class="text-blue-400 text-xs">รอตรวจ</span>';
        } else {
            status = `<button class="bg-white/10 px-2 py-1 rounded text-[10px] hover:bg-white/20 transition-all" onclick="openSubmitModal('${task.id}','${student.id}')">
                ส่งงาน
            </button>`;
        }
        
        return `
            <div class="bg-white/5 p-2 rounded text-center hover:bg-white/10 transition-all">
                <div class="text-[10px] truncate mb-1" title="${task.name}">${task.name}</div>
                <div class="text-xs">${status}</div>
            </div>`;
    }).join('');
}

window.openSubmitModal = function(taskId, studentId) {
    const task = dataState.tasks.find(t => t.id == taskId);
    const student = dataState.students.find(s => s.id == studentId);
    
    if(!task || !student) {
        showToast("ไม่พบข้อมูลงาน", "error");
        return;
    }
    
    document.getElementById('submit-task-id').value = taskId;
    document.getElementById('submit-student-id').value = studentId;
    
    const className = dataState.classes.find(c => c.id == student.classId)?.name || '-';
    document.getElementById('submit-modal-title').textContent = `${task.name} (ห้อง ${className})`;
    
    // Render friend selector
    const container = document.getElementById('friend-selector-container');
    container.innerHTML = '';
    
    // Get classmates (excluding the student)
    const classmates = dataState.students
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
};

window.logoutStudent = function() { 
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
};

window.printOfficialReport = function() {
    const classId = document.getElementById('report-class').value;
    if(!classId) {
        showToast("กรุณาเลือกห้องก่อน", "warning");
        return;
    }
    
    const cls = dataState.classes.find(c => c.id == classId);
    const subject = cls ? dataState.subjects.find(s => s.id == cls.subjectId) : null;
    
    document.getElementById('print-subtitle').textContent = 
        `${subject ? subject.name : ''} ${cls ? cls.name : ''} - ${getThaiDateISO()}`;
    
    const tbody = document.getElementById('print-table-body');
    tbody.innerHTML = '';
    
    const tasks = dataState.tasks.filter(t => t.classId == classId);
    const students = dataState.students
        .filter(s => s.classId == classId)
        .sort((a,b) => Number(a.no) - Number(b.no));
    
    students.forEach((student, idx) => {
        const { chapScores, midterm, final, total } = calculateScores(student.id, tasks, dataState.scores);
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
};

window.exportAttendanceCSV = function() {
    const classId = document.getElementById('att-class-select').value;
    const date = document.getElementById('att-date-input').value;
    
    if(!classId) {
        showToast("กรุณาเลือกห้องก่อน", "warning");
        return;
    }
    
    const students = dataState.students
        .filter(s => s.classId == classId)
        .sort((a,b) => Number(a.no) - Number(b.no));
    
    let csv = "เลขที่,รหัสนักเรียน,ชื่อ-นามสกุล,สถานะ,วันที่\n";
    
    students.forEach(student => {
        const attendance = dataState.attendance.find(a => 
            a.studentId == student.id && a.date.startsWith(date));
        const status = attendance ? attendance.status : 'ไม่มีการบันทึก';
        
        csv += `${student.no},${student.code},"${student.name}",${status},${date}\n`;
    });
    
    // Create and download CSV file
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const className = dataState.classes.find(c => c.id == classId)?.name || 'class';
    link.setAttribute('download', `attendance_${className}_${date}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast("ดาวน์โหลดไฟล์ CSV เรียบร้อย", "success");
};

window.exportGradeCSV = function() {
    const classId = document.getElementById('report-class').value;
    if(!classId) {
        showToast("กรุณาเลือกห้องก่อน", "warning");
        return;
    }
    
    const tasks = dataState.tasks.filter(t => t.classId == classId);
    const students = dataState.students
        .filter(s => s.classId == classId)
        .sort((a,b) => Number(a.no) - Number(b.no));
    
    let csv = "เลขที่,รหัสนักเรียน,ชื่อ-นามสกุล,บท1,บท2,บท3,บท4,บท5,บท6,กลางภาค,ปลายภาค,รวม,เกรด\n";
    
    students.forEach(student => {
        const { chapScores, midterm, final, total } = calculateScores(student.id, tasks, dataState.scores);
        const grade = calGrade(total);
        
        csv += `${student.no},${student.code},"${student.name}",${chapScores.join(',')},${midterm},${final},${total},${grade}\n`;
    });
    
    // Create and download CSV file
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const className = dataState.classes.find(c => c.id == classId)?.name || 'class';
    link.setAttribute('download', `grades_${className}_${getThaiDateISO()}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast("ดาวน์โหลดไฟล์ CSV เรียบร้อย", "success");
};

// Make dataState available globally for UI functions
window.dataState = dataState;
window.saveLocalData = saveLocalData;
window.refreshUI = refreshUI;
