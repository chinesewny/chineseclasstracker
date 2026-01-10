import { escapeHtml } from './utils.js';

export function showToast(message, type = 'success') {
    const Toast = Swal.mixin({
        toast: true, 
        position: 'bottom', 
        showConfirmButton: false, 
        timer: 3000,
        background: type === 'error' ? '#7f1d1d' : (type === 'warning' ? '#78350f' : '#064e3b'), 
        color: '#fff'
    });
    Toast.fire({ icon: type, title: message });
}

export function showLoading(show = true) {
    const loader = document.getElementById('global-loader');
    if(loader) loader.style.display = show ? 'flex' : 'none';
}

export function renderDropdown(id, list, placeholder = "-- เลือก --") {
    const el = document.getElementById(id);
    if (!el) return;
    
    const currentVal = el.value;
    el.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
    
    list.forEach(item => {
        const opt = document.createElement('option');
        opt.value = escapeHtml(item.id);
        opt.textContent = escapeHtml(item.name);
        el.appendChild(opt);
    });
    
    // Restore previous value if it exists in new list
    if(currentVal && list.some(item => String(item.id) === String(currentVal))) {
        el.value = currentVal;
    }
}

export function renderAdminMaterials(materials, subjects) {
    const div = document.getElementById('admin-mat-list');
    if(!div) return;
    
    div.innerHTML = '';
    
    if(!materials || materials.length === 0) {
        div.innerHTML = '<div class="text-center text-white/50 py-10">ไม่มีเนื้อหา</div>';
        return;
    }
    
    materials.forEach(m => {
        const sub = subjects.find(s => s.id == m.subjectId)?.name || '-';
        div.innerHTML += `
            <div class="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <div>
                    <div class="text-xs text-yellow-400">${escapeHtml(sub)}</div>
                    <div class="font-bold text-sm text-white">
                        <a href="${escapeHtml(m.link)}" target="_blank" class="hover:underline hover:text-blue-300">
                            ${escapeHtml(m.title)}
                        </a>
                    </div>
                </div>
                <button onclick="deleteMaterial('${m.id}')" class="text-red-400 hover:text-red-300 text-sm">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>`;
    });
}

export function renderScheduleList(schedules, classes) {
    const div = document.getElementById('schedule-list');
    if(!div) return;
    
    div.innerHTML = '';
    
    if(!schedules || schedules.length === 0) {
        div.innerHTML = '<div class="text-center text-white/50 py-4">ไม่มีตารางสอน</div>';
        return;
    }
    
    const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
    
    schedules.sort((a,b) => (a.day - b.day) || (a.period - b.period)).forEach(s => {
        const clsName = classes.find(c=>c.id==s.classId)?.name || '?';
        div.innerHTML += `
            <div class="flex justify-between items-center text-xs text-white/70 bg-white/5 p-2 rounded border border-white/5 mb-1">
                <span>${days[s.day]} คาบ ${s.period}</span> 
                <span class="text-yellow-400 font-bold">${escapeHtml(clsName)}</span>
                <button onclick="deleteSchedule('${s.id}')" class="text-red-400 hover:text-red-300 text-xs">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>`;
    });
}

// Global functions for UI
window.deleteMaterial = (id) => {
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
            const index = window.dataState.materials.findIndex(m => m.id == id);
            if (index !== -1) {
                window.dataState.materials.splice(index, 1);
                window.saveLocalData();
                window.refreshUI();
                showToast("ลบเนื้อหาเรียบร้อย", "success");
            }
        }
    });
};

window.deleteSchedule = (id) => {
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
            const index = window.dataState.schedules.findIndex(s => s.id == id);
            if (index !== -1) {
                window.dataState.schedules.splice(index, 1);
                window.saveLocalData();
                window.refreshUI();
                showToast("ลบตารางสอนเรียบร้อย", "success");
            }
        }
    });
};
