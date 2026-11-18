import { ToastProvider } from '@/staff/components/Toast';
import { StaffLayout } from '@/staff/StaffLayout';

function App() {
  return (
    <ToastProvider>
      <StaffLayout />
    </ToastProvider>
  );
}

export default App;
