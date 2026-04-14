import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import ErrorModal from '../component/ErrorModal.tsx';
import { resetTo } from '../navigation/NavigationService';
import i18n from '../i18n';

interface ErrorModalState {
  visible: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
}

interface ErrorModalContextType {
  showError: (title: string, message: string, onConfirm?: () => void) => void;
  hideError: () => void;
}

const ErrorModalContext = createContext<ErrorModalContextType | undefined>(undefined);

export const useErrorModal = () => {
  const context = useContext(ErrorModalContext);
  if (!context) {
    throw new Error('useErrorModal must be used within ErrorModalProvider');
  }
  return context;
};

export const ErrorModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errorState, setErrorState] = useState<ErrorModalState>({
    visible: false,
    title: '',
    message: '',
  });
 
   useEffect(() => {
     // Initialize global manager with provider's showError function
     ErrorModalManager.init(showError);
   }, []);
 
   const showError = (title: string, message: string, onConfirm?: () => void) => {
    setErrorState({
      visible: true,
      title,
      message,
      onConfirm,
    });
  };

  const hideError = () => {
    setErrorState({
      visible: false,
      title: '',
      message: '',
    });
  };

  const handleConfirm = () => {
    if (errorState.onConfirm) {
      errorState.onConfirm();
    }
    hideError();
  };

  return (
    <ErrorModalContext.Provider value={{ showError, hideError }}>
      {children}
      <ErrorModal
        visible={errorState.visible}
        onClose={hideError}
        onConfirm={handleConfirm}
        title={errorState.title}
        message={errorState.message}
        buttonText={i18n.t('common.confirm')}
      />
    </ErrorModalContext.Provider>
  );
};

// Global error modal manager for use outside of React components
let globalShowError: ((title: string, message: string, onConfirm?: () => void) => void) | null = null;

export const ErrorModalManager = {
  init: (showErrorFn: (title: string, message: string, onConfirm?: () => void) => void) => {
    globalShowError = showErrorFn;
  },
  
  showError: (title: string, message: string, onConfirm?: () => void) => {
    if (globalShowError) {
      globalShowError(title, message, onConfirm);
    } else {
      console.warn('ErrorModalManager not initialized. Falling back to console.error');
      console.error(title, message);
    }
  },
  
  showTimeoutError: (onConfirm?: () => void) => {
    ErrorModalManager.showError(
      i18n.t('errors.timeoutError'),
      i18n.t('errors.timeoutMessage'),
      onConfirm
    );
  },
  
  showSessionExpired: (onConfirm?: () => void) => {
    ErrorModalManager.showError(
      i18n.t('errors.sessionExpired'),
      i18n.t('errors.sessionExpiredSandbox'),
      onConfirm
    );
  },
  
  showAccessDenied: (onConfirm?: () => void) => {
    ErrorModalManager.showError(
      i18n.t('errors.sessionExpired'),
      i18n.t('errors.sessionExpiredMessage'),
      onConfirm
    );
  },
};

