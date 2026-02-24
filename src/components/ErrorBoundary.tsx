import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('App crashed:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    onClick={() => window.location.reload()}
                    style={{
                        position: 'fixed', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: '#1a1a24', color: '#fff',
                        fontFamily: 'system-ui', cursor: 'pointer',
                        gap: '1rem', padding: '2rem', textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: '3rem' }}>😵</div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Something went wrong</h2>
                    <p style={{ opacity: 0.5, fontSize: '0.875rem', margin: 0 }}>Tap anywhere to reload</p>
                </div>
            );
        }
        return this.props.children;
    }
}
