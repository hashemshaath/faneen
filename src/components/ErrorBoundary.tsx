import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
          <div className="text-center max-w-md space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              حدث خطأ غير متوقع
            </h1>
            <p className="text-muted-foreground text-sm">
              نعتذر عن هذا الخطأ. يرجى إعادة تحميل الصفحة أو العودة للرئيسية.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReload} variant="default" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                إعادة التحميل
              </Button>
              <Button onClick={this.handleHome} variant="outline" className="gap-2">
                <Home className="w-4 h-4" />
                الرئيسية
              </Button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-4 p-3 rounded-lg bg-muted text-xs text-start overflow-auto max-h-40 text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
