export function escapeHtml(text) {
    if (!text) return text;
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function getThaiDateISO() {
    const d = new Date();
    const u = d.getTime() + (d.getTimezoneOffset() * 60000);
    const b = new Date(u + (7 * 3600000));
    return b.toISOString().slice(0, 10);
}

export function formatThaiDate(dateString) {
    if (!dateString) return "-";
    if (dateString.includes('T') || dateString.includes('Z')) {
        const d = new Date(dateString);
        return `${d.getFullYear() + 543}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    }
    const [year, month, day] = dateString.split('-');
    return `${parseInt(year) + 543}/${month}/${day}`;
}

export function calGrade(s) {
    const score = Number(s);
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
    let chapData = Array(6).fill().map(() => ({ earn: 0, max: 0 }));
    let midterm = 0, final = 0, totalScore = 0;
    
    tasks.forEach(t => {
        const scoreLog = scores.find(x => x.studentId == studentId && x.taskId == t.id);
        const score = scoreLog ? Number(scoreLog.score) : 0;
        const max = Number(t.maxScore);
        
        if (t.category === 'accum') {
            const chapters = t.chapter ? t.chapter.toString().split(',') : [];
            if (chapters.length > 0) {
                const splitMax = max / chapters.length;
                const splitScore = score / chapters.length;
                chapters.forEach(c => {
                    const idx = parseInt(c) - 1;
                    if (idx >= 0 && idx < 6) {
                        chapData[idx].max += splitMax;
                        chapData[idx].earn += splitScore;
                    }
                });
            }
        } else if (t.category === 'midterm') midterm += score;
        else if (t.category === 'final') final += score;
        
        if (t.category === 'special') totalScore += score;
    });

    const chapScores = chapData.map(d => {
        if (d.max > 0) {
            return parseFloat((d.earn / d.max * 10).toFixed(1));
        }
        return 0;
    });
    
    totalScore += chapScores.reduce((a, b) => a + b, 0) + midterm + final;
    totalScore = parseFloat(totalScore.toFixed(1));
    
    return { chapScores, midterm, final, total: totalScore };
}
