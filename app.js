// ==========================================
// Aplikacja Testowa - Główna logika
// ==========================================

// Stan aplikacji
const AppState = {
    tests: [],
    results: [],
    activeSessions: [], // Sesje w toku
    currentQuiz: null,
    currentQuestionIndex: 0,
    userAnswers: [],
    importedQuestions: [],
    userNotes: {}, // Przechowuje notatki użytkownika: { testId: { questionId: { question: '', answers: {} } } }
    currentReviewResult: null, // Aktualnie przeglądany wynik
    editMode: false // Tryb edycji w przeglądzie
};

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initializeNavigation();
    initializeAddTestSection();
    initializeQuizSection();
    renderTestsList();
    renderResultsList();
});

// ==========================================
// Nawigacja
// ==========================================

function initializeNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Aktualizuj zakładki nawigacji
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Aktualizuj zawartość
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
}

function showScreen(screenId) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    // Ukryj aktywną zakładkę w nawigacji gdy pokazujemy quiz
    if (screenId === 'quiz-screen' || screenId === 'result-screen') {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
    }
}

// ==========================================
// Sekcja: Dodaj test
// ==========================================

function initializeAddTestSection() {
    const csvFileInput = document.getElementById('csv-file');
    const saveTestBtn = document.getElementById('save-test');
    const clearFormBtn = document.getElementById('clear-form');
    const downloadTemplateBtn = document.getElementById('download-template');
    const parseCSVTextBtn = document.getElementById('parse-csv-text');
    
    csvFileInput.addEventListener('change', handleCSVUpload);
    saveTestBtn.addEventListener('click', saveTest);
    clearFormBtn.addEventListener('click', clearForm);
    downloadTemplateBtn.addEventListener('click', downloadCSVTemplate);
    parseCSVTextBtn.addEventListener('click', handleCSVPaste);
    
    // Obsługa zakładek importu
    initializeImportTabs();
}

function initializeImportTabs() {
    const importTabs = document.querySelectorAll('.import-tab');
    
    importTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const importType = tab.dataset.import;
            
            // Aktualizuj aktywną zakładkę
            importTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Pokaż odpowiednią zawartość
            document.querySelectorAll('.import-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`import-${importType}`).classList.add('active');
        });
    });
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('file-name').textContent = `📄 ${file.name}`;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        parseCSV(content);
    };
    reader.readAsText(file, 'UTF-8');
}

function handleCSVPaste() {
    const textarea = document.getElementById('csv-textarea');
    const content = textarea.value.trim();
    
    if (!content) {
        alert('Wklej zawartość CSV w pole tekstowe!');
        return;
    }
    
    parseCSV(content);
}

function parseCSV(content) {
    const lines = content.trim().split('\n');
    const questions = [];
    
    if (lines.length < 2) {
        alert('Plik CSV musi zawierać nagłówek i co najmniej jedno pytanie!');
        return;
    }
    
    // Parsuj nagłówek, żeby wykryć liczbę odpowiedzi
    const headerLine = lines[0].trim();
    let headerParts;
    if (headerLine.includes(';')) {
        headerParts = headerLine.split(';');
    } else {
        headerParts = parseCSVLine(headerLine);
    }
    
    // Znajdź indeks kolumny "poprawna" w nagłówku
    let correctColumnIndex = -1;
    for (let i = 0; i < headerParts.length; i++) {
        const col = headerParts[i].trim().toLowerCase();
        if (col === 'poprawna' || col === 'correct' || col === 'prawidlowa') {
            correctColumnIndex = i;
            break;
        }
    }
    
    // Jeśli nie znaleziono kolumny "poprawna", użyj wartości z formularza
    let answersCount;
    if (correctColumnIndex > 0) {
        answersCount = correctColumnIndex - 1; // Liczba odpowiedzi = indeks "poprawna" - 1 (bo pytanie jest na pozycji 0)
    } else {
        answersCount = parseInt(document.getElementById('answers-count').value) || 4;
        correctColumnIndex = answersCount + 1;
    }
    
    // Zaktualizuj pole formularza
    document.getElementById('answers-count').value = answersCount;
    
    console.log(`Wykryto ${answersCount} odpowiedzi, kolumna "poprawna" na indeksie ${correctColumnIndex}`);
    
    // Pomijamy pierwszy wiersz (nagłówek)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Obsługa różnych separatorów (średnik lub przecinek)
        let parts;
        if (line.includes(';')) {
            parts = line.split(';');
        } else {
            parts = parseCSVLine(line);
        }
        
        // Minimalna liczba kolumn: pytanie + odpowiedzi + poprawna
        const minColumns = 1 + answersCount + 1;
        
        if (parts.length >= minColumns) {
            // Zbierz odpowiedzi (od indeksu 1 do answersCount)
            const answers = [];
            for (let j = 1; j <= answersCount; j++) {
                if (parts[j] && parts[j].trim()) {
                    answers.push(parts[j].trim());
                }
            }
            
            // Indeks kolumny z poprawną odpowiedzią
            const correctIdx = correctColumnIndex;
            
            // Zbierz notatki (jeśli są)
            const questionNoteIndex = correctColumnIndex + 1;
            const answerNotes = [];
            for (let j = 0; j < answersCount; j++) {
                const noteIndex = questionNoteIndex + 1 + j;
                answerNotes.push(parts[noteIndex] ? parts[noteIndex].trim() : '');
            }
            
            const question = {
                id: Date.now() + i,
                text: parts[0].trim(),
                answers: answers,
                correct: parts[correctIdx] ? parts[correctIdx].trim().split(',').map(n => parseInt(n.trim()) - 1) : [0],
                // Notatki z CSV (opcjonalne)
                questionNote: parts[questionNoteIndex] ? parts[questionNoteIndex].trim() : '',
                answerNotes: answerNotes
            };
            questions.push(question);
        }
    }
    
    AppState.importedQuestions = questions;
    renderQuestionsPreview(questions);
    
    // Włącz przycisk zapisywania jeśli są pytania
    document.getElementById('save-test').disabled = questions.length === 0;
}

