/**
 * hooks/useWrittenTest.ts
 *
 * State machine for the written test simulation (mock Scripps Round 3).
 * 40 MC questions, 15-minute timer, review at the end.
 */
import { useState, useCallback, useRef } from 'react';
import { generateWrittenTest, type WrittenTest, type WrittenTestQuestion } from '../domains/spelling/writtenTestGenerator';

export type TestPhase = 'setup' | 'in-progress' | 'review' | 'results';

export interface TestResults {
    spellingCorrect: number;
    spellingTotal: number;
    vocabCorrect: number;
    vocabTotal: number;
    total: number;
    timeTakenMs: number;
}

export function useWrittenTest() {
    const [phase, setPhase] = useState<TestPhase>('setup');
    const [test, setTest] = useState<WrittenTest | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const startTimeRef = useRef(0);
    const [results, setResults] = useState<TestResults | null>(null);

    const startTest = useCallback((difficulty: number) => {
        const t = generateWrittenTest(difficulty);
        setTest(t);
        setAnswers(new Array(t.questions.length).fill(null));
        setCurrentIndex(0);
        setPhase('in-progress');
        startTimeRef.current = Date.now();
        setResults(null);
    }, []);

    const selectAnswer = useCallback((questionIndex: number, optionIndex: number) => {
        setAnswers(prev => {
            const next = [...prev];
            next[questionIndex] = optionIndex;
            return next;
        });
    }, []);

    const nextQuestion = useCallback(() => {
        setCurrentIndex(prev => Math.min(prev + 1, (test?.questions.length ?? 1) - 1));
    }, [test]);

    const prevQuestion = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, []);

    const goToQuestion = useCallback((index: number) => {
        setCurrentIndex(index);
    }, []);

    const submitTest = useCallback(() => {
        if (!test) return;
        const timeTaken = Date.now() - startTimeRef.current;
        let spellingCorrect = 0;
        let vocabCorrect = 0;
        let spellingTotal = 0;
        let vocabTotal = 0;

        for (let i = 0; i < test.questions.length; i++) {
            const q = test.questions[i];
            const isCorrect = answers[i] === q.correctIndex;
            if (q.type === 'spelling') {
                spellingTotal++;
                if (isCorrect) spellingCorrect++;
            } else {
                vocabTotal++;
                if (isCorrect) vocabCorrect++;
            }
        }

        setResults({
            spellingCorrect,
            spellingTotal,
            vocabCorrect,
            vocabTotal,
            total: spellingCorrect + vocabCorrect,
            timeTakenMs: timeTaken,
        });
        setPhase('results');
    }, [test, answers]);

    const reviewTest = useCallback(() => {
        setPhase('review');
        setCurrentIndex(0);
    }, []);

    const resetTest = useCallback(() => {
        setPhase('setup');
        setTest(null);
        setAnswers([]);
        setCurrentIndex(0);
        setResults(null);
    }, []);

    const currentQuestion: WrittenTestQuestion | null = test?.questions[currentIndex] ?? null;
    const answeredCount = answers.filter(a => a !== null).length;
    const totalQuestions = test?.questions.length ?? 0;

    return {
        phase,
        test,
        currentIndex,
        currentQuestion,
        answers,
        answeredCount,
        totalQuestions,
        results,
        startTest,
        selectAnswer,
        nextQuestion,
        prevQuestion,
        goToQuestion,
        submitTest,
        reviewTest,
        resetTest,
    };
}
