import { escapeHtml } from './utils.js';

// Show toast notification
export function showToast(message, type = 'success') {
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

// Show/hide loading indicator
export function showLoading(show = true) {
    const loader = document.getElementById('global-loader');
    if(loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// Render dropdown select
export function renderDropdown(id, list, placeholder = "-- เลือก --") {
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

// Render admin materials list
export function renderAdminMaterials(materials, subjects) {
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
                <button onclick="deleteMaterial('${material.id}')" class="text-red-400 hover:text-red-300 ml-2 p-2 rounded-full hover:bg-red-400/10 transition-all">
                    <i class="fa-solid fa-trash text-sm"></i>
                </button>
            </div>`;
    });
}

// Render schedule list
export function renderScheduleList(schedules, classes) {
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
                    <button onclick="deleteSchedule('${schedule.id}')" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-all">
                        <i class="fa-solid fa-times text-xs"></i>
                    </button>
                </div>
            </div>`;
    });
}

// Global functions for UI
window.deleteMaterial = function(materialId) {
    if (typeof Swal === 'undefined') {
        if (confirm('ลบเนื้อหานี้หรือไม่?')) {
            // Remove from local state
            const index = window.dataState.materials.findIndex(m => m.id == materialId);
            if (index !== -1) {
                window.dataState.materials.splice(index, 1);
                window.saveLocalData();
                window.refreshUI();
                showToast("ลบเนื้อหาเรียบร้อย", "success");
            }
        }
        return;
    }
    
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
            const index = window.dataState.materials.findIndex(m => m.id == materialId);
            if (index !== -1) {
                window.dataState.materials.splice(index, 1);
                window.saveLocalData();
                window.refreshUI();
                showToast("ลบเนื้อหาเรียบร้อย", "success");
            }
        }
    });
};

window.deleteSchedule = function(scheduleId) {
    if (typeof Swal === 'undefined') {
        if (confirm('ลบตารางสอนนี้หรือไม่?')) {
            // Remove from local state
            const index = window.dataState.schedules.findIndex(s => s.id == scheduleId);
            if (index !== -1) {
                window.dataState.schedules.splice(index, 1);
                window.saveLocalData();
                window.refreshUI();
                showToast("ลบตารางสอนเรียบร้อย", "success");
            }
        }
        return;
    }
    
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
            const index = window.dataState.schedules.findIndex(s => s.id == scheduleId);
            if (index !== -1) {
                window.dataState.schedules.splice(index, 1);
                window.saveLocalData();
                window.refreshUI();
                showToast("ลบตารางสอนเรียบร้อย", "success");
            }
        }
    });
};
