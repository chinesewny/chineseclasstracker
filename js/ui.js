export function showToast(msg, type = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
    Toast.fire({ icon: type, title: msg });
}

export function showLoading(isLoading) {
    if (isLoading) {
        Swal.fire({
            title: 'กำลังโหลด...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    } else {
        Swal.close();
    }
}

export function renderDropdown(id, items, defaultText = null) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = defaultText ? `<option value="">${defaultText}</option>` : '';
    items.forEach(i => {
        el.innerHTML += `<option value="${i.id}">${i.name}</option>`;
    });
}

export function renderScheduleList(schedules, classes) {
    const container = document.getElementById('schedule-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    // เรียงวันและคาบ
    schedules.sort((a, b) => (a.day * 10 + a.period) - (b.day * 10 + b.period));
    
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'];
    
    schedules.forEach(s => {
        const cls = classes.find(c => c.id == s.classId);
        container.innerHTML += `
            <div class="flex justify-between items-center bg-white/5 p-3 rounded mb-2">
                <div>
                    <span class="text-yellow-400 font-bold">${days[s.day]}</span> 
                    <span class="text-white ml-2">คาบ ${s.period}</span>
                </div>
                <div class="text-blue-300 font-bold">${cls ? cls.name : '-'}</div>
            </div>
        `;
    });
}

export function renderAdminMaterials(materials, subjects) {
    const container = document.getElementById('mat-admin-list');
    if(!container) return;
    container.innerHTML = '';
    materials.forEach(m => {
        const subName = subjects.find(s => s.id == m.subjectId)?.name || '-';
        container.innerHTML += `
            <div class="p-3 bg-white/5 rounded flex justify-between items-center mb-2">
                <div>
                    <div class="text-xs text-yellow-400">${subName}</div>
                    <div class="text-white font-bold">${m.title}</div>
                </div>
                <a href="${m.link}" target="_blank" class="text-blue-400 text-xs">เปิดดู</a>
            </div>
        `;
    });
}
