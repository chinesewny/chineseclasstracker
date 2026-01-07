export function getThaiDateISO() {
    const d = new Date();
    return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export function formatThaiDate(isoDate) {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function calGrade(score) {
    score = Number(score);
    if (score >= 80) return 4;
    if (score >= 75) return 3.5;
    if (score >= 70) return 3;
    if (score >= 65) return 2.5;
    if (score >= 60) return 2;
    if (score >= 55) return 1.5;
    if (score >= 50) return 1;
    return 0;
}

export function calculateScores(studentId, tasks, scores) {
    const chapScores = [0, 0, 0, 0, 0, 0];
    let midterm = 0, final = 0, total = 0;

    tasks.forEach(t => {
        const sc = scores.find(s => s.studentId == studentId && s.taskId == t.id);
        const val = sc ? Number(sc.score) : 0;
        
        if (t.category === 'บทที่') {
            let chaps = String(t.chapter).split(',');
            chaps.forEach(c => {
                let cIdx = Number(c) - 1;
                if (cIdx >= 0 && cIdx < 6) chapScores[cIdx] += val;
            });
        }
        else if (t.category === 'กลางภาค') midterm += val;
        else if (t.category === 'ปลายภาค') final += val;
    });

    const totalChap = chapScores.reduce((a, b) => a + b, 0); 
    total = totalChap + midterm + final;

    return { chapScores, midterm, final, total };
}

export function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}
