import React from 'react';
import { AlertCircle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg flex items-center shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mr-4 shrink-0" />
          <div>
            <h2 className="text-red-800 font-semibold mb-1">Rất tiếc, đã xảy ra lỗi không mong muốn!</h2>
            <p className="text-red-600 text-sm">
              Ứng dụng quá tải hoặc gặp dữ liệu không hợp lệ. Vui lòng tải lại trang hoặc kiểm tra Console để biết thêm chi tiết.
            </p>
            <button
              className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded transition-colors text-sm border border-red-200"
              onClick={() => window.location.reload()}
            >
              Tải lại ứng dụng
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
