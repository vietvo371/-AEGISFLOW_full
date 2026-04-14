import { useEffect } from 'react';
import { useAlert, AlertService } from '../services/AlertService';

/**
 * Component này kết nối AlertService (singleton) với AlertProvider (context)
 * Cho phép sử dụng AlertService.alert() từ bất kỳ đâu trong app
 */
const AlertServiceConnector = () => {
  const { showAlert } = useAlert();

  useEffect(() => {
    // Kết nối AlertService với AlertProvider
    AlertService.setShowAlert(showAlert);
  }, [showAlert]);

  return null;
};

export default AlertServiceConnector;