// Parsowanie linii CSV z obsługą cudzysłowów
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    
    return result;
}

function renderQuestionsPreview(questions) {
    const preview = document.getElementById('questions-preview');
    
    if (questions.length === 0) {
        preview.innerHTML = '<p class="empty-state">Nie udało się zaimportować pytań. Sprawdź format pliku CSV.</p>';
        return;
    }
    
    console.log('Podgląd pytań:', questions);
    
    preview.innerHTML = questions.map((q, index) => {
        console.log(`Pytanie ${index + 1}: ${q.answers.length} odpowiedzi`, q.answers);
        
        const answersHtml = q.answers.map((a, i) => {
            const isCorrect = q.correct.includes(i);
            const hasNote = q.answerNotes && q.answerNotes[i];
            return `<span class="${isCorrect ? 'correct' : ''}">${String.fromCharCode(65 + i)}) ${a}${isCorrect ? ' ✓' : ''}${hasNote ? ' 📝' : ''}</span>`;
        }).join(' | ');
        
        const hasQuestionNote = q.questionNote ? ' 📝' : '';
        
        return `
            <div class="preview-question">
                <strong>Pytanie ${index + 1}${hasQuestionNote}:</strong> ${q.text}
                <div class="preview-answers">${answersHtml}</div>
            </div>
        `;
    }).join('');
}

function saveTest() {
    const testName = document.getElementById('test-name').value.trim();
    const testType = document.getElementById('test-type').value;
    const answersCount = parseInt(document.getElementById('answers-count').value) || 4;
    
    if (!testName) {
        alert('Podaj nazwę testu!');
        return;
    }
    
    if (AppState.importedQuestions.length === 0) {
        alert('Zaimportuj pytania z pliku CSV!');
        return;
    }
    
    const test = {
        id: Date.now(),
        name: testName,
        type: testType,
        answersCount: answersCount,
        questions: AppState.importedQuestions,
        createdAt: new Date().toISOString()
    };
    
    AppState.tests.push(test);
    saveToLocalStorage();
    clearForm();
    renderTestsList();
    
    alert('Test został zapisany!');
    switchTab('tests');
}

function clearForm() {
    document.getElementById('test-name').value = '';
    document.getElementById('test-type').value = 'single';
    document.getElementById('answers-count').value = '4';
    document.getElementById('csv-file').value = '';
    document.getElementById('file-name').textContent = '';
    document.getElementById('csv-textarea').value = '';
    document.getElementById('questions-preview').innerHTML = 
        '<p class="empty-state">Zaimportuj plik CSV lub wklej tekst, aby zobaczyć pytania</p>';
    document.getElementById('save-test').disabled = true;
    AppState.importedQuestions = [];
}

function downloadCSVTemplate() {
    // Pobierz liczbę odpowiedzi z formularza
    const answersCount = parseInt(document.getElementById('answers-count').value) || 4;
    
    // Generuj nagłówek dynamicznie
    let header = 'pytanie';
    for (let i = 1; i <= answersCount; i++) {
        header += `;odpowiedz${i}`;
    }
    header += ';poprawna;notatka_pytania';
    for (let i = 1; i <= answersCount; i++) {
        header += `;notatka${i}`;
    }
    
    // Generuj przykładowe wiersze
    const examples = [];
    
    // Przykład 1
    let ex1 = 'Ile to 2+2?';
    const ans1 = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    for (let i = 0; i < answersCount; i++) {
        ex1 += `;${ans1[i] || ''}`;
    }
    ex1 += ';3;Podstawowe działanie';
    for (let i = 0; i < answersCount; i++) {
        ex1 += `;${i === 2 ? 'Poprawna!' : ''}`;
    }
    examples.push(ex1);
    
    // Przykład 2
    let ex2 = 'Stolica Polski to?';
    const ans2 = ['Kraków', 'Warszawa', 'Gdańsk', 'Poznań', 'Wrocław', 'Łódź', 'Lublin', 'Katowice', 'Szczecin', 'Bydgoszcz'];
    for (let i = 0; i < answersCount; i++) {
        ex2 += `;${ans2[i] || ''}`;
    }
    ex2 += ';2;Pytanie o geografię';
    for (let i = 0; i < answersCount; i++) {
        ex2 += `;${i === 1 ? 'Obecna stolica!' : ''}`;
    }
    examples.push(ex2);
    
    const template = header + '\n' + examples.join('\n');
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'szablon_testu.csv';
    link.click();
}

// ==========================================
// Sekcja: Lista testów
// ==========================================

