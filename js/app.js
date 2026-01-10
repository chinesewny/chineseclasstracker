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
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyBS-rZyl5AqMg-woHQSUbOv1xPqPdjrYCYFilNM0FXHOIsFyNQ8xxMvJp4B1Iry8vaOw/exec";

async function fetchData() {
    try {
        console.log('Fetching data from Google Script...');
        
        // ใช้ GET request ธรรมดา (Google Apps Script ควรอนุญาต CORS จากทุกที่)
        const url = `${GOOGLE_SCRIPT_URL}?action=getData&t=${new Date().getTime()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors', // ใช้ cors mode
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data fetched successfully:', data);
        return data;
        
    } catch (error) {
        console.error('Fetch Error:', error);
        // คืนค่าข้อมูลจาก localStorage เป็น fallback
        const localData = JSON.parse(localStorage.getItem('chineseclass_data') || '{}');
        return localData;
    }
}

async function sendData(payload) {
    try {
        console.log('Sending data to Google Script:', payload.action);
        
        // ใช้ POST request ธรรมดา
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors', // ใช้ cors mode
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Send successful:', data);
        return data;
        
    } catch (error) {
        console.error('Send Error:', error);
        
        // ถ้า offline หรือ CORS ยังมีปัญหา ให้เก็บใน local storage
        console.log('Storing data locally and queueing for sync...');
        
        // เก็บข้อมูลใน local storage
        updateLocalState(payload);
        saveLocalData();
        
        // เพิ่มลงใน queue สำหรับ sync ในภายหลัง
        addToSyncQueue(payload);
        
        return { 
            status: 'queued', 
            message: 'Data stored locally and queued for sync' 
        };
    }
}

// ฟังก์ชันช่วยสำหรับเก็บข้อมูลใน local storage
function saveLocalData() {
    localStorage.setItem('chineseclass_data', JSON.stringify(app.dataState));
    localStorage.setItem('chineseclass_last_sync', new Date().toISOString());
}

function updateLocalState(p) {
    switch(p.action) {
        case 'addSubject':
            if(!app.dataState.subjects.some(s => s.id === p.id)) {
                app.dataState.subjects.push({id: p.id, name: p.name});
            }
            break;
            
        case 'addClass':
            if(!app.dataState.classes.some(c => c.id === p.id)) {
                app.dataState.classes.push({id: p.id, name: p.name, subjectId: p.subjectId});
            }
            break;
            
        case 'addStudent':
            if(!app.dataState.students.some(s => s.id === p.id)) {
                app.dataState.students.push({
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
                if(!app.dataState.tasks.some(t => t.id === taskId)) {
                    app.dataState.tasks.push({
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
            const scoreIndex = app.dataState.scores.findIndex(s => s.studentId == p.studentId && s.taskId == p.taskId);
            if(scoreIndex >= 0) {
                app.dataState.scores[scoreIndex].score = p.score;
            } else {
                app.dataState.scores.push({
                    studentId: p.studentId, 
                    taskId: p.taskId, 
                    score: p.score
                });
            }
            app.updateInboxBadge();
            break;
            
        case 'addAttendance':
            const attIndex = app.dataState.attendance.findIndex(a => a.studentId == p.studentId && a.date == p.date);
            if(attIndex >= 0) {
                app.dataState.attendance[attIndex].status = p.status;
            } else {
                app.dataState.attendance.push({
                    studentId: p.studentId, 
                    classId: p.classId, 
                    date: p.date, 
                    status: p.status
                });
            }
            break;
            
        case 'submitTask':
            p.studentIds.forEach(sid => {
                const subIndex = app.dataState.submissions.findIndex(s => s.studentId == sid && s.taskId == p.taskId);
                if(subIndex >= 0) { 
                    app.dataState.submissions[subIndex].link = p.link; 
                    app.dataState.submissions[subIndex].timestampISO = new Date().toISOString();
                    app.dataState.submissions[subIndex].comment = p.comment;
                } else {
                    app.dataState.submissions.push({
                        taskId: p.taskId, 
                        studentId: sid, 
                        link: p.link, 
                        timestampISO: new Date().toISOString(), 
                        comment: p.comment
                    });
                }
            });
            app.updateInboxBadge();
            break;
            
        case 'addSchedule':
            if(!app.dataState.schedules.some(s => s.id === p.id)) {
                app.dataState.schedules.push({
                    id: p.id, 
                    day: p.day, 
                    period: p.period, 
                    classId: p.classId
                });
            }
            break;
            
        case 'addMaterial':
            if(!app.dataState.materials.some(m => m.id === p.id)) {
                app.dataState.materials.push({
                    id: p.id, 
                    subjectId: p.subjectId, 
                    title: p.title, 
                    link: p.link
                });
            }
            break;
    }
    
    // บันทึกลง local storage
    saveLocalData();
}

// Queue สำหรับข้อมูลที่ยังไม่ได้ sync
function addToSyncQueue(payload) {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({
        ...payload,
        timestamp: new Date().toISOString(),
        attempts: 0
    });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
}

// พยายาม sync ข้อมูลที่ค้างอยู่
async function trySyncQueue() {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    if (queue.length === 0) return;
    
    console.log(`Attempting to sync ${queue.length} queued items...`);
    
    const successful = [];
    const failed = [];
    
    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        
        try {
            const result = await sendData(item);
            if (result && result.status === 'success') {
                successful.push(item);
            } else {
                // เพิ่มจำนวนครั้งที่พยายาม
                item.attempts = (item.attempts || 0) + 1;
                if (item.attempts < 3) {
                    failed.push(item);
                } else {
                    console.log('Giving up on item after 3 attempts:', item);
                }
            }
        } catch (error) {
            console.error('Failed to sync item:', error);
            item.attempts = (item.attempts || 0) + 1;
            if (item.attempts < 3) {
                failed.push(item);
            }
        }
    }
    
    // อัปเดต queue
    localStorage.setItem('sync_queue', JSON.stringify(failed));
    
    if (successful.length > 0) {
        console.log(`Successfully synced ${successful.length} items`);
        showToast(`ซิงค์ข้อมูลสำเร็จ ${successful.length} รายการ`, "success");
    }
}

// ================ MAIN APPLICATION INITIALIZATION ================
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
    isOnline: navigator.onLine,
    
    PERIODS: [
        { p: 1, start: "08:30", end: "09:20" }, { p: 2, start: "09:20", end: "10:10" },
        { p: 3, start: "10:10", end: "11:00" }, { p: 4, start: "11:00", end: "11:50" },
        { p: 5, start: "11:50", end: "12:40" }, { p: 6, start: "12:40", end: "13:30" },
        { p: 7, start: "13:30", end: "14:20" }, { p: 8, start: "14:20", end: "15:10" }
    ],
    
    // ================ INITIALIZATION ================
    
    // Initialize application
    init() {
        console.log('🚀 Initializing ChineseClass app...');
        
        // ตั้งค่าเบื้องต้น
        this.setupBaseFunctions();
        
        // โหลดข้อมูลจาก local storage
        this.loadLocalData();
        
        // ตั้งค่า UI พื้นฐาน
        this.setupBasicUI();
        
        // ตั้งค่า event listeners
        this.initEventListeners();
        
        // ตั้งค่า network monitoring
        this.setupNetworkMonitoring();
        
        // ตรวจสอบการล็อกอิน
        this.checkLoginStatus();
        
        // ตั้งค่า timers และ intervals
        this.setupTimers();
        
        // ทำให้ app ใช้งานได้ global
        window.app = this;
        
        console.log('✅ App initialized successfully');
        console.log('📊 Data state:', this.dataState);
        
        return this;
    },
    
    // ตั้งค่า base functions
    setupBaseFunctions() {
        console.log('🔧 Setting up base functions...');
        
        // ตั้งค่า utility functions ให้ app
        window.getThaiDateISO = getThaiDateISO;
        window.formatThaiDate = formatThaiDate;
        window.calGrade = calGrade;
        window.calculateScores = calculateScores;
        window.escapeHtml = escapeHtml;
        
        // ตั้งค่า API functions
        window.fetchData = fetchData;
        window.sendData = sendData;
        window.updateLocalState = this.updateLocalState.bind(this);
        window.saveLocalData = this.saveLocalData.bind(this);
        window.addToSyncQueue = addToSyncQueue;
        window.trySyncQueue = trySyncQueue;
        
        // ตั้งค่า UI functions
        window.showToast = showToast;
        window.showLoading = showLoading;
        window.renderDropdown = renderDropdown;
        window.renderAdminMaterials = renderAdminMaterials;
        window.renderScheduleList = renderScheduleList;
    },
    
    // ตั้งค่า UI พื้นฐาน
    setupBasicUI() {
        console.log('🎨 Setting up basic UI...');
        
        // ตั้งค่าวันที่ปัจจุบันใน attendance input
        if (document.getElementById('att-date-input')) {
            document.getElementById('att-date-input').value = getThaiDateISO();
        }
        
        // ซ่อน global loader
        showLoading(false);
        
        // ตั้งค่า score buttons
        this.renderScoreButtons();
        
        // ตั้งค่าเริ่มต้นของ chapter checkboxes
        this.setupChapterCheckboxes();
        
        // ตั้งค่าเริ่มต้นของ friend selector
        this.setupFriendSelector();
    },
    
    // ตั้งค่า chapter checkboxes
    setupChapterCheckboxes() {
        const checkboxes = document.querySelectorAll('.chapter-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const div = this.nextElementSibling;
                if (this.checked) {
                    div.classList.remove('bg-black/30', 'text-white/50');
                    div.classList.add('bg-gradient-to-br', 'from-yellow-600', 'to-yellow-800', 'text-white');
                } else {
                    div.classList.remove('bg-gradient-to-br', 'from-yellow-600', 'to-yellow-800', 'text-white');
                    div.classList.add('bg-black/30', 'text-white/50');
                }
            });
        });
    },
    
    // ตั้งค่า friend selector
    setupFriendSelector() {
        const container = document.getElementById('friend-selector-container');
        if (container) {
            container.innerHTML = '<div class="text-center text-white/50 text-xs py-4">เลือกเพื่อนร่วมกลุ่ม (ถ้ามี)</div>';
        }
    },
    
    // โหลดข้อมูลจาก local storage
    loadLocalData() {
        console.log('📂 Loading local data...');
        
        // โหลดข้อมูลหลัก
        const backup = localStorage.getItem('wany_data_backup');
        if (backup) { 
            try {
                const parsed = JSON.parse(backup); 
                this.dataState = parsed.data; 
                console.log('📥 Loaded data from backup, timestamp:', new Date(parsed.timestamp).toLocaleString());
            } catch (error) {
                console.error('❌ Error parsing backup:', error);
                this.dataState = this.getDefaultDataState();
            }
        } else {
            console.log('📭 No backup found, using default data');
            this.dataState = this.getDefaultDataState();
        }
        
        // โหลด sync queue
        const syncQueue = localStorage.getItem('sync_queue');
        if (syncQueue) {
            try {
                const queue = JSON.parse(syncQueue);
                console.log(`📋 Loaded sync queue with ${queue.length} items`);
            } catch (error) {
                console.error('❌ Error parsing sync queue:', error);
                localStorage.setItem('sync_queue', JSON.stringify([]));
            }
        }
        
        // โหลด session
        const session = localStorage.getItem('wany_admin_session');
        if (session) {
            console.log('🔑 Admin session found');
        }
    },
    
    // ข้อมูลเริ่มต้น
    getDefaultDataState() {
        return {
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
        };
    },
    
    // บันทึกข้อมูลลง local storage
    saveLocalData() {
        localStorage.setItem('wany_data_backup', JSON.stringify({ 
            timestamp: Date.now(), 
            data: this.dataState 
        }));
        console.log('💾 Data saved to local storage');
    },
    
    // ตั้งค่า network monitoring
    setupNetworkMonitoring() {
        console.log('📡 Setting up network monitoring...');
        
        window.addEventListener('online', () => {
            console.log('🌐 Online - attempting to sync...');
            this.isOnline = true;
            showToast("เชื่อมต่อออนไลน์แล้ว - กำลังซิงค์ข้อมูล", "success");
            
            // พยายาม sync ทันที
            setTimeout(() => {
                this.appSync();
                trySyncQueue();
            }, 1000);
        });
        
        window.addEventListener('offline', () => {
            console.log('📴 Offline - using local data');
            this.isOnline = false;
            showToast("ออฟไลน์ - ใช้ข้อมูลในเครื่อง", "warning");
        });
        
        // ตรวจสอบสถานะ network ทุก 30 วินาที
        setInterval(() => {
            const currentOnline = navigator.onLine;
            if (currentOnline !== this.isOnline) {
                this.isOnline = currentOnline;
                console.log(`Network status changed: ${this.isOnline ? 'Online' : 'Offline'}`);
            }
        }, 30000);
    },
    
    // ตรวจสอบสถานะการล็อกอิน
    checkLoginStatus() {
        console.log('🔍 Checking login status...');
        
        const savedSession = localStorage.getItem('wany_admin_session');
        if (savedSession) {
            console.log('👨‍🏫 Admin is logged in');
            this.showAdminPanel(true);
        } else {
            console.log('👨‍🎓 Showing student section');
            this.switchMainTab('student');
            this.appSync();
        }
    },
    
    // ตั้งค่า timers
    setupTimers() {
        console.log('⏰ Setting up timers...');
        
        // ตรวจสอบ smart schedule ทุกนาที
        setInterval(() => this.checkSmartSchedule(), 60000);
        
        // พยายาม sync queue ทุก 2 นาที
        setInterval(() => {
            if (this.isOnline) {
                trySyncQueue();
            }
        }, 2 * 60 * 1000);
        
        // บันทึกข้อมูลอัตโนมัติทุก 1 นาที
        setInterval(() => {
            this.saveLocalData();
        }, 60 * 1000);
        
        // ตรวจสอบและทำความสะอาดข้อมูลเก่าทุก 5 นาที
        setInterval(() => {
            this.cleanupOldData();
        }, 5 * 60 * 1000);
    },
    
    // ทำความสะอาดข้อมูลเก่า
    cleanupOldData() {
        console.log('🧹 Cleaning up old data...');
        
        const now = Date.now();
        const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
        
        // ทำความสะอาด attendance เก่ากว่า 30 วัน (เก็บเฉพาะเดือนปัจจุบัน)
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        this.dataState.attendance = this.dataState.attendance.filter(att => {
            const attMonth = att.date ? att.date.slice(0, 7) : '';
            return attMonth === currentMonth;
        });
        
        console.log('🧼 Cleanup completed');
    },
    
    // ================ DATA SYNC FUNCTIONS ================
    
    // Sync ข้อมูลกับ server
    async appSync() {
        if (!this.isOnline) {
            console.log('📴 Skipping sync - offline');
            showToast("ออฟไลน์ - ไม่สามารถซิงค์ข้อมูลได้", "warning");
            return;
        }
        
        console.log('🔄 Syncing data with server...');
        showLoading(true);
        
        try {
            const json = await fetchData();
            if (json && (json.subjects !== undefined || json.data)) {
                // ถ้ามีโครงข้อมูลที่ถูกต้อง
                const serverData = json.data || json;
                this.mergeData(serverData);
                this.saveLocalData();
                this.refreshUI();
                console.log('✅ Sync successful');
                showToast("ข้อมูลอัพเดทแล้วจากเซิร์ฟเวอร์", "success");
            } else {
                console.log('⚠️ No valid data from server, using local data');
                showToast("ใช้ข้อมูลในเครื่อง (เซิร์ฟเวอร์ไม่ตอบสนอง)", "info");
            }
        } catch (e) {
            console.warn('❌ Sync failed:', e);
            showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
        } finally {
            showLoading(false);
        }
    },
    
    // ผสานข้อมูลจาก server กับ local
    mergeData(serverData) {
        console.log('🔄 Merging data with server data...');
        
        const mergeArrays = (local, server, key = 'id') => {
            if (!server || !Array.isArray(server)) return local;
            
            const merged = [...local];
            
            server.forEach(serverItem => {
                if (!serverItem) return;
                
                let index = -1;
                
                if (Array.isArray(key)) {
                    // Composite key
                    index = merged.findIndex(item => {
                        return key.every(k => {
                            const itemVal = item ? item[k] : undefined;
                            const serverVal = serverItem ? serverItem[k] : undefined;
                            return String(itemVal) === String(serverVal);
                        });
                    });
                } else {
                    // Single key
                    const itemKey = serverItem ? serverItem[key] : undefined;
                    index = merged.findIndex(item => {
                        const localKey = item ? item[key] : undefined;
                        return String(localKey) === String(itemKey);
                    });
                }
                
                if (index >= 0) {
                    // Update existing item
                    merged[index] = { ...merged[index], ...serverItem };
                } else {
                    // Add new item
                    merged.push(serverItem);
                }
            });
            
            return merged;
        };
        
        // ผสานแต่ละส่วนของข้อมูล
        this.dataState.subjects = mergeArrays(this.dataState.subjects, serverData.subjects, 'id');
        this.dataState.classes = mergeArrays(this.dataState.classes, serverData.classes, 'id');
        this.dataState.students = mergeArrays(this.dataState.students, serverData.students, 'id');
        this.dataState.tasks = mergeArrays(this.dataState.tasks, serverData.tasks, 'id');
        this.dataState.scores = mergeArrays(this.dataState.scores, serverData.scores, ['studentId', 'taskId']);
        this.dataState.attendance = mergeArrays(this.dataState.attendance, serverData.attendance, ['studentId', 'date']);
        this.dataState.submissions = mergeArrays(this.dataState.submissions, serverData.submissions, ['studentId', 'taskId']);
        this.dataState.materials = mergeArrays(this.dataState.materials, serverData.materials, 'id');
        this.dataState.schedules = mergeArrays(this.dataState.schedules, serverData.schedules, 'id');
        
        console.log('✅ Data merged successfully');
    },
    
    // Manual sync
    manualSync() {
        console.log('👆 Manual sync triggered');
        showToast("กำลังซิงค์ข้อมูลกับเซิร์ฟเวอร์...", "info");
        this.appSync();
    },
    
    // ================ UI REFRESH FUNCTIONS ================
    
    // Refresh UI ทั้งหมด
    refreshUI() {
        console.log('🎨 Refreshing UI...');
        
        try {
            // Render dropdowns
            renderDropdown('class-subject-ref', this.dataState.subjects);
            renderDropdown('student-class', this.dataState.classes);
            renderDropdown('scan-class-select', this.dataState.classes);
            renderDropdown('task-subject-filter', this.dataState.subjects);
            renderDropdown('report-class', this.dataState.classes);
            renderDropdown('att-class-select', this.dataState.classes);
            renderDropdown('mat-subject', this.dataState.subjects);
            renderDropdown('sch-class', this.dataState.classes);
            
            // Render schedule list
            renderScheduleList(this.dataState.schedules || [], this.dataState.classes);
            
            // Check smart schedule
            this.checkSmartSchedule();
            
            // Update inbox badge
            this.updateInboxBadge();
            
            // Refresh active panel ถ้ามี
            this.refreshActivePanel();
            
            console.log('✅ UI refreshed');
        } catch (error) {
            console.error('❌ Error refreshing UI:', error);
        }
    },
    
    // Refresh panel ที่กำลัง active อยู่
    refreshActivePanel() {
        const activePanel = document.querySelector('.admin-panel:not(.hidden)');
        if (!activePanel) return;
        
        const panelId = activePanel.id;
        console.log(`Refreshing active panel: ${panelId}`);
        
        switch(panelId) {
            case 'admin-panel-homework':
                this.renderIncomingSubmissions();
                break;
            case 'admin-panel-material':
                renderAdminMaterials(this.dataState.materials, this.dataState.subjects);
                break;
            case 'admin-panel-scan':
                this.updateScanTaskDropdown();
                this.renderScoreRoster();
                break;
            case 'admin-panel-attendance':
                this.renderAttRoster();
                break;
            case 'admin-panel-report':
                this.renderGradeReport();
                break;
        }
    },
    
    // ================ UPDATE LOCAL STATE ================
    
    // Update local state (เหมือนในโค้ดก่อนหน้า แต่ bind กับ this)
    updateLocalState(p) {
        // ใช้ switch case เดิม แต่เรียกผ่าน this.dataState
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
        
        // บันทึกข้อมูลทันที
        this.saveLocalData();
        
        // Refresh UI
        this.refreshUI();
    }
};

// ================ INITIALIZE APP WHEN DOM IS LOADED ================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, starting app initialization...');
    
    // เริ่มต้นแอปพลิเคชัน
    app.init();
    
    // แสดงสถานะเริ่มต้น
    const statusDiv = document.createElement('div');
    statusDiv.className = 'fixed bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full z-50';
    statusDiv.id = 'app-status';
    statusDiv.textContent = '🟢 ChineseClass Ready';
    document.body.appendChild(statusDiv);
    
    // อัพเดทสถานะทุก 30 วินาที
    setInterval(() => {
        const statusDiv = document.getElementById('app-status');
        if (statusDiv) {
            const dataCount = Object.values(app.dataState).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
            const syncQueue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
            const queueCount = syncQueue.length;
            
            let statusText = `📊 ${dataCount} items`;
            if (queueCount > 0) {
                statusText += ` | ⏳ ${queueCount} pending`;
            }
            if (!app.isOnline) {
                statusText += ' | 📴 Offline';
            }
            
            statusDiv.textContent = statusText;
        }
    }, 30000);
});

// ================ GLOBAL ERROR HANDLING ================
window.addEventListener('error', function(e) {
    console.error('🚨 Global error:', e.error);
    
    // แสดง error ใน UI (เฉพาะใน development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-900/90 text-white p-3 rounded-lg max-w-md z-50';
        errorDiv.innerHTML = `
            <div class="font-bold mb-1">Error:</div>
            <div class="text-sm mb-2">${e.message}</div>
            <div class="text-xs opacity-75">${e.filename}:${e.lineno}</div>
        `;
        document.body.appendChild(errorDiv);
        
        // ลบหลังจาก 10 วินาที
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }
});

// ================ SERVICE WORKER REGISTRATION ================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('🔧 ServiceWorker registered:', registration.scope);
            })
            .catch(function(err) {
                console.warn('⚠️ ServiceWorker registration failed:', err);
            });
    });
}

// ================ MAKE APP AVAILABLE GLOBALLY ================
window.app = app;
