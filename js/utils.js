// Escape HTML special characters to prevent XSS
export function escapeHtml(text) {
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

// Get current Thai date in ISO format (YYYY-MM-DD)
export function getThaiDateISO() {
    const now = new Date();
    // Convert to Thailand time (UTC+7)
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    const year = thaiTime.getUTCFullYear();
    const month = String(thaiTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(thaiTime.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Format date string to Thai format (YYYY/MM/DD)
export function formatThaiDate(dateString) {
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
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${thaiYear}/${month}/${day}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

// Calculate grade from score
export function calGrade(score) {
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

// Calculate scores for a student
export function calculateScores(studentId, tasks, scores) {
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