function renderTestsList() {
    const container = document.getElementById('tests-list');
    
    if (AppState.tests.length === 0) {
        container.innerHTML = '<p class="empty-state">Nie masz jeszcze żadnych testów. Dodaj pierwszy test!</p>';
        return;
    }
    
    container.innerHTML = AppState.tests.map(test => {
        const date = new Date(test.createdAt).toLocaleDateString('pl-PL');
        const typeLabel = test.type === 'multiple' ? 'Wielokrotny wybór' : 'Jednokrotny wybór';
        
        // Sprawdź czy jest aktywna sesja
        const activeSession = getActiveSession(test.id);
        
        let sessionInfo = '';
        let actionButtons = '';
        
        if (activeSession) {
            const progress = activeSession.currentQuestionIndex + 1;
            const total = activeSession.totalQuestions;
            const progressPercent = Math.round((progress / total) * 100);
            const savedDate = new Date(activeSession.savedAt).toLocaleString('pl-PL');
            
            sessionInfo = `
                <div class="session-in-progress">
                    <div class="session-badge">⏸️ W toku</div>
                    <div class="session-progress">
                        <span>Pytanie ${progress} z ${total}</span>
                        <div class="session-progress-bar">
                            <div class="session-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                    <div class="session-saved">Zapisano: ${savedDate}</div>
                </div>
            `;
            
            actionButtons = `
                <button class="btn btn-success" onclick="startQuiz(${test.id})">
                    ▶️ Kontynuuj
                </button>
                <button class="btn btn-secondary btn-small" onclick="abandonSession(${test.id})" title="Zacznij od nowa">
                    🔄
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteTest(${test.id})">
                    🗑️
                </button>
            `;
        } else {
            actionButtons = `
                <button class="btn btn-success" onclick="startQuiz(${test.id})">
                    ▶️ Rozpocznij
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteTest(${test.id})">
                    🗑️
                </button>
            `;
        }
        
        return `
            <div class="test-card ${activeSession ? 'has-session' : ''}">
                <div class="test-info">
                    <h3>${escapeHtml(test.name)}</h3>
                    <div class="test-meta">
                        <span>📝 ${test.questions.length} pytań</span>
                        <span>📋 ${typeLabel}</span>
                        <span>� ${test.answersCount || 4} odp.</span>
                        <span>�📅 ${date}</span>
                    </div>
                    ${sessionInfo}
                </div>
                <div class="test-actions">
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');
}

function deleteTest(testId) {
    if (!confirm('Czy na pewno chcesz usunąć ten test?')) return;
    
    AppState.tests = AppState.tests.filter(t => t.id !== testId);
    saveToLocalStorage();
    renderTestsList();
}

// ==========================================
// Sekcja: Quiz
// ==========================================

function initializeQuizSection() {
    document.getElementById('prev-question').addEventListener('click', previousQuestion);
    document.getElementById('next-question').addEventListener('click', nextQuestion);
    document.getElementById('quit-quiz').addEventListener('click', quitQuiz);
    document.getElementById('retry-test').addEventListener('click', retryTest);
    document.getElementById('back-to-tests').addEventListener('click', () => switchTab('tests'));
    document.getElementById('show-answers-review').addEventListener('click', showCurrentQuizReview);
    document.getElementById('close-review').addEventListener('click', closeReview);
}

function startQuiz(testId) {
    const test = AppState.tests.find(t => t.id === testId);
    if (!test) return;
    
    // Sprawdź czy jest zapisana sesja
    const existingSession = AppState.activeSessions.find(s => s.testId === testId);
    
    AppState.currentQuiz = test;
    
    if (existingSession) {
        // Wznów sesję
        AppState.currentQuestionIndex = existingSession.currentQuestionIndex;
        AppState.userAnswers = existingSession.userAnswers;
    } else {
        // Nowa sesja
        AppState.currentQuestionIndex = 0;
        AppState.userAnswers = new Array(test.questions.length).fill(null).map(() => []);
    }
    
    document.getElementById('quiz-title').textContent = test.name;
    
    showScreen('quiz-screen');
    renderCurrentQuestion();
}

function renderCurrentQuestion() {
    const quiz = AppState.currentQuiz;
    const questionIndex = AppState.currentQuestionIndex;
    const question = quiz.questions[questionIndex];
    const totalQuestions = quiz.questions.length;
    
    // Aktualizuj postęp
    document.getElementById('quiz-progress-text').textContent = 
        `Pytanie ${questionIndex + 1} z ${totalQuestions}`;
    document.getElementById('progress-fill').style.width = 
        `${((questionIndex + 1) / totalQuestions) * 100}%`;
    
    // Aktualizuj pytanie
    document.getElementById('question-number').textContent = questionIndex + 1;
    document.getElementById('question-text').textContent = question.text;
    
    // Pobierz notatki (z CSV lub użytkownika)
    const userNotes = getUserNotes(quiz.id, question.id);
    const questionNote = userNotes.question || question.questionNote || '';
    
    // Aktualizuj notatkę pytania
    const questionNoteEl = document.getElementById('question-note');
    const noteToggleBtn = document.querySelector('.note-toggle-btn');
    
    questionNoteEl.innerHTML = parseMarkdown(questionNote);
    questionNoteEl.classList.add('hidden');
    
    if (questionNote) {
        noteToggleBtn.classList.add('has-note');
    } else {
        noteToggleBtn.classList.remove('has-note');
    }
    
    // Renderuj odpowiedzi
    const answersContainer = document.getElementById('answers-list');
    const userAnswer = AppState.userAnswers[questionIndex];
    const isMultiple = quiz.type === 'multiple';
    
    answersContainer.innerHTML = question.answers.map((answer, i) => {
        const letter = String.fromCharCode(65 + i);
        const isSelected = userAnswer.includes(i);
        const answerNote = userNotes.answers[i] || (question.answerNotes ? question.answerNotes[i] : '') || '';
        const hasNote = answerNote.length > 0;
        
        return `
            <div class="answer-option-wrapper">
                <div class="answer-option ${isSelected ? 'selected' : ''}" 
                     onclick="selectAnswer(${i})"
                     data-index="${i}">
                    <span class="answer-letter">${letter}</span>
                    <span class="answer-text">${escapeHtml(answer)}</span>
                    <div class="answer-note-actions" onclick="event.stopPropagation()">
                        <button class="answer-note-btn ${hasNote ? 'has-note' : ''}" 
                                onclick="toggleAnswerNote(${i})" 
                                title="Pokaż/ukryj notatkę">
                            📝
                        </button>
                        <button class="answer-note-btn" 
                                onclick="editAnswerNote(${i})" 
                                title="Edytuj notatkę">
                            ✏️
                        </button>
                    </div>
                    ${isMultiple ? `<input type="checkbox" ${isSelected ? 'checked' : ''} style="display:none">` : ''}
                </div>
                <div id="answer-note-${i}" class="answer-note hidden">${parseMarkdown(answerNote)}</div>
            </div>
        `;
    }).join('');
    
    // Aktualizuj przyciski nawigacji
    document.getElementById('prev-question').disabled = questionIndex === 0;
    
    const nextBtn = document.getElementById('next-question');
    if (questionIndex === totalQuestions - 1) {
        nextBtn.textContent = '✓ Zakończ test';
        nextBtn.classList.remove('btn-primary');
        nextBtn.classList.add('btn-success');
    } else {
        nextBtn.textContent = 'Dalej →';
        nextBtn.classList.add('btn-primary');
        nextBtn.classList.remove('btn-success');
    }
    
    // Renderuj matematykę KaTeX po załadowaniu DOM
    setTimeout(() => {
        renderAllMath();
    }, 10);
}

function selectAnswer(answerIndex) {
    const quiz = AppState.currentQuiz;
    const questionIndex = AppState.currentQuestionIndex;
    
    if (quiz.type === 'multiple') {
        // Wielokrotny wybór
        const currentAnswers = AppState.userAnswers[questionIndex];
        const index = currentAnswers.indexOf(answerIndex);
        
        if (index === -1) {
            currentAnswers.push(answerIndex);
        } else {
            currentAnswers.splice(index, 1);
        }
    } else {
        // Jednokrotny wybór
        AppState.userAnswers[questionIndex] = [answerIndex];
    }
    
    // Zapisz sesję po każdej odpowiedzi
    saveActiveSession();
    
    renderCurrentQuestion();
}

function previousQuestion() {
    if (AppState.currentQuestionIndex > 0) {
        AppState.currentQuestionIndex--;
        saveActiveSession();
        renderCurrentQuestion();
    }
}

function nextQuestion() {
    const quiz = AppState.currentQuiz;
    
    if (AppState.currentQuestionIndex < quiz.questions.length - 1) {
        AppState.currentQuestionIndex++;
        saveActiveSession();
        renderCurrentQuestion();
    } else {
        finishQuiz();
    }
}

function quitQuiz() {
    if (confirm('Czy na pewno chcesz przerwać test? Twój postęp zostanie zapisany i będziesz mógł kontynuować później.')) {
        saveActiveSession();
        renderTestsList(); // Odśwież listę testów aby pokazać sesję w toku
        switchTab('tests');
    }
}

function finishQuiz() {
    const quiz = AppState.currentQuiz;
    let correctCount = 0;
    
    quiz.questions.forEach((question, index) => {
        const userAnswer = AppState.userAnswers[index].sort().join(',');
        const correctAnswer = question.correct.sort().join(',');
        
        if (userAnswer === correctAnswer) {
            correctCount++;
        }
    });
    
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
    // Zapisz wynik
    const result = {
        id: Date.now(),
        testId: quiz.id,
        testName: quiz.name,
        score: correctCount,
        total: totalQuestions,
        percentage: percentage,
        date: new Date().toISOString(),
        // Zapisz pytania i odpowiedzi do podglądu
        questions: quiz.questions.map((q, idx) => ({
            id: q.id,
            text: q.text,
            answers: q.answers,
            correct: q.correct,
            userAnswer: AppState.userAnswers[idx] || []
        }))
    };
    
    AppState.results.push(result);
    AppState.lastResult = result; // Zachowaj ostatni wynik do podglądu
    
    // Usuń sesję w toku (test zakończony)
    removeActiveSession(quiz.id);
    
    saveToLocalStorage();
    renderResultsList(); // Odśwież listę wyników
    
    // Pokaż ekran wyniku
    showResultScreen(correctCount, totalQuestions, percentage);
}

function showResultScreen(score, total, percentage) {
    let icon, title, message;
    
    if (percentage >= 80) {
        icon = '🎉';
        title = 'Gratulacje!';
        message = 'Świetna robota! Tak trzymaj!';
    } else if (percentage >= 60) {
        icon = '👍';
        title = 'Dobra robota!';
        message = 'Całkiem nieźle, ale możesz jeszcze poprawić wynik!';
    } else if (percentage >= 40) {
        icon = '📚';
        title = 'Może być lepiej';
        message = 'Spróbuj jeszcze raz i popraw swój wynik!';
    } else {
        icon = '💪';
        title = 'Nie poddawaj się!';
        message = 'Powtórz materiał i spróbuj ponownie!';
    }
    
    document.getElementById('result-icon').textContent = icon;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-score').textContent = `${score}/${total}`;
    document.getElementById('result-percentage').textContent = `${percentage}%`;
    document.getElementById('result-message').textContent = message;
    
    showScreen('result-screen');
}

function retryTest() {
    if (AppState.currentQuiz) {
        startQuiz(AppState.currentQuiz.id);
    }
}

// ==========================================
// Sekcja: Wyniki
// ==========================================

function renderResultsList() {
    const container = document.getElementById('results-list');
    
    if (AppState.results.length === 0) {
        container.innerHTML = '<p class="empty-state">Brak wyników. Rozwiąż test, aby zobaczyć wyniki!</p>';
        return;
    }
    
    // Sortuj wyniki od najnowszych
    const sortedResults = [...AppState.results].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    container.innerHTML = sortedResults.map(result => {
        const date = new Date(result.date).toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let percentageClass = '';
        if (result.percentage < 40) percentageClass = 'low';
        else if (result.percentage < 70) percentageClass = 'medium';
        
        const hasDetails = result.questions && result.questions.length > 0;
        
        return `
            <div class="result-item">
                <div class="result-item-info">
                    <h3>${escapeHtml(result.testName)}</h3>
                    <div class="result-item-date">📅 ${date}</div>
                </div>
                <div class="result-item-score">
                    <span class="value">${result.score}/${result.total}</span>
                    <span class="label">Punkty</span>
                </div>
                <div class="result-item-percentage">
                    <span class="value ${percentageClass}">${result.percentage}%</span>
                    <span class="label">Wynik</span>
                </div>
                <div class="result-item-actions">
                    <button class="btn ${hasDetails ? 'btn-primary' : 'btn-secondary'} btn-small" onclick="${hasDetails ? `showReviewFromHistory(${result.id})` : `alert('Brak szczegółów dla tego wyniku. Podgląd dostępny tylko dla nowych testów.')`}">
                        🔍 Podgląd
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteResult(${result.id})">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteResult(resultId) {
    if (!confirm('Czy na pewno chcesz usunąć ten wynik?')) return;
    
    AppState.results = AppState.results.filter(r => r.id !== resultId);
    saveToLocalStorage();
    renderResultsList();
}

// ==========================================
// Podgląd odpowiedzi
// ==========================================

function showCurrentQuizReview() {
    if (AppState.lastResult) {
        showReviewScreen(AppState.lastResult);
    }
}

function showReviewFromHistory(resultId) {
    const result = AppState.results.find(r => r.id === resultId);
    if (result && result.questions) {
        showReviewScreen(result);
    } else {
        alert('Brak zapisanych szczegółów dla tego wyniku. Podgląd jest dostępny tylko dla nowych testów.');
    }
}

function showReviewScreen(result) {
    document.getElementById('review-title').textContent = `Podgląd: ${result.testName}`;
    
    // Zapisz aktualny wynik do edycji
    AppState.currentReviewResult = result;
    
    renderReviewList(result);
    
    // Zapisz skąd przyszliśmy
    AppState.reviewReturnTo = document.querySelector('.tab-content.active')?.id || 'results';
    
    showScreen('review-screen');
}

function renderReviewList(result) {
    let correctCount = 0;
    let incorrectCount = 0;
    
    const reviewHtml = result.questions.map((q, index) => {
        const userAnswer = q.userAnswer || [];
        const correctAnswer = q.correct || [];
        
        // Sprawdź czy odpowiedź jest poprawna
        const isQuestionCorrect = 
            userAnswer.length === correctAnswer.length &&
            userAnswer.sort().join(',') === correctAnswer.sort().join(',');
        
        if (isQuestionCorrect) {
            correctCount++;
        } else {
            incorrectCount++;
        }
        
        const answersHtml = q.answers.map((answer, i) => {
            const isCorrect = correctAnswer.includes(i);
            const isSelected = userAnswer.includes(i);
            const isWrong = isSelected && !isCorrect;
            
            let classes = 'review-answer';
            if (isSelected) classes += ' user-selected';
            if (isCorrect) classes += ' is-correct';
            if (isWrong) classes += ' is-wrong';
            
            const letter = String.fromCharCode(65 + i);
            
            let icons = '';
            if (isSelected && isCorrect) icons = '✓ Twoja odpowiedź';
            else if (isSelected && !isCorrect) icons = '✗ Twoja odpowiedź';
            else if (isCorrect && !isSelected) icons = '✓ Poprawna';
            
            return `
                <div class="${classes}" data-question-index="${index}" data-answer-index="${i}">
                    <span class="review-answer-letter">${letter}</span>
                    <span class="review-answer-text">${escapeHtml(answer)}</span>
                    <span class="review-answer-icons">${icons}</span>
                </div>
            `;
        }).join('');
        
        return `
            <div class="review-item ${isQuestionCorrect ? 'correct' : 'incorrect'}" data-question-index="${index}">
                <div class="review-question-header">
                    <span class="review-question-number">${index + 1}</span>
                    <span class="review-question-text">${escapeHtml(q.text)}</span>
                    <button class="review-edit-btn" onclick="editQuestion(${index})">✏️</button>
                    <span class="review-question-status">${isQuestionCorrect ? '✅' : '❌'}</span>
                </div>
                <div class="review-answers">
                    ${answersHtml}
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('review-correct').textContent = correctCount;
    document.getElementById('review-incorrect').textContent = incorrectCount;
    document.getElementById('review-list').innerHTML = reviewHtml;
}

function editQuestion(questionIndex) {
    const result = AppState.currentReviewResult;
    if (!result || !result.questions[questionIndex]) return;
    
    const question = result.questions[questionIndex];
    showQuestionEditModal(questionIndex, question);
}

// Aliasy dla kompatybilności
function editQuestionText(questionIndex) {
    editQuestion(questionIndex);
}

function editAnswerText(questionIndex, answerIndex) {
    editQuestion(questionIndex);
}

function updateOriginalTest(testId, questionIndex, type, newValue, answerIndex = null, newCorrect = null) {
    // Znajdź oryginalny test
    const test = AppState.tests.find(t => t.id === testId);
    if (!test || !test.questions[questionIndex]) return;
    
    if (type === 'text') {
        test.questions[questionIndex].text = newValue;
    } else if (type === 'answer' && answerIndex !== null) {
        test.questions[questionIndex].answers[answerIndex] = newValue;
    } else if (type === 'correct' && newCorrect !== null) {
        test.questions[questionIndex].correct = newCorrect;
    } else if (type === 'full') {
        // Pełna aktualizacja
        test.questions[questionIndex].text = newValue.text;
        test.questions[questionIndex].answers = newValue.answers;
        test.questions[questionIndex].correct = newValue.correct;
    }
    
    // Zapisz zmiany
    saveToLocalStorage();
    
    // Zaktualizuj też inne wyniki z tym testem
    AppState.results.forEach(r => {
        if (r.testId === testId && r.questions && r.questions[questionIndex]) {
            if (type === 'text') {
                r.questions[questionIndex].text = newValue;
            } else if (type === 'answer' && answerIndex !== null) {
                r.questions[questionIndex].answers[answerIndex] = newValue;
            } else if (type === 'correct' && newCorrect !== null) {
                r.questions[questionIndex].correct = newCorrect;
            } else if (type === 'full') {
                r.questions[questionIndex].text = newValue.text;
                r.questions[questionIndex].answers = newValue.answers;
                r.questions[questionIndex].correct = newValue.correct;
            }
        }
    });
    
    saveToLocalStorage();
}

function showQuestionEditModal(questionIndex, question) {
    const existingModal = document.querySelector('.edit-modal-overlay');
    if (existingModal) existingModal.remove();
    
    const answersHtml = question.answers.map((answer, i) => {
        const letter = String.fromCharCode(65 + i);
        const isCorrect = question.correct.includes(i);
        
        return `
            <div class="edit-answer-row">
                <label class="edit-correct-checkbox">
                    <input type="checkbox" 
                           id="edit-correct-${i}" 
                           ${isCorrect ? 'checked' : ''}>
                    <span class="checkmark ${isCorrect ? 'is-correct' : ''}">✓</span>
                </label>
                <span class="edit-answer-letter">${letter}</span>
                <input type="text" 
                       id="edit-answer-${i}" 
                       class="edit-answer-input" 
                       value="${escapeHtml(answer)}" 
                       placeholder="Odpowiedź ${letter}">
            </div>
        `;
    }).join('');
    
    const modalHtml = `
        <div class="edit-modal-overlay" onclick="closeEditModal(event)">
            <div class="question-edit-modal" onclick="event.stopPropagation()">
                <h3>✏️ Edycja pytania ${questionIndex + 1}</h3>
                
                <div class="edit-section">
                    <label>Treść pytania:</label>
                    <textarea id="edit-question-text" placeholder="Wpisz treść pytania...">${escapeHtml(question.text)}</textarea>
                </div>
                
                <div class="edit-section">
                    <label>Odpowiedzi <span class="edit-hint">(zaznacz poprawne):</span></label>
                    <div class="edit-answers-list">
                        ${answersHtml}
                    </div>
                </div>
                
                <div class="edit-modal-actions">
                    <button class="btn btn-secondary" onclick="closeEditModal()">Anuluj</button>
                    <button class="btn btn-primary" onclick="saveReviewQuestionEdit(${questionIndex})">💾 Zapisz zmiany</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('edit-question-text').focus();
    
    // Dodaj obsługę zmiany checkboxów
    question.answers.forEach((_, i) => {
        document.getElementById(`edit-correct-${i}`).addEventListener('change', (e) => {
            const checkmark = e.target.nextElementSibling;
            if (e.target.checked) {
                checkmark.classList.add('is-correct');
            } else {
                checkmark.classList.remove('is-correct');
            }
        });
    });
}

function saveReviewQuestionEdit(questionIndex) {
    console.log('saveReviewQuestionEdit called with index:', questionIndex);
    
    const result = AppState.currentReviewResult;
    if (!result) {
        console.error('No currentReviewResult!');
        return;
    }
    
    const question = result.questions[questionIndex];
    if (!question) {
        console.error('No question at index:', questionIndex);
        return;
    }
    
    // Pobierz nowe wartości
    const questionTextEl = document.getElementById('edit-question-text');
    if (!questionTextEl) {
        console.error('Cannot find edit-question-text element');
        return;
    }
    
    const newText = questionTextEl.value.trim();
    const newAnswers = [];
    const newCorrect = [];
    
    question.answers.forEach((_, i) => {
        const answerInput = document.getElementById(`edit-answer-${i}`);
        const correctCheckbox = document.getElementById(`edit-correct-${i}`);
        
        if (answerInput) {
            newAnswers.push(answerInput.value.trim() || `Odpowiedź ${String.fromCharCode(65 + i)}`);
        }
        
        if (correctCheckbox && correctCheckbox.checked) {
            newCorrect.push(i);
        }
    });
    
    console.log('New values:', { newText, newAnswers, newCorrect });
    
    // Walidacja - musi być przynajmniej jedna poprawna odpowiedź
    if (newCorrect.length === 0) {
        alert('Musisz zaznaczyć przynajmniej jedną poprawną odpowiedź!');
        return;
    }
    
    if (!newText) {
        alert('Treść pytania nie może być pusta!');
        return;
    }
    
    // Aktualizuj w wyniku
    question.text = newText;
    question.answers = newAnswers;
    question.correct = newCorrect;
    
    // Aktualizuj w oryginalnym teście
    updateOriginalTest(result.testId, questionIndex, 'full', {
        text: newText,
        answers: newAnswers,
        correct: newCorrect
    });
    
    console.log('Closing modal...');
    
    // Zamknij modal
    const modal = document.querySelector('.edit-modal-overlay');
    if (modal) {
        modal.remove();
    }
    
    console.log('Rerendering list...');
    
    // Przerenderuj listę
    renderReviewList(result);
    
    console.log('Done!');
}

function showEditModal(title, currentValue, onSave) {
    const existingModal = document.querySelector('.edit-modal-overlay');
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
        <div class="edit-modal-overlay note-modal-overlay" onclick="closeEditModal(event)">
            <div class="note-modal" onclick="event.stopPropagation()">
                <h3>${escapeHtml(title)}</h3>
                <textarea id="edit-modal-input" placeholder="Wpisz tekst...">${escapeHtml(currentValue)}</textarea>
                <div class="note-modal-actions">
                    <button class="btn btn-secondary" onclick="closeEditModal()">Anuluj</button>
                    <button class="btn btn-primary" onclick="saveEditFromModal()">Zapisz</button>
                </div>
            </div>
        </div>
    `;

    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.currentEditCallback = onSave;
    document.getElementById('edit-modal-input').focus();
}

function closeEditModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.querySelector('.edit-modal-overlay');
    if (modal) modal.remove();
    window.currentEditCallback = null;
}

function saveEditFromModal() {
    const input = document.getElementById('edit-modal-input');
    const newValue = input.value.trim();
    
    const callback = window.currentEditCallback;
    window.currentEditCallback = null;
    
    const modal = document.querySelector('.edit-modal-overlay');
    if (modal) modal.remove();
    
    if (callback) callback(newValue);
}

function closeReview() {
    const returnTo = AppState.reviewReturnTo || 'results';
    
    if (returnTo === 'result-screen') {
        showScreen('result-screen');
    } else {
        switchTab('results');
    }
}

// ==========================================
// Sesje w toku
// ==========================================

function saveActiveSession() {
    if (!AppState.currentQuiz) return;
    
    const testId = AppState.currentQuiz.id;
    
    // Usuń starą sesję jeśli istnieje
    AppState.activeSessions = AppState.activeSessions.filter(s => s.testId !== testId);
    
    // Dodaj nową sesję
    const session = {
        testId: testId,
        testName: AppState.currentQuiz.name,
        currentQuestionIndex: AppState.currentQuestionIndex,
        totalQuestions: AppState.currentQuiz.questions.length,
        userAnswers: AppState.userAnswers,
        savedAt: new Date().toISOString()
    };
    
    AppState.activeSessions.push(session);
    saveToLocalStorage();
}

function removeActiveSession(testId) {
    AppState.activeSessions = AppState.activeSessions.filter(s => s.testId !== testId);
    saveToLocalStorage();
}

function getActiveSession(testId) {
    return AppState.activeSessions.find(s => s.testId === testId);
}

function abandonSession(testId) {
    if (confirm('Czy na pewno chcesz porzucić tę sesję? Postęp zostanie utracony.')) {
        removeActiveSession(testId);
        renderTestsList();
    }
}

// ==========================================
// Edycja pytania
// ==========================================

function openEditQuestionModal() {
    const quiz = AppState.currentQuiz;
    const question = quiz.questions[AppState.currentQuestionIndex];
    
    const answersHtml = question.answers.map((answer, i) => {
        const letter = String.fromCharCode(65 + i);
        const isCorrect = question.correct.includes(i);
        
        return `
            <div class="edit-answer-row">
                <span class="edit-answer-letter">${letter}</span>
                <input type="text" id="edit-answer-${i}" value="${escapeHtml(answer)}" placeholder="Odpowiedź ${letter}">
                <label class="correct-checkbox">
                    <input type="checkbox" id="edit-correct-${i}" ${isCorrect ? 'checked' : ''}>
                    ✓
                </label>
            </div>
        `;
    }).join('');
    
    const modalHtml = `
        <div class="note-modal-overlay" onclick="closeEditQuestionModal(event)">
            <div class="edit-modal" onclick="event.stopPropagation()">
                <h3>✏️ Edytuj pytanie</h3>
                
                <div class="edit-form-group">
                    <label for="edit-question-text">Treść pytania:</label>
                    <textarea id="edit-question-text" rows="3">${escapeHtml(question.text)}</textarea>
                </div>
                
                <div class="edit-answers-section">
                    <h4>Odpowiedzi:</h4>
                    ${answersHtml}
                </div>
                
                <div class="edit-modal-actions">
                    <button class="btn btn-secondary" onclick="closeEditQuestionModal()">Anuluj</button>
                    <button class="btn btn-primary" onclick="saveQuestionEdit()">💾 Zapisz</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('edit-question-text').focus();
}

function closeEditQuestionModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.querySelector('.note-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function saveQuestionEdit() {
    const quiz = AppState.currentQuiz;
    const questionIndex = AppState.currentQuestionIndex;
    const question = quiz.questions[questionIndex];
    
    // Pobierz nową treść pytania
    const newQuestionText = document.getElementById('edit-question-text').value.trim();
    
    if (!newQuestionText) {
        alert('Treść pytania nie może być pusta!');
        return;
    }
    
    // Pobierz nowe odpowiedzi
    const newAnswers = [];
    const newCorrect = [];
    
    for (let i = 0; i < question.answers.length; i++) {
        const answerInput = document.getElementById(`edit-answer-${i}`);
        const correctCheckbox = document.getElementById(`edit-correct-${i}`);
        
        if (answerInput && answerInput.value.trim()) {
            newAnswers.push(answerInput.value.trim());
            if (correctCheckbox && correctCheckbox.checked) {
                newCorrect.push(newAnswers.length - 1);
            }
        }
    }
    
    if (newAnswers.length < 2) {
        alert('Pytanie musi mieć co najmniej 2 odpowiedzi!');
        return;
    }
    
    if (newCorrect.length === 0) {
        alert('Zaznacz co najmniej jedną poprawną odpowiedź!');
        return;
    }
    
    // Zaktualizuj pytanie
    question.text = newQuestionText;
    question.answers = newAnswers;
    question.correct = newCorrect;
    
    // Znajdź test w AppState.tests i zaktualizuj
    const testIndex = AppState.tests.findIndex(t => t.id === quiz.id);
    if (testIndex !== -1) {
        AppState.tests[testIndex].questions[questionIndex] = question;
    }
    
    // Zapisz do localStorage
    saveToLocalStorage();
    
    // Zamknij modal i odśwież pytanie
    closeEditQuestionModal();
    renderCurrentQuestion();
}

// ==========================================
// LocalStorage
// ==========================================

function saveToLocalStorage() {
    localStorage.setItem('testApp_tests', JSON.stringify(AppState.tests));
    localStorage.setItem('testApp_results', JSON.stringify(AppState.results));
    localStorage.setItem('testApp_userNotes', JSON.stringify(AppState.userNotes));
    localStorage.setItem('testApp_activeSessions', JSON.stringify(AppState.activeSessions));
}

function loadFromLocalStorage() {
    try {
        const tests = localStorage.getItem('testApp_tests');
        const results = localStorage.getItem('testApp_results');
        const userNotes = localStorage.getItem('testApp_userNotes');
        const activeSessions = localStorage.getItem('testApp_activeSessions');
        
        if (tests) AppState.tests = JSON.parse(tests);
        if (results) AppState.results = JSON.parse(results);
        if (userNotes) AppState.userNotes = JSON.parse(userNotes);
        if (activeSessions) AppState.activeSessions = JSON.parse(activeSessions);
    } catch (e) {
        console.error('Błąd podczas ładowania danych:', e);
    }
}

// ==========================================
// Pomocnicze
// ==========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Parsowanie Markdown z obsługą LaTeX/KaTeX
function parseMarkdown(text) {
    if (!text) return '';
    
    let result = text;
    
    // Sprawdź czy marked.js jest załadowany
    if (typeof marked !== 'undefined' && marked.parse) {
        try {
            // Konfiguracja marked.js
            marked.setOptions({
                breaks: true,  // Zamienia \n na <br>
                gfm: true      // GitHub Flavored Markdown
            });
            result = marked.parse(text);
        } catch (e) {
            console.error('Błąd parsowania Markdown:', e);
            result = escapeHtml(text).replace(/\n/g, '<br>');
        }
    } else {
        result = escapeHtml(text).replace(/\n/g, '<br>');
    }
    
    return result;
}

// Renderowanie KaTeX na elemencie
function renderKaTeXInElement(element) {
    // Sprawdź czy KaTeX auto-render jest załadowany
    if (typeof window.renderMathInElement === 'function' && typeof katex !== 'undefined') {
        try {
            window.renderMathInElement(element, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '\\[', right: '\\]', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false}
                ],
                throwOnError: false,
                errorColor: '#cc0000'
            });
        } catch (e) {
            console.error('Błąd renderowania KaTeX:', e);
        }
    }
}

// Renderowanie matematyki we wszystkich notatkach
function renderAllMath() {
    // Renderuj matematykę w notatkach pytań
    const questionNote = document.getElementById('question-note');
    if (questionNote) {
        renderKaTeXInElement(questionNote);
    }
    
    // Renderuj matematykę w notatkach odpowiedzi
    document.querySelectorAll('.answer-note').forEach(note => {
        renderKaTeXInElement(note);
    });
}

// ==========================================
// Notatki
// ==========================================

function getUserNotes(testId, questionId) {
    if (!AppState.userNotes[testId]) {
        AppState.userNotes[testId] = {};
    }
    if (!AppState.userNotes[testId][questionId]) {
        AppState.userNotes[testId][questionId] = { question: '', answers: {} };
    }
    return AppState.userNotes[testId][questionId];
}

function saveUserNote(testId, questionId, type, index, note) {
    const notes = getUserNotes(testId, questionId);
    
    if (type === 'question') {
        notes.question = note;
    } else {
        notes.answers[index] = note;
    }
    
    saveToLocalStorage();
}

function toggleQuestionNote() {
    const noteEl = document.getElementById('question-note');
    noteEl.classList.toggle('hidden');
}

function editQuestionNote() {
    const quiz = AppState.currentQuiz;
    const question = quiz.questions[AppState.currentQuestionIndex];
    const userNotes = getUserNotes(quiz.id, question.id);
    const currentNote = userNotes.question || question.questionNote || '';
    
    showNoteModal('Notatka do pytania', currentNote, (newNote) => {
        saveUserNote(quiz.id, question.id, 'question', null, newNote);
        renderCurrentQuestion();
    });
}

function toggleAnswerNote(answerIndex) {
    const noteEl = document.getElementById(`answer-note-${answerIndex}`);
    if (noteEl) {
        noteEl.classList.toggle('hidden');
    }
}

function editAnswerNote(answerIndex) {
    const quiz = AppState.currentQuiz;
    const question = quiz.questions[AppState.currentQuestionIndex];
    const userNotes = getUserNotes(quiz.id, question.id);
    const currentNote = userNotes.answers[answerIndex] || 
                       (question.answerNotes ? question.answerNotes[answerIndex] : '') || '';
    
    const letter = String.fromCharCode(65 + answerIndex);
    
    showNoteModal(`Notatka do odpowiedzi ${letter}`, currentNote, (newNote) => {
        saveUserNote(quiz.id, question.id, 'answer', answerIndex, newNote);
        renderCurrentQuestion();
    });
}

function showNoteModal(title, currentValue, onSave) {
    // Usuń istniejący modal jeśli jest
    const existingModal = document.querySelector('.note-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHtml = `
        <div class="note-modal-overlay" onclick="closeNoteModal(event)">
            <div class="note-modal" onclick="event.stopPropagation()">
                <h3>${escapeHtml(title)}</h3>
                <textarea id="note-modal-input" placeholder="Wpisz notatkę... (obsługuje Markdown i LaTeX)">${escapeHtml(currentValue)}</textarea>
                <div class="markdown-hint">
                    💡 <strong>Markdown:</strong> 
                    <code>**pogrubienie**</code> 
                    <code>*kursywa*</code> 
                    <code>\`kod\`</code> 
                    <code>- lista</code><br>
                    📐 <strong>Matematyka:</strong>
                    <code>$x^2$</code> inline,
                    <code>\\[E=mc^2\\]</code> blok,
                    <code>\\sqrt{x}</code>, <code>\\frac{a}{b}</code>
                </div>
                <div class="note-modal-actions">
                    <button class="btn btn-secondary" onclick="closeNoteModal()">Anuluj</button>
                    <button class="btn btn-primary" onclick="saveNoteFromModal()">Zapisz</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Zapisz callback
    window.currentNoteCallback = onSave;
    
    // Focus na textarea
    document.getElementById('note-modal-input').focus();
}

function closeNoteModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.querySelector('.note-modal-overlay');
    if (modal) {
        modal.remove();
    }
    // NIE resetuj callback tutaj - zostanie zresetowany w saveNoteFromModal
}

function saveNoteFromModal() {
    const input = document.getElementById('note-modal-input');
    const newNote = input.value.trim();
    
    // Zapisz callback przed zamknięciem modalu
    const callback = window.currentNoteCallback;
    window.currentNoteCallback = null;
    
    // Zamknij modal
    const modal = document.querySelector('.note-modal-overlay');
    if (modal) {
        modal.remove();
    }
    
    // Callback zapisuje notatkę i renderuje pytanie
    if (callback) {
        callback(newNote);
    }
}
