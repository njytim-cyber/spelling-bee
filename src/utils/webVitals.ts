/**
 * Web Vitals reporter — measures real-user performance metrics
 * and logs them to the error monitor's Firestore collection.
 */
import type { Metric } from 'web-vitals';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

function reportMetric(metric: Metric) {
    const uid = localStorage.getItem('spell-bee-uid') || 'unknown';
    const id = `${uid}-${metric.name}-${Date.now()}`;

    setDoc(doc(db, 'vitals', id), {
        name: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,    // 'good' | 'needs-improvement' | 'poor'
        navigationType: metric.navigationType,
        userAgent: navigator.userAgent.slice(0, 200),
        timestamp: serverTimestamp(),
    }).catch(() => {
        // Silently fail — monitoring shouldn't cause errors
    });
}

export function initWebVitals() {
    // Dynamic import to keep it off the critical path
    import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
        onCLS(reportMetric);
        onINP(reportMetric);
        onLCP(reportMetric);
        onFCP(reportMetric);
        onTTFB(reportMetric);
    });
}
