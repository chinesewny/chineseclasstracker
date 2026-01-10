// ChineseClass System - Main Application
// รวมทุกฟังก์ชันในไฟล์เดียวเพื่อหลีกเลี่ยงปัญหา reference

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

// ================ API FUNCTIONS ================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQNjMSE06u5xO4dtyipa5P-YzoaicppubdwlUgMpaX4L4TUjk3-xY2PRnzhS42AxZe/exec";

async function fetchData() {
    try {
        console.log('Fetching data from Google Script...');
        
        // ใช้ GET request ธรรมดา
        const url = `${GOOGLE_SCRIPT_URL}?action=getData&t=${new Date().getTime()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
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
            mode: 'cors',
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
    // ใช้ฟังก์ชันใน app object
    if (window.app && window.app.updateLocalState) {
        window.app.updateLocalState(p);
    } else {
        console.warn('app.updateLocalState not available yet');
    }
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
        
        // ตั้งค่า utility functions ให้ใช้ผ่าน window
        // ไม่ต้องตั้งค่าอีกเพราะฟังก์ชันถูกประกาศเป็น global อยู่แล้ว
        console.log('✅ Base functions ready');
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
    
    // Update local state 
    updateLocalState(p) {
        console.log('Updating local state for action:', p.action);
        
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
    },
    
   // ================ EVENT LISTENERS (แบบเต็ม) ================
    
initEventListeners() {
    console.log('🎯 Initializing event listeners...');
    
    // ================ TAB BUTTONS ================
    document.getElementById('tab-btn-admin')?.addEventListener('click', () => this.switchMainTab('admin'));
    document.getElementById('tab-btn-student')?.addEventListener('click', () => this.switchMainTab('student'));
    
    // ================ ADMIN LOGIN/LOGOUT ================
    // Admin logout
    document.getElementById('btn-admin-logout')?.addEventListener('click', () => this.handleAdminLogout());
    
    // Admin login form
    document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
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
    
    // ================ ADMIN MENU BUTTONS ================
    document.getElementById('menu-basic')?.addEventListener('click', () => this.switchAdminSubTab('basic'));
    document.getElementById('menu-scan')?.addEventListener('click', () => this.switchAdminSubTab('scan'));
    document.getElementById('menu-report')?.addEventListener('click', () => this.switchAdminSubTab('report'));
    document.getElementById('menu-homework')?.addEventListener('click', () => this.switchAdminSubTab('homework'));
    document.getElementById('menu-attendance')?.addEventListener('click', () => this.switchAdminSubTab('attendance'));
    document.getElementById('menu-material')?.addEventListener('click', () => this.switchAdminSubTab('material'));
    
    // ================ ADMIN FORMS ================
    // Form: เพิ่มวิชา
    document.getElementById('form-subject')?.addEventListener('submit', (e) => { 
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
    
    // Form: เพิ่มห้องเรียน
    document.getElementById('form-class')?.addEventListener('submit', (e) => { 
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
    
    // Form: เพิ่มนักเรียน
    document.getElementById('form-student')?.addEventListener('submit', (e) => { 
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
    
    // Form: สร้างงาน
    document.getElementById('form-task')?.addEventListener('submit', (e) => { 
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
    
    // Form: ตารางสอน
    document.getElementById('form-schedule')?.addEventListener('submit', (e) => {
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
    
    // Form: เนื้อหา
    document.getElementById('form-material')?.addEventListener('submit', (e) => {
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
    
    // ================ STUDENT SECTION ================
    // Student login
    document.getElementById('btn-student-login')?.addEventListener('click', () => this.handleStudentLogin());
    
    // Student logout
    document.getElementById('btn-student-logout')?.addEventListener('click', () => this.logoutStudent());
    
    // ================ SCAN & ATTENDANCE INPUTS ================
    // Scan score input
    document.getElementById('scan-score-input')?.addEventListener('keydown', (e) => {
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
    document.getElementById('att-scan-input')?.addEventListener('keydown', (e) => {
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
    
    // ================ ATTENDANCE MODE BUTTONS ================
    document.getElementById('btn-att-present')?.addEventListener('click', () => this.setAttMode('มา'));
    document.getElementById('btn-att-leave')?.addEventListener('click', () => this.setAttMode('ลา'));
    document.getElementById('btn-att-absent')?.addEventListener('click', () => this.setAttMode('ขาด'));
    
    // ================ SMART CLASS BUTTON ================
    document.getElementById('btn-use-smart-class')?.addEventListener('click', () => this.useSmartClass());
    
    // ================ EXPORT/PRINT BUTTONS ================
    document.getElementById('btn-export-attendance-csv')?.addEventListener('click', () => this.exportAttendanceCSV());
    document.getElementById('btn-print-report')?.addEventListener('click', () => this.printOfficialReport());
    document.getElementById('btn-export-grade-csv')?.addEventListener('click', () => this.exportGradeCSV());
    
    // ================ MODAL BUTTONS ================
    // Score modal
    document.getElementById('btn-modal-cancel')?.addEventListener('click', () => {
        document.getElementById('score-modal').classList.add('hidden');
    });
    
    document.getElementById('btn-modal-save')?.addEventListener('click', () => {
        const val = document.getElementById('modal-score-input').value;
        if(!val || Number(val) > Number(this.pendingScore.task.maxScore)) {
            showToast("คะแนนไม่ถูกต้อง", "error");
            return;
        }
        this.handleSave({action:'addScore', studentId:this.pendingScore.student.id, taskId:this.pendingScore.task.id, score:val});
        document.getElementById('score-modal').classList.add('hidden');
        showToast("บันทึกคะแนนสำเร็จ", "success");
    });
    
    document.getElementById('modal-score-input')?.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter') document.getElementById('btn-modal-save').click(); 
    });
    
    // Submit modal
    document.getElementById('btn-submit-cancel')?.addEventListener('click', () => {
        document.getElementById('submit-modal').classList.add('hidden');
    });
    
    document.getElementById('form-submit-work')?.addEventListener('submit', (e) => {
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
    
    // ================ SELECT CHANGE EVENTS ================
    document.getElementById('scan-class-select')?.addEventListener('change', () => { 
        this.updateScanTaskDropdown(); 
        this.renderScoreRoster(); 
    });
    
    document.getElementById('scan-task-select')?.addEventListener('change', () => this.renderScoreRoster());
    document.getElementById('att-class-select')?.addEventListener('change', () => this.renderAttRoster());
    document.getElementById('att-date-input')?.addEventListener('change', () => this.renderAttRoster());
    document.getElementById('report-class')?.addEventListener('change', () => this.renderGradeReport());
    document.getElementById('task-subject-filter')?.addEventListener('change', () => this.renderTaskClassCheckboxes());
    
    // ================ MANUAL SCORE BUTTONS ================
    document.getElementById('btn-score-manual')?.addEventListener('click', () => this.setScoreMode('manual'));
    
    // ================ CHAPTER CHECKBOXES ================
    // ตั้งค่า event listeners สำหรับ chapter checkboxes
    document.querySelectorAll('.chapter-checkbox').forEach(checkbox => {
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
    
    // ================ MANUAL SYNC BUTTON ================
    // เพิ่มปุ่ม manual sync ถ้ามี
    const manualSyncBtn = document.querySelector('[onclick*="manualSync"]');
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', () => this.manualSync());
    }
    
    // ================ IMPORT/EXPORT BUTTONS ================
    // Export data button
    const exportBtn = document.querySelector('[onclick*="exportData"]');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportData());
    }
    
    // Import data input
    const importInput = document.querySelector('input[type="file"][accept=".json"]');
    if (importInput) {
        importInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importData(e.target.files[0]);
            }
        });
    }
    
    // ================ DYNAMIC ELEMENT EVENT DELEGATION ================
    // สำหรับ elements ที่สร้างแบบ dynamic
    document.addEventListener('click', (e) => {
        // สำหรับปุ่ม submit grade ใน incoming submissions
        if (e.target.matches('button[onclick*="submitGrade"]') || 
            e.target.closest('button[onclick*="submitGrade"]')) {
            const button = e.target.matches('button') ? e.target : e.target.closest('button');
            const onclick = button.getAttribute('onclick');
            const match = onclick.match(/submitGrade\('([^']+)', '([^']+)', '([^']+)', (\d+)\)/);
            if (match) {
                e.preventDefault();
                this.submitGrade(match[1], match[2], match[3], match[4]);
            }
        }
        
        // สำหรับปุ่ม delete material/schedule
        if (e.target.matches('button[onclick*="deleteMaterial"]') || 
            e.target.closest('button[onclick*="deleteMaterial"]')) {
            const button = e.target.matches('button') ? e.target : e.target.closest('button');
            const onclick = button.getAttribute('onclick');
            const match = onclick.match(/deleteMaterial\('([^']+)'\)/);
            if (match) {
                e.preventDefault();
                this.deleteMaterial(match[1]);
            }
        }
        
        if (e.target.matches('button[onclick*="deleteSchedule"]') || 
            e.target.closest('button[onclick*="deleteSchedule"]')) {
            const button = e.target.matches('button') ? e.target : e.target.closest('button');
            const onclick = button.getAttribute('onclick');
            const match = onclick.match(/deleteSchedule\('([^']+)'\)/);
            if (match) {
                e.preventDefault();
                this.deleteSchedule(match[1]);
            }
        }
        
        // สำหรับปุ่ม open submit modal
        if (e.target.matches('button[onclick*="openSubmitModal"]') || 
            e.target.closest('button[onclick*="openSubmitModal"]')) {
            const button = e.target.matches('button') ? e.target : e.target.closest('button');
            const onclick = button.getAttribute('onclick');
            const match = onclick.match(/openSubmitModal\('([^']+)', '([^']+)'\)/);
            if (match) {
                e.preventDefault();
                this.openSubmitModal(match[1], match[2]);
            }
        }
    });
    
    // ================ FORM VALIDATION ================
    // เพิ่ม validation ให้กับ inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            const max = e.target.max;
            if (max && Number(value) > Number(max)) {
                e.target.value = max;
                showToast(`ค่าสูงสุดคือ ${max}`, "warning");
            }
        });
    });
    
    // ================ KEYBOARD SHORTCUTS ================
    document.addEventListener('keydown', (e) => {
        // ESC to close modals
        if (e.key === 'Escape') {
            if (!document.getElementById('score-modal').classList.contains('hidden')) {
                document.getElementById('score-modal').classList.add('hidden');
            }
            if (!document.getElementById('submit-modal').classList.contains('hidden')) {
                document.getElementById('submit-modal').classList.add('hidden');
            }
        }
        
        // Ctrl+S to save (ใน forms ที่ active)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            const activeForm = document.querySelector('form:focus-within');
            if (activeForm) {
                activeForm.dispatchEvent(new Event('submit'));
            }
        }
    });
    
    console.log('✅ Event listeners initialized');
},

// ================ SUPPORTING FUNCTIONS ================

// Handle save data
async handleSave(payload) {
    console.log('Saving data:', payload.action);
    
    // Optimistic local update
    this.updateLocalState(payload);
    
    try {
        // Send to server
        const result = await sendData(payload);
        console.log('Save successful:', result);
        
        // Show success message if not queued
        if (result.status !== 'queued') {
            showToast("บันทึกข้อมูลสำเร็จ", "success");
        }
        
        return result;
    } catch(e) {
        console.error('Save failed:', e);
        showToast("บันทึกไม่สำเร็จ (รอ Sync)", "error");
        throw e;
    }
},

// Set attendance mode
setAttMode(mode) {
    this.attMode = mode;
    
    // Reset all buttons
    document.getElementById('btn-att-present')?.classList.remove('btn-att-active-present');
    document.getElementById('btn-att-leave')?.classList.remove('btn-att-active-leave');
    document.getElementById('btn-att-absent')?.classList.remove('btn-att-active-absent');
    
    // Activate selected button
    if(mode === 'มา') {
        document.getElementById('btn-att-present')?.classList.add('btn-att-active-present');
    } else if(mode === 'ลา') {
        document.getElementById('btn-att-leave')?.classList.add('btn-att-active-leave');
    } else if(mode === 'ขาด') {
        document.getElementById('btn-att-absent')?.classList.add('btn-att-active-absent');
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
    
    // Show admin panel
    showAdminPanel(auto = false) {
        document.getElementById('admin-login-wrapper').classList.add('hidden');
        document.getElementById('admin-content-wrapper').classList.remove('hidden');
        this.refreshUI();
        if (!auto) this.appSync();
    },
    
    // เพิ่มฟังก์ชันอื่นๆ ที่ขาดหาย...
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
    
    // อื่นๆ...
    checkSmartSchedule() {
        // ฟังก์ชัน placeholder
        console.log('Checking smart schedule...');
    },
    
    updateInboxBadge() {
        // ฟังก์ชัน placeholder
        console.log('Updating inbox badge...');
    }
};

// ================ INITIALIZE APP WHEN DOM IS LOADED ================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, starting app initialization...');
    
    // เริ่มต้นแอปพลิเคชัน
    app.init();
    
    // แสดงสถานะเริ่มต้น
    const statusDiv = document.createElement('div');
    statusDiv.className = 'fixed bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full z-50 hidden';
    statusDiv.id = 'app-status';
    statusDiv.textContent = '🟢 ChineseClass Ready';
    document.body.appendChild(statusDiv);
    
    console.log('✅ App initialization complete');
});

// ================ GLOBAL ERROR HANDLING ================
window.addEventListener('error', function(e) {
    console.error('🚨 Global error:', e.error);
    
    // แสดง error ใน console เท่านั้น
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.error('Error details:', e.message, 'at', e.filename, ':', e.lineno);
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
